import { z } from "zod";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export const folderPlacementSchema = z.object({
  threadId: z.string().min(1).max(512),
  projectId: z.string().min(1).max(512),
  movedAt: z.number().int().nonnegative(),
});
export type FolderPlacement = z.infer<typeof folderPlacementSchema>;

export function normalizeFolderPlacements(value: unknown): FolderPlacement[] {
  if (!Array.isArray(value)) return [];
  const placements = new Map<string, FolderPlacement>();
  for (const item of value) {
    const parsed = folderPlacementSchema.safeParse(item);
    if (parsed.success) placements.set(parsed.data.threadId, parsed.data);
  }
  return [...placements.values()];
}

/** Missing destination projects fall back to BB's original project. */
export function threadFolderId(
  thread: Pick<PluginSidebarThread, "id" | "projectId">,
  placements: ReadonlyMap<string, FolderPlacement>,
  projectIds: ReadonlySet<string>,
): string {
  const destination = placements.get(thread.id)?.projectId;
  return destination && projectIds.has(destination)
    ? destination
    : thread.projectId;
}
