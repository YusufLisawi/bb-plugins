import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFakePluginHost,
  makeThreadResponse,
} from "@get-bb/plugin-sdk/testing";
import plugin from "../server";
import {
  parseDeletionDays,
  runCleanup,
  MAX_DELETIONS_PER_SWEEP,
  type CleanupConfig,
} from "../cleanup";
import { createExemptions } from "../exemptions";
import { DAY_MS } from "../sweep";

const now = 100 * DAY_MS;
const config: CleanupConfig = {
  deleteArchivedThreads: true,
  deleteArchivedAfterDays: 13,
  dryRun: false,
};
const old = (
  id: string,
  overrides: Parameters<typeof makeThreadResponse>[0] = {},
) =>
  makeThreadResponse({
    id,
    title: id,
    createdAt: 20 * DAY_MS,
    updatedAt: 80 * DAY_MS,
    latestAttentionAt: 70 * DAY_MS,
    archivedAt: 80 * DAY_MS,
    lastReadAt: null,
    deletedAt: null,
    pinnedAt: null,
    parentThreadId: null,
    lifecycleOwnerThreadId: null,
    status: "idle",
    visibility: "visible",
    queuedMessageCount: 0,
    activeBackgroundAgentCount: 0,
    ...overrides,
  });
const hosts: ReturnType<typeof createFakePluginHost>[] = [];
afterEach(async () => {
  for (const h of hosts.splice(0)) await h.harness.lifecycle.dispose();
});
function setup(rows: ReturnType<typeof old>[]) {
  const host = createFakePluginHost({ pluginId: "auto-archive" });
  hosts.push(host);
  const threads = new Map(rows.map((row) => [row.id, row]));
  const deleted: string[] = [];
  const list = async ({
    archived,
    offset = 0,
    limit = 100,
  }: {
    archived?: boolean;
    offset?: number;
    limit?: number;
  }) =>
    [...threads.values()]
      .filter(
        (thread) =>
          thread.deletedAt === null &&
          (archived === undefined || (thread.archivedAt !== null) === archived),
      )
      .slice(offset, offset + limit)
      .map((thread) => structuredClone(thread));
  const get = async ({ threadId }: { threadId: string }) => {
    const thread = threads.get(threadId);
    if (!thread || thread.deletedAt !== null)
      throw new Error("Thread unavailable");
    return structuredClone(thread);
  };
  host.harness.inspection.sdk.stub("threads.list", list);
  host.harness.inspection.sdk.stub("threads.get", get);
  host.harness.inspection.sdk.stub(
    "threads.delete",
    async ({
      threadId,
      childThreadsConfirmed,
    }: {
      threadId: string;
      childThreadsConfirmed: boolean;
    }) => {
      expect(childThreadsConfirmed).toBe(false);
      if (
        [...threads.values()].some(
          (thread) =>
            thread.deletedAt === null && thread.parentThreadId === threadId,
        )
      ) {
        throw new Error("Child threads require confirmation");
      }
      const current = threads.get(threadId)!;
      expect(current.pinnedAt).toBeNull();
      expect(current.archivedAt).not.toBeNull();
      deleted.push(threadId);
      current.deletedAt = now;
      return { ok: true };
    },
  );
  return {
    ...host,
    threads,
    deleted,
    list,
    get,
    exemptions: createExemptions(host.bb),
  };
}

