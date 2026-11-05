import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useBbNavigate, useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { splitQuoted } from "../shared/quotes.js";
import { splitMessage } from "../shared/clean.js";
import { AUTOMATIONS_CHANGED, type AutomationRun, DRAFTS_CHANGED, MAIL_CHANGED, type Insight, type MessageDetail, type Person, type ReplyDraft, type ThreadDetail } from "../shared/types.js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Composer, useAiName, type ComposeDraft } from "./Composer.js";
import { FileGlyph } from "./KnowledgeView.js";
import { SplitIcons } from "./icons.js";
import {
  displayName,
  errorMessage,
  firstName,
  formatAddress,
  formatFullDate,
  formatListDate,
  formatSize,
  laterLabel,
  laterOptions,
  splitLabel,
} from "./lib.js";
import { replyRequestStore, sidebarDataStore } from "./mailStore.js";
import { detailCache } from "./listCache.js";
import { Menu } from "./Menu.js";

/** One conversation: header actions, the messages, and the reply box. */
export function ThreadContent({ threadId, onClosed }: { threadId: string; onClosed: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const sidebar = useSyncExternalStore(sidebarDataStore.subscribe, sidebarDataStore.get);
  // A conversation seen before (or prefetched on hover) shows at once.
  const [thread, setThread] = useState<ThreadDetail | null>(() => detailCache.get(threadId));
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ value: ComposeDraft; key: string } | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const aiName = useAiName(rpc);
  /** A reply the AI drafted ahead for the newest message. */
  const [ahead, setAhead] = useState<ReplyDraft | null>(null);
  const autoOpened = useRef<string | null>(null);
  const navigate = useBbNavigate();
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [automationList, setAutomationList] = useState<{ id: string; name: string }[]>([]);
  const loadRuns = useCallback(() => {
    rpc.call("automationRunsFor", { threadId }).then((result) => setRuns(result.runs), () => undefined);
  }, [rpc, threadId]);
  useEffect(loadRuns, [loadRuns]);
  useRealtime(AUTOMATIONS_CHANGED, loadRuns);
  useEffect(() => {
    rpc.call("automations").then((result) => setAutomationList(result.automations.map((entry) => ({ id: entry.id, name: entry.name }))), () => undefined);
  }, [rpc]);

  async function runAutomation(automationId: string) {
    try {
      const run = await rpc.call("automationRun", { automationId, threadId });
      setRuns((current) => [run, ...current.filter((entry) => entry.id !== run.id)]);
      toast.success(`${run.automationName} started`, { description: "Its summary and reply show up here when the agent is done." });
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not start the automation."));
    }
  }

  async function startDraft(kind: "reply" | "all" | "forward", drafted?: string) {
    if (!latest || !thread) return;
    // Quote the whole message, not the cached preview.
    const message = latest.partial ? await rpc.call("get", { id: latest.id }).catch(() => latest) : latest;
    const others = conversationOthers(thread.messages, thread.me, primaryOf(message, thread.me));
    const value = kind === "forward"
      ? forwardDraft(message)
      : { ...replyDraft(message, thread.me, false), ...(kind === "all" ? { cc: others } : {}), replyAllCc: others };
    setDraft({ value: { ...value, from: thread.accountId, ...(drafted ? { text: drafted, drafted: true } : {}) }, key: `${kind}:${latest.id}` });
    // A draft that opens by itself stays below the message instead of scrolling to it.
    if (!drafted) requestAnimationFrame(() => composerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }
  const markedRead = useRef(false);

  const load = useCallback(() => {
    rpc.call("thread", { id: threadId }).then(
      (result) => {
        detailCache.set(threadId, result);
        setThread(result);
        setError(null);
        const unread = result.messages.some((message) => message.folder === "inbox" && !message.seen);
        if (unread && !markedRead.current) {
          markedRead.current = true;
          void rpc.call("threadAction", { id: threadId, action: "read" }).catch(() => undefined);
        }
      },
      (cause) => setError(errorMessage(cause, "Could not open this conversation.")),
    );
  }, [rpc, threadId]);

  useEffect(load, [load]);
  useRealtime(MAIL_CHANGED, () => { if (thread) load(); });

  // The drafted reply follows the newest message: a new one gets its own.
  const latestId = thread?.messages[thread.messages.length - 1]?.id;
  const loadAhead = useCallback(() => {
    rpc.call("replyDraft", { id: threadId }).then(setAhead, () => setAhead(null));
  }, [rpc, threadId]);
  useEffect(() => { if (latestId) loadAhead(); }, [latestId, loadAhead]);
  useRealtime(DRAFTS_CHANGED, (payload) => {
    if (thread && (payload as { anchor?: string } | null)?.anchor === thread.id) loadAhead();
  });

  // A reply asked for from the list's right-click menu starts once the conversation is here.
  useEffect(() => {
    const wanted = replyRequestStore.get();
    if (!thread || !wanted || wanted.threadId !== threadId) return;
    replyRequestStore.set(null);
    autoOpened.current = ahead?.messageId ?? "manual";
    void startDraft(wanted.kind, wanted.kind === "reply" && ahead?.status === "ready" ? ahead.text : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, threadId]);

  // Open a ready draft in the reply box once; closing it keeps it, discarding drops it.
  useEffect(() => {
    if (!thread || draft || ahead?.status !== "ready" || autoOpened.current === ahead.messageId) return;
    autoOpened.current = ahead.messageId;
    void startDraft("reply", ahead.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, draft, ahead]);

  function discardDraft() {
    if (draft?.value.drafted && ahead?.messageId) {
      void rpc.call("dismissDraft", { messageId: ahead.messageId }).catch(() => undefined);
      setAhead(null);
    }
    setDraft(null);
  }

  async function act(action: "done" | "inbox" | "later" | "unlater" | "unread" | "move", extra: { until?: number; to?: string } = {}) {
    try {
      await rpc.call("threadAction", { id: threadId, action, ...extra });
      if (action === "done") {
        toast.success("Done");
        onClosed();
      } else if (action === "later" && extra.until) {
        toast.success(`Back ${laterLabel(extra.until)}`);
        onClosed();
      } else if (action === "inbox") toast.success("Moved to Inbox");
      else if (action === "unread") {
        // Leave it: an open conversation counts as read again the next time it shows.
        toast.success("Marked unread");
        onClosed();
      }
      else if (action === "unlater") toast.success("Back in your inbox");
      else if (action === "move" && extra.to) toast.success(`Moved to ${splitLabel(extra.to, sidebar.splits)}`);
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not update the conversation."));
    }
  }

  const close = (
    <button
      type="button"
      onClick={onClosed}
      aria-label="Close conversation"
      title="Close (Esc)"
      className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="size-4" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  );

  if (error) {
    return <div className="relative p-5 pr-12">{close}<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p></div>;
  }
  if (!thread) return <div className="relative h-full">{close}<DetailLoading /></div>;

  const latest = thread.messages[thread.messages.length - 1];
  const moveTargets = ["needs_you", "other", "updates", ...sidebar.splits.map((split) => `c:${split.id}`)].filter((split) => split !== thread.split);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background text-foreground">
      {close}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto grid w-full min-w-0 max-w-3xl grid-cols-[minmax(0,1fr)] gap-4 px-3 py-4 sm:px-6 sm:py-5">
          <header className="grid gap-2">
            <h1 className="pr-8 text-lg font-semibold leading-7 [overflow-wrap:anywhere]">{thread.subject}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{thread.messages.length} {thread.messages.length === 1 ? "message" : "messages"}</span>
              {thread.split ? <><span aria-hidden="true">·</span><span>{splitLabel(thread.split, sidebar.splits)}</span></> : null}
              {thread.laterUntil ? <><span aria-hidden="true">·</span><span>Back {laterLabel(thread.laterUntil)}</span></> : null}
              {thread.reason ? <><span aria-hidden="true">·</span><span className="italic">{thread.reason}</span></> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-1">
              {thread.inInbox ? (
                <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => void act("done")}>
                  <SplitIcons.check className="size-3.5" />
                  Done
                </Button>
              ) : thread.split === "archive" ? (
                <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => void act("inbox")}>
                  <SplitIcons.inbox className="size-3.5" />
                  Move to Inbox
                </Button>
              ) : null}
              {thread.laterUntil ? (
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={() => void act("unlater")}>Back to inbox now</Button>
              ) : null}
              <Menu
                label="Later"
                align="start"
                items={laterOptions().map((option) => ({ label: option.label, hint: laterLabel(option.until), onSelect: () => void act("later", { until: option.until }) }))}
                trigger={({ toggle }) => (
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={toggle}>
                    <SplitIcons.clock className="size-3.5" />
                    Later
                  </Button>
                )}
              />
              {thread.inInbox ? (
                <Menu
                  label="Move to"
                  align="start"
                  items={moveTargets.map((split) => ({ label: splitLabel(split, sidebar.splits), onSelect: () => void act("move", { to: split }) }))}
                  trigger={({ toggle }) => (
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={toggle}>Move to…</Button>
                  )}
                />
              ) : null}
              {thread.inInbox ? (
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-muted-foreground" onClick={() => void act("unread")}>Mark unread</Button>
              ) : null}
              {automationList.length ? (
                <Menu
                  label="Run automation"
                  items={automationList.map((automation) => ({ label: automation.name, onSelect: () => void runAutomation(automation.id) }))}
                  trigger={({ toggle }) => (
                    <Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground" onClick={toggle}>
                      <SplitIcons.bolt className="size-3.5" />
                      Automate
                    </Button>
                  )}
                />
              ) : null}
            </div>
          </header>

          <Conversation messages={thread.messages} me={thread.me} />

          {runs.map((run) => (
            <div key={run.id} className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3">
              <SplitIcons.bolt className={cn("mt-0.5 size-4 shrink-0", run.status === "running" ? "animate-pulse text-muted-foreground" : "text-foreground")} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">
                  {run.automationName}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {run.status === "running" ? "the agent is checking…" : run.status === "done" ? (run.sent ? "done, reply sent" : "done") : run.status === "needs_you" ? "needs you" : "failed"}
                  </span>
                </p>
                {run.summary ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{run.summary}</p> : null}
              </div>
              {run.threadId ? (
                <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => navigate.toThread(run.threadId!)}>Open agent</Button>
              ) : null}
            </div>
          ))}

          {latest && draft ? (
            <div ref={composerRef} className="overflow-visible rounded-lg border border-border/70 bg-background shadow-sm">
              <Composer
                key={draft.key}
                draft={draft.value}
                draftKey={draft.key}
                variant="inline"
                autoFocus={!draft.value.drafted}
                onSent={() => setDraft(null)}
                onClose={() => setDraft(null)}
                onDiscard={discardDraft}
              />
            </div>
          ) : latest ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startDraft("reply", ahead?.status === "ready" ? ahead.text : undefined)}
                className="flex h-11 min-w-48 flex-1 items-center gap-3 rounded-lg border border-border/70 px-4 text-left text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-state-hover hover:text-foreground"
              >
                {ahead?.status === "drafting" ? (
                  <>
                    <SplitIcons.sparkle className="size-3.5 shrink-0 animate-pulse" />
                    {aiName} is drafting a reply…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
                    Reply to {isMine(latest, thread.me) ? "this conversation" : firstName(latest.from)}…
                  </>
                )}
              </button>
              <div className="flex gap-2">
                {conversationOthers(thread.messages, thread.me, primaryOf(latest, thread.me)) ? (
                  <Button type="button" size="sm" variant="outline" className="h-11 px-3.5 text-[13px] font-normal text-foreground/80" onClick={() => void startDraft("all")}>Reply all</Button>
                ) : null}
                <Button type="button" size="sm" variant="outline" className="h-11 px-3.5 text-[13px] font-normal text-foreground/80" onClick={() => void startDraft("forward")}>Forward</Button>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}

// ---- the conversation -------------------------------------------------------

function isMine(message: MessageDetail, me: string) {
  return message.from.address.toLowerCase() === me.toLowerCase();
}

function Conversation({ messages, me }: { messages: MessageDetail[]; me: string }) {
  // Open the newest message and anything unread; fold the rest to one line each.
  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    messages.forEach((message, index) => {
      if (index === messages.length - 1 || (message.folder === "inbox" && !message.seen)) open.add(message.id);
    });
    return open;
  }, [messages]);
  const [open, setOpen] = useState(initiallyOpen);
  const [showAll, setShowAll] = useState(false);

  // With many folded messages in a row, show the first one and a count.
  const hiddenRun = useMemo(() => {
    if (showAll) return new Set<string>();
    const hidden = new Set<string>();
    let run: string[] = [];
    const flush = () => {
      if (run.length > 3) run.slice(1).forEach((id) => hidden.add(id));
      run = [];
    };
    for (const message of messages) {
      if (open.has(message.id)) flush();
      else run.push(message.id);
    }
    flush();
    return hidden;
  }, [messages, open, showAll]);

  const toggle = (id: string) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      {messages.map((message, index) => {
        if (hiddenRun.has(message.id)) {
          const firstHidden = index > 0 && !hiddenRun.has(messages[index - 1]!.id);
          if (!firstHidden) return null;
          let count = 0;
          for (let cursor = index; cursor < messages.length && hiddenRun.has(messages[cursor]!.id); cursor += 1) count += 1;
          return (
            <button
              key={`more-${message.id}`}
              type="button"
              onClick={() => setShowAll(true)}
              className="flex w-full items-center gap-3 border-t border-border/60 px-4 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-state-hover"
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-border/70 text-[10px] tabular-nums">{count}</span>
              {count} earlier messages
            </button>
          );
        }
        return (
          <Fragment key={message.id}>
            {open.has(message.id)
              ? <MessageBlock message={message} me={me} first={index === 0} onCollapse={messages.length > 1 ? () => toggle(message.id) : undefined} />
              : <MessageRow message={message} me={me} first={index === 0} onExpand={() => toggle(message.id)} />}
          </Fragment>
        );
      })}
    </div>
  );
}

