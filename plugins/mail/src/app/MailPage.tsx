import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  useBbNavigate,
  useRealtime,
  useRpc,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { MAIL_CHANGED, type CustomSplit, type MailStatus, type SplitId, type ThreadSummary } from "../shared/types.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EnableAlertsBanner } from "./AlertSettings.js";
import { ComposeDialog, type ComposeDraft } from "./ComposeDialog.js";
import { ConnectForm } from "./ConnectForm.js";
import { SplitGlyph, SplitIcons } from "./icons.js";
import {
  defined,
  errorMessage,
  FORM_CONTROL_CLASS,
  formatListDate,
  laterLabel,
  laterOptions,
  PANEL_ID,
  parseThreadRoute,
  splitLabel,
  threadRoute,
  waitingLabel,
} from "./lib.js";
import { MailSettings } from "./MailSettings.js";
import { MailSidebar, MailSidebarTakeover } from "./MailSidebar.js";
import {
  accountStore,
  pageRequestStore,
  replyRequestStore,
  selectSplit,
  sidebarDataStore,
  splitStore,
  takeoverRegistry,
  viewStore,
} from "./mailStore.js";
import { CleanupDialog } from "./CleanupDialog.js";
import { RowMenu, type RowMenuActions } from "./RowMenu.js";
import { ConversationPane } from "./ConversationPane.js";
import { ThreadContent } from "./ThreadPanel.js";
import { detailCache, listCache, listKey, type SplitsData } from "./listCache.js";
import { KnowledgeView } from "./KnowledgeView.js";
import { AutomationsView, prefetchAutomations } from "./AutomationsView.js";
import { Menu } from "./Menu.js";
import { SplitDialog } from "./SplitDialog.js";

/** Conversations per page: a screenful arrives at once, more stream in as you scroll. */
const PAGE = 25;

