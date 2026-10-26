// bb-plugin-sidebar-plus — backend: stores sidebar layout and follow-up marks
// in kv, then broadcasts changes so every open window repaints at once.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { normalizeSectionOwners } from "./src/sectionFolders";
import { z } from "zod";
import {
  DEFAULT_LAYOUT,
  layoutSchema,
  normalizeLayout,
  type SidebarLayout,
} from "./src/layout";
import {
  folderPlacementSchema,
  normalizeFolderPlacements,
} from "./src/threadFolders";
import {
  cleanName,
  NAME_MAX,
  normalizePinGroups,
  normalizeProjectLabels,
  pinGroupSchema,
  type PinGroup,
} from "./src/pinGroups";

const preferenceSchema = z.object({
  projectPinnedThreadIds: z.array(z.string()),
  exemptThreadIds: z.array(z.string()),
  autoArchiveAvailable: z.boolean(),
  folderPlacements: z.array(folderPlacementSchema),
  projectLabels: z.record(z.string(), z.string()),
  pinGroups: z.array(pinGroupSchema),
});
const exemptionSchema = z.object({ threadIds: z.array(z.string()) });
const PROJECT_PINS_KEY = "project-pinned-thread-ids";
const THREAD_FOLDERS_KEY = "thread-folder-placements";
const PROJECT_LABELS_KEY = "project-labels";
const PIN_GROUPS_KEY = "pin-groups";
const id = z.string().min(1).max(512);
const nameInput = z.string().max(NAME_MAX * 4);

const LAYOUT_KEY = "layout";
const LAYOUT_CHANNEL = "layout-changed";
const FOLLOW_UPS_KEY = "follow-up-thread-ids";
const FOLLOW_UPS_CHANNEL = "follow-ups-changed";
const SECTION_OWNERS_KEY = "section-owner-projects";
export const SECTION_OWNERS_CHANNEL = "section-owners-changed";
let followUpWriteQueue: Promise<unknown> = Promise.resolve();

function normalizeFollowUpIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter(
    (id): id is string =>
      typeof id === "string" && id.length > 0 && id.length <= 512,
  );
  return [...new Set(ids)];
}

export const rpcContract = defineRpcContract({
  getThreadPreferences: { input: z.null(), output: preferenceSchema },
  setThreadFolder: {
    input: z
      .object({
        threadId: z.string().min(1).max(512),
        projectId: z.string().min(1).max(512),
      })
      .strict(),
    output: preferenceSchema,
  },
  setPinMode: {
    input: z
      .object({
        threadId: z.string().min(1).max(512),
        mode: z.enum(["none", "global", "project"]),
      })
      .strict(),
    output: preferenceSchema,
  },
  setAutoArchiveExempt: {
    input: z
      .object({ threadId: z.string().min(1).max(512), exempt: z.boolean() })
      .strict(),
    output: preferenceSchema,
  },
  /** A sidebar-only folder name; null or bb's own name clears it. */
  setProjectLabel: {
    input: z.object({ projectId: id, label: nameInput.nullable() }).strict(),
    output: preferenceSchema,
  },
  /** Create a pin group in a folder, optionally filing a thread in it. */
  createPinGroup: {
    input: z
      .object({ projectId: id, name: nameInput, threadId: id.optional() })
      .strict(),
    output: preferenceSchema,
  },
  /** File a thread in a group (pinning it in the project), or null to remove. */
  setThreadPinGroup: {
    input: z.object({ threadId: id, groupId: id.nullable() }).strict(),
    output: preferenceSchema,
  },
  renamePinGroup: {
    input: z.object({ groupId: id, name: nameInput }).strict(),
    output: preferenceSchema,
  },
  /** Remove a group; its threads stay pinned in the project. */
  deletePinGroup: {
    input: z.object({ groupId: id }).strict(),
    output: preferenceSchema,
  },
  getLayout: {
    input: z.null(),
    output: z.object({ layout: layoutSchema }),
  },
  setLayout: {
    // Accept anything object-shaped; the server normalizes so a stale client
    // can never wedge the stored layout.
    input: z.object({ layout: z.record(z.string(), z.unknown()) }).strict(),
    output: z.object({ layout: layoutSchema }),
  },
  resetLayout: {
    input: z.null(),
    output: z.object({ layout: layoutSchema }),
  },
  getFollowUps: {
    input: z.null(),
    output: z.object({ threadIds: z.array(z.string()) }),
  },
  setFollowUp: {
    input: z
      .object({
        threadId: z.string().min(1).max(512),
        marked: z.boolean(),
      })
      .strict(),
    output: z.object({ threadIds: z.array(z.string()) }),
  },
  /** Which project each folder (bb thread section) was created in. */
  getSectionOwners: {
    input: z.null(),
    output: z.object({ owners: z.record(z.string(), z.string()) }),
  },
  setSectionOwner: {
    input: z
      .object({
        sectionId: z.string().min(1).max(512),
        projectId: z.string().min(1).max(512).nullable(),
      })
      .strict(),
    output: z.object({ owners: z.record(z.string(), z.string()) }),
  },
});

