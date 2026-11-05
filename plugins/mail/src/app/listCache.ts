import type { CustomSplit, MailStatus, ThreadDetail, ThreadSummary } from "../shared/types.js";

/**
 * What Mail last showed, so opening it paints at once from memory (or, after a
 * reload, from localStorage) while fresh data loads behind it.
 */

export interface SplitsData {
  splits: CustomSplit[];
  order?: string[];
  counts: Record<string, number>;
  unread: number;
  inbox: { conversations: number; emails: number; unread: number; bySplit: Record<string, number> };
  sync: { total: number; cached: number };
}

export interface ListPage {
  threads: ThreadSummary[];
  total: number;
  at: number;
}

interface Snapshot {
  status: MailStatus | null;
  splits: Record<string, SplitsData>;
  lists: Record<string, ListPage>;
}

const STORAGE_KEY = "bb-mail:cache:v1";
/** Only the top of each list is kept on disk; more loads as the reader scrolls. */
const STORED_ROWS = 30;
const STORED_LISTS = 12;

function read(): Snapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Snapshot;
      if (parsed && typeof parsed === "object" && parsed.lists && parsed.splits) return parsed;
    }
  } catch {
    // A broken or missing cache only costs the instant first paint.
  }
  return { status: null, splits: {}, lists: {} };
}

const snapshot: Snapshot = read();
let saveTimer: number | null = null;

function save() {
  if (saveTimer !== null) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    const lists = Object.entries(snapshot.lists)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, STORED_LISTS)
      .map(([key, page]) => [key, { ...page, threads: page.threads.slice(0, STORED_ROWS) }] as const);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, lists: Object.fromEntries(lists) }));
    } catch {
      // Storage full or unavailable: the in-memory copy still works.
    }
  }, 400);
}

/** The key of one list: split, search and mailbox. */
export function listKey(split: string, query: string, account: string | undefined): string {
  return `${split}|${query}|${account ?? ""}`;
}

export const listCache = {
  status: () => snapshot.status,
  setStatus(status: MailStatus) {
    snapshot.status = status;
    save();
  },
  splits: (account: string | undefined) => snapshot.splits[account ?? ""] ?? null,
  setSplits(account: string | undefined, data: SplitsData) {
    snapshot.splits[account ?? ""] = data;
    save();
  },
  list: (key: string): ListPage | null => snapshot.lists[key] ?? null,
  setList(key: string, threads: ThreadSummary[], total: number) {
    snapshot.lists[key] = { threads, total, at: Date.now() };
    save();
  },
  /** Forget everything, e.g. after the last mailbox is removed. */
  clear() {
    snapshot.status = null;
    snapshot.splits = {};
    snapshot.lists = {};
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

// Opened conversations, kept in memory only, so going back to one is instant.
const details = new Map<string, ThreadDetail>();
const pending = new Map<string, Promise<ThreadDetail>>();
const DETAILS = 40;

export const detailCache = {
  get: (id: string) => details.get(id) ?? null,
  set(id: string, detail: ThreadDetail) {
    details.delete(id);
    details.set(id, detail);
    while (details.size > DETAILS) details.delete(details.keys().next().value!);
  },
  /** Load a conversation ahead of a click (hover, keyboard cursor); never marks it read. */
  prefetch(id: string, load: () => Promise<ThreadDetail>) {
    if (details.has(id) || pending.has(id)) return;
    const promise = load();
    pending.set(id, promise);
    promise.then((detail) => detailCache.set(id, detail), () => undefined).finally(() => pending.delete(id));
  },
};
