import type { PluginSidebarSection, PluginSidebarThread } from "@get-bb/plugin-sdk/app";

/**
 * Folders inside a project are bb thread sections. bb's sections are global
 * named buckets; Sidebar Plus remembers which project each folder was created
 * in, so an empty folder still shows there, and shows a section in every
 * project that has threads in it.
 */
export type SectionOwners = Readonly<Record<string, string>>;

/** The folders to draw inside `projectId`, oldest first (bb's order). */
export function sectionsForProject(
  projectId: string,
  projectThreads: readonly PluginSidebarThread[],
  sections: readonly PluginSidebarSection[],
  owners: SectionOwners,
): PluginSidebarSection[] {
  const used = new Set(
    projectThreads.map((thread) => thread.sectionId).filter((id): id is string => Boolean(id)),
  );
  return sections.filter((section) => owners[section.id] === projectId || used.has(section.id));
}

/**
 * Which folder a thread sits in inside its project: its family root's
 * section, so a subthread always stays under its parent. Null = loose.
 */
export function familySectionId(
  thread: PluginSidebarThread,
  byId: ReadonlyMap<string, PluginSidebarThread>,
  knownSectionIds: ReadonlySet<string>,
): string | null {
  let root = thread;
  const seen = new Set([thread.id]);
  while (root.parentThreadId && byId.has(root.parentThreadId) && !seen.has(root.parentThreadId)) {
    seen.add(root.parentThreadId);
    root = byId.get(root.parentThreadId)!;
  }
  return root.sectionId && knownSectionIds.has(root.sectionId) ? root.sectionId : null;
}

/** A project's threads split into its folders and the loose rest. */
export function partitionBySection(
  projectThreads: readonly PluginSidebarThread[],
  folders: readonly PluginSidebarSection[],
): { bySection: Map<string, PluginSidebarThread[]>; loose: PluginSidebarThread[] } {
  const byId = new Map(projectThreads.map((thread) => [thread.id, thread]));
  const known = new Set(folders.map((folder) => folder.id));
  const bySection = new Map<string, PluginSidebarThread[]>(folders.map((folder) => [folder.id, []]));
  const loose: PluginSidebarThread[] = [];
  for (const thread of projectThreads) {
    const sectionId = familySectionId(thread, byId, known);
    if (sectionId) bySection.get(sectionId)!.push(thread);
    else loose.push(thread);
  }
  return { bySection, loose };
}

export function normalizeSectionOwners(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const owners: Record<string, string> = {};
  for (const [sectionId, projectId] of Object.entries(value as Record<string, unknown>)) {
    if (sectionId.length > 0 && sectionId.length <= 512 && typeof projectId === "string" && projectId.length > 0 && projectId.length <= 512) {
      owners[sectionId] = projectId;
    }
  }
  return owners;
}
