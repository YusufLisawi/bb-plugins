// State shared between the Mail page and the split list it puts in BB's
// sidebar. The sidebar list renders inside another plugin's tree, where this
// plugin's RPC hooks are not available, so it reads and writes only here.
import type { ComponentType } from "react";
import type { CustomSplit, SplitId } from "../shared/types.js";

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

const SPLIT_KEY = "bb-mail:split";

function initialSplit(): SplitId {
  try {
    const saved = window.localStorage.getItem(SPLIT_KEY);
    if (saved && /^(needs_you|waiting|other|later|archive|sent|c:[a-z0-9-]+)$/.test(saved)) return saved as SplitId;
  } catch {
    // Ignore unavailable storage.
  }
  return "needs_you";
}

export const splitStore = createStore<SplitId>(initialSplit());

export function selectSplit(split: SplitId) {
  viewStore.set("mail");
  try {
    window.localStorage.setItem(SPLIT_KEY, split);
  } catch {
    // Ignore unavailable storage.
  }
  splitStore.set(split);
}

/** A reply started from the list's context menu, picked up when that conversation opens. */
export const replyRequestStore = createStore<{ threadId: string; kind: "reply" | "all" | "forward" } | null>(null);

/** The main area: the mail list, or the Knowledge page. */
export const viewStore = createStore<"mail" | "knowledge" | "automations">("mail");

export interface SidebarData {
  accounts: { id: string; email: string }[];
  splits: CustomSplit[];
  /** Sidebar order of all splits; empty until loaded. */
  order: string[];
  counts: Record<string, number>;
  /** What the Inbox holds, so the split counts can be read against a total. */
  inbox: { conversations: number; emails: number; unread: number; bySplit: Record<string, number> } | null;
  /** Server messages vs downloaded, while older mail is being fetched. */
  sync: { total: number; cached: number } | null;
}

export const sidebarDataStore = createStore<SidebarData>({ accounts: [], splits: [], order: [], counts: {}, inbox: null, sync: null });

const ACCOUNT_KEY = "bb-mail:account";

function initialAccount(): string {
  try {
    return window.localStorage.getItem(ACCOUNT_KEY) ?? "";
  } catch {
    return "";
  }
}

/** The mailbox being viewed; "" shows every mailbox together. */
export const accountStore = createStore<string>(initialAccount());

export function selectAccount(account: string) {
  try {
    window.localStorage.setItem(ACCOUNT_KEY, account);
  } catch {
    // Ignore unavailable storage.
  }
  accountStore.set(account);
}

/** Requests from the sidebar that the page fulfils (it owns dialogs and RPC). */
export type PageRequest = { kind: "new-split" } | { kind: "edit-split"; id: string } | { kind: "search" } | { kind: "settings"; tab?: "ai" | "alerts" | "mailboxes" } | { kind: "add-account" } | { kind: "cleanup" } | { kind: "reorder"; order: string[] };
export const pageRequestStore = createStore<{ request: PageRequest; at: number } | null>(null);

export function requestPage(request: PageRequest) {
  pageRequestStore.set({ request, at: Date.now() });
}

// ---- sidebar takeover ------------------------------------------------------
//
// A tiny cross-plugin contract on `window`: a plugin page offers a component
// for the sidebar while it is open, and a thread-list plugin that supports
// takeovers (Sidebar Plus) renders it instead of threads. `hosts` counts
// mounted thread lists that honour it, so the page can show its own split
// list when no host is present.

export interface SidebarTakeover {
  id: string;
  component: ComponentType<{ onNavigate: () => void }>;
}

interface TakeoverRegistry {
  version: 1;
  current: SidebarTakeover | null;
  hosts: number;
  set(next: SidebarTakeover | null): void;
  subscribe(listener: Listener): () => void;
}

declare global {
  interface Window {
    __bbSidebarTakeover?: TakeoverRegistry;
  }
}

export function takeoverRegistry(): TakeoverRegistry {
  if (!window.__bbSidebarTakeover) {
    const listeners = new Set<Listener>();
    const registry: TakeoverRegistry = {
      version: 1,
      current: null,
      hosts: 0,
      set(next) {
        registry.current = next;
        for (const listener of listeners) listener();
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    window.__bbSidebarTakeover = registry;
  }
  return window.__bbSidebarTakeover;
}