describe("archived thread cleanup", () => {
  it("is disabled by default, including through the installed CLI", async () => {
    const h = setup([old("old")]);
    const result = await runCleanup(
      h.bb,
      { ...config, deleteArchivedThreads: false },
      { now },
    );
    expect(result.enabled).toBe(false);
    expect(h.deleted).toEqual([]);
    expect(h.harness.inspection.sdk.callsTo("threads.list")).toHaveLength(0);
    await plugin(h.bb);
    expect((await h.harness.behavior.runCli(["cleanup"])).stdout).toContain(
      "cleanup disabled",
    );
    expect(
      (await h.harness.behavior.runCli(["cleanup", "--dry-run"])).stdout,
    ).toContain("candidates 1, deleted 0");
    expect(h.deleted).toEqual([]);
  });
  it("deletes only old archives and never pins or live threads", async () => {
    const h = setup([
      old("old"),
      old("pin", { pinnedAt: now }),
      old("live", { archivedAt: null }),
      old("recent-archive", { archivedAt: now - DAY_MS }),
    ]);
    const result = await runCleanup(h.bb, config, {
      now,
      exemptions: h.exemptions,
    });
    expect(h.deleted).toEqual(["old"]);
    expect(result.deleted).toBe(1);
  });
  it.each([
    ["recent edit", { updatedAt: now - DAY_MS }],
    ["recent attention", { latestAttentionAt: now - DAY_MS }],
    ["recent read", { lastReadAt: now - DAY_MS }],
    ["recent creation", { createdAt: now - DAY_MS }],
    ["running", { status: "active" }],
    ["pending", { status: "pending" }],
    ["queued messages", { queuedMessageCount: 1 }],
    ["background agent", { activeBackgroundAgentCount: 1 }],
    ["hidden worker", { visibility: "hidden" }],
    ["invalid archive time", { archivedAt: NaN }],
    ["invalid activity time", { latestAttentionAt: NaN }],
  ] as const)("retains a thread with %s", async (_reason, override) => {
    const h = setup([old("keep", override)]);
    await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual([]);
  });
  it.each([{ parentThreadId: "root" }, { lifecycleOwnerThreadId: "root" }])(
    "protects pinned children and their family for relation %j",
    async (relation) => {
      const h = setup([
        old("root"),
        old("pin", { ...relation, pinnedAt: now }),
        old("sibling", { parentThreadId: "root" }),
      ]);
      await runCleanup(h.bb, config, { now });
      expect(h.deleted).toEqual([]);
    },
  );
  it("protects children under a pinned parent and a recent child protects siblings", async () => {
    const h = setup([
      old("pin", { pinnedAt: now }),
      old("child", { parentThreadId: "pin" }),
      old("root"),
      old("recent", { parentThreadId: "root", lastReadAt: now }),
      old("sibling", { parentThreadId: "root" }),
    ]);
    await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual([]);
  });
  it("protects explicit exemptions and their whole family", async () => {
    const h = setup([
      old("root"),
      old("keep", { parentThreadId: "root" }),
      old("sibling", { parentThreadId: "root" }),
    ]);
    await h.exemptions.set("keep", true);
    await runCleanup(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.deleted).toEqual([]);
  });
  it("deletes old children individually and only removes their parent after they are gone", async () => {
    const h = setup([
      old("root"),
      old("child", { parentThreadId: "root", lifecycleOwnerThreadId: "root" }),
    ]);
    await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual(["child"]);
    await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual(["child", "root"]);
  });
  it("retains orphaned relations while allowing unrelated old archives to be cleaned", async () => {
    const h = setup([old("orphan", { parentThreadId: "missing" }), old("old")]);
    await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual(["old"]);
  });
  it("fails closed when a thread scan is unavailable", async () => {
    const h = setup([old("old")]);
    h.harness.inspection.sdk.stub("threads.list", async () => {
      throw new Error("Disconnected");
    });
    await expect(runCleanup(h.bb, config, { now })).rejects.toThrow(
      "Disconnected",
    );
    expect(h.deleted).toEqual([]);
  });
  it.each(["pin", "unarchive", "read", "work"])(
    "rechecks %s changes during validation",
    async (change) => {
      const h = setup([old("keep")]);
      h.harness.inspection.sdk.stub(
        "threads.get",
        async (args: { threadId: string }) => {
          const thread = h.threads.get(args.threadId)!;
          if (change === "pin") thread.pinnedAt = now;
          if (change === "unarchive") thread.archivedAt = null;
          if (change === "read") thread.lastReadAt = now;
          if (change === "work") thread.queuedMessageCount = 1;
          return h.get(args);
        },
      );
      const result = await runCleanup(h.bb, config, { now });
      expect(h.deleted).toEqual([]);
      expect(result.skipped).toBe(1);
    },
  );
  it("rechecks an exemption added after candidate collection", async () => {
    const h = setup([old("keep")]);
    let marked = false;
    h.harness.inspection.sdk.stub(
      "threads.list",
      async (args: Parameters<typeof h.list>[0]) => {
        if (!marked) {
          marked = true;
          await h.exemptions.set("keep", true);
        }
        return h.list(args);
      },
    );
    const result = await runCleanup(h.bb, config, {
      now,
      exemptions: h.exemptions,
    });
    expect(h.deleted).toEqual([]);
    expect(result.skipped).toBe(1);
  });
  it("refuses a child attached between validation and the core delete request", async () => {
    const h = setup([old("root")]);
    h.harness.inspection.sdk.stub(
      "threads.get",
      async (args: { threadId: string }) => {
        const current = await h.get(args);
        h.threads.set(
          "new-pin",
          old("new-pin", { parentThreadId: "root", pinnedAt: now }),
        );
        return current;
      },
    );
    const result = await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual([]);
    expect(result.errors).toBe(1);
  });
  it("stops deletion if cleanup is disabled during the pass", async () => {
    const h = setup([old("keep")]);
    const canDelete = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    await runCleanup(h.bb, config, { now, canDelete });
    expect(h.deleted).toEqual([]);
  });
  it("keeps dry runs and previews read-only, even while deletion is disabled", async () => {
    const h = setup([old("old")]);
    expect(
      (await runCleanup(h.bb, config, { now, dryRun: true })).candidates,
    ).toBe(1);
    expect(
      (
        await runCleanup(
          h.bb,
          { ...config, deleteArchivedThreads: false },
          { now, preview: true },
        )
      ).candidates,
    ).toBe(1);
    expect(h.deleted).toEqual([]);
  });
  it("pages through more than 100 archived threads and limits real deletion to 25 per sweep", async () => {
    const h = setup(Array.from({ length: 105 }, (_, i) => old(`old-${i}`)));
    const result = await runCleanup(h.bb, config, { now });
    expect(result.candidates).toBe(105);
    expect(result.deleted).toBe(MAX_DELETIONS_PER_SWEEP);
    expect(result.skipped).toBe(80);
  });
  it.each(["", "0", "-1", "13.5", "NaN", "Infinity", "1e3", "0x13", "36501"])(
    "disables deletion for invalid retention %j",
    async (raw) => {
      const h = setup([old("old")]);
      expect(parseDeletionDays(raw)).toBeNull();
      await runCleanup(
        h.bb,
        { ...config, deleteArchivedAfterDays: parseDeletionDays(raw) },
        { now },
      );
      expect(h.deleted).toEqual([]);
    },
  );
  it("accepts valid whole-day retention and applies the archive-age boundary", async () => {
    expect(parseDeletionDays(" 13 ")).toBe(13);
    const h = setup([
      old("exact", { archivedAt: now - 13 * DAY_MS }),
      old("too-new", { archivedAt: now - 13 * DAY_MS + 1 }),
    ]);
    await runCleanup(h.bb, config, { now });
    expect(h.deleted).toEqual(["exact"]);
  });
});
