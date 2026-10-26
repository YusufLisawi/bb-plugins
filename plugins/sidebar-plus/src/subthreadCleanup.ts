import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { threadStatus } from "./status";

type Children = ReadonlyMap<string, readonly PluginSidebarThread[]>;

/** Working or waiting on you: never archived by a cleanup. */
export function isBusy(thread: PluginSidebarThread): boolean {
  const status = threadStatus(thread);
  return status === "running" || status === "attention";
}

export interface SubthreadCleanupPlan {
  /** Subthreads to archive. Archiving one also archives everything below it. */
  archive: PluginSidebarThread[];
  /** How many subthreads that removes in total. */
  archivedCount: number;
  /** Subthreads kept because they, or something below them, are still working. */
  keptCount: number;
}

/**
 * What "Clean up subthreads" archives under `threadId`. bb archives a thread
 * together with its children, so a subthread is archived whole only when
 * nothing beneath it is working or waiting; otherwise it stays and its idle
 * children are considered one by one.
 */
export function subthreadCleanupPlan(
  threadId: string,
  childrenOf: Children,
): SubthreadCleanupPlan {
  const plan: SubthreadCleanupPlan = { archive: [], archivedCount: 0, keptCount: 0 };
  const seen = new Set<string>([threadId]);

  const size = (thread: PluginSidebarThread, guard: Set<string>): number => {
    let total = 1;
    for (const child of childrenOf.get(thread.id) ?? []) {
      if (guard.has(child.id)) continue;
      guard.add(child.id);
      total += size(child, guard);
    }
    return total;
  };
  const anyBusy = (thread: PluginSidebarThread, guard: Set<string>): boolean => {
    if (isBusy(thread)) return true;
    for (const child of childrenOf.get(thread.id) ?? []) {
      if (guard.has(child.id)) continue;
      guard.add(child.id);
      if (anyBusy(child, guard)) return true;
    }
    return false;
  };
  const visit = (parentId: string) => {
    for (const child of childrenOf.get(parentId) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      if (!anyBusy(child, new Set([child.id]))) {
        plan.archive.push(child);
        plan.archivedCount += size(child, new Set([child.id]));
      } else {
        plan.keptCount += 1;
        visit(child.id);
      }
    }
  };
  visit(threadId);
  return plan;
}