export default async function plugin(bb: BbPluginApi) {
  let layoutWriteQueue: Promise<unknown> = Promise.resolve();
  let preferenceQueue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const request = preferenceQueue.catch(() => undefined).then(work);
    preferenceQueue = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  };
  async function readPreferences() {
    const projectPinnedThreadIds = normalizeFollowUpIds(
      await bb.storage.kv.get(PROJECT_PINS_KEY),
    );
    const folderPlacements = normalizeFolderPlacements(
      await bb.storage.kv.get(THREAD_FOLDERS_KEY),
    );
    const projectLabels = normalizeProjectLabels(
      await bb.storage.kv.get(PROJECT_LABELS_KEY),
    );
    const pinGroups = await readPinGroups();
    try {
      const result = await bb.sdk.plugins.callRpc({
        pluginId: "auto-archive",
        method: "getExemptions",
        input: null,
        outputSchema: exemptionSchema,
      });
      return {
        projectPinnedThreadIds,
        folderPlacements,
        projectLabels,
        pinGroups,
        exemptThreadIds: result.threadIds,
        autoArchiveAvailable: true,
      };
    } catch {
      return {
        projectPinnedThreadIds,
        folderPlacements,
        projectLabels,
        pinGroups,
        exemptThreadIds: [],
        autoArchiveAvailable: false,
      };
    }
  }
  async function readPinGroups(): Promise<PinGroup[]> {
    return normalizePinGroups(await bb.storage.kv.get(PIN_GROUPS_KEY));
  }
  async function writePinGroups(groups: PinGroup[]) {
    await bb.storage.kv.set(PIN_GROUPS_KEY, normalizePinGroups(groups));
  }
  /** Leave every group, or only groups outside `keepProjectId`. */
  async function ungroupThread(threadId: string, keepProjectId?: string) {
    const groups = await readPinGroups();
    const next = groups.map((group) =>
      group.projectId === keepProjectId
        ? group
        : {
            ...group,
            threadIds: group.threadIds.filter((id) => id !== threadId),
          },
    );
    if (JSON.stringify(next) !== JSON.stringify(groups))
      await writePinGroups(next);
  }
  function changed() {
    bb.realtime.publish("thread-preferences-changed", { at: Date.now() });
    return readPreferences();
  }
  async function setThreadFolder(threadId: string, projectId: string) {
    return serialize(async () => {
      const thread = await bb.sdk.threads.get({ threadId });
      if (thread.deletedAt !== null) throw new Error("This thread was deleted");
      // Validate the destination through BB, without changing project ownership
      // or the thread's environment. Only this plugin's folder placement changes.
      await bb.sdk.projects.get({ projectId });
      const placements = new Map(
        normalizeFolderPlacements(
          await bb.storage.kv.get(THREAD_FOLDERS_KEY),
        ).map((placement) => [placement.threadId, placement]),
      );
      if (projectId === thread.projectId) placements.delete(threadId);
      else placements.set(threadId, { threadId, projectId, movedAt: Date.now() });
      await bb.storage.kv.set(THREAD_FOLDERS_KEY, [...placements.values()]);
      // A group belongs to one folder; a moved thread leaves the others.
      await ungroupThread(threadId, projectId);
      return changed();
    });
  }
  async function setPinMode(
    threadId: string,
    mode: "none" | "global" | "project",
  ) {
    return serialize(async () => {
      await writePinMode(threadId, mode);
      return changed();
    });
  }
  /** Callers serialize. Only project pins can sit in a group. */
  async function writePinMode(
    threadId: string,
    mode: "none" | "global" | "project",
  ) {
    const thread = await bb.sdk.threads.get({ threadId });
    if (thread.deletedAt !== null) throw new Error("This thread was deleted");
    const previous = normalizeFollowUpIds(
      await bb.storage.kv.get(PROJECT_PINS_KEY),
    );
    const next = new Set(previous);
    if (mode === "project") next.add(threadId);
    else next.delete(threadId);
    await bb.storage.kv.set(PROJECT_PINS_KEY, [...next]);
    try {
      if (mode === "none" && thread.pinnedAt !== null)
        await bb.sdk.threads.unpin({ threadId });
      else if (mode !== "none" && thread.pinnedAt === null)
        await bb.sdk.threads.pin({ threadId });
    } catch (error) {
      await bb.storage.kv.set(PROJECT_PINS_KEY, previous);
      throw error;
    }
    if (mode !== "project") await ungroupThread(threadId);
    return thread;
  }
  async function setProjectLabel(projectId: string, label: string | null) {
    return serialize(async () => {
      const project = await bb.sdk.projects.get({ projectId });
      const name = label === null ? null : cleanName(label);
      if (label !== null && name === null)
        throw new Error(`Use 1–${NAME_MAX} characters for the folder name`);
      const labels = normalizeProjectLabels(
        await bb.storage.kv.get(PROJECT_LABELS_KEY),
      );
      if (name === null || name === project.name) delete labels[projectId];
      else labels[projectId] = name;
      await bb.storage.kv.set(PROJECT_LABELS_KEY, labels);
      return changed();
    });
  }
  /** Pin a thread in its project and file it in `groupId`'s group. */
  async function fileInGroup(threadId: string, groupId: string) {
    const groups = await readPinGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) throw new Error("This group no longer exists");
    const thread = await bb.sdk.threads.get({ threadId });
    const placement = normalizeFolderPlacements(
      await bb.storage.kv.get(THREAD_FOLDERS_KEY),
    ).find((p) => p.threadId === threadId);
    if ((placement?.projectId ?? thread.projectId) !== group.projectId)
      throw new Error("Pick a group in this thread's own folder");
    await writePinMode(threadId, "project");
    await writePinGroups(
      (await readPinGroups()).map((g) => ({
        ...g,
        threadIds:
          g.id === groupId
            ? [...g.threadIds.filter((id) => id !== threadId), threadId]
            : g.threadIds.filter((id) => id !== threadId),
      })),
    );
  }
  async function createPinGroup(
    projectId: string,
    rawName: string,
    threadId?: string,
  ) {
    return serialize(async () => {
      const name = cleanName(rawName);
      if (name === null)
        throw new Error(`Use 1–${NAME_MAX} characters for the group name`);
      await bb.sdk.projects.get({ projectId });
      const groupId = `grp_${crypto.randomUUID().slice(0, 12)}`;
      await writePinGroups([
        ...(await readPinGroups()),
        { id: groupId, projectId, name, threadIds: [] },
      ]);
      if (threadId)
        try {
          await fileInGroup(threadId, groupId);
        } catch (error) {
          await writePinGroups(
            (await readPinGroups()).filter((g) => g.id !== groupId),
          );
          throw error;
        }
      return changed();
    });
  }
  async function setThreadPinGroup(threadId: string, groupId: string | null) {
    return serialize(async () => {
      if (groupId === null) await ungroupThread(threadId);
      else await fileInGroup(threadId, groupId);
      return changed();
    });
  }
  async function renamePinGroup(groupId: string, rawName: string) {
    return serialize(async () => {
      const name = cleanName(rawName);
      if (name === null)
        throw new Error(`Use 1–${NAME_MAX} characters for the group name`);
      const groups = await readPinGroups();
      if (!groups.some((g) => g.id === groupId))
        throw new Error("This group no longer exists");
      await writePinGroups(
        groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
      );
      return changed();
    });
  }
  async function deletePinGroup(groupId: string) {
    return serialize(async () => {
      await writePinGroups(
        (await readPinGroups()).filter((g) => g.id !== groupId),
      );
      return changed();
    });
  }
  async function setAutoArchiveExempt(threadId: string, exempt: boolean) {
    return serialize(async () => {
      await bb.sdk.plugins.callRpc({
        pluginId: "auto-archive",
        method: "setExemption",
        input: { threadId, exempt },
        outputSchema: exemptionSchema,
      });
      bb.realtime.publish("thread-preferences-changed", { at: Date.now() });
      return readPreferences();
    });
  }
  async function readLayout(): Promise<SidebarLayout> {
    const stored = await bb.storage.kv.get<unknown>(LAYOUT_KEY);
    return normalizeLayout(stored ?? DEFAULT_LAYOUT);
  }

  async function writeLayout(
    next: unknown,
    merge = false,
  ): Promise<SidebarLayout> {
    const request = layoutWriteQueue
      .catch(() => undefined)
      .then(async () => {
        const layout = normalizeLayout(
          merge
            ? { ...(await readLayout()), ...(next as Record<string, unknown>) }
            : next,
        );
        await bb.storage.kv.set(LAYOUT_KEY, layout);
        bb.realtime.publish(LAYOUT_CHANNEL, { at: Date.now() });
        return layout;
      });
    layoutWriteQueue = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  }

  async function readFollowUps(): Promise<string[]> {
    return normalizeFollowUpIds(
      await bb.storage.kv.get<unknown>(FOLLOW_UPS_KEY),
    );
  }

  async function writeFollowUp(
    threadId: string,
    marked: boolean,
  ): Promise<string[]> {
    const request = followUpWriteQueue
      .catch(() => undefined)
      .then(async () => {
        const threadIds = new Set(await readFollowUps());
        if (marked) threadIds.add(threadId);
        else threadIds.delete(threadId);
        const next = [...threadIds];
        await bb.storage.kv.set(FOLLOW_UPS_KEY, next);
        bb.realtime.publish(FOLLOW_UPS_CHANNEL, { at: Date.now() });
        return next;
      });
    followUpWriteQueue = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  }

  let sectionOwnerQueue: Promise<unknown> = Promise.resolve();
  async function readSectionOwners() {
    return normalizeSectionOwners(await bb.storage.kv.get<unknown>(SECTION_OWNERS_KEY));
  }
  function writeSectionOwner(sectionId: string, projectId: string | null) {
    const request = sectionOwnerQueue
      .catch(() => undefined)
      .then(async () => {
        const owners = await readSectionOwners();
        if (projectId) owners[sectionId] = projectId;
        else delete owners[sectionId];
        await bb.storage.kv.set(SECTION_OWNERS_KEY, owners);
        bb.realtime.publish(SECTION_OWNERS_CHANNEL, { at: Date.now() });
        return owners;
      });
    sectionOwnerQueue = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  }

  bb.rpc.register(rpcContract, {
    getThreadPreferences: async () => readPreferences(),
    setThreadFolder: async ({ threadId, projectId }) =>
      setThreadFolder(threadId, projectId),
    setPinMode: async ({ threadId, mode }) => setPinMode(threadId, mode),
    setAutoArchiveExempt: async ({ threadId, exempt }) =>
      setAutoArchiveExempt(threadId, exempt),
    setProjectLabel: async ({ projectId, label }) =>
      setProjectLabel(projectId, label),
    createPinGroup: async ({ projectId, name, threadId }) =>
      createPinGroup(projectId, name, threadId),
    setThreadPinGroup: async ({ threadId, groupId }) =>
      setThreadPinGroup(threadId, groupId),
    renamePinGroup: async ({ groupId, name }) => renamePinGroup(groupId, name),
    deletePinGroup: async ({ groupId }) => deletePinGroup(groupId),
    getLayout: async () => ({ layout: await readLayout() }),
    // An older open client may omit settings added in a newer plugin bundle.
    setLayout: async ({ layout }) => ({
      layout: await writeLayout(layout, true),
    }),
    resetLayout: async () => ({ layout: await writeLayout(DEFAULT_LAYOUT) }),
    getFollowUps: async () => ({ threadIds: await readFollowUps() }),
    setFollowUp: async ({ threadId, marked }) => ({
      threadIds: await writeFollowUp(threadId, marked),
    }),
    getSectionOwners: async () => ({ owners: await readSectionOwners() }),
    setSectionOwner: async ({ sectionId, projectId }) => ({
      owners: await writeSectionOwner(sectionId, projectId),
    }),
  });

  bb.log.info("sidebar-plus loaded");
}
