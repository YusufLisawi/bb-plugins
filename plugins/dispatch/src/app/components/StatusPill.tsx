import type { TaskPriority, TaskStatus } from "../../types.js";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/helpers.js";

export function StatusPill({ status }: { status: TaskStatus }) {
  const tone =
    status === "done"
      ? "bg-secondary text-secondary-foreground"
      : status === "in_progress"
        ? "bg-primary/15 text-primary"
        : status === "backlog"
          ? "bg-muted text-muted-foreground"
          : "bg-state-active text-foreground";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityPill({ priority }: { priority: TaskPriority }) {
  const dot =
    priority === "urgent"
      ? "bg-destructive"
      : priority === "high"
        ? "bg-primary"
        : priority === "medium"
          ? "bg-secondary-foreground"
          : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground" title={`Priority: ${PRIORITY_LABELS[priority]}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
