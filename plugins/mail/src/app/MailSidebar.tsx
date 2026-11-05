import { useState, useSyncExternalStore, type DragEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { SplitId } from "../shared/types.js";
import { SplitGlyph, SplitIcons, splitIcon } from "./icons.js";
import { SPLIT_LABELS } from "./lib.js";
import { accountStore, requestPage, selectAccount, selectSplit, sidebarDataStore, splitStore, viewStore } from "./mailStore.js";
import { Menu } from "./Menu.js";

const DEFAULT_ORDER: SplitId[] = ["needs_you", "waiting", "other", "updates", "later", "archive", "junk"];

/** The user's order, with anything missing from it (new splits) added in a sensible place. */
function orderedSplits(order: string[], customs: { id: string }[]): SplitId[] {
  const known = [...DEFAULT_ORDER, ...customs.map((split) => `c:${split.id}` as SplitId), "sent" as SplitId];
  const kept = order.filter((id): id is SplitId => known.includes(id as SplitId));
  if (kept.length === 0) return known;
  for (const id of known) {
    if (kept.includes(id)) continue;
    const sent = kept.indexOf("sent");
    if (id.startsWith("c:") && sent >= 0) kept.splice(sent, 0, id);
    else kept.push(id);
  }
  return kept;
}

function formatCount(count: number | undefined): string {
  if (!count) return "";
  return count >= 1000 ? count.toLocaleString() : String(count);
}

/**
 * The split list. In BB's sidebar it renders inside another plugin's tree, so
 * it uses only module state and carries this plugin's CSS scope itself.
 */
export function MailSidebar({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const split = useSyncExternalStore(splitStore.subscribe, splitStore.get);
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.get);
  // Splits are not highlighted while the Knowledge page is open.
  const active = view !== "mail" ? null : split;
  const data = useSyncExternalStore(sidebarDataStore.subscribe, sidebarDataStore.get);
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.get);
  const current = data.accounts.find((entry) => entry.id === account);
  const accountLabel = current?.email ?? (data.accounts.length > 1 ? "All inboxes" : data.accounts[0]?.email ?? "Mail");

  const splitsInOrder = orderedSplits(data.order, data.splits);
  const [dragging, setDragging] = useState<SplitId | null>(null);
  const [dropAt, setDropAt] = useState<{ id: SplitId; after: boolean } | null>(null);

  function move(id: SplitId, target: SplitId, after: boolean) {
    if (id === target) return;
    const next = splitsInOrder.filter((entry) => entry !== id);
    const index = next.indexOf(target);
    next.splice(after ? index + 1 : index, 0, id);
    requestPage({ kind: "reorder", order: next });
  }

  const dragProps = (split: SplitId) => ({
    draggable: !compact,
    onDragStart: (event: DragEvent) => {
      setDragging(split);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", split);
    },
    onDragOver: (event: DragEvent<HTMLLIElement>) => {
      if (!dragging) return;
      event.preventDefault();
      const box = event.currentTarget.getBoundingClientRect();
      setDropAt({ id: split, after: event.clientY > box.top + box.height / 2 });
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (dragging && dropAt) move(dragging, dropAt.id, dropAt.after);
      setDragging(null);
      setDropAt(null);
    },
    onDragEnd: () => {
      setDragging(null);
      setDropAt(null);
    },
    // Alt+↑ / Alt+↓ move the focused split.
    onKeyDown: (event: KeyboardEvent) => {
      if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      event.preventDefault();
      const index = splitsInOrder.indexOf(split);
      const neighbour = splitsInOrder[index + (event.key === "ArrowUp" ? -1 : 1)];
      if (neighbour) move(split, neighbour, event.key === "ArrowDown");
    },
  });

  const choose = (split: SplitId) => {
    selectSplit(split);
    onNavigate?.();
  };

  const item = (split: SplitId, label: string, emoji = "") => {
    const Glyph = splitIcon(split);
    const selected = active === split;
    const count = data.counts[split];
    return (
      <li
        key={split}
        {...dragProps(split)}
        className={cn("group/item relative", dragging === split && "opacity-40")}
      >
        {dropAt?.id === split && dragging !== split ? (
          <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-foreground/60", dropAt.after ? "-bottom-px" : "-top-px")} />
        ) : null}
        <button
          type="button"
          onClick={() => choose(split)}
          aria-current={selected ? "page" : undefined}
          className={cn(
            "flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            selected ? "bg-state-hover font-medium text-foreground" : "text-foreground/80 hover:bg-state-hover hover:text-foreground",
          )}
        >
          {split.startsWith("c:") ? <SplitGlyph icon={emoji} className="size-4 shrink-0 text-muted-foreground" /> : <Glyph className="size-4 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground group-hover/item:opacity-0">{formatCount(count)}</span> : null}
        </button>
        {split.startsWith("c:") ? (
          <button
            type="button"
            aria-label={`Edit ${label}`}
            onClick={() => requestPage({ kind: "edit-split", id: split.slice(2) })}
            className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:flex group-hover/item:flex"
          >
            <SplitIcons.pencil className="size-3.5" />
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <div data-bb-plugin="mail" className="flex min-h-0 flex-col text-foreground">
      <nav aria-label="Mail splits" className={cn("grid gap-3", compact ? "" : "px-2 py-2")}>
        {!compact ? (
          <div className="grid gap-1.5">
            <Menu
              label="Mailboxes"
              align="start"
              className="flex w-full"
              items={[
                ...(data.accounts.length > 1 ? [{ label: "All inboxes", hint: account ? "" : "✓", onSelect: () => selectAccount("") }] : []),
                ...data.accounts.map((entry) => ({ label: entry.email, hint: entry.id === account || (data.accounts.length === 1) ? "✓" : "", onSelect: () => selectAccount(data.accounts.length > 1 ? entry.id : "") })),
                { label: "Add mailbox…", onSelect: () => requestPage({ kind: "add-account" }) },
              ]}
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground" aria-hidden="true">
                    {accountLabel.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{accountLabel}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
                </button>
              )}
            />
            <button
              type="button"
              onClick={() => requestPage({ kind: "search" })}
              className="flex h-8 items-center gap-2 rounded-md bg-muted/50 px-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="size-4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span className="flex-1">Search</span>
              <kbd className="rounded bg-background/60 px-1.5 text-[11px] font-sans">/</kbd>
            </button>
          </div>
        ) : null}

        <ul className="grid gap-px" aria-label="Splits. Drag to reorder, or Alt+Up and Alt+Down.">
          {splitsInOrder.map((split) => {
            if (!split.startsWith("c:")) return item(split, SPLIT_LABELS[split]!);
            const custom = data.splits.find((entry) => `c:${entry.id}` === split);
            return custom ? item(split, custom.name, custom.icon) : null;
          })}
          <li>
            <button
              type="button"
              onClick={() => requestPage({ kind: "new-split" })}
              className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <SplitIcons.plus className="size-4" />
              New split
            </button>
          </li>
        </ul>

        {!compact && (data.inbox || data.sync) ? <MailboxSummary inbox={data.inbox} sync={data.sync} splits={data.splits} /> : null}

        {!compact ? (
          <button
            type="button"
            onClick={() => { viewStore.set("knowledge"); onNavigate?.(); }}
            aria-current={view === "knowledge" ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              view === "knowledge" ? "bg-state-hover font-medium text-foreground" : "text-foreground/80 hover:bg-state-hover hover:text-foreground",
            )}
          >
            <SplitIcons.brain className="size-4 text-muted-foreground" />
            Knowledge
          </button>
        ) : null}

        {!compact ? (
          <button
            type="button"
            onClick={() => { viewStore.set("automations"); onNavigate?.(); }}
            aria-current={view === "automations" ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              view === "automations" ? "bg-state-hover font-medium text-foreground" : "text-foreground/80 hover:bg-state-hover hover:text-foreground",
            )}
          >
            <SplitIcons.bolt className="size-4 text-muted-foreground" />
            Automations
          </button>
        ) : null}

        {!compact ? (
          <button
            type="button"
            onClick={() => requestPage({ kind: "settings" })}
            className="flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <SplitIcons.settings className="size-4" />
            Settings
          </button>
        ) : null}
      </nav>
    </div>
  );
}

