import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import {
  ancestorsOf,
  descendants,
  subtree,
  treeIds,
  type TreeNode,
} from "./familyTree";

export const FOLDER_PAGE_SIZE = 5;

/**
 * Page whole families, so a child always appears under its parent. Project
 * pins stay above the page and take their descendants with them.
 */
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
  const byId = new Map(sorted.map((thread) => [thread.id, thread]));
  const { roots, childrenOf } = buildTree(sorted);
  // A pin nested under another pin travels with the outer one.
  const pinned = sorted
    .filter(
      (thread) =>
        thread.isPinned &&
        projectPinnedIds.has(thread.id) &&
        !ancestorsOf(thread, byId).some((ancestor) => ancestor.isPinned),
    )
    .map((thread) => subtree(thread, childrenOf));
  const inPinned = treeIds(pinned);
  const familyActivity = (node: TreeNode) =>
    Math.max(activityAt(node.thread), ...descendants(node).map(activityAt));
  const families = roots
    .filter((thread) => !inPinned.has(thread.id))
    .map((thread) => subtree(thread, childrenOf, inPinned))
    .map((node) => ({ node, at: familyActivity(node) }))
    .sort(
      (a, b) => b.at - a.at || a.node.thread.id.localeCompare(b.node.thread.id),
    )
    .map(({ node }) => node);
  const page = families.slice(0, limit);
  return { pinned, page, hiddenCount: families.length - page.length };
}

export function buildTree(threads: readonly PluginSidebarThread[]) {
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const childrenOf = new Map<string, PluginSidebarThread[]>();
  const roots: PluginSidebarThread[] = [];
  for (const thread of threads) {
    // A thread whose parent lives in another folder is a root here.
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
