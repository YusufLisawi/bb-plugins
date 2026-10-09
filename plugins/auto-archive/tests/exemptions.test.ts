import { afterEach, describe, expect, it } from "vitest";
import {
  createFakePluginHost,
  makeThreadResponse,
} from "@get-bb/plugin-sdk/testing";
import plugin, { runSweep, type ResolvedSweepConfig } from "../server";
import { createExemptions } from "../exemptions";
import { DAY_MS, parseInactivityDays } from "../sweep";

const now = 100 * DAY_MS;
const config: ResolvedSweepConfig = {
  inactivityDays: 15,
  archiveHidden: false,
  archiveRunning: false,
  sinceInstallAt: DAY_MS,
  dryRun: false,
  deleteArchivedThreads: false,
  deleteArchivedAfterDays: 13,
};
const stale = (
  id: string,
  overrides: Parameters<typeof makeThreadResponse>[0] = {},
) =>
  makeThreadResponse({
    id,
    status: "idle",
    latestAttentionAt: 20 * DAY_MS,
    pinnedAt: null,
    parentThreadId: null,
    archivedAt: null,
    deletedAt: null,
    visibility: "visible",
    ...overrides,
  });
const hosts: ReturnType<typeof createFakePluginHost>[] = [];
afterEach(async () => {
  for (const host of hosts.splice(0)) await host.harness.lifecycle.dispose();
});
function setup(threads: ReturnType<typeof stale>[]) {
  const host = createFakePluginHost({ pluginId: "auto-archive" });
  hosts.push(host);
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const archived: string[] = [];
  host.harness.inspection.sdk.stub(
    "threads.list",
    async ({
      archived,
      offset = 0,
      limit = 100,
    }: {
      archived?: boolean;
      offset?: number;
      limit?: number;
    }) =>
      [...byId.values()]
        .filter(
          (thread) =>
            thread.deletedAt === null &&
            (archived === undefined ||
              (thread.archivedAt !== null) === archived),
        )
        .slice(offset, offset + limit)
        .map((thread) => structuredClone(thread)),
  );
  host.harness.inspection.sdk.stub(
    "threads.get",
    async ({ threadId }: { threadId: string }) => {
      const thread = byId.get(threadId);
      if (!thread) throw new Error("Thread unavailable");
      return thread;
    },
  );
  host.harness.inspection.sdk.stub(
    "threads.archive",
    async ({ threadId }: { threadId: string }) => {
      archived.push(threadId);
      return byId.get(threadId);
    },
  );
  return { ...host, archived, byId, exemptions: createExemptions(host.bb) };
}

