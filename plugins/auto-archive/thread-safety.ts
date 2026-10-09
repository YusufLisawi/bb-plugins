import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { DAY_MS, type SweepConfig, type ThreadActivitySnapshot } from "./sweep";

export interface SafetyThread extends ThreadActivitySnapshot {
  title: string | null;
  titleFallback: string | null;
  createdAt: number;
  updatedAt: number;
  lastReadAt: number | null;
  lifecycleOwnerThreadId: string | null;
  queuedMessageCount?: number;
  queuedWork?: string;
  hasPendingInteraction?: boolean;
  activeBackgroundAgentCount?: number;
  activity?: Record<string, number>;
}

/** Read both archive states explicitly; omitting archived defaults to live. */
export async function readThreadIndex(
  bb: BbPluginApi,
  signal?: AbortSignal,
): Promise<Map<string, SafetyThread>> {
  const readState = async (archived: boolean) => {
    const found: SafetyThread[] = [];
    for (let offset = 0; !signal?.aborted; offset += 100) {
      const page = await bb.sdk.threads.list({
        archived,
        includeHidden: true,
        limit: 100,
        offset,
        signal,
      });
      found.push(...page);
      if (page.length < 100) break;
    }
    return found;
  };
  const results = await Promise.allSettled([readState(false), readState(true)]);
  const index = new Map<string, SafetyThread>();
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
    for (const thread of result.value)
      if (thread.deletedAt === null) index.set(thread.id, thread);
  }
  if (signal?.aborted) throw new Error("Thread scan aborted");
  return index;
}

export function parentIds(thread: SafetyThread): string[] {
  return [
    ...new Set(
      [thread.parentThreadId, thread.lifecycleOwnerThreadId].filter(
        (id): id is string => typeof id === "string",
      ),
    ),
  ];
}

/** Re-read every connected relative immediately before a mutation. */
export async function refreshFamily(
  bb: BbPluginApi,
  index: Map<string, SafetyThread>,
  threadId: string,
  signal?: AbortSignal,
): Promise<void> {
  const links = new Map<string, Set<string>>();
  for (const thread of index.values())
    for (const parentId of parentIds(thread)) {
      const children = links.get(parentId) ?? new Set();
      children.add(thread.id);
      links.set(parentId, children);
      const parents = links.get(thread.id) ?? new Set();
      parents.add(parentId);
      links.set(thread.id, parents);
    }
  const family = new Set<string>();
  const pending = [threadId];
  while (pending.length) {
    const id = pending.pop()!;
    if (family.has(id)) continue;
    family.add(id);
    pending.push(...(links.get(id) ?? []));
  }
  const results = await Promise.allSettled(
    [...family].map(async (id) => {
      const current = await bb.sdk.threads.get({ threadId: id, signal });
      const prior = index.get(id);
      if (!prior) throw new Error(`Unresolved thread relation: ${id}`);
      index.set(id, { ...prior, ...current });
    }),
  );
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
}

export function hasWork(thread: SafetyThread): boolean {
  return (
    !["idle", "error"].includes(thread.status) ||
    (thread.queuedMessageCount ?? 0) > 0 ||
    (thread.queuedWork !== undefined && thread.queuedWork !== "none") ||
    thread.hasPendingInteraction === true ||
    (thread.activeBackgroundAgentCount ?? 0) > 0 ||
    Object.values(thread.activity ?? {}).some((count) => count > 0)
  );
}

/** Protect pins/exemptions, and every ancestor an archive could cascade from. */
export function archiveProtectedIds(
  index: ReadonlyMap<string, SafetyThread>,
  exemptions: ReadonlySet<string>,
  config: SweepConfig,
  now: number,
): Set<string> {
  const result = new Set(exemptions);
  const pending = [...exemptions];
  for (const thread of index.values()) {
    if (
      thread.pinnedAt !== null ||
      (!config.archiveRunning && hasWork(thread)) ||
      !Number.isFinite(thread.latestAttentionAt) ||
      thread.latestAttentionAt > now - config.inactivityDays * DAY_MS
    )
      pending.push(thread.id);
  }
  const visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.add(id);
    const thread = index.get(id);
    if (thread) pending.push(...parentIds(thread));
  }
  return result;
}

export function oldArchivedThread(
  thread: SafetyThread,
  days: number,
  now: number,
): boolean {
  const cutoff = now - days * DAY_MS;
  if (
    thread.deletedAt !== null ||
    thread.pinnedAt !== null ||
    hasWork(thread) ||
    thread.visibility !== "visible"
  )
    return false;
  if (
    thread.archivedAt === null ||
    !Number.isFinite(thread.archivedAt) ||
    thread.archivedAt <= 0 ||
    thread.archivedAt > cutoff
  )
    return false;
  for (const at of [
    thread.createdAt,
    thread.updatedAt,
    thread.latestAttentionAt,
  ]) {
    if (!Number.isFinite(at) || at <= 0 || at > cutoff) return false;
  }
  if (thread.archivedAt < thread.createdAt) return false;
  if (
    thread.lastReadAt !== null &&
    (!Number.isFinite(thread.lastReadAt) || thread.lastReadAt > cutoff)
  )
    return false;
  return true;
}

/** A pin, exemption, live/recent thread, hidden worker, or missing relation
 * protects its whole connected family from deletion. Never delete by cascade. */
export function deletionCandidates(
  index: ReadonlyMap<string, SafetyThread>,
  exemptions: ReadonlySet<string>,
  days: number,
  now: number,
): SafetyThread[] {
  const links = new Map<string, Set<string>>();
  const hasChildren = new Set<string>();
  const blocked = new Set(exemptions);
  for (const thread of index.values()) {
    if (!oldArchivedThread(thread, days, now)) blocked.add(thread.id);
    for (const parentId of parentIds(thread)) {
      hasChildren.add(parentId);
      const relatives = links.get(parentId) ?? new Set();
      relatives.add(thread.id);
      links.set(parentId, relatives);
      const parents = links.get(thread.id) ?? new Set();
      parents.add(parentId);
      links.set(thread.id, parents);
      if (!index.has(parentId)) blocked.add(parentId);
    }
  }
  const pending = [...blocked];
  while (pending.length) {
    for (const relative of links.get(pending.pop()!) ?? []) {
      if (!blocked.has(relative)) {
        blocked.add(relative);
        pending.push(relative);
      }
    }
  }
  return [...index.values()]
    .filter((thread) => !blocked.has(thread.id) && !hasChildren.has(thread.id))
    .sort((a, b) => a.archivedAt! - b.archivedAt! || a.id.localeCompare(b.id));
}
