// bb-plugin-sidebar-plus — backend: stores sidebar layout and follow-up marks
// in kv, then broadcasts changes so every open window repaints at once.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
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

const preferenceSchema = z.object({
  projectPinnedThreadIds: z.array(z.string()),
  exemptThreadIds: z.array(z.string()),
  autoArchiveAvailable: z.boolean(),
  folderPlacements: z.array(folderPlacementSchema),
});
const exemptionSchema = z.object({ threadIds: z.array(z.string()) });
const PROJECT_PINS_KEY = "project-pinned-thread-ids";
const THREAD_FOLDERS_KEY = "thread-folder-placements";

const LAYOUT_KEY = "layout";
const LAYOUT_CHANNEL = "layout-changed";
const FOLLOW_UPS_KEY = "follow-up-thread-ids";
const FOLLOW_UPS_CHANNEL = "follow-ups-changed";
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
        exemptThreadIds: result.threadIds,
        autoArchiveAvailable: true,
      };
    } catch {
      return {
        projectPinnedThreadIds,
        folderPlacements,
        exemptThreadIds: [],
        autoArchiveAvailable: false,
      };
    }
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
      bb.realtime.publish("thread-preferences-changed", { at: Date.now() });
      return readPreferences();
    });
  }
  async function setPinMode(
    threadId: string,
    mode: "none" | "global" | "project",
  ) {
    return serialize(async () => {
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
      bb.realtime.publish("thread-preferences-changed", { at: Date.now() });
      return readPreferences();
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

  bb.rpc.register(rpcContract, {
    getThreadPreferences: async () => readPreferences(),
    setThreadFolder: async ({ threadId, projectId }) =>
      setThreadFolder(threadId, projectId),
    setPinMode: async ({ threadId, mode }) => setPinMode(threadId, mode),
    setAutoArchiveExempt: async ({ threadId, exempt }) =>
      setAutoArchiveExempt(threadId, exempt),
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
  });

  bb.log.info("sidebar-plus loaded");
}
