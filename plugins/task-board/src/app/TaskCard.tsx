import { memo, useState, type PointerEvent } from "react";
import {
  experimental_ThreadStatusGlyph as ThreadStatusGlyph,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import type { Task } from "../contract.js";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { REPEAT_LABELS, formatAgo, formatWhen, taskLabel } from "./format.js";
import { Chip, ProjectDot, TONES, isWaitingOnUser, toneOf } from "./status.js";
import { ModelLabel } from "./models.js";
import type { CardDisplay } from "./display.js";

/** Linear-style bars: quiet for low, a filled square for urgent. */
export function PriorityGlyph({ priority, className }: { priority: number; className?: string }) {
  if (priority <= 0) return null;
  if (priority === 4) {
    return (
      <span
        role="img"
        aria-label="Urgent"
        className={cn("inline-flex size-3.5 items-center justify-center rounded-[3px] bg-orange-500 text-[10px] font-bold leading-none text-white", className)}
      >
        !
      </span>
    );
  }
  const labels = ["", "Low priority", "Medium priority", "High priority"];
  return (
    <span role="img" aria-label={labels[priority]} className={cn("inline-flex h-3.5 items-end gap-[2px]", className)}>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn("w-[3px] rounded-[1px]", bar <= priority ? "bg-foreground/75" : "bg-foreground/15")}
          style={{ height: `${4 + bar * 3}px` }}
        />
      ))}
    </span>
  );
}

export function triggerLabel(task: Task, tasksById: Map<string, Task>): string | null {
  switch (task.trigger.kind) {
    case "none":
      return null;
    case "at":
      return task.trigger.at === null ? null : formatWhen(task.trigger.at);
    case "thread-free":
      return "Queued on thread";
    case "after-task": {
      const dependency = task.trigger.taskId ? tasksById.get(task.trigger.taskId) : undefined;
      return dependency ? `After ${taskLabel(dependency)}` : "After another task";
    }
  }
}

/** The thread a task runs in, with bb's live status mark. */
export function ThreadLabel({ thread, threadId, worktree }: { thread: PluginSidebarThread | undefined; threadId: string | null; worktree: boolean }) {
  if (threadId === null) {
    return (
      <>
        <Icon name={worktree ? "GitBranch" : "Plus"} fallback="Plus" className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{worktree ? "New worktree" : "New thread"}</span>
      </>
    );
  }
  const live = thread && (thread.indicator !== "none" || thread.isArchived);
  return (
    <>
      {live ? (
        <span className="inline-flex size-3 shrink-0 items-center justify-center">
          <ThreadStatusGlyph indicator={thread.indicator} archived={thread.isArchived} size="compact" />
        </span>
      ) : (
        <Icon name="MessageSquare" fallback="Link" className="size-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{thread?.displayTitle ?? "Thread"}</span>
    </>
  );
}

type SubAgentState = "working" | "waiting" | "failed" | "done";

function subAgentState(thread: PluginSidebarThread): SubAgentState {
  if (isWaitingOnUser(thread)) return "waiting";
  if (thread.status === "error") return "failed";
  if (thread.status === "idle") return "done";
  return "working";
}

const SUB_AGENT_LABEL: Record<SubAgentState, { text: string; className: string }> = {
  working: { text: "Working", className: "text-sky-600 dark:text-sky-400" },
  waiting: { text: "Waiting", className: "text-orange-600 dark:text-orange-400" },
  failed: { text: "Failed", className: "text-red-600 dark:text-red-400" },
  done: { text: "Done", className: "text-muted-foreground" },
};

const SUB_AGENT_DOT: Record<SubAgentState, string> = {
  working: "bg-sky-500 animate-pulse",
  waiting: "bg-orange-500",
  failed: "bg-red-500",
  done: "bg-emerald-500/60",
};

function SubAgentRow({ thread, state, onOpenThread }: { thread: PluginSidebarThread; state: SubAgentState; onOpenThread(threadId: string): void }) {
  const label = SUB_AGENT_LABEL[state];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenThread(thread.id)}
        title={`${thread.displayTitle} · open in split`}
        className="grid w-full grid-cols-[6px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 py-[3px] text-left text-[12px] transition-colors hover:bg-foreground/[0.05]"
      >
        <span aria-hidden className={cn("size-1.5 rounded-full", SUB_AGENT_DOT[state])} />
        <span className={cn("truncate", state === "done" ? "text-muted-foreground" : "text-foreground/90")}>{thread.displayTitle}</span>
        {state === "done" ? null : <span className={cn("text-[11px] font-medium", label.className)}>{label.text}</span>}
      </button>
    </li>
  );
}

