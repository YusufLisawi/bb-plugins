import type {
  PluginSidebarProject,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";

export type ProjectMove = "up" | "down" | "top" | "bottom";

export function normalizeProjectOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && id.length <= 512,
      ),
    ),
  ].slice(0, 4096);
}

/** Saved projects stay put; new projects follow them in automatic order. */
export function orderProjects(
  projects: readonly PluginSidebarProject[],
  threads: readonly PluginSidebarThread[],
  savedOrder: readonly string[],
): PluginSidebarProject[] {
  const activity = new Map<string, number>();
  for (const thread of threads) {
    if (!thread.isArchived)
      activity.set(
        thread.projectId,
        Math.max(activity.get(thread.projectId) ?? 0, thread.updatedAt),
      );
  }
  const ranks = new Map(
    normalizeProjectOrder(savedOrder).map((id, index) => [id, index]),
  );
  return [...projects].sort((a, b) => {
    const rankA = ranks.get(a.id),
      rankB = ranks.get(b.id);
    if (rankA !== undefined || rankB !== undefined) {
      return (rankA ?? Infinity) - (rankB ?? Infinity);
    }
    if (a.isPersonal !== b.isPersonal) return a.isPersonal ? 1 : -1;
    return (
      (activity.get(b.id) ?? 0) - (activity.get(a.id) ?? 0) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
    );
  });
}

export function moveProjectOrder(
  projectIds: readonly string[],
  projectId: string,
  move: ProjectMove,
): string[] {
  const next = normalizeProjectOrder(projectIds);
  const index = next.indexOf(projectId);
  if (index < 0) return next;
  const target =
    move === "top"
      ? 0
      : move === "bottom"
        ? next.length - 1
        : Math.min(
            next.length - 1,
            Math.max(0, index + (move === "up" ? -1 : 1)),
          );
  next.splice(index, 1);
  next.splice(target, 0, projectId);
  return next;
}
