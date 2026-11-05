import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { defined, errorMessage } from "./lib.js";

type Counts = { conversations: number; emails: number; unread: number };
type Scope = { split?: string; account?: string; olderThanDays?: number };
type BulkAction = "read" | "done";

const AGES = [
  { days: 7, label: "1 week" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 365, label: "1 year" },
];

/**
 * One place to get a messy inbox back to a good start: everything read,
 * old mail done, newsletters cleared. Each action shows its count first,
 * asks once, and offers Undo afterwards.
 */
export function CleanupDialog({ open, onClose, account }: { open: boolean; onClose: () => void; account?: string }) {
  const [age, setAge] = useState(30);
  const [revision, setRevision] = useState(0);
  const done = () => setRevision((value) => value + 1);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pb-2 pt-5">
          <DialogTitle className="text-base">Clean up your inbox</DialogTitle>
          <DialogDescription className="text-xs leading-5">
            Start fresh without losing anything. Done mail moves to Archive on your server and can be brought back.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-5 pb-5 pt-3">
          <CleanupCard
            key={`read-${revision}`}
            title="Mark everything as read"
            describe={(counts) => counts.unread ? `${counts.unread.toLocaleString()} unread emails in your Inbox.` : "Nothing unread. 🎉"}
            scope={defined({ account })}
            actions={[{ action: "read", label: (counts) => `Mark ${counts.unread.toLocaleString()} as read`, enabled: (counts) => counts.unread > 0 }]}
            onDone={done}
          />
          <CleanupCard
            key={`old-${age}-${revision}`}
            title="Mark older mail as done"
            describe={(counts) => counts.conversations
              ? `${counts.conversations.toLocaleString()} conversations (${counts.emails.toLocaleString()} emails) with nothing new for ${AGES.find((entry) => entry.days === age)?.label ?? `${age} days`}.`
              : "No conversations that old in your Inbox."}
            scope={defined({ account, olderThanDays: age })}
            extra={(
              <div className="flex rounded-md bg-muted/60 p-0.5" role="radiogroup" aria-label="Older than">
                {AGES.map((entry) => (
                  <button
                    key={entry.days}
                    type="button"
                    role="radio"
                    aria-checked={age === entry.days}
                    onClick={() => setAge(entry.days)}
                    className={cn(
                      "h-6 flex-1 rounded px-2 text-xs transition-colors",
                      age === entry.days ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
            actions={[{ action: "done", label: (counts) => `Mark ${counts.conversations.toLocaleString()} done`, enabled: (counts) => counts.conversations > 0 }]}
            onDone={done}
          />
          <CleanupCard
            key={`updates-${revision}`}
            title="Clear out Promos & updates"
            describe={(counts) => counts.conversations
              ? `${counts.conversations.toLocaleString()} promotions, newsletters and notifications · ${counts.unread.toLocaleString()} unread.`
              : "Promos & updates is empty."}
            scope={defined({ account, split: "updates" })}
            actions={[
              { action: "read", label: () => "Mark read", enabled: (counts) => counts.unread > 0, quiet: true },
              { action: "done", label: (counts) => `Mark ${counts.conversations.toLocaleString()} done`, enabled: (counts) => counts.conversations > 0 },
            ]}
            onDone={done}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CardAction {
  action: BulkAction;
  label: (counts: Counts) => string;
  enabled: (counts: Counts) => boolean;
  quiet?: boolean;
}

function CleanupCard({ title, describe, scope, actions, extra, onDone }: {
  title: string;
  describe: (counts: Counts) => string;
  scope: Scope;
  actions: CardAction[];
  extra?: ReactNode;
  onDone: () => void;
}) {
  const rpc = useRpc<typeof rpcContract>();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirming, setConfirming] = useState<CardAction | null>(null);
  const [running, setRunning] = useState(false);
  const scopeKey = JSON.stringify(scope);

  const load = useCallback(() => {
    rpc.call("bulkPreview", JSON.parse(scopeKey) as Scope).then(setCounts, () => setCounts(null));
  }, [rpc, scopeKey]);

  useEffect(load, [load]);

  async function run(entry: CardAction) {
    setRunning(true);
    try {
      const result = await rpc.call("bulk", { ...(JSON.parse(scopeKey) as Scope), action: entry.action });
      const undo = entry.action === "read"
        ? () => void rpc.call("bulk", { messageIds: result.messageIds, action: "unread" }).then(() => toast.success("Restored as unread"))
        : () => void rpc.call("bulk", { threadIds: result.threadIds, action: "inbox" }).then(() => toast.success("Moved back to the Inbox"));
      toast.success(
        entry.action === "read" ? `${result.messageIds.length.toLocaleString()} emails marked as read` : `${result.threadIds.length.toLocaleString()} conversations done`,
        { duration: 10_000, action: { label: "Undo", onClick: undo } },
      );
      setConfirming(null);
      onDone();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not clean up."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="grid gap-2.5 rounded-lg border border-border/70 p-3.5">
      <div>
        <h3 className="text-[13px] font-medium">{title}</h3>
        <p className="mt-0.5 min-h-4 text-xs leading-4 text-muted-foreground">{counts ? describe(counts) : "Counting…"}</p>
      </div>
      {extra}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2">
          <span className="min-w-0 flex-1 text-xs">{running ? "Working… large mailboxes take a few seconds." : `${confirming.label(counts!)}? You can undo right after.`}</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirming(null)} disabled={running}>Cancel</Button>
          <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void run(confirming)} disabled={running}>{running ? "Working…" : "Confirm"}</Button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-1.5">
          {actions.map((entry) => (
            <Button
              key={entry.action}
              type="button"
              size="sm"
              variant={entry.quiet ? "ghost" : "outline"}
              className="h-7 px-2.5 text-xs"
              disabled={!counts || !entry.enabled(counts)}
              onClick={() => setConfirming(entry)}
            >
              {counts ? entry.label(counts) : "…"}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
