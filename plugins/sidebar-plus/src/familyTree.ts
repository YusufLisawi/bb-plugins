import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { threadStatus } from "./status";

/** One row of a nested thread list and the rows indented beneath it. */
export interface TreeNode {
  thread: PluginSidebarThread;
  children: TreeNode[];
  /**
   * Shown only so a matching descendant appears under its parent (e.g. an
   * idle parent above its running child in "In progress").
   */
  context: boolean;
}

type ThreadLike = Pick<PluginSidebarThread, "id" | "parentThreadId">;

/** Visible ancestors, nearest first. Stops at a missing parent or a cycle. */
export function ancestorsOf<T extends ThreadLike>(
  thread: T,
  byId: ReadonlyMap<string, T>,
): T[] {
  const result: T[] = [];
  const seen = new Set([thread.id]);
  let parentId = thread.parentThreadId;
  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    seen.add(parentId);
    result.push(parent);
    parentId = parent.parentThreadId;
  }
  return result;
}

/** A thread with every descendant beneath it; `skip` ids are left out. */
export function subtree(
  thread: PluginSidebarThread,
  childrenOf: ReadonlyMap<string, readonly PluginSidebarThread[]>,
  skip: ReadonlySet<string> = new Set(),
  seen: Set<string> = new Set(),
): TreeNode {
  seen.add(thread.id);
  const children: TreeNode[] = [];
  for (const child of childrenOf.get(thread.id) ?? []) {
    if (skip.has(child.id) || seen.has(child.id)) continue;
    children.push(subtree(child, childrenOf, skip, seen));
  }
  return { thread, children, context: false };
}

/**
 * Nest each match under its visible ancestors, which become context rows
 * unless they match too. Families keep the order of their first match, and
 * siblings keep match order.
 */
export function groupUnderAncestors(
  matches: readonly PluginSidebarThread[],
  byId: ReadonlyMap<string, PluginSidebarThread>,
): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  const matched = new Set(matches.map((thread) => thread.id));
  for (const match of matches) {
    const chain = [...ancestorsOf(match, byId).reverse(), match];
    let parent: TreeNode | null = null;
    for (const thread of chain) {
      let node = nodes.get(thread.id);
      if (!node) {
        node = { thread, children: [], context: !matched.has(thread.id) };
        nodes.set(thread.id, node);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
      parent = node;
    }
  }
  return roots;
}

/** Every descendant below a node, depth first. */
export function descendants(node: TreeNode): PluginSidebarThread[] {
  const result: PluginSidebarThread[] = [];
  const pending = [...node.children].reverse();
  while (pending.length) {
    const next = pending.pop()!;
    result.push(next.thread);
    for (let i = next.children.length - 1; i >= 0; i--)
      pending.push(next.children[i]!);
  }
  return result;
}

export function treeIds(nodes: readonly TreeNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    ids.add(node.thread.id);
    for (const thread of descendants(node)) ids.add(thread.id);
  }
  return ids;
}

/**
 * A collapsed family opens by itself while it holds the active thread or a
 * child that is working or waiting on you, so live sub-agents stay visible.
 */
export function shouldAutoExpand(
  node: TreeNode,
  activeThreadId: string | null,
): boolean {
  return descendants(node).some((thread) => {
    if (thread.id === activeThreadId) return true;
    const status = threadStatus(thread);
    return status === "running" || status === "attention" || status === "error";
  });
}
