import type { DispatchTask } from "../../types.js";
import { STATUS_LABELS } from "../lib/helpers.js";
import { Icon } from "../../../components/ui/icon.js";
import { PriorityPill, StatusPill } from "./StatusPill.js";

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
      className="flex min-h-12 w-full min-w-0 items-center gap-3 border-t border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-state-hover focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring first:border-t-0"
    >
      <span className="min-w-0 flex-1">
        <span title={task.title} className={`block truncate text-[13px] ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {task.title}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2.5 text-[11px] text-muted-foreground">
          <StatusPill status={task.status} />
          <PriorityPill priority={task.priority} />
          {task.linkedThreadId ? <span className="truncate">BB thread</span> : null}
        </span>
      </span>
      <Icon name="ChevronRight" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
