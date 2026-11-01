// Pure sweep logic for bb-plugin-auto-archive.
//
// Kept free of the plugin API so it is unit-testable without a bb server.
// The factory in server.ts wires these functions to settings, the background
// sweeper, and the CLI.

export const HOUR_MS = 60 * 60_000;
export const DAY_MS = 24 * HOUR_MS;

/** Thread fields the sweep reads. Structurally compatible with bb's thread
 * list entries, so full entries satisfy this shape. */
export interface ThreadActivitySnapshot {
  id: string;
  archivedAt: number | null;
  pinnedAt: number | null;
  deletedAt: number | null;
  visibility: "visible" | "hidden";
  status: "error" | "stopping" | "idle" | "starting" | "active" | "pending";
  parentThreadId: string | null;
  latestAttentionAt: number;
  lifecycleOwnerThreadId?: string | null;
}

export interface SweepConfig {
  /** Days of inactivity before a thread becomes a candidate. */
  inactivityDays: number;
  /**
   * Days of inactivity before a child thread is archived on its own, while
   * its parent stays. Null or omitted leaves children to the parent cascade.
   */
  childInactivityDays?: number | null;
  /** Also archive hidden (background-worker) threads. */
  archiveHidden: boolean;
  /** Also archive threads with work in flight (starting/active/stopping). */
  archiveRunning: boolean;
  /**
   * Epoch ms of the initial install. Threads whose last activity predates
   * this (i.e. a pre-existing backlog that was already idle when the plugin
   * was installed) are never auto-archived. 0 disables the guard.
   */
  sinceInstallAt: number;
}

export interface SweepStats {
  scanned: number;
  candidates: number;
  archived: number;
  errors: number;
  dryRun: boolean;
  /** The share of `candidates` and `archived` that were child threads. */
  childCandidates?: number;
  childArchived?: number;
}

/** Child fields the child sweep reads on top of the root snapshot. */
export interface ChildActivitySnapshot extends ThreadActivitySnapshot {
  updatedAt: number;
  lastReadAt: number | null;
}

/**
 * Which threads to archive, in sweep order.
 *
 * A thread is a candidate when it has been completely quiet for the full
 * inactivity window:
 * - `latestAttentionAt` is bb's last-activity marker: the most recent turn
 *   completion, error, or creation time. It does not move on read-state or
 *   metadata changes, so opening a thread never counts as activity.
 * - Child threads are not selected here: archiving a parent cascades to its
 *   children, and a child's attention timestamp does not advance on turn
 *   completion. `selectChildrenToArchive` judges them on their own clock.
 * - Threads with work in flight (starting/active/stopping) are skipped
 *   unless `archiveRunning`, because archiving stops running work.
 * - Pinned threads are always protected; hidden threads are skipped unless opted in.
 * - A fresh install never nukes a pre-existing backlog: threads whose last
 *   activity (`latestAttentionAt`) predates `sinceInstallAt` are skipped,
 *   so only threads that become idle after install are ever candidates.
 *   Combined with the inactivity cutoff this also means nothing is archived
 *   until the full window has elapsed since install.
 */
export function selectThreadsToArchive<T extends ThreadActivitySnapshot>(
  threads: readonly T[],
  config: SweepConfig,
  now: number,
): T[] {
  const cutoff = now - config.inactivityDays * DAY_MS;
  const since = config.sinceInstallAt ?? 0;
  return threads.filter((thread) => {
    if (thread.archivedAt !== null || thread.deletedAt !== null) {
      return false;
    }
    if (
      thread.parentThreadId !== null ||
      thread.lifecycleOwnerThreadId != null
    ) {
      return false;
    }
    if (thread.visibility === "hidden" && !config.archiveHidden) {
      return false;
    }
    if (thread.pinnedAt !== null) {
      return false;
    }
    if (
      thread.status !== "idle" &&
      thread.status !== "error" &&
      !config.archiveRunning
    ) {
      return false;
    }
    if (thread.latestAttentionAt < since) {
      return false;
    }
    return thread.latestAttentionAt <= cutoff;
  });
}

/**
 * A child's last activity. Its attention timestamp usually stays at its
 * creation, so the latest update (turn completions, but also renames and
 * reads) is the conservative clock: anything recent delays archiving.
 */
export function childActivityAt(thread: ChildActivitySnapshot): number {
  return Math.max(
    thread.latestAttentionAt,
    thread.updatedAt,
    thread.lastReadAt ?? 0,
  );
}

/**
 * Child threads (sub-agents, forks) to archive on their own, oldest first.
 * The root rules apply — pins, hidden and running threads, and anything idle
 * since before install are skipped — on the child's own clock and threshold.
 * Family protection is checked separately.
 */
export function selectChildrenToArchive<T extends ChildActivitySnapshot>(
  threads: readonly T[],
  config: SweepConfig,
  now: number,
): T[] {
  const days = config.childInactivityDays;
  if (days === null || days === undefined) return [];
  const cutoff = now - days * DAY_MS;
  const since = config.sinceInstallAt ?? 0;
  return threads
    .filter((thread) => {
      if (thread.archivedAt !== null || thread.deletedAt !== null) return false;
      if (thread.parentThreadId === null) return false;
      if (thread.visibility === "hidden" && !config.archiveHidden) return false;
      if (thread.pinnedAt !== null) return false;
      if (
        thread.status !== "idle" &&
        thread.status !== "error" &&
        !config.archiveRunning
      )
        return false;
      const at = childActivityAt(thread);
      return Number.isFinite(at) && at >= since && at <= cutoff;
    })
    .sort((a, b) => childActivityAt(a) - childActivityAt(b));
}

/**
 * Parse the string `childInactivityDays` setting. Blank or 0 turns the child
 * sweep off, and so does anything unreadable, so a typo never archives early.
 */
export function parseChildInactivityDays(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const days = Number(trimmed);
  return Number.isFinite(days) && days > 0 && days <= 36500 ? days : null;
}

/** Parse the string `inactivityDays` setting; falls back to 15 on garbage. */
export function parseInactivityDays(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 15;
}

/** Milliseconds until the next top-of-hour; exactly on the hour → a full hour. */
export function msUntilNextHour(now: Date = new Date()): number {
  return (
    (60 - now.getMinutes()) * 60_000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds()
  );
}

/** Abort-aware sleep: resolves early (without clearing the caller's timer
 * state) when `signal` aborts, so services stop promptly on reload. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      clearTimeout(timer);
      resolve();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
