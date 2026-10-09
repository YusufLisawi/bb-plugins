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
      makeThreadResponse({ id, pinnedAt: null, deletedAt: null }),
    ]),
  );
  const exemptions = new Set<string>();
  h.harness.inspection.sdk.stub(
    "threads.get",
    async ({ threadId }: { threadId: string }) => threads.get(threadId),
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
