import type { TaskPriority, TaskStatus } from "../../types.js";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/helpers.js";

export function StatusPill({ status }: { status: TaskStatus }) {
  const tone =
    status === "done"
      ? "bg-muted-foreground"
      : status === "in_progress"
        ? "bg-primary"
        : status === "backlog"
          ? "bg-muted-foreground/60"
          : "bg-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
      <span className={`size-1.5 rounded-full ${tone}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
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
