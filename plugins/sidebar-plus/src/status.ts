import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

/** The five buckets the sidebar colors: one per "what should I do" answer. */
export type ThreadStatus = "error" | "attention" | "running" | "done" | "idle";

export function threadStatus(thread: PluginSidebarThread): ThreadStatus {
  if (thread.indicator === "unread-error") return "error";
  if (thread.hasPendingInteraction || thread.indicator === "waiting-for-input")
    return "attention";
  switch (thread.indicator) {
    case "runtime":
    case "workflow":
    case "background-agent":
    case "background-command":
    case "plan-mode":
    case "goal":
    case "working-draft":
      return "running";
    case "unread-success":
      return "done";
    default:
      break;
  }
  const activity = thread.activity;
  if (
    activity.workflows +
      activity.backgroundAgents +
      activity.backgroundCommands +
      activity.planMode +
      activity.goals >
    0
  ) {
    return "running";
  }
  return "idle";
}

export const STATUS_LABEL: Record<ThreadStatus, string> = {
  error: "Failed",
  attention: "Needs your input",
  running: "In progress",
  done: "Done, unread",
  idle: "",
};

export function threadDisplayTitle(thread: PluginSidebarThread): string {
  return thread.title?.trim() || thread.titleFallback?.trim() || "New thread";
}

export function matchesQuery(
  thread: PluginSidebarThread,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return threadDisplayTitle(thread).toLowerCase().includes(needle);
}

export interface StatusCounts {
  error: number;
  attention: number;
  running: number;
  done: number;
  idle: number;
}

export function countStatuses(
  threads: readonly PluginSidebarThread[],
): StatusCounts {
  const counts: StatusCounts = {
    error: 0,
    attention: 0,
    running: 0,
    done: 0,
    idle: 0,
  };
  for (const thread of threads) counts[threadStatus(thread)] += 1;
  return counts;
}
