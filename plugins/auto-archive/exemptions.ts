import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

export const exemptionResultSchema = z.object({ threadIds: z.array(z.string()) });
const KEY = "auto-archive-exempt-thread-ids";

/** One queue per plugin generation serializes exemption writes and archives. */
export function createExemptions(bb: BbPluginApi) {
  let queue: Promise<unknown> = Promise.resolve();
  const locked = <T>(work: () => Promise<T>): Promise<T> => {
    const request = queue.catch(() => undefined).then(work);
    queue = request.then(() => undefined, () => undefined);
    return request;
  };
  async function read(): Promise<string[]> {
    const stored = await bb.storage.kv.get<unknown>(KEY);
    return Array.isArray(stored)
      ? [...new Set(stored.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];
  }
  async function protectedIds(): Promise<Set<string>> {
    const protectedThreads = new Set<string>();
    for (const exemptId of await read()) {
      let id: string | null = exemptId;
      while (id && !protectedThreads.has(id)) {
        protectedThreads.add(id);
        // Archiving a root cascades. Protect every ancestor of an exempt child.
        // If an ancestor cannot be resolved, fail the sweep closed.
        const thread = await bb.sdk.threads.get({ threadId: id });
        id = thread.deletedAt === null ? thread.parentThreadId : null;
      }
    }
    return protectedThreads;
  }
  return {
    read,
    async set(threadId: string, exempt: boolean): Promise<string[]> {
      return locked(async () => {
        if (exempt) await bb.sdk.threads.get({ threadId });
        const ids = new Set(await read());
        if (exempt) ids.add(threadId);
        else ids.delete(threadId);
        const next = [...ids];
        await bb.storage.kv.set(KEY, next);
        bb.realtime.publish("exemptions-changed", { at: Date.now() });
        return next;
      });
    },
    withProtectedThreads<T>(work: (ids: ReadonlySet<string>) => Promise<T>): Promise<T> {
      return locked(async () => work(await protectedIds()));
    },
  };
}

export type Exemptions = ReturnType<typeof createExemptions>;
