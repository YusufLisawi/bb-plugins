// Device-local alert state shared by the app-wide listener, the badged
// sidebar icon and the Mail page. Everything here lives in this browser (or
// the BB desktop app): each device chooses its own sound and notification
// preferences, and tabs on one device share one cursor so an email alerts once.

const KEY = "bb-mail:";

function read(name: string): string | null {
  try {
    return window.localStorage.getItem(KEY + name);
  } catch {
    return null;
  }
}

function write(name: string, value: string) {
  try {
    window.localStorage.setItem(KEY + name, value);
  } catch {
    // Private mode or a full quota: alerts still work for this session.
  }
}

// ---- tiny observable store -------------------------------------------------

type Listener = () => void;

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Unread Inbox count, kept current by the app-wide listener. */
export const unreadStore = createStore(0);

export interface AlertPrefs {
  sound: boolean;
  desktop: boolean;
}

export const prefsStore = createStore<AlertPrefs>({
  sound: read("sound") !== "off",
  desktop: read("desktop") !== "off",
});

export function setPrefs(next: Partial<AlertPrefs>) {
  const merged = { ...prefsStore.get(), ...next };
  write("sound", merged.sound ? "on" : "off");
  write("desktop", merged.desktop ? "on" : "off");
  prefsStore.set(merged);
}

// ---- notification permission --------------------------------------------

export type Permission = NotificationPermission | "unsupported";

export function notificationPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window) || !window.isSecureContext) return "unsupported";
  return Notification.permission;
}

export const permissionStore = createStore<Permission>(notificationPermission());

export async function requestNotificationPermission(): Promise<Permission> {
  if (notificationPermission() === "unsupported") return "unsupported";
  try {
    const result = await Notification.requestPermission();
    permissionStore.set(result);
    if (result === "granted") setPrefs({ desktop: true });
    return result;
  } catch {
    permissionStore.set(notificationPermission());
    return notificationPermission();
  }
}

// ---- arrival cursor --------------------------------------------------------

/** The newest arrival this device has already alerted for; null on first run. */
export function readCursor(): number | null {
  const raw = read("cursor");
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function writeCursor(value: number) {
  write("cursor", String(value));
}

// ---- sound -----------------------------------------------------------------

let audio: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (audio) return audio;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  audio = new Context();
  return audio;
}

/**
 * Browsers only let a page start audio after the user interacts with it, so
 * the first click or key press anywhere in BB unlocks the alert sound.
 */
export function unlockAudioOnGesture(signal: AbortSignal) {
  const unlock = () => {
    const context = audioContext();
    if (context && context.state === "suspended") void context.resume();
  };
  window.addEventListener("pointerdown", unlock, { signal, capture: true });
  window.addEventListener("keydown", unlock, { signal, capture: true });
}

/** A short two-note chime, synthesized so no audio file is needed. */
export function playChime() {
  const context = audioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  const start = context.currentTime + 0.02;
  const notes: [number, number][] = [[880, 0], [1318.5, 0.13]];
  for (const [frequency, offset] of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start + offset);
    gain.gain.linearRampToValueAtTime(0.18, start + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.55);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.6);
  }
}

// ---- browser tab badge -----------------------------------------------------

const TITLE_PREFIX = /^\(\d+\+?\) /;

function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** Prefix the tab title with "(n)" and keep it there when BB retitles the page. */
export function keepTitleBadge(signal: AbortSignal) {
  const apply = () => {
    const count = unreadStore.get();
    const base = document.title.replace(TITLE_PREFIX, "");
    const next = count > 0 ? `(${badgeText(count)}) ${base}` : base;
    if (document.title !== next) document.title = next;
  };
  const observer = new MutationObserver(apply);
  observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  const unsubscribe = unreadStore.subscribe(apply);
  apply();
  signal.addEventListener("abort", () => {
    observer.disconnect();
    unsubscribe();
    document.title = document.title.replace(TITLE_PREFIX, "");
  });
}

/** Draw a red count dot on the tab's favicon. */
export function keepFaviconBadge(signal: AbortSignal) {
  let original: string | null = null;
  let drawn: string | null = null;
  let generation = 0;

  const iconLink = () => document.querySelector<HTMLLinkElement>("link[rel~='icon']");

  const apply = async () => {
    const link = iconLink();
    if (!link) return;
    if (link.href !== drawn) original = link.href;
    const count = unreadStore.get();
    const current = ++generation;
    if (count === 0 || !original) {
      if (drawn && original) link.href = original;
      drawn = null;
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = original;
    try {
      await image.decode();
    } catch {
      return;
    }
    if (current !== generation) return;
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, size, size);
    const text = count > 9 ? "9+" : String(count);
    const radius = 19;
    context.beginPath();
    context.arc(size - radius, radius, radius, 0, Math.PI * 2);
    context.fillStyle = "#e5484d";
    context.fill();
    context.fillStyle = "#fff";
    context.font = "bold 26px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, size - radius, radius + 1);
    try {
      drawn = canvas.toDataURL("image/png");
    } catch {
      return;
    }
    link.href = drawn;
  };

  const observer = new MutationObserver(() => {
    const link = iconLink();
    if (link && link.href !== drawn) void apply();
  });
  observer.observe(document.head, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
  const unsubscribe = unreadStore.subscribe(() => void apply());
  void apply();
  signal.addEventListener("abort", () => {
    observer.disconnect();
    unsubscribe();
    const link = iconLink();
    if (link && drawn && original) link.href = original;
  });
}

/** The OS-level app badge, where the browser supports it (installed web apps). */
export function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (count > 0) void nav.setAppBadge?.(count).catch(() => undefined);
  else void nav.clearAppBadge?.().catch(() => undefined);
}
