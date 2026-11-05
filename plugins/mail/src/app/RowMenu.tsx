import type { ReactNode } from "react";
import * as Menu from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import { usePortalScopeProps } from "@/lib/portal-scope";
import type { CustomSplit, ThreadSummary } from "../shared/types.js";
import { SplitGlyph, SplitIcons, splitIcon } from "./icons.js";
import { laterLabel, laterOptions, SPLIT_LABELS } from "./lib.js";

export type ReplyKind = "reply" | "all" | "forward";

export interface RowMenuActions {
  open: () => void;
  reply: (kind: ReplyKind) => void;
  done: () => void;
  later: (until: number) => void;
  unlater: () => void;
  move: (to: string) => void;
  read: (read: boolean) => void;
  select: () => void;
}

const ITEM = "flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-state-hover";
const CONTENT = "z-50 min-w-52 rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-lg outline-none";

function Item({ icon, label, hint, onSelect, disabled }: { icon?: ReactNode; label: string; hint?: string; onSelect: () => void; disabled?: boolean }) {
  return (
    <Menu.Item className={ITEM} onSelect={onSelect} disabled={disabled}>
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint ? <span className="pl-4 text-[11px] text-muted-foreground">{hint}</span> : null}
    </Menu.Item>
  );
}

function Separator() {
  return <Menu.Separator className="my-1 h-px bg-border/60" />;
}

function ReplyIcon({ all = false }: { all?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      {all ? <path d="M7 14 2 9l5-5" /> : null}
      <path d={all ? "M12 14 7 9l5-5" : "M9 14 4 9l5-5"} />
      <path d={all ? "M7 9h8.5a5.5 5.5 0 0 1 0 11H13" : "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"} />
    </svg>
  );
}

/** Right-click on a conversation: reply, file it, snooze it, mark it. */
export function RowMenu({ thread, split, splits, children, actions }: {
  thread: ThreadSummary;
  /** The list it's shown in. */
  split: string;
  splits: CustomSplit[];
  children: ReactNode;
  actions: RowMenuActions;
}) {
  const scope = usePortalScopeProps();
  const archived = split === "archive" || split === "junk";
  const targets = ["needs_you", "other", "updates", ...splits.map((entry) => `c:${entry.id}`)].filter((entry) => entry !== split && entry !== thread.split);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>{children}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content {...scope} className={CONTENT} collisionPadding={8}>
          <Item icon={<SplitIcons.inbox className="size-4" />} label="Open" hint="↵" onSelect={actions.open} />
          <Separator />
          <Item icon={<ReplyIcon />} label="Reply" onSelect={() => actions.reply("reply")} />
          <Item icon={<ReplyIcon all />} label="Reply all" onSelect={() => actions.reply("all")} />
          <Item icon={<SplitIcons.sent className="size-4" />} label="Forward" onSelect={() => actions.reply("forward")} />
          <Separator />
          <Item
            icon={archived ? <SplitIcons.inbox className="size-4" /> : <SplitIcons.archive className="size-4" />}
            label={archived ? (split === "junk" ? "Not junk · Move to Inbox" : "Move to Inbox") : "Done · Archive"}
            hint="E"
            onSelect={actions.done}
          />
          {split === "later" ? (
            <Item icon={<SplitIcons.inbox className="size-4" />} label="Back to Inbox now" onSelect={actions.unlater} />
          ) : (
            <Menu.Sub>
              <Menu.SubTrigger className={cn(ITEM, "data-[state=open]:bg-state-hover")}>
                <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true"><SplitIcons.clock className="size-4" /></span>
                <span className="flex-1">Later</span>
                <SplitIcons.chevron className="size-3.5 -rotate-90 text-muted-foreground" />
              </Menu.SubTrigger>
              <Menu.Portal>
                <Menu.SubContent {...scope} className={CONTENT} sideOffset={4} collisionPadding={8}>
                  {laterOptions().map((option) => (
                    <Item key={option.label} label={option.label} hint={laterLabel(option.until)} onSelect={() => actions.later(option.until)} />
                  ))}
                </Menu.SubContent>
              </Menu.Portal>
            </Menu.Sub>
          )}
          <Menu.Sub>
            <Menu.SubTrigger className={cn(ITEM, "data-[state=open]:bg-state-hover")}>
              <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true"><SplitIcons.folder className="size-4" /></span>
              <span className="flex-1">Move to</span>
              <SplitIcons.chevron className="size-3.5 -rotate-90 text-muted-foreground" />
            </Menu.SubTrigger>
            <Menu.Portal>
              <Menu.SubContent {...scope} className={CONTENT} sideOffset={4} collisionPadding={8}>
                {targets.map((target) => {
                  const custom = target.startsWith("c:") ? splits.find((entry) => `c:${entry.id}` === target) : undefined;
                  const Glyph = splitIcon(target);
                  return (
                    <Item
                      key={target}
                      icon={custom ? <SplitGlyph icon={custom.icon} className="size-4" /> : <Glyph className="size-4" />}
                      label={custom?.name ?? SPLIT_LABELS[target] ?? target}
                      onSelect={() => actions.move(target)}
                    />
                  );
                })}
              </Menu.SubContent>
            </Menu.Portal>
          </Menu.Sub>
          <Separator />
          <Item
            icon={<span className={cn("size-2 rounded-full", thread.unread ? "border border-muted-foreground" : "bg-primary")} />}
            label={thread.unread ? "Mark as read" : "Mark as unread"}
            onSelect={() => actions.read(thread.unread)}
          />
          <Item icon={<SplitIcons.checkbox className="size-4" />} label="Select" hint="X" onSelect={actions.select} />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
