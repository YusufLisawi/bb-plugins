import { afterEach, describe, expect, it } from "vitest";
import {
  createFakePluginHost,
  makeThreadResponse,
} from "@get-bb/plugin-sdk/testing";
import plugin from "../server";

const hosts: ReturnType<typeof createFakePluginHost>[] = [];
afterEach(async () => {
  for (const h of hosts.splice(0)) await h.harness.lifecycle.dispose();
});
async function setup() {
  const h = createFakePluginHost({ pluginId: "sidebar-plus" });
  hosts.push(h);
  const threads = new Map(
    ["one", "two"].map((id) => [
      id,
      makeThreadResponse({
        id,
        projectId: "source",
        environmentId: "env_original",
        pinnedAt: null,
        deletedAt: null,
      }),
    ]),
  );
  const exemptions = new Set<string>();
  h.harness.inspection.sdk.stub(
    "threads.get",
    async ({ threadId }: { threadId: string }) => threads.get(threadId),
  );
  h.harness.inspection.sdk.stub(
    "projects.get",
    async ({ projectId }: { projectId: string }) => {
      if (!["source", "destination", "other"].includes(projectId))
        throw new Error("Project not found");
      return { id: projectId };
    },
  );
  h.harness.inspection.sdk.stub(
    "threads.pin",
    async ({ threadId }: { threadId: string }) => {
      const thread = threads.get(threadId)!;
      thread.pinnedAt = 1;
      return thread;
    },
  );
  h.harness.inspection.sdk.stub(
    "threads.unpin",
    async ({ threadId }: { threadId: string }) => {
      const thread = threads.get(threadId)!;
      thread.pinnedAt = null;
      return thread;
    },
  );
  h.harness.inspection.sdk.stub(
    "plugins.callRpc",
    async ({
      method,
      input,
    }: {
      method: string;
      input: { threadId: string; exempt: boolean };
    }) => {
      if (method === "setExemption") {
        if (input.exempt) exemptions.add(input.threadId);
        else exemptions.delete(input.threadId);
      }
      return { threadIds: [...exemptions] };
    },
  );
  await plugin(h.bb);
  return { ...h, threads, exemptions };
}
describe("thread preferences", () => {
  it("moves a project pin without changing its core project, workspace, pin or archive exemption", async () => {
    const h = await setup();
    await h.harness.behavior.callRpc("setPinMode", {
      threadId: "one",
      mode: "project",
    });
    await h.harness.behavior.callRpc("setAutoArchiveExempt", {
      threadId: "one",
      exempt: true,
    });
    const original = structuredClone(h.threads.get("one"));
    const result = await h.harness.behavior.callRpc("setThreadFolder", {
      threadId: "one",
      projectId: "destination",
    });
    expect(result).toMatchObject({
      projectPinnedThreadIds: ["one"],
      exemptThreadIds: ["one"],
      folderPlacements: [
        {
          threadId: "one",
          projectId: "destination",
          movedAt: expect.any(Number),
        },
      ],
    });
    expect(h.threads.get("one")).toEqual(original);
    expect(h.harness.inspection.sdk.callsTo("threads.update")).toHaveLength(0);
    expect(h.harness.inspection.sdk.callsTo("threads.pin")).toHaveLength(1);
    expect(h.harness.inspection.sdk.callsTo("threads.unpin")).toHaveLength(0);
    const reloaded = await h.harness.lifecycle.reload(plugin);
    hosts.push(reloaded);
    expect(
      await reloaded.harness.behavior.callRpc("getThreadPreferences", null),
    ).toMatchObject({
      projectPinnedThreadIds: ["one"],
      folderPlacements: result.folderPlacements,
    });
  });
  it("keeps concurrent folder moves, supports returning to the original folder, and rejects unavailable destinations", async () => {
    const h = await setup();
    await Promise.all([
      h.harness.behavior.callRpc("setThreadFolder", {
        threadId: "one",
        projectId: "destination",
      }),
      h.harness.behavior.callRpc("setThreadFolder", {
        threadId: "two",
        projectId: "other",
      }),
    ]);
    const before = await h.harness.behavior.callRpc(
      "getThreadPreferences",
      null,
    );
    await expect(
      h.harness.behavior.callRpc("setThreadFolder", {
        threadId: "one",
        projectId: "missing",
      }),
    ).rejects.toThrow("Project not found");
    expect(
      await h.harness.behavior.callRpc("getThreadPreferences", null),
    ).toEqual(before);
    expect(
      await h.harness.behavior.callRpc("setThreadFolder", {
        threadId: "one",
        projectId: "source",
      }),
    ).toMatchObject({
      folderPlacements: [
        { threadId: "two", projectId: "other" },
      ],
    });
    h.threads.get("one")!.deletedAt = 1;
    await expect(
      h.harness.behavior.callRpc("setThreadFolder", {
        threadId: "one",
        projectId: "destination",
      }),
    ).rejects.toThrow("This thread was deleted");
  });
  it("persists folder order across reload, preserves it for older clients, and resets to automatic order", async () => {
    const h = await setup();
    await h.harness.behavior.callRpc("setLayout", {
      layout: { projectOrder: ["two", "one"] },
    });
    await h.harness.behavior.callRpc("setLayout", {
      layout: { statusColors: false },
    });
    const reloaded = await h.harness.lifecycle.reload(plugin);
    hosts.push(reloaded);
    expect(
      await reloaded.harness.behavior.callRpc("getLayout", null),
    ).toMatchObject({
      layout: { projectOrder: ["two", "one"], statusColors: false },
    });
    expect(
      await reloaded.harness.behavior.callRpc("resetLayout", null),
    ).toMatchObject({ layout: { projectOrder: [] } });
  });
  it("serializes concurrent settings edits so an order change is preserved", async () => {
    const h = await setup();
    await Promise.all([
      h.harness.behavior.callRpc("setLayout", {
        layout: { projectOrder: ["two", "one"] },
      }),
      h.harness.behavior.callRpc("setLayout", {
        layout: { navGridColumns: 4 },
      }),
    ]);
    expect(await h.harness.behavior.callRpc("getLayout", null)).toMatchObject({
      layout: { projectOrder: ["two", "one"], navGridColumns: 4 },
    });
  });
  it("pins inside a project and moves an existing pin globally without repinning", async () => {
    const h = await setup();
    expect(
      await h.harness.behavior.callRpc("setPinMode", {
        threadId: "one",
        mode: "project",
      }),
    ).toMatchObject({ projectPinnedThreadIds: ["one"] });
    expect(h.threads.get("one")!.pinnedAt).toBe(1);
    expect(
      await h.harness.behavior.callRpc("setPinMode", {
        threadId: "one",
        mode: "global",
      }),
    ).toMatchObject({ projectPinnedThreadIds: [] });
    expect(h.harness.inspection.sdk.callsTo("threads.pin")).toHaveLength(1);
    await h.harness.behavior.callRpc("setPinMode", {
      threadId: "one",
      mode: "none",
    });
    expect(h.threads.get("one")!.pinnedAt).toBeNull();
  });
  it("keeps concurrent project pins and preserves them after reload", async () => {
    const h = await setup();
    await Promise.all(
      ["one", "two"].map((threadId) =>
        h.harness.behavior.callRpc("setPinMode", { threadId, mode: "project" }),
      ),
    );
    const reloaded = await h.harness.lifecycle.reload(plugin);
    hosts.push(reloaded);
    expect(
      await reloaded.harness.behavior.callRpc("getThreadPreferences", null),
    ).toMatchObject({ projectPinnedThreadIds: ["one", "two"] });
  });
  it("rolls back project placement if the core pin fails", async () => {
    const h = await setup();
    h.harness.inspection.sdk.stub("threads.pin", async () => {
      throw new Error("Pin failed");
    });
    await expect(
      h.harness.behavior.callRpc("setPinMode", {
        threadId: "one",
        mode: "project",
      }),
    ).rejects.toThrow("Pin failed");
    expect(
      await h.harness.behavior.callRpc("getThreadPreferences", null),
    ).toMatchObject({ projectPinnedThreadIds: [] });
  });
  it("disables auto-archive independently of pinning", async () => {
    const h = await setup();
    expect(
      await h.harness.behavior.callRpc("setAutoArchiveExempt", {
        threadId: "one",
        exempt: true,
      }),
    ).toMatchObject({ exemptThreadIds: ["one"] });
    expect(h.threads.get("one")!.pinnedAt).toBeNull();
    expect(h.harness.inspection.sdk.callsTo("threads.pin")).toHaveLength(0);
    await h.harness.behavior.callRpc("setAutoArchiveExempt", {
      threadId: "one",
      exempt: false,
    });
    expect(h.exemptions.size).toBe(0);
  });
  it("keeps project placement available when auto-archive is disconnected", async () => {
    const h = await setup();
    h.harness.inspection.sdk.stub("plugins.callRpc", async () => {
      throw new Error("Plugin offline");
    });
    expect(
      await h.harness.behavior.callRpc("setPinMode", {
        threadId: "one",
        mode: "project",
      }),
    ).toMatchObject({
      projectPinnedThreadIds: ["one"],
      autoArchiveAvailable: false,
    });
  });
});
