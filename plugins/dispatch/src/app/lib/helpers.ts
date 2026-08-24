import type { DispatchProject, DispatchTask, TaskPriority, TaskStatus } from "../../types.js";

export const STATUS_OPTIONS: readonly { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export const PRIORITY_OPTIONS: readonly { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<TaskStatus, string>;

export const PRIORITY_LABELS = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<TaskPriority, string>;

export function parseTaskId(subPath: string): string | null {
  if (!subPath.startsWith("task/")) return null;
  const raw = subPath.slice("task/".length).split("/")[0];
  return raw ? decodeURIComponent(raw) : null;
}

export function projectForTask(
  task: DispatchTask,
  projects: Record<string, DispatchProject>,
): DispatchProject | null {
  return projects[task.projectId] ?? null;
}

export function formatRelativeDate(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const days = Math.round((time - Date.now()) / 86_400_000);
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days > -7 && days < 0) return `${Math.abs(days)}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(time);
}

export function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-3)}` : value;
}

export function taskMatchesProject(task: DispatchTask, projectId: string): boolean {
  return task.projectId === projectId || task.sharedProjectIds.includes(projectId);
}