function useTakeoverHosts(): number {
  const registry = takeoverRegistry();
  return useSyncExternalStore(registry.subscribe, () => registry.hosts);
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

export function MailPage({ subPath }: PluginNavPanelProps) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const split = useSyncExternalStore(splitStore.subscribe, splitStore.get);
  const accountSelection = useSyncExternalStore(accountStore.subscribe, accountStore.get);
  const hosts = useTakeoverHosts();
  // Paint from what Mail showed last; fresh data replaces it as it arrives.
  const [status, setStatus] = useState<MailStatus | null>(() => listCache.status());
  // A remembered mailbox that was removed falls back to all mailboxes.
  const account = status?.accounts.some((entry) => entry.id === accountSelection) ? accountSelection : undefined;
  const [splits, setSplits] = useState<CustomSplit[]>(() => listCache.splits(account)?.splits ?? []);
  const [order, setOrder] = useState<string[]>(() => listCache.splits(account)?.order ?? []);
  const [counts, setCounts] = useState<Record<string, number>>(() => listCache.splits(account)?.counts ?? {});
  const [inboxSummary, setInboxSummary] = useState<SplitsData["inbox"] | null>(() => listCache.splits(account)?.inbox ?? null);
  const [syncProgress, setSyncProgress] = useState<SplitsData["sync"] | null>(() => listCache.splits(account)?.sync ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  // How many rows are on screen, so a live refresh re-reads exactly that window.
  const loadedCount = useRef(PAGE);
  const listIdentity = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const key = listKey(split, debouncedQuery, account);
  const [total, setTotal] = useState(() => listCache.list(key)?.total ?? 0);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(() => listCache.list(key)?.threads ?? null);
  // Switching split, search or mailbox shows that list's last copy at once.
  const [shownKey, setShownKey] = useState(key);
  const [shownAccount, setShownAccount] = useState(account);
  if (shownKey !== key) {
    setShownKey(key);
    const page = listCache.list(key);
    setThreads(page?.threads ?? null);
    setTotal(page?.total ?? 0);
  }
  if (shownAccount !== account) {
    setShownAccount(account);
    const cached = listCache.splits(account);
    if (cached) {
      setCounts(cached.counts);
      setInboxSummary(cached.inbox);
      setSyncProgress(cached.sync);
    }
  }
  /** The first screen came in one `home` call; nothing else loads before it. */
  const [booted, setBooted] = useState(false);
  const bootLoaded = useRef<{ list: string | null; splits: boolean }>({ list: null, splits: false });
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [editingSplit, setEditingSplit] = useState<string | "new" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"ai" | "alerts" | "mailboxes">("ai");
  const mainView = useSyncExternalStore(viewStore.subscribe, viewStore.get);
  const [addingAccount, setAddingAccount] = useState(false);
  const [cursor, setCursor] = useState(0);
  // Multi-select for bulk actions; `allMatching` widens it to every conversation in the split.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const lastPicked = useRef<number | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedId = parseThreadRoute(subPath);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const applyStatus = useCallback((next: MailStatus) => {
    setStatus(next);
    if (next.connected) listCache.setStatus(next);
    else listCache.clear();
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      applyStatus(await rpc.call("status"));
    } catch (cause) {
      setError(errorMessage(cause, "Could not reach the Mail plugin."));
    }
  }, [rpc, applyStatus]);

  const applySplits = useCallback((forAccount: string | undefined, result: SplitsData) => {
    listCache.setSplits(forAccount, result);
    setSplits(result.splits);
    if (result.order) setOrder(result.order);
    setCounts(result.counts);
    setInboxSummary(result.inbox);
    setSyncProgress(result.sync);
  }, []);

  const loadSplits = useCallback(async () => {
    try {
      applySplits(account, await rpc.call("splits", defined({ account })));
    } catch {
      // The list call reports errors.
    }
  }, [rpc, account, applySplits]);

  /** (Re)load the first page, or the whole window already scrolled into view. */
  const loadThreads = useCallback(async () => {
    const identity = key;
    if (listIdentity.current !== identity) {
      listIdentity.current = identity;
      loadedCount.current = PAGE;
    }
    try {
      const result = await rpc.call("threads", defined({ split, query: debouncedQuery, account, offset: 0, limit: Math.max(PAGE, loadedCount.current) }));
      listCache.setList(identity, result.threads, result.total);
      if (listIdentity.current !== identity) return;
      setThreads(result.threads);
      setTotal(result.total);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Could not load mail."));
    }
  }, [rpc, key, split, debouncedQuery, account]);

  /** Append the next page when the reader nears the end of the list. */
  const loadMore = useCallback(async () => {
    if (loadingMore || !threads || threads.length >= total) return;
    const identity = listIdentity.current;
    setLoadingMore(true);
    try {
      const result = await rpc.call("threads", defined({ split, query: debouncedQuery, account, offset: threads.length, limit: PAGE }));
      if (listIdentity.current !== identity) return;
      setThreads((before) => {
        const seen = new Set((before ?? []).map((thread) => thread.id));
        const next = [...(before ?? []), ...result.threads.filter((thread) => !seen.has(thread.id))];
        loadedCount.current = next.length;
        listCache.setList(identity, next, result.total);
        return next;
      });
      setTotal(result.total);
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not load older mail."));
    } finally {
      setLoadingMore(false);
    }
  }, [rpc, split, debouncedQuery, account, threads, total, loadingMore]);

  // Infinite scroll: a sentinel below the last row pulls in the next page early.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { root: scrollRef.current, rootMargin: "600px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, threads?.length, total]);

  const reload = useCallback(() => {
    void loadThreads();
    void loadSplits();
  }, [loadThreads, loadSplits]);

  // The first screen: status, split counts and the top of the list in one round trip.
  useEffect(() => {
    let cancelled = false;
    const selection = accountStore.get();
    const firstSplit = splitStore.get();
    rpc.call("home", defined({ split: firstSplit, account: selection || undefined, limit: PAGE })).then((result) => {
      if (cancelled) return;
      applyStatus(result.status);
      if (result.status.connected) {
        const scope = result.status.accounts.some((entry) => entry.id === selection) ? selection : undefined;
        if (result.splits) {
          applySplits(scope, result.splits);
          bootLoaded.current.splits = true;
        }
        if (result.list) {
          const homeKey = listKey(firstSplit, "", scope);
          listCache.setList(homeKey, result.list.threads, result.list.total);
          bootLoaded.current.list = homeKey;
          if (keyRef.current === homeKey) {
            listIdentity.current = homeKey;
            loadedCount.current = PAGE;
            setThreads(result.list.threads);
            setTotal(result.list.total);
          }
        }
      }
      setError(null);
      setBooted(true);
    }, (cause) => {
      if (cancelled) return;
      setError(errorMessage(cause, "Could not reach the Mail plugin."));
      setBooted(true);
    });
    return () => { cancelled = true; };
  }, [rpc, applyStatus, applySplits]);

  useEffect(() => {
    if (!booted || !status?.connected) return;
    if (bootLoaded.current.list === key) {
      bootLoaded.current.list = null;
      return;
    }
    void loadThreads();
  }, [booted, status?.connected, key, loadThreads]);

  useEffect(() => {
    if (!booted || !status?.connected) return;
    if (bootLoaded.current.splits) bootLoaded.current.splits = false;
    else void loadSplits();
  }, [booted, status?.connected, loadSplits]);

  useEffect(() => {
    if (!booted || !status?.connected) return;
    const interval = window.setInterval(() => { void loadStatus(); reload(); }, 60_000);
    return () => window.clearInterval(interval);
  }, [booted, status?.connected, loadStatus, reload]);

  // Bursts of changes (a sync, a bulk action) refresh once.
  const changeTimer = useRef<number | null>(null);
  useRealtime(MAIL_CHANGED, () => {
    if (changeTimer.current !== null) return;
    changeTimer.current = window.setTimeout(() => {
      changeTimer.current = null;
      reload();
      void loadStatus();
    }, 250);
  });
  useEffect(() => () => { if (changeTimer.current !== null) window.clearTimeout(changeTimer.current); }, []);

  // Fetch the top of the other splits while idle, so switching to one is instant.
  const splitIds = ["needs_you", "waiting", "other", "updates", "later", "archive", "sent", ...splits.map((entry) => `c:${entry.id}`)].join(",");
  useEffect(() => {
    if (!booted || !status?.connected) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      for (const id of splitIds.split(",")) {
        if (cancelled) return;
        const otherKey = listKey(id, "", account);
        const cached = listCache.list(otherKey);
        if (otherKey === keyRef.current || (cached && Date.now() - cached.at < 60_000)) continue;
        try {
          const result = await rpc.call("threads", defined({ split: id as SplitId, query: "", account, offset: 0, limit: PAGE }));
          listCache.setList(otherKey, result.threads, result.total);
        } catch {
          return;
        }
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rpc, booted, status?.connected, account, splitIds]);

  // Automations open instantly when their data is already here.
  useEffect(() => {
    if (!booted || !status?.connected) return;
    const timer = window.setTimeout(() => prefetchAutomations(rpc as never), 2500);
    return () => window.clearTimeout(timer);
  }, [rpc, booted, status?.connected]);

  const prefetchThread = useCallback((id: string) => {
    detailCache.prefetch(id, () => rpc.call("thread", { id }));
  }, [rpc]);

  // Reset the keyboard cursor when the list changes identity.
  useEffect(() => {
    setCursor(0);
    setPicked(new Set());
    setAllMatching(false);
  }, [split, debouncedQuery, account]);

  // Feed the sidebar split list.
  useEffect(() => {
    sidebarDataStore.set({ accounts: status?.accounts.map((entry) => ({ id: entry.id, email: entry.email })) ?? [], splits, order, counts, inbox: inboxSummary, sync: syncProgress });
  }, [status?.accounts, splits, order, counts, inboxSummary, syncProgress]);

  // A split chosen in the sidebar that no longer exists falls back to Needs you.
  useEffect(() => {
    if (split.startsWith("c:") && splits.length > 0 && !splits.some((entry) => `c:${entry.id}` === split)) selectSplit("needs_you");
  }, [split, splits]);

  // Offer the split list to the BB sidebar while Mail is open.
  useEffect(() => {
    if (!status?.connected) return;
    const registry = takeoverRegistry();
    registry.set({ id: "mail", component: MailSidebarTakeover });
    return () => {
      if (registry.current?.id === "mail") registry.set(null);
    };
  }, [status?.connected]);

  // Requests from the sidebar (it cannot open dialogs itself).
  const request = useSyncExternalStore(pageRequestStore.subscribe, pageRequestStore.get);
  useEffect(() => {
    if (!request) return;
    pageRequestStore.set(null);
    switch (request.request.kind) {
      case "new-split": setEditingSplit("new"); break;
      case "edit-split": setEditingSplit(request.request.id); break;
      case "search": searchRef.current?.focus(); break;
      case "settings": setSettingsTab(request.request.tab ?? "ai"); setSettingsOpen(true); break;
      case "add-account": setSettingsOpen(false); setAddingAccount(true); break;
      case "cleanup": setCleanupOpen(true); break;
      case "reorder": {
        const next = request.request.order;
        setOrder(next);
        rpc.call("saveSplitOrder", { order: next as SplitId[] }).then((result) => setOrder(result.order), (cause) => {
          toast.error(errorMessage(cause, "Could not save the split order."));
          void loadSplits();
        });
        break;
      }
    }
  }, [request]);

  // The conversation pane follows the route: it exists only while one is selected.
  const openThread = useCallback((thread: ThreadSummary) => {
    navigate.toPluginPanel(PANEL_ID, { subPath: threadRoute(thread.id) });
    if (thread.unread) setThreads((current) => current?.map((entry) => (entry.id === thread.id ? { ...entry, unread: false } : entry)) ?? null);
  }, [navigate]);

  const closeThread = useCallback(() => {
    // Hand focus back to the list first: if it vanished with the pane, BB would treat the page as left.
    const row = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? listRef.current?.querySelector<HTMLElement>("button:not([role])");
    row?.focus({ preventScroll: true });
    navigate.toPluginPanel(PANEL_ID);
  }, [navigate]);

  const act = useCallback(async (thread: ThreadSummary, action: "done" | "inbox" | "later" | "unlater", until?: number) => {
    // Optimistic: the row leaves this view at once.
    setThreads((current) => current?.filter((entry) => entry.id !== thread.id) ?? null);
    try {
      await rpc.call("threadAction", defined({ id: thread.id, action, until }));
      if (action === "done") toast.success("Done", { action: { label: "Undo", onClick: () => void rpc.call("threadAction", { id: thread.id, action: "inbox" }) } });
      if (action === "later" && until) toast.success(`Back ${laterLabel(until)}`, { action: { label: "Undo", onClick: () => void rpc.call("threadAction", { id: thread.id, action: "unlater" }) } });
      if (action === "inbox") toast.success("Moved to Inbox");
      if (action === "unlater") toast.success("Back in your inbox");
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not update the conversation."));
      reload();
    }
  }, [rpc, reload]);

  async function moveThread(thread: ThreadSummary, to: string) {
    // It leaves this list unless this is Needs you and it's still urgent there.
    if (split !== "needs_you") setThreads((current) => current?.filter((entry) => entry.id !== thread.id) ?? null);
    try {
      await rpc.call("threadAction", { id: thread.id, action: "move", to: to as SplitId });
      toast.success(`Moved to ${splitLabel(to, splits)}`);
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not move the conversation."));
    } finally {
      reload();
    }
  }

  async function markRead(thread: ThreadSummary, read: boolean) {
    setThreads((current) => current?.map((entry) => (entry.id === thread.id ? { ...entry, unread: !read } : entry)) ?? null);
    try {
      await rpc.call("threadAction", { id: thread.id, action: read ? "read" : "unread" });
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not update the conversation."));
      reload();
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      applyStatus(await rpc.call("sync"));
      reload();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not check for mail."));
    } finally {
      setRefreshing(false);
    }
  }

  async function saveSplits(next: CustomSplit[]) {
    const result = await rpc.call("saveSplits", { splits: next });
    setSplits(result.splits);
    reload();
  }

  const visible = threads ?? [];
  const current = visible[Math.min(cursor, Math.max(0, visible.length - 1))];

  function togglePick(index: number, range: boolean) {
    setAllMatching(false);
    setPicked((before) => {
      const next = new Set(before);
      const from = range && lastPicked.current !== null ? Math.min(lastPicked.current, index) : index;
      const to = range && lastPicked.current !== null ? Math.max(lastPicked.current, index) : index;
      const turnOn = !before.has(visible[index]!.id);
      for (let position = from; position <= to; position += 1) {
        const id = visible[position]!.id;
        if (turnOn) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    lastPicked.current = index;
  }

  function clearPicked() {
    setPicked(new Set());
    setAllMatching(false);
    lastPicked.current = null;
  }

  const pickedCount = allMatching ? total : picked.size;

  async function runBulk(action: "read" | "unread" | "done" | "inbox" | "later" | "move", extra: { until?: number; to?: string } = {}) {
    const scope = allMatching && !debouncedQuery
      ? defined({ split, account })
      : { threadIds: [...picked] };
    const ids = new Set(picked);
    // Optimistic: rows that leave this view go at once; read state flips in place.
    if (action === "read" || action === "unread") {
      setThreads((before) => before?.map((thread) => (allMatching || ids.has(thread.id) ? { ...thread, unread: action === "unread" } : thread)) ?? null);
    } else {
      setThreads((before) => before?.filter((thread) => !(allMatching || ids.has(thread.id))) ?? null);
    }
    clearPicked();
    try {
      const result = await rpc.call("bulk", defined({ ...scope, action, until: extra.until, to: extra.to }));
      const undo = action === "read"
        ? () => void rpc.call("bulk", { messageIds: result.messageIds, action: "unread" })
        : action === "done"
          ? () => void rpc.call("bulk", { threadIds: result.threadIds, action: "inbox" })
          : action === "later"
            ? () => void rpc.call("bulk", { threadIds: result.threadIds, action: "unlater" })
            : undefined;
      const n = result.threadIds.length.toLocaleString();
      const message = action === "read" ? `${result.messageIds.length.toLocaleString()} emails marked as read`
        : action === "unread" ? `${n} marked unread`
        : action === "done" ? `${n} conversations done`
        : action === "inbox" ? `${n} moved to Inbox`
        : action === "later" ? `${n} snoozed until ${laterLabel(extra.until ?? 0)}`
        : `${n} moved to ${splitLabel(extra.to ?? "needs_you", splits)}`;
      toast.success(message, { duration: 10_000, ...(undo ? { action: { label: "Undo", onClick: undo } } : {}) });
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not update those conversations."));
    } finally {
      reload();
    }
  }
  const doneAction: "done" | "inbox" = split === "archive" || split === "junk" ? "inbox" : "done";
  const inboxLabel = split === "junk" ? "Not junk" : "Move to Inbox";

  // Superhuman-style keys: j/k move, Enter opens, e done, h later, c compose, / search.
  useEffect(() => {
    if (!status?.connected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || draft || editingSplit || settingsOpen) return;
      // Enter and Space on a focused button belong to that button.
      if ((event.key === "Enter" || event.key === " ") && event.target instanceof Element && event.target.closest("button, a, [role=button], [role=checkbox], [role=menuitem]")) return;
      if (document.querySelector("[role=dialog]")) return;
      const key = event.key;
      if (key === "x" && current) togglePick(visible.indexOf(current), event.shiftKey);
      else if (key === "Escape" && (picked.size || allMatching)) clearPicked();
      else if (key === "Escape" && selectedId) closeThread();
      else if (key === "e" && (picked.size || allMatching)) void runBulk(doneAction);
      else if (key === "j" || key === "ArrowDown") {
        setCursor((value) => Math.min(value + 1, Math.max(0, visible.length - 1)));
        // Keyboard readers reach the end too: fetch the next page ahead of them.
        if (cursor >= visible.length - 10) void loadMore();
      }
      else if (key === "k" || key === "ArrowUp") setCursor((value) => Math.max(value - 1, 0));
      else if ((key === "Enter" || key === "o") && current) openThread(current);
      else if (key === "e" && current) void act(current, doneAction);
      else if (key === "h" && current && split !== "later") void act(current, "later", laterOptions().find((option) => option.label === "Tomorrow")!.until);
      else if (key === "c") setDraft({ to: "", subject: "", text: "" });
      else if (key === "/") searchRef.current?.focus();
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, visible, current, cursor, loadMore, draft, editingSplit, settingsOpen, openThread, closeThread, selectedId, act, doneAction, split, picked, allMatching]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // The keyboard cursor's conversation is the likely next one to open.
  const cursorId = current?.id;
  useEffect(() => {
    if (!cursorId) return;
    const timer = window.setTimeout(() => prefetchThread(cursorId), 150);
    return () => window.clearTimeout(timer);
  }, [cursorId, prefetchThread]);

  const title = debouncedQuery ? "Search" : splitLabel(split, splits);
  const view = split.startsWith("c:") && !debouncedQuery ? splits.find((entry) => `c:${entry.id}` === split) : undefined;
  const groupBy = view?.groupBy ?? "none";
  const groupOf = (thread: ThreadSummary) => groupBy === "sender"
    ? thread.people[0] ?? "Me"
    : groupBy === "day"
      ? new Date(thread.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
      : "";
  const count = debouncedQuery ? total : counts[split] ?? (threads ? total : undefined);

  if (!status) return error ? <PageError message={error} onRetry={() => void loadStatus()} /> : <LoadingState />;
  if (!status.connected) return <ConnectForm onConnected={applyStatus} />;

  const firstSync = threads !== null && threads.length === 0 && status.lastSyncAt === null && !debouncedQuery;
  const showOwnNav = hosts === 0;

  return (
    <div className="relative flex h-full min-h-0 bg-background text-foreground">
      {showOwnNav ? (
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-border/60 md:block">
          <MailSidebar />
        </aside>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {mainView === "knowledge" ? <KnowledgeView /> : mainView === "automations" ? <AutomationsView /> : (
        <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
              {view ? <SplitGlyph icon={view.icon} className="size-[18px] shrink-0 self-center text-muted-foreground" /> : null}
              {title}
              {count ? <span className="text-base font-normal tabular-nums text-muted-foreground">{count.toLocaleString()}</span> : null}
            </h1>
            <div className="flex w-full items-center gap-1 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Label htmlFor="mail-search" className="sr-only">Search mail</Label>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <Input
                  id="mail-search"
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); event.currentTarget.blur(); } }}
                  placeholder="Search"
                  className={cn(FORM_CONTROL_CLASS, "h-9 w-full pl-7 sm:h-8 sm:w-48")}
                />
              </div>
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => void refresh()} disabled={refreshing} aria-label="Check for new mail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn("size-4", (refreshing || status.syncing) && "animate-spin")} aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setCleanupOpen(true)} aria-label="Clean up inbox">
                <SplitIcons.broom className="size-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSettingsOpen(true)} aria-label="Sorting and alerts">
                <SplitIcons.settings className="size-4" />
              </Button>
              <Button type="button" size="sm" className="h-9 px-2.5 sm:h-8" onClick={() => setDraft({ to: "", subject: "", text: "" })} aria-label="Compose">
                <SplitIcons.pencil className="size-3.5" />
                <span className="hidden sm:inline">Compose</span>
              </Button>
            </div>
          </header>

          {mainView === "mail" ? (
            <div className={cn("-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1", showOwnNav ? "md:hidden" : "sm:hidden")}>
              {((order.length ? order : ["needs_you", "waiting", "other", "updates", "later", "archive", ...splits.map((entry) => `c:${entry.id}`), "sent"]) as SplitId[]).filter((entry) => !entry.startsWith("c:") || splits.some((custom) => `c:${custom.id}` === entry)).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => selectSplit(entry)}
                  className={cn("h-7 shrink-0 rounded-md px-2.5 text-xs", entry === split ? "bg-muted font-medium" : "text-muted-foreground hover:bg-state-hover")}
                >
                  {splitLabel(entry, splits)}
                  {counts[entry] ? <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[entry]}</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 empty:hidden"><EnableAlertsBanner /></div>

          {status.error ? <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive" role="alert">{status.error}</p> : null}
          {error ? <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}

          <section className="mt-3" aria-label={title}>
            {threads === null || firstSync ? (
              <ListSkeleton label={firstSync ? "Downloading your recent mail…" : undefined} />
            ) : visible.length === 0 ? (
              <EmptyState split={split} searching={Boolean(debouncedQuery)} />
            ) : (
              <ul ref={listRef} className="-mx-2" aria-label={`${title} conversations`}>
                {visible.map((thread, index) => (
                  <Fragment key={thread.id}>
                  {groupBy !== "none" && (index === 0 || groupOf(visible[index - 1]!) !== groupOf(thread)) ? (
                    <li className="px-2 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pt-1" aria-hidden="true">{groupOf(thread)}</li>
                  ) : null}
                  <ThreadRow
                    index={index}
                    thread={thread}
                    split={split}
                    active={index === cursor}
                    selected={thread.id === selectedId}
                    checked={allMatching || picked.has(thread.id)}
                    selecting={picked.size > 0 || allMatching}
                    onToggle={(range) => togglePick(index, range)}
                    onOpen={() => { setCursor(index); openThread(thread); }}
                    onDone={() => void act(thread, doneAction)}
                    onLater={(until) => void act(thread, "later", until)}
                    onUnlater={() => void act(thread, "unlater")}
                    doneLabel={doneAction === "inbox" ? inboxLabel : "Done"}
                    showAccount={!account && (status.accounts.length > 1)}
                    onPrefetch={() => prefetchThread(thread.id)}
                    filedIn={split === "needs_you" && thread.split?.startsWith("c:") ? splits.find((entry) => `c:${entry.id}` === thread.split) : undefined}
                    splits={splits}
                    menu={{
                      open: () => { setCursor(index); openThread(thread); },
                      reply: (kind) => { setCursor(index); replyRequestStore.set({ threadId: thread.id, kind }); openThread(thread); },
                      done: () => void act(thread, doneAction),
                      later: (until) => void act(thread, "later", until),
                      unlater: () => void act(thread, "unlater"),
                      move: (to) => void moveThread(thread, to),
                      read: (read) => void markRead(thread, read),
                      select: () => togglePick(index, false),
                    }}
                  />
                  </Fragment>
                ))}
                {total > visible.length ? (
                  <li ref={sentinelRef} className="flex h-12 items-center justify-center text-xs text-muted-foreground" aria-live="polite">
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden="true" />
                        Loading older mail…
                      </span>
                    ) : (
                      <button type="button" onClick={() => void loadMore()} className="rounded px-2 py-1 hover:bg-state-hover hover:text-foreground">
                        {(total - visible.length).toLocaleString()} older
                      </button>
                    )}
                  </li>
                ) : visible.length > PAGE ? (
                  <li className="py-4 text-center text-[11px] text-muted-foreground">That's everything · {visible.length.toLocaleString()} conversations</li>
                ) : null}
              </ul>
            )}
          </section>
        </main>
        )}
      </div>

      {pickedCount > 0 ? (
        <div className="absolute inset-x-0 bottom-3 z-20 mx-auto flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-lg" role="toolbar" aria-label="Selected conversations">
          <span className="px-1.5 font-medium tabular-nums">{pickedCount.toLocaleString()} selected</span>
          {!allMatching && !debouncedQuery && total > picked.size ? (
            <button type="button" onClick={() => setAllMatching(true)} className="rounded px-1.5 py-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Select all {total.toLocaleString()}
            </button>
          ) : null}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <BulkButton onClick={() => void runBulk("read")}>Mark read</BulkButton>
          <BulkButton onClick={() => void runBulk("unread")}>Unread</BulkButton>
          <BulkButton onClick={() => void runBulk(doneAction)}>{doneAction === "inbox" ? inboxLabel : "Done"}</BulkButton>
          {split !== "later" ? (
            <Menu
              label="Later"
              items={laterOptions().map((option) => ({ label: option.label, hint: laterLabel(option.until), onSelect: () => void runBulk("later", { until: option.until }) }))}
              trigger={({ toggle }) => <BulkButton onClick={toggle}>Later</BulkButton>}
            />
          ) : null}
          <Menu
            label="Move to"
            items={["needs_you", "other", "updates", ...splits.map((entry) => `c:${entry.id}`)].filter((entry) => entry !== split).map((entry) => ({ label: splitLabel(entry, splits), onSelect: () => void runBulk("move", { to: entry }) }))}
            trigger={({ toggle }) => <BulkButton onClick={toggle}>Move to…</BulkButton>}
          />
          <button type="button" aria-label="Clear selection" onClick={clearPicked} className="ml-0.5 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-state-hover hover:text-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}

      <div className={cn("pointer-events-none absolute bottom-3 right-3 hidden items-center gap-3 rounded-lg border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur", pickedCount === 0 && "lg:flex")}>
        <Hint label="Open" keys="↵" />
        <Hint label={doneAction === "inbox" ? "Inbox" : "Done"} keys="E" />
        <Hint label="Later" keys="H" />
        <Hint label="Compose" keys="C" />
        <span className="flex items-center gap-1.5 border-l border-border/60 pl-3">
          <span className={cn("size-1.5 rounded-full", status.live ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />
          {status.live ? "Live" : "Reconnecting"}
        </span>
      </div>
      </div>

      {selectedId && mainView === "mail" ? (
        <ConversationPane>
          <ThreadContent key={selectedId} threadId={selectedId} onClosed={closeThread} />
        </ConversationPane>
      ) : null}

      <ComposeDialog draft={draft} onClose={() => setDraft(null)} />
      <CleanupDialog open={cleanupOpen} onClose={() => { setCleanupOpen(false); reload(); }} account={account} />
      <SplitDialog editing={editingSplit} splits={splits} onClose={() => setEditingSplit(null)} onSave={saveSplits} />
      <AddAccountDialog open={addingAccount} onClose={() => setAddingAccount(false)} onConnected={(next) => { setAddingAccount(false); applyStatus(next); }} />
      <MailSettings open={settingsOpen} initialTab={settingsTab} onClose={() => setSettingsOpen(false)} status={status} onDisconnected={(next) => { setSettingsOpen(false); applyStatus(next); }} />
    </div>
  );
}

function Hint({ label, keys }: { label: string; keys: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      <kbd className="rounded border border-border/70 bg-muted/50 px-1 font-sans text-[10px]">{keys}</kbd>
    </span>
  );
}

function BulkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-7 rounded-md px-2 font-medium transition-colors hover:bg-state-hover">
      {children}
    </button>
  );
}

function ThreadRow({ thread, split, index, active, selected, checked, selecting, onToggle, onOpen, onDone, onLater, onUnlater, doneLabel, showAccount, onPrefetch, filedIn, splits, menu }: {
  thread: ThreadSummary;
  splits: CustomSplit[];
  /** Right-click actions. */
  menu: RowMenuActions;
  /** In Needs you: the split this urgent conversation also belongs to. */
  filedIn?: CustomSplit;
  /** Load the conversation ahead of a likely click. */
  onPrefetch: () => void;
  checked: boolean;
  selecting: boolean;
  onToggle: (range: boolean) => void;
  split: string;
  index: number;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
  onDone: () => void;
  onLater: (until: number) => void;
  onUnlater: () => void;
  doneLabel: string;
  showAccount: boolean;
}) {
  const people = thread.people.length ? thread.people.join(", ") : "Me";
  const meta = split === "waiting"
    ? waitingLabel(thread.date)
    : split === "later" && thread.laterUntil
      ? laterLabel(thread.laterUntil)
      : formatListDate(thread.date);
  const strong = thread.unread;
  const hover = useRef<number | null>(null);
  const startPrefetch = () => {
    if (hover.current === null) hover.current = window.setTimeout(onPrefetch, 90);
  };
  const stopPrefetch = () => {
    if (hover.current !== null) window.clearTimeout(hover.current);
    hover.current = null;
  };
  useEffect(() => stopPrefetch, []);

  return (
    <RowMenu thread={thread} split={split} splits={splits} actions={menu}>
    <li data-index={index} className="group/row relative" onMouseEnter={startPrefetch} onMouseLeave={stopPrefetch} onFocus={onPrefetch}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`Select ${thread.subject}`}
        onClick={(event) => { event.stopPropagation(); onToggle(event.shiftKey); }}
        className={cn(
          "absolute left-2 top-1/2 z-10 flex size-4 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          checked ? "text-primary opacity-100" : selecting ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
        )}
      >
        {checked ? <SplitIcons.checked className="size-4" /> : <SplitIcons.checkbox className="size-4" />}
      </button>
      <button
        type="button"
        onClick={(event) => {
          // While picking, a click (or a shift-click range) selects instead of opening.
          if (selecting || event.shiftKey || event.metaKey || event.ctrlKey) onToggle(event.shiftKey);
          else onOpen();
        }}
        aria-current={selected ? "true" : undefined}
        title={thread.reason ? `Sorted here: ${thread.reason}` : undefined}
        className={cn(
          "grid w-full min-w-0 grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring sm:h-10 sm:grid-cols-[1rem_minmax(5rem,11rem)_minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-0 sm:py-0",
          checked ? "bg-primary/[0.07]" : selected ? "bg-muted/70" : active ? "bg-state-hover" : "hover:bg-state-hover",
        )}
      >
        <span className={cn("row-span-2 flex self-start justify-center pt-1.5 sm:row-span-1 sm:self-center sm:pt-0", (selecting || checked) ? "invisible" : "group-hover/row:invisible")} aria-hidden="true">
          {strong ? <span className="size-1.5 rounded-full bg-primary" /> : null}
        </span>
        <span className={cn("truncate", strong ? "font-semibold text-foreground" : "text-foreground/75")}>
          {people}
          {thread.count > 1 ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">{thread.count}</span> : null}
        </span>
        <span className="col-span-2 col-start-2 row-start-2 min-w-0 truncate sm:col-span-1 sm:col-start-auto sm:row-start-auto">
          {filedIn ? (
            <span className="mr-1.5 inline-flex translate-y-[-1px] items-center gap-1 rounded bg-muted/70 px-1.5 align-middle text-[11px] leading-[18px] text-muted-foreground">
              <SplitGlyph icon={filedIn.icon} className="size-3" />
              {filedIn.name}
            </span>
          ) : null}
          <span className={strong ? "font-medium text-foreground" : "text-foreground/85"}>{thread.subject}</span>
          {thread.snippet ? <span className="text-muted-foreground"> · {thread.snippet}</span> : null}
        </span>
        <span className={cn(
          "col-start-3 row-start-1 flex shrink-0 items-center gap-1.5 pl-2 text-xs tabular-nums group-hover/row:invisible sm:col-start-auto sm:row-start-auto",
          split === "waiting" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}>
          {showAccount ? <span className="max-w-24 truncate rounded bg-muted/60 px-1 text-[10px] text-muted-foreground" title={thread.account}>{thread.account.split("@")[0]}</span> : null}
          {thread.hasAttachments ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-3" aria-label="Attachment"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg> : null}
          {meta}
        </span>
      </button>
      <div className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover/row:flex">
        <RowAction label={doneLabel} onClick={onDone}>
          {doneLabel === "Done" ? <SplitIcons.check className="size-4" /> : <SplitIcons.inbox className="size-4" />}
        </RowAction>
        {split !== "later" ? (
          <Menu
            label="Later"
            items={laterOptions().map((option) => ({ label: option.label, hint: laterLabel(option.until), onSelect: () => onLater(option.until) }))}
            trigger={({ toggle }) => (
              <RowAction label="Later" onClick={toggle}><SplitIcons.clock className="size-4" /></RowAction>
            )}
          />
        ) : (
          <RowAction label="Back to inbox now" onClick={onUnlater}><SplitIcons.inbox className="size-4" /></RowAction>
        )}
      </div>
    </li>
    </RowMenu>
  );
}

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function ListSkeleton({ label }: { label?: string }) {
  return (
    <div role="status" aria-label={label ?? "Loading mail"} className="grid gap-1 pt-1">
      {label ? <p className="pb-1 text-xs text-muted-foreground">{label}</p> : null}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
        <div key={row} className="grid h-10 grid-cols-[11rem_1fr_3rem] items-center gap-3 px-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full max-w-xl" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-6">
      <Skeleton className="h-6 w-32" />
      <div className="mt-4"><ListSkeleton /></div>
    </div>
  );
}

const EMPTY: Record<string, [string, string]> = {
  needs_you: ["Nothing needs you", "Everything that asks for your reply or attention shows up here."],
  waiting: ["Not waiting on anyone", "Emails you sent that haven't had a reply show up here for 30 days."],
  other: ["No other mail", "Mail from people that needs nothing from you lands here."],
  updates: ["No promos or updates", "Promotions, newsletters and app notifications land here."],
  junk: ["Junk is empty", "Mail your server filed as junk shows here. Real mail found in it also shows in Needs you."],
  later: ["Nothing for later", "Press H on a conversation to bring it back tomorrow."],
  archive: ["Archive is empty", "Press E on a conversation to mark it done."],
  sent: ["Nothing sent yet", "Messages you send appear here."],
};

function EmptyState({ split, searching }: { split: string; searching: boolean }) {
  const [title, detail] = searching
    ? ["No matches", "Search covers the newest cached mail: people, subjects and text."]
    : EMPTY[split] ?? ["No mail here", "Inbox mail that matches this split's senders, keywords or description shows up here."];
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-4 py-12 text-center">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-3 px-5 pt-12">
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{message}</p>
      <Button type="button" size="sm" variant="outline" className="h-8 justify-self-start" onClick={onRetry}>Try again</Button>
    </div>
  );
}

function AddAccountDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: (status: MailStatus) => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add a mailbox</DialogTitle>
          <DialogDescription className="text-xs">It joins your splits and alerts; switch between mailboxes at the top of the sidebar.</DialogDescription>
        </DialogHeader>
        <ConnectForm embedded onConnected={(next) => { toast.success("Mailbox added"); onConnected(next); }} />
      </DialogContent>
    </Dialog>
  );
}
