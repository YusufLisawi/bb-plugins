import type { DispatchTask } from "../../types.js";
import { STATUS_LABELS } from "../lib/helpers.js";
import { PriorityPill } from "./StatusPill.js";

interface TaskRowProps {
  task: DispatchTask;
  onOpen: () => void;
}

export function TaskRow({ task, onOpen }: TaskRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open task ${task.title}. Status: ${STATUS_LABELS[task.status]}.`}
      className="flex min-h-14 w-full min-w-0 items-center gap-3 border-t border-border/70 px-3 py-3 text-left hover:bg-state-hover focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring first:border-t-0"
    >
      <StatusDot status={task.status} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {task.title}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <PriorityPill priority={task.priority} />
          {task.linkedThreadId ? <span className="truncate text-primary">Linked to BB</span> : null}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground" aria-hidden="true">›</span>
    </button>
  );
}

function StatusDot({ status }: { status: DispatchTask["status"] }) {
  const tone =
    status === "done"
      ? "bg-muted-foreground"
      : status === "in_progress"
        ? "bg-primary"
        : status === "backlog"
          ? "bg-muted-foreground/60"
          : "bg-foreground";

  return <span className={`size-2 shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
}
