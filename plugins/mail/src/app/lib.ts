import type { Address } from "../shared/types.js";

export const PANEL_ID = "inbox";

// Thread ids are Message-IDs ("<abc@host>"); carry them base64url-encoded so
// the route survives the host's own URL encoding untouched.
function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function threadRoute(id: string): string {
  return `thread/${toBase64Url(id)}`;
}

export function parseThreadRoute(subPath: string): string | null {
  const match = /^thread\/([A-Za-z0-9_-]+)$/.exec(subPath);
  if (!match) return null;
  const id = fromBase64Url(match[1]!);
  return id && id.length <= 998 ? id : null;
}

export const SPLIT_LABELS: Record<string, string> = {
  needs_you: "Needs you",
  waiting: "Waiting",
  other: "Other",
  updates: "Promos & updates",
  later: "Later",
  archive: "Archive",
  junk: "Junk",
  sent: "Sent",
};

export function splitLabel(split: string, customs: { id: string; name: string }[]): string {
  if (split.startsWith("c:")) return customs.find((entry) => entry.id === split.slice(2))?.name ?? "Split";
  return SPLIT_LABELS[split] ?? split;
}

/** "4d, no reply" for Waiting rows. */
export function waitingLabel(ms: number, now = Date.now()): string {
  const days = Math.floor((now - ms) / 86_400_000);
  if (days < 1) {
    const hours = Math.max(1, Math.floor((now - ms) / 3_600_000));
    return `${hours}h, no reply`;
  }
  return `${days}d, no reply`;
}

export function laterLabel(until: number): string {
  const date = new Date(until);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export interface LaterOption {
  label: string;
  until: number;
}

export function laterOptions(now = new Date()): LaterOption[] {
  const at = (days: number, hour: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.getTime();
  };
  const options: LaterOption[] = [];
  if (now.getHours() < 17) options.push({ label: "Later today", until: now.getTime() + 3 * 3_600_000 });
  options.push({ label: "Tomorrow", until: at(1, 8) });
  const toSaturday = (6 - now.getDay() + 7) % 7 || 7;
  if (now.getDay() !== 6 && now.getDay() !== 0) options.push({ label: "This weekend", until: at(toSaturday, 9) });
  const toMonday = (8 - now.getDay()) % 7 || 7;
  options.push({ label: "Next week", until: at(toMonday, 8) });
  return options;
}

export const FORM_CONTROL_CLASS =
  "h-8 rounded-md border-border/70 bg-muted/25 px-2.5 text-[13px] shadow-none hover:border-border hover:bg-muted/40 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring";

export const FORM_TEXTAREA_CLASS =
  "rounded-md border-border/70 bg-muted/25 px-2.5 py-2 text-[13px] leading-5 shadow-none hover:border-border hover:bg-muted/40 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring";

/** "Carro Bernardo, Maria Nuria (Allianz…)" → "Maria"; "Ana García" → "Ana". */
export function firstName(address: Address): string {
  let name = address.name.replace(/\(.*?\)/g, "").replace(/["']/g, "").trim();
  if (name.includes(",")) name = name.split(",")[1]!.trim();
  return name.split(/\s+/)[0] || address.address.split("@")[0] || "them";
}

export function displayName(address: Address): string {
  return address.name || address.address || "Unknown sender";
}

export function formatAddress(address: Address): string {
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

/** Today → time, this year → "Oct 3", older → "Oct 3, 2025". */
export function formatListDate(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatFullDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** RPC inputs must be strict JSON: drop keys whose value is undefined. */
export function defined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