/**
 * A parent's sub-agents, folded into its card. Active ones are listed; the
 * finished ones fold into one line. Sub-agents never get cards of their own.
 */
function SubAgents({ threads, onOpenThread }: { threads: readonly PluginSidebarThread[]; onOpenThread(threadId: string): void }) {
  const [showFinished, setShowFinished] = useState(false);
  const rows = threads.map((thread) => ({ thread, state: subAgentState(thread) }));
  const order: SubAgentState[] = ["waiting", "failed", "working", "done"];
  rows.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
  const active = rows.filter((row) => row.state !== "done");
  const finished = rows.filter((row) => row.state === "done");
  return (
    <div className="-mx-1 border-t border-border/60 pt-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <div className="mb-1 flex items-center gap-1.5 px-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium uppercase tracking-[0.05em]">Sub-agents</span>
        <span className="tabular-nums">{threads.length}</span>
      </div>
      <ul className="grid">
        {active.map((row) => (
          <SubAgentRow key={row.thread.id} thread={row.thread} state={row.state} onOpenThread={onOpenThread} />
        ))}
        {showFinished
          ? finished.map((row) => <SubAgentRow key={row.thread.id} thread={row.thread} state={row.state} onOpenThread={onOpenThread} />)
          : null}
      </ul>
      {finished.length > 0 ? (
        <button
          type="button"
          aria-expanded={showFinished}
          onClick={() => setShowFinished((value) => !value)}
          className="mt-0.5 flex items-center gap-2 rounded-md px-1.5 py-[3px] text-[11.5px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-500/60" />
          {showFinished ? "Hide finished" : `${finished.length} finished`}
          <Icon name={showFinished ? "ChevronUp" : "ChevronDown"} className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  thread: PluginSidebarThread | undefined;
  /** Live sub-agents under the task's thread, grouped into this card. */
  subAgents: readonly PluginSidebarThread[];
  projectName: string | null;
  trigger: string | null;
  selected: boolean;
  /** Briefly glows after the card is opened, so it is easy to find. */
  flash: boolean;
  /** Changes every minute so relative times re-render. */
  minute?: number;
  display: CardDisplay;
  onOpen(id: string): void;
  onOpenThread(threadId: string): void;
  onPointerDown(event: PointerEvent<HTMLElement>, id: string): void;
}

export const TaskCard = memo(function TaskCard({
  task,
  thread,
  subAgents,
  projectName,
  trigger,
  selected,
  flash,
  display,
  onOpen,
  onOpenThread,
  onPointerDown,
}: TaskCardProps) {
  const ownTone = toneOf(task, thread);
  // A sub-agent waiting on you makes the whole card wait.
  const tone = ownTone === "running" && subAgents.some(isWaitingOnUser) ? "waiting" : ownTone;
  const unread = task.status === "done" && thread?.isUnread === true;
  const auto = task.origin === "thread";
  const title = auto ? (thread?.displayTitle ?? task.title.trim()) || "Thread" : taskLabel(task);
  const preview = task.title.trim() ? task.prompt.trim() : task.prompt.trim().split("\n").slice(1).join(" ").trim();
  const done = task.status === "done";
  const showProject = display.project && projectName !== null;
  // "New thread" is the usual case and says nothing; an existing thread or a
  // worktree is worth a chip.
  const showThread = display.thread && !auto && (task.threadId !== null || task.worktree);
  const showModel = display.model && task.execution.model !== null;
  const showSchedule = display.schedule && trigger !== null;
  const showRepeat = display.repeat && task.repeat.kind !== "none";
  const showStatus = tone === "waiting" || (tone === "running" && task.startedAt !== null) || (done && task.finishedAt !== null);
  const hasMeta = showProject || showThread || showModel || showSchedule || showRepeat || showStatus;
  return (
    <div
      role="button"
      tabIndex={0}
      data-task-id={task.id}
      onPointerDown={(event) => onPointerDown(event, task.id)}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
      aria-current={selected ? "true" : undefined}
      aria-label={`${title}, ${TONES[tone].label}`}
      className={cn(
        "group relative grid w-full min-w-0 cursor-pointer scroll-m-4 grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border bg-card p-3 text-left outline-none",
        "transition-[border-color,box-shadow,background-color,opacity] duration-300",
        "border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:border-foreground/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
        "focus-visible:ring-2 focus-visible:ring-ring",
        tone === "running" && "border-sky-500/40 bg-sky-500/[0.045] ring-1 ring-sky-500/20",
        tone === "waiting" && "border-orange-500/55 bg-orange-500/[0.07] ring-1 ring-orange-500/30",
        tone === "flagged" && "border-red-500/45 bg-red-500/[0.05]",
        tone === "queued" && task.waitingReason && "border-dashed",
        task.hiddenAt !== null && "opacity-60",
        selected && "border-foreground/45 bg-state-active shadow-[0_2px_10px_rgba(0,0,0,0.12)]",
        flash && "border-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.28),0_6px_20px_rgba(14,165,233,0.18)]",
      )}
    >
      <span className="flex items-start gap-2">
        <span className={cn("min-w-0 flex-1 text-[13.5px] font-medium leading-5 text-foreground line-clamp-2", done && "text-muted-foreground line-through decoration-foreground/25")}>
          {title}
        </span>
        {task.pinnedAt !== null ? <Icon name="Pin" className="mt-[3px] size-3.5 shrink-0 text-amber-500" aria-label="Pinned" /> : null}
        <PriorityGlyph priority={task.priority} className="mt-[3px] shrink-0" />
      </span>

      {display.preview && preview ? <span className="-mt-1 text-xs leading-[1.45] text-muted-foreground line-clamp-2">{preview}</span> : null}

      {hasMeta ? (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        {showProject ? (
          <Chip className="max-w-[45%]">
            <ProjectDot projectId={task.projectId} className="size-1.5" />
            <span className="truncate">{projectName}</span>
          </Chip>
        ) : null}
        {auto ? (
          showModel ? (
            <Chip title={`Running on ${task.execution.model}${task.execution.reasoningLevel ? `, ${task.execution.reasoningLevel} reasoning` : ""}`} className="max-w-[60%]">
              <ModelLabel providerId={task.execution.providerId} model={task.execution.model} />
            </Chip>
          ) : null
        ) : (
          <>
            {showThread ? (
              <Chip className="max-w-[60%]">
                <ThreadLabel thread={thread} threadId={task.threadId} worktree={task.worktree} />
              </Chip>
            ) : null}
            {showModel ? (
              <Chip title={task.execution.model ?? undefined} className="max-w-[45%]">
                <ModelLabel providerId={task.execution.providerId ?? thread?.providerId ?? null} model={task.execution.model} />
              </Chip>
            ) : null}
          </>
        )}
        {showSchedule ? (
          <Chip className="max-w-full bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <Icon name="Clock" className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{trigger}</span>
          </Chip>
        ) : null}
        {showRepeat ? (
          <Chip title={REPEAT_LABELS[task.repeat.kind]} className="bg-violet-500/12 text-violet-600 dark:text-violet-400">
            <Icon name="Repeat" className="size-3 shrink-0" aria-hidden />
            <span>{task.repeat.kind === "weekdays" ? "Weekdays" : task.repeat.kind[0]!.toUpperCase() + task.repeat.kind.slice(1)}</span>
          </Chip>
        ) : null}
        {tone === "waiting" ? (
          <span className="ml-auto text-[11px] font-semibold text-orange-600 dark:text-orange-400">
            Waiting for you{task.startedAt ? ` · ${formatAgo(task.startedAt).replace(" ago", "")}` : ""}
          </span>
        ) : null}
        {tone === "running" && task.startedAt ? (
          <span className="ml-auto text-[11px] font-medium text-sky-600 dark:text-sky-400">Working · {formatAgo(task.startedAt).replace(" ago", "")}</span>
        ) : null}
        {done && task.finishedAt !== null ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {unread ? (
              <span className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                <span aria-hidden className="size-1.5 rounded-full bg-sky-500" />
                New
              </span>
            ) : null}
            {formatAgo(task.finishedAt)}
          </span>
        ) : null}
      </span>
      ) : null}

      {display.subAgents && subAgents.length > 0 ? <SubAgents threads={subAgents} onOpenThread={onOpenThread} /> : null}

      {tone === "flagged" ? (
        <span className="rounded-md bg-red-500/10 px-2 py-1 text-xs leading-snug text-red-600 line-clamp-2 dark:text-red-400">{task.error}</span>
      ) : task.waitingReason && task.status === "queued" ? (
        <span className="text-[11px] text-muted-foreground line-clamp-1">{task.waitingReason}</span>
      ) : null}
    </div>
  );
});
