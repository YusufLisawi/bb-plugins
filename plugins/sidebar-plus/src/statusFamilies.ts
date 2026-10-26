import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { ancestorsOf, descendants, groupUnderAncestors, subtree, treeIds, type TreeNode } from "./familyTree";
import { threadStatus } from "./status";

type Children = ReadonlyMap<string, readonly PluginSidebarThread[]>;

export interface StatusFamilies {
  /** Whole families with any member working, newest activity first. */
  running: TreeNode[];
  /** Finished top threads with their family, then finished subthreads under their parent. */
  done: TreeNode[];
  /** Threads these sections show, so their projects can leave them out. Context parents are not claimed. */
  runningIds: Set<string>;
  doneIds: Set<string>;
}

/**
 * Group "In progress" and "Done" by family, so a task and its sub-agents move
 * together:
 * - a family is in progress when its top thread or any subthread is working,
 *   even when the top thread itself is idle;
 * - a finished top thread brings its family to Done; a finished subthread of a
 *   family that is not in progress shows under its (context) parent.
 * `skipRoot` leaves a family where it is (project pins stay in their project).
 */
export function statusFamilies(
  candidates: readonly PluginSidebarThread[],
  byId: ReadonlyMap<string, PluginSidebarThread>,
  childrenOf: Children,
  options: { doneSince: number; skipRoot?: (root: PluginSidebarThread) => boolean },
): StatusFamilies {
  const rootOf = (thread: PluginSidebarThread) => ancestorsOf(thread, byId).at(-1) ?? thread;
  const skip = options.skipRoot ?? (() => false);
  const activity = (node: TreeNode) =>
    Math.max(node.thread.updatedAt, ...descendants(node).map((thread) => thread.updatedAt));

  const runningRoots = new Map<string, PluginSidebarThread>();
  for (const thread of candidates) {
    if (threadStatus(thread) !== "running") continue;
    const root = rootOf(thread);
    if (!skip(root)) runningRoots.set(root.id, root);
  }
  const running = [...runningRoots.values()]
    .map((root) => subtree(root, childrenOf))
    .sort((a, b) => activity(b) - activity(a) || a.thread.id.localeCompare(b.thread.id));
  const runningIds = treeIds(running);

  const doneRoots: PluginSidebarThread[] = [];
  const doneSingles: PluginSidebarThread[] = [];
  for (const thread of candidates) {
    if (threadStatus(thread) !== "done" || thread.updatedAt < options.doneSince) continue;
    if (runningIds.has(thread.id)) continue;
    const root = rootOf(thread);
    if (skip(root)) continue;
    if (root.id === thread.id) doneRoots.push(thread);
    else doneSingles.push(thread);
  }
  const doneFamilies = doneRoots
    .map((root) => subtree(root, childrenOf))
    .sort((a, b) => activity(b) - activity(a) || a.thread.id.localeCompare(b.thread.id));
  const inDoneFamily = treeIds(doneFamilies);
  const singles = doneSingles
    .filter((thread) => !inDoneFamily.has(thread.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const done = [...doneFamilies, ...groupUnderAncestors(singles, byId)];
  const doneIds = new Set([...inDoneFamily, ...singles.map((thread) => thread.id)]);

  return { running, done, runningIds, doneIds };
}