function Avatar({ message, me, small = false }: { message: MessageDetail; me: string; small?: boolean }) {
  const mine = isMine(message, me);
  const label = mine ? "Me" : displayName(message.from);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium uppercase",
        small ? "size-6 text-[10px]" : "size-8 text-xs",
        mine ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
      aria-hidden="true"
    >
      {label.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 1) || "?"}
    </span>
  );
}

function senderLabel(message: MessageDetail, me: string) {
  return isMine(message, me) ? "Me" : displayName(message.from);
}

function MessageRow({ message, me, first, onExpand }: { message: MessageDetail; me: string; first: boolean; onExpand: () => void }) {
  const preview = splitQuoted(message.text).body.replace(/\s+/g, " ").slice(0, 160);
  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left text-xs transition-colors hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        !first && "border-t border-border/60",
      )}
    >
      <Avatar message={message} me={me} small />
      <span className={cn("truncate", message.folder === "inbox" && !message.seen ? "font-semibold" : "font-medium text-foreground/85")}>{senderLabel(message, me)}</span>
      <span className="truncate text-muted-foreground">{preview || "(no text)"}</span>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatListDate(message.date)}</span>
    </button>
  );
}

function MessageBlock({ message: preview, me, first, onCollapse }: { message: MessageDetail; me: string; first: boolean; onCollapse?: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  // Older mail is cached as a preview; the full message loads the first time it is expanded.
  const [full, setFull] = useState<MessageDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (!preview.partial) return;
    let cancelled = false;
    rpc.call("get", { id: preview.id }).then(
      (result) => { if (!cancelled) setFull(result); },
      () => { if (!cancelled) setLoadFailed(true); },
    );
    return () => { cancelled = true; };
  }, [rpc, preview.id, preview.partial]);
  const message = full ?? preview;
  const loading = preview.partial && !full && !loadFailed;
  // What they wrote; signature, legal footer and quoted history fold behind •••.
  const parts = useMemo(() => {
    const split = splitMessage(message.text);
    return { body: split.body, quoted: split.folded };
  }, [message.text]);
  const conversational = splitQuoted(message.text).quoted.length > 0 || message.references.length > 0;
  const [showQuoted, setShowQuoted] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const html = message.html && (!conversational || showOriginal || !parts.body) ? message.html : null;
  const recipients = [...message.to, ...message.cc].map((address) => (address.address.toLowerCase() === me.toLowerCase() ? "me" : displayName(address).split(/[\s,]/)[0]));

  return (
    <section className={cn("min-w-0 px-3 py-4 sm:px-4", !first && "border-t border-border/60")} aria-label={`Message from ${senderLabel(message, me)}`}>
      <header
        className={cn("flex items-start gap-3", onCollapse && "cursor-pointer")}
        onClick={onCollapse}
        title={onCollapse ? "Collapse" : undefined}
      >
        <Avatar message={message} me={me} />
        <div className="min-w-0 flex-1 text-xs leading-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="min-w-0 truncate">
              {isMine(message, me) ? (
                <span className="text-[13px] font-semibold text-foreground">{senderLabel(message, me)}</span>
              ) : (
                <PersonCard address={message.from.address} name={senderLabel(message, me)} />
              )}
              {!isMine(message, me) && message.from.name ? <span className="text-muted-foreground"> {message.from.address}</span> : null}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground" title={formatFullDate(message.date)}>{formatListDate(message.date)}</span>
          </div>
          <p className="truncate text-muted-foreground" title={[...message.to, ...message.cc].map(formatAddress).join(", ")}>
            to {recipients.join(", ") || "—"}
          </p>
        </div>
      </header>

      <div className="mt-3 min-w-0 sm:pl-11">
        {loading ? (
          <div className="grid gap-2" role="status" aria-label="Loading the full message">
            <TextBody text={parts.body || message.snippet} muted />
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden="true" />
              Loading the full message…
            </span>
          </div>
        ) : html ? <HtmlBody html={withImages(html, message)} /> : <TextBody text={parts.body || "(no text)"} />}

        {!loading && !html && parts.quoted ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowQuoted((value) => !value)}
              aria-expanded={showQuoted}
              aria-label={showQuoted ? "Hide quoted text" : "Show quoted text"}
              className="rounded bg-muted/60 px-1.5 text-xs leading-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              •••
            </button>
            {showQuoted ? (
              <div className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
                <TextBody text={parts.quoted} muted />
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading ? <ImageAttachments message={message} inHtml={Boolean(html)} /> : null}
        {message.attachments.some((attachment) => !isImage(attachment)) ? <Attachments message={message} /> : null}

        {message.html && conversational && parts.body ? (
          <button type="button" onClick={() => setShowOriginal((value) => !value)} className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {showOriginal ? "Show clean view" : "View original"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

// ---- text rendering ---------------------------------------------------------

const LINK = /(\S+?)<(https?:\/\/[^>\s]+)>|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

function linkify(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(line.slice(last, index));
    const [whole, label, labelUrl, url, email] = match;
    const href = labelUrl ?? url ?? (email ? `mailto:${email}` : whole);
    const text = label ?? url ?? email ?? whole;
    nodes.push(
      <a key={index} href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-2 hover:underline [overflow-wrap:anywhere]">
        {text.length > 60 && !label ? `${text.slice(0, 57)}…` : text}
      </a>,
    );
    last = index + whole.length;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

/** Outlook's "<tel:…>"/"<mailto:…>" link copies and "[cid:…]" image placeholders are noise. */
function tidy(text: string): string {
  return text
    .replace(/<(?:tel|mailto|sip):[^>\s]+>/gi, "")
    .replace(/\[cid:[^\]]+\]/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function TextBody({ text, muted = false }: { text: string; muted?: boolean }) {
  const paragraphs = tidy(text).split(/\n{2,}/);
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 text-[13.5px] leading-6 [overflow-wrap:anywhere]", muted ? "text-muted-foreground" : "text-foreground")}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          {paragraph.split("\n").map((line, lineIndex, lines) => (
            <Fragment key={lineIndex}>
              {linkify(line.replace(/^>\s?/, ""))}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

/**
 * Untrusted email HTML in a sandbox: no scripts, no forms, links open in a
 * new tab. Same-origin is allowed only so the frame can size to its content;
 * without allow-scripts the email cannot run code either way.
 */
function HtmlBody({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: http: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:"><base target="_blank"><style>html,body{margin:0;padding:0;background:#fff;color:#111;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere}body{padding:16px}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;
    const measure = () => {
      const body = frame.contentDocument?.documentElement;
      if (body) setHeight(Math.max(80, body.scrollHeight));
    };
    const onLoad = () => {
      measure();
      const root = frame.contentDocument?.documentElement;
      if (root) {
        observer = new ResizeObserver(measure);
        observer.observe(root);
      }
    };
    frame.addEventListener("load", onLoad);
    return () => {
      frame.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      title="Message body"
      srcDoc={doc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="block w-full rounded-md border border-border/60 bg-white"
      style={{ height }}
    />
  );
}

// ---- reply drafts -------------------------------------------------------------

function quote(message: MessageDetail): string {
  const body = message.text.trimEnd().split("\n").map((line) => `> ${line}`).join("\n");
  return `On ${formatFullDate(message.date)}, ${formatAddress(message.from)} wrote:\n${body}`;
}

/** A recipient string that survives commas in display names. */
function recipient(address: { name: string; address: string }): string {
  return address.name ? `"${address.name.replace(/"/g, "")}" <${address.address}>` : address.address;
}

function prefixed(prefix: string, subject: string): string {
  return new RegExp(`^${prefix}:`, "i").test(subject.trim()) ? subject : `${prefix}: ${subject}`;
}

/** Everyone on the conversation except me and the reply's main recipients: Reply all's Cc. */
function conversationOthers(messages: MessageDetail[], me: string, primary: string[]): string {
  const skip = new Set([me.toLowerCase(), ...primary.map((address) => address.toLowerCase())]);
  const seen = new Map<string, { name: string; address: string }>();
  for (const message of messages) {
    for (const address of [message.from, ...message.to, ...message.cc]) {
      const key = address.address.toLowerCase();
      if (!key.includes("@") || skip.has(key) || seen.has(key)) continue;
      seen.set(key, address);
    }
  }
  return [...seen.values()].map(recipient).join(", ");
}

function primaryOf(message: MessageDetail, me: string): string[] {
  const mine = isMine(message, me);
  return (mine ? message.to : message.replyTo.length ? message.replyTo : [message.from]).map((address) => address.address);
}

function replyDraft(message: MessageDetail, me: string, all: boolean): ComposeDraft {
  const mine = isMine(message, me);
  const primary = mine ? message.to : message.replyTo.length ? message.replyTo : [message.from];
  const to = primary.map(recipient).join(", ");
  const cc = all
    ? [...(mine ? [] : message.to), ...message.cc]
        .filter((address) => address.address.toLowerCase() !== me.toLowerCase() && !primary.some((entry) => entry.address === address.address))
        .map(recipient)
        .join(", ")
    : "";
  return { to, cc, subject: prefixed("Re", message.subject), text: "", quoted: quote(message), quotedLabel: "Show quoted text", replyToId: message.id };
}

function forwardDraft(message: MessageDetail): ComposeDraft {
  const header = [
    "---------- Forwarded message ----------",
    `From: ${formatAddress(message.from)}`,
    `Date: ${formatFullDate(message.date)}`,
    `Subject: ${message.subject}`,
    `To: ${message.to.map(formatAddress).join(", ")}`,
  ].join("\n");
  return { to: "", subject: prefixed("Fwd", message.subject), text: "", quoted: `${header}\n\n${message.text}`, quotedLabel: "Forwarded message" };
}

function DetailLoading() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-3 p-6" role="status" aria-label="Loading conversation">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-40" />
      <div className="mt-2 grid gap-3 rounded-lg border border-border/60 p-4">
        <div className="flex gap-3"><Skeleton className="size-8 rounded-full" /><div className="grid flex-1 gap-1.5"><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-24" /></div></div>
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

// ---- attachments and people ---------------------------------------------------------

const ATTACHMENT_URL = "/api/v1/plugins/mail/http/attachment";

/** Attachments with Open and Read; what the AI read appears under each file. */
function isImage(attachment: MessageDetail["attachments"][number]): boolean {
  return /^image\/(png|jpe?g|gif|webp)$/i.test(attachment.contentType);
}

/** Point the HTML body's cid: images at Mail's attachment route, so pictures placed in the email show. */
function withImages(html: string, message: MessageDetail): string {
  let out = html;
  message.attachments.forEach((attachment, index) => {
    if (!attachment.cid) return;
    const url = `${ATTACHMENT_URL}?id=${encodeURIComponent(message.id)}&index=${index}&inline=1`;
    out = out.split(`cid:${attachment.cid}`).join(url);
  });
  return out;
}

/**
 * Pictures the sender attached or placed in the email, as previews under the
 * text. Tiny images (signature logos, tracking pixels) are left out; in the
 * original view, images already inside the HTML aren't repeated.
 */
function ImageAttachments({ message, inHtml }: { message: MessageDetail; inHtml: boolean }) {
  const images = message.attachments
    .map((attachment, index) => ({ attachment, index }))
    .filter(({ attachment }) => isImage(attachment) && (!attachment.cid || attachment.size >= 12_000) && !(inHtml && attachment.embedded));
  if (!images.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Images">
      {images.map(({ attachment, index }) => {
        const url = `${ATTACHMENT_URL}?id=${encodeURIComponent(message.id)}&index=${index}&inline=1`;
        return (
          <a
            key={`${attachment.filename}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            title={`${attachment.filename} · ${formatSize(attachment.size)}`}
            className="block overflow-hidden rounded-lg border border-border/60 bg-muted/30 transition-opacity hover:opacity-90"
            style={{ width: images.length === 1 ? 320 : 160, maxWidth: "100%" }}
          >
            <img src={url} alt={attachment.filename} loading="lazy" style={{ display: "block", width: "100%", height: images.length === 1 ? "auto" : 120, maxHeight: 420, maxWidth: "none", objectFit: "cover" }} />
          </a>
        );
      })}
    </div>
  );
}

function Attachments({ message }: { message: MessageDetail }) {
  const rpc = useRpc<typeof rpcContract>();
  const [insights, setInsights] = useState<Map<number, Insight>>(new Map());
  const [reading, setReading] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    rpc.call("attachmentInsights", { messageIds: [message.id] }).then(
      (result) => { if (!cancelled) setInsights(new Map(result.insights.map((insight) => [insight.index, insight]))); },
      () => undefined,
    );
    return () => { cancelled = true; };
  }, [rpc, message.id]);

  async function read(index: number, force = false) {
    setReading((current) => new Set(current).add(index));
    try {
      const insight = await rpc.call("attachmentRead", { messageId: message.id, index, force });
      setInsights((current) => new Map(current).set(index, insight));
      if (insight.status === "failed") toast.error(insight.error ?? "Could not read this file.");
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not read this file."));
    } finally {
      setReading((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
    }
  }

  return (
    <div className="mt-3 grid gap-2" aria-label="Attachments">
      {message.attachments.map((attachment, index) => {
        if (isImage(attachment)) return null;
        const insight = insights.get(index);
        const busy = reading.has(index);
        const href = `${ATTACHMENT_URL}?id=${encodeURIComponent(message.id)}&index=${index}`;
        return (
          <div key={`${attachment.filename}-${index}`} className="grid gap-2 rounded-lg border border-border/60 px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <FileGlyph kind={insight?.kind ?? attachment.contentType} filename={attachment.filename} />
              <a href={`${href}&inline=1`} target="_blank" rel="noreferrer" className="min-w-0 truncate font-medium hover:underline" title={`Open ${attachment.filename}`}>{attachment.filename}</a>
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(attachment.size)}</span>
              <span className="ml-auto flex shrink-0 items-center gap-0.5">
                <a href={href} className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-state-hover hover:text-foreground" title="Download">Download</a>
                {insight?.status === "done" ? null : (
                  <button type="button" onClick={() => void read(index, Boolean(insight))} disabled={busy} className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-state-hover hover:text-foreground disabled:opacity-60">
                    {busy ? "Reading…" : "✨ Read"}
                  </button>
                )}
              </span>
            </div>
            {busy ? (
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden="true" />
                Reading {attachment.filename}…
              </p>
            ) : insight?.status === "done" ? (
              <div className="grid gap-1 border-t border-border/50 pt-2 text-xs leading-5">
                <p>{insight.summary}</p>
                {insight.facts.length ? (
                  <ul className="grid gap-0.5 text-muted-foreground">
                    {insight.facts.map((fact, factIndex) => <li key={factIndex} className="flex gap-1.5"><span aria-hidden="true">·</span>{fact}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : insight ? (
              <p className="text-[11px] text-muted-foreground">{insight.error ?? insight.summary}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** A sender's name that opens what Mail knows about them. */
function PersonCard({ address, name }: { address: string; name: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState<Person | null | undefined>(undefined);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || person !== undefined) return;
    rpc.call("knowledgePerson", { address }).then((result) => setPerson(result.person), () => setPerson(null));
  }, [rpc, open, person, address]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [open]);

  return (
    <span ref={root} className="relative" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="text-[13px] font-semibold text-foreground underline-offset-2 hover:underline" aria-expanded={open}>
        {name}
      </button>
      {open ? (
        <span className="absolute left-0 top-full z-40 mt-1.5 grid w-80 gap-2 rounded-xl border border-border/70 bg-popover p-3.5 text-left text-xs font-normal leading-5 text-popover-foreground shadow-lg">
          {person === undefined ? <span className="text-muted-foreground">Loading…</span> : null}
          {person === null ? <span className="text-muted-foreground">Mail hasn't learned about {name} yet. Learn from your email on the Knowledge page.</span> : null}
          {person ? (
            <>
              <span className="grid">
                <span className="text-[13px] font-semibold">{person.name || address}</span>
                <span className="text-muted-foreground">{[person.role, person.org].filter(Boolean).join(" · ") || address}</span>
              </span>
              {person.relationship ? <span>{person.relationship}</span> : null}
              {person.summary ? <span className="text-muted-foreground">Lately: {person.summary}</span> : null}
              <span className="grid gap-0.5 text-muted-foreground">
                {person.register ? <span>You write: {person.register}{person.greeting ? ` · “${person.greeting}”` : ""}{person.signoff ? ` … “${person.signoff}”` : ""}</span> : null}
                {person.projects.length ? <span>Projects: {person.projects.join(", ")}</span> : null}
                {person.ccWith.length ? <span>Usually with: {person.ccWith.slice(0, 3).map((entry) => entry.name || entry.address).join(", ")}</span> : null}
                <span className="tabular-nums">You wrote {person.sent} · they wrote {person.received}</span>
              </span>
              {person.notes ? <span className="rounded-md bg-muted/50 px-2 py-1">{person.notes}</span> : null}
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