describe("archive exemptions", () => {
  it("never archives a pin even if an old configuration requested archiving pins", async () => {
    const h = setup([stale("keep", { pinnedAt: now })]);
    const legacy = { ...config, archivePinned: true };
    await runSweep(h.bb, legacy, { now, exemptions: h.exemptions });
    expect(h.archived).toEqual([]);
  });
  it("protects a root when a visible or lifecycle child is pinned", async () => {
    const h = setup([
      stale("root"),
      stale("child", { parentThreadId: "root", pinnedAt: now }),
      stale("owner"),
      stale("worker", { lifecycleOwnerThreadId: "owner", pinnedAt: now }),
    ]);
    await runSweep(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.archived).toEqual([]);
  });
  it("protects parents with recent or queued child work", async () => {
    const h = setup([
      stale("root"),
      stale("recent", { parentThreadId: "root", latestAttentionAt: now }),
      stale("owner"),
      stale("worker", {
        lifecycleOwnerThreadId: "owner",
        queuedMessageCount: 1,
      }),
    ]);
    await runSweep(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.archived).toEqual([]);
  });
  it("defaults to 15 days if an invalid threshold is supplied", () => {
    expect(parseInactivityDays("invalid")).toBe(15);
    expect(parseInactivityDays("0")).toBe(15);
    expect(parseInactivityDays("30")).toBe(30);
  });
  it("removes an exemption when its thread is deleted", async () => {
    const h = setup([stale("deleted")]);
    await plugin(h.bb);
    await h.harness.behavior.callRpc("setExemption", {
      threadId: "deleted",
      exempt: true,
    });
    await h.harness.behavior.emitThreadEvent("thread.deleted", {
      thread: stale("deleted", { deletedAt: now }),
    });
    expect(await h.harness.behavior.callRpc("getExemptions", null)).toEqual({
      threadIds: [],
    });
  });
  it("keeps an unpinned exempt thread and archives an ordinary stale thread", async () => {
    const h = setup([
      stale("keep"),
      stale("old"),
      stale("recent", { latestAttentionAt: now - DAY_MS }),
    ]);
    await h.exemptions.set("keep", true);
    const stats = await runSweep(h.bb, config, {
      now,
      exemptions: h.exemptions,
    });
    expect(h.archived).toEqual(["old"]);
    expect(stats.archived).toBe(1);
    expect(h.byId.get("keep")!.pinnedAt).toBeNull();
    await h.exemptions.set("keep", false);
    await runSweep(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.archived).toContain("keep");
  });
  it("protects all ancestors of an exempt child from cascading archive", async () => {
    const h = setup([
      stale("root"),
      stale("child", { parentThreadId: "root" }),
      stale("grandchild", { parentThreadId: "child" }),
      stale("other"),
    ]);
    await h.exemptions.set("grandchild", true);
    await runSweep(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.archived).toEqual(["other"]);
  });
  it("rechecks an exemption added while scanning", async () => {
    const h = setup([stale("keep")]);
    let marked = false;
    h.harness.inspection.sdk.stub("threads.list", async () => {
      if (!marked) {
        marked = true;
        await h.exemptions.set("keep", true);
      }
      return [stale("keep")];
    });
    await runSweep(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.archived).toEqual([]);
  });
  it("rechecks pins and work started after candidate selection", async () => {
    const h = setup([stale("pin"), stale("work")]);
    h.harness.inspection.sdk.stub("threads.list", async () => {
      const page = [stale("pin"), stale("work")];
      h.byId.set("pin", stale("pin", { pinnedAt: now }));
      h.byId.set("work", stale("work", { status: "active" }));
      return page;
    });
    await runSweep(h.bb, config, { now, exemptions: h.exemptions });
    expect(h.archived).toEqual([]);
  });
  it("does not sweep when an exempt thread's ancestry cannot be resolved", async () => {
    const h = setup([stale("missing"), stale("other")]);
    await h.exemptions.set("missing", true);
    h.byId.delete("missing");
    await expect(
      runSweep(h.bb, config, { now, exemptions: h.exemptions }),
    ).rejects.toThrow("Thread unavailable");
    expect(h.archived).toEqual([]);
  });
  it("serializes simultaneous writes and persists through plugin reload", async () => {
    const h = setup([stale("one"), stale("two")]);
    await plugin(h.bb);
    await Promise.all([
      h.harness.behavior.callRpc("setExemption", {
        threadId: "one",
        exempt: true,
      }),
      h.harness.behavior.callRpc("setExemption", {
        threadId: "two",
        exempt: true,
      }),
    ]);
    const reloaded = await h.harness.lifecycle.reload(plugin);
    hosts.push(reloaded);
    expect(
      await reloaded.harness.behavior.callRpc("getExemptions", null),
    ).toEqual({ threadIds: ["one", "two"] });
  });
  it("keeps dry runs read-only and rejects malformed exemption requests", async () => {
    const h = setup([stale("old")]);
    const stats = await runSweep(h.bb, config, { now, dryRun: true });
    expect(stats.candidates).toBe(1);
    expect(h.archived).toEqual([]);
    await plugin(h.bb);
    await expect(
      h.harness.behavior.callRpc("setExemption", {
        threadId: "",
        exempt: true,
      }),
    ).rejects.toThrow();
  });
});
