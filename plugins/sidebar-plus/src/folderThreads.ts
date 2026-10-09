import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export const FOLDER_PAGE_SIZE = 5;

/** Page individual threads, so expanded children cannot overflow a page. */
export function folderThreads(
  threads: readonly PluginSidebarThread[],
  projectPinnedIds: ReadonlySet<string>,
  limit: number,
  placedAt: ReadonlyMap<string, number> = new Map(),
) {
  // Moving a thread is recent sidebar activity. Its core timestamps and the
  // Auto Archive inactivity clock remain untouched.
  const activityAt = (thread: PluginSidebarThread) =>
    Math.max(thread.updatedAt, placedAt.get(thread.id) ?? 0);
  const sorted = [...threads].sort(
    (a, b) => activityAt(b) - activityAt(a) || a.id.localeCompare(b.id),
  );
  const pinned = sorted.filter(
    (thread) => thread.isPinned && projectPinnedIds.has(thread.id),
  );
  const recent = sorted.filter(
    (thread) => !thread.isPinned || !projectPinnedIds.has(thread.id),
  );
  const page = recent.slice(0, limit);
  return { pinned, page, hiddenCount: recent.length - page.length };
}

export function buildTree(threads: readonly PluginSidebarThread[]) {
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const childrenOf = new Map<string, PluginSidebarThread[]>();
  const roots: PluginSidebarThread[] = [];
  for (const thread of threads) {
    // A parent outside this page is intentionally not materialized: the page
    // must still contain only five threads, and the child must remain reachable.
    const ancestors = new Set([thread.id]);
    let parent = thread.parentThreadId;
    let cycle = false;
    while (parent && byId.has(parent)) {
      if (ancestors.has(parent)) {
        cycle = true;
        break;
      }
      ancestors.add(parent);
      parent = byId.get(parent)!.parentThreadId;
    }
    if (!cycle && thread.parentThreadId && byId.has(thread.parentThreadId)) {
      const children = childrenOf.get(thread.parentThreadId) ?? [];
      children.push(thread);
      childrenOf.set(thread.parentThreadId, children);
    } else roots.push(thread);
  }
  return { roots, childrenOf };
}