/**
 * What the counts add up to: split numbers are conversations, so the Inbox
 * total is shown both ways, plus progress while older mail downloads.
 */
function MailboxSummary({ inbox, sync, splits }: { inbox: SidebarDataInbox; sync: SidebarDataSync; splits: { id: string; name: string }[] }) {
  const downloading = sync && sync.total > 0 && sync.cached < sync.total;
  return (
    <div className="grid gap-1.5 px-2 text-[11px] leading-4 text-muted-foreground">
      {downloading ? (
        <div className="grid gap-1" role="status">
          <p>Downloading older mail… {sync.cached.toLocaleString()} of {sync.total.toLocaleString()}</p>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/60 transition-[width]" style={{ width: `${Math.round((sync.cached / sync.total) * 100)}%` }} />
          </div>
        </div>
      ) : null}
      {inbox && inbox.unread > 20 ? (
        <button type="button" onClick={() => requestPage({ kind: "cleanup" })} className="justify-self-start rounded text-[11px] font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline">
          Clean up your inbox →
        </button>
      ) : null}
    </div>
  );
}

type SidebarDataInbox = ReturnType<typeof sidebarDataStore.get>["inbox"];
type SidebarDataSync = ReturnType<typeof sidebarDataStore.get>["sync"];

/** The component handed to the sidebar host while the Mail page is open. */
export function MailSidebarTakeover({ onNavigate }: { onNavigate: () => void }) {
  return <MailSidebar onNavigate={onNavigate} />;
}
