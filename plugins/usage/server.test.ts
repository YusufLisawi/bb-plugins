import assert from "node:assert/strict";
import { test } from "node:test";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server.ts";

test("plan overrides persist across reloads, handle concurrent saves, and can be cleared", async () => {
  let { bb, harness } = createFakePluginHost({ pluginId: "usage" });
  try {
    await plugin(bb);
    assert.deepEqual(await harness.behavior.callRpc("getPlanOverrides", null), {});
    await Promise.all([
      harness.behavior.callRpc("setPlanOverride", { accountId: "one", plan: "ultra" }),
      harness.behavior.callRpc("setPlanOverride", { accountId: "two", plan: "ultra" }),
    ]);
    assert.deepEqual(await harness.behavior.callRpc("getPlanOverrides", null), { one: "ultra", two: "ultra" });
    ({ bb, harness } = await harness.lifecycle.reload(plugin));
    assert.deepEqual(await harness.behavior.callRpc("getPlanOverrides", null), { one: "ultra", two: "ultra" });
    assert.deepEqual(await harness.behavior.callRpc("setPlanOverride", { accountId: "one", plan: null }), { two: "ultra" });
    await assert.rejects(harness.behavior.callRpc("setPlanOverride", { accountId: "two", plan: "20x" }));
  } finally { await harness.lifecycle.dispose(); }
});
