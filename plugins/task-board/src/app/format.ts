import type { RepeatKind, Task, TaskStatus } from "../contract.js";

export const COLUMNS: readonly { status: TaskStatus; title: string; empty: string }[] = [
  { status: "todo", title: "Todo", empty: "Nothing planned" },
  { status: "running", title: "In progress", empty: "No agent is working" },
  { status: "done", title: "Done", empty: "Nothing finished yet" },
];

export const PRIORITIES = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Urgent" },
] as const;

export const REPEAT_LABELS: Record<RepeatKind, string> = {
  none: "Does not repeat",
  hourly: "Every hour",
  daily: "Every day",
  weekdays: "Every weekday",
  weekly: "Every week",
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function taskLabel(task: Pick<Task, "title" | "prompt">): string {
  const title = task.title.trim();
  if (title) return title;
  const firstLine = task.prompt.trim().split("\n")[0]?.trim();
  return firstLine || "Untitled task";
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

/** "14:00", "Tomorrow 09:00", "Mon, Nov 17 09:00". */
export function formatWhen(epochMs: number, now = Date.now()): string {
  const date = new Date(epochMs);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayDiff = Math.floor((epochMs - startOfToday) / 86_400_000);
  const time = timeFormat.format(date);
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `Tomorrow ${time}`;
  if (dayDiff === -1) return `Yesterday ${time}`;
  return `${dayFormat.format(date)} ${time}`;
}

export function formatAgo(epochMs: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - epochMs) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** The value a `datetime-local` input shows for an epoch time. */
export function toLocalInput(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** A task's tab and route id, validated before it reaches an RPC. */
export function parseTaskId(subPath: string | undefined): string | null {
  if (!subPath) return null;
  const [kind, rawId] = subPath.split("/");
  if (kind !== "task" || !rawId) return null;
  const id = decodeURIComponent(rawId);
  return /^[\w-]{1,64}$/u.test(id) ? id : null;
}
