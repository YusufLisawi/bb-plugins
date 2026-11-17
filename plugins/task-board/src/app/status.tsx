import type { ReactNode } from "react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { Task, TaskStatus } from "../contract.js";
import { cn } from "@/lib/utils";

/**
 * What a card shows: its column, "flagged" when it failed, or "waiting" when
 * its thread is paused on a question, approval or plan for the user.
 */
export type Tone = TaskStatus | "flagged" | "waiting";

/** bb's live view says the thread is waiting on the user. */
export function isWaitingOnUser(thread: PluginSidebarThread | undefined): boolean {
  return thread !== undefined && (thread.indicator === "waiting-for-input" || thread.hasPendingInteraction);
}

export function toneOf(task: Pick<Task, "status" | "error">, thread?: PluginSidebarThread): Tone {
  if (task.error) return "flagged";
  if (task.status === "running" && isWaitingOnUser(thread)) return "waiting";
  return task.status;
}

/**
 * One hue per state, used for glyphs, count pills and card tints. Literal
 * class strings so Tailwind keeps them; opacity keeps them right in both
 * light and dark themes.
 */
export const TONES: Record<Tone, { text: string; soft: string; ring: string; label: string }> = {
  todo: { text: "text-muted-foreground", soft: "bg-foreground/[0.06]", ring: "", label: "Todo" },
  queued: { text: "text-amber-500", soft: "bg-amber-500/12", ring: "ring-amber-500/25", label: "Scheduled" },
  running: { text: "text-sky-500", soft: "bg-sky-500/12", ring: "ring-sky-500/35", label: "In progress" },
  done: { text: "text-emerald-500", soft: "bg-emerald-500/12", ring: "ring-emerald-500/25", label: "Done" },
  flagged: { text: "text-red-500", soft: "bg-red-500/12", ring: "ring-red-500/40", label: "Needs attention" },
  waiting: { text: "text-orange-500", soft: "bg-orange-500/12", ring: "ring-orange-500/40", label: "Waiting for you" },
};

/** Linear-style state marks, drawn here so they never depend on icon names. */
export function StatusGlyph({ tone, className }: { tone: Tone; className?: string }) {
  const color = TONES[tone].text;
  const common = cn("size-3.5 shrink-0", color, className);
  switch (tone) {
    case "todo":
      return (
        <svg viewBox="0 0 14 14" className={common} aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.9" />
        </svg>
      );
    case "queued":
      return (
        <svg viewBox="0 0 14 14" className={common} aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 4.2V7l1.9 1.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "running":
      return (
        <svg viewBox="0 0 14 14" className={common} aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3.5A3.5 3.5 0 0 1 7 10.5Z" fill="currentColor" />
        </svg>
      );
    case "done":
      return (
        <svg viewBox="0 0 14 14" className={common} aria-hidden>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "waiting":
      return (
        <svg viewBox="0 0 14 14" className={common} aria-hidden>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path d="M5.6 4.4v5.2M8.4 4.4v5.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "flagged":
      return (
        <svg viewBox="0 0 14 14" className={common} aria-hidden>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path d="M7 3.9v3.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7" cy="9.9" r="0.95" fill="white" />
        </svg>
      );
  }
}

const PROJECT_DOTS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-indigo-500",
];

/** A stable colour per project, so the same project reads the same everywhere. */
export function projectDot(projectId: string): string {
  let hash = 0;
  for (const char of projectId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PROJECT_DOTS[Math.abs(hash) % PROJECT_DOTS.length]!;
}

export function ProjectDot({ projectId, className }: { projectId: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", projectDot(projectId), className)} />;
}

/** The small metadata pill used on cards and in the panel header. */
export function Chip({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 min-w-0 max-w-full items-center gap-1 rounded-md bg-foreground/[0.06] px-1.5 text-[11px] font-medium leading-none text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
