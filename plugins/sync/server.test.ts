import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it } from "vitest";
import plugin from "./server";

describe("plugin Git sync", () => {
  it("registers local Git sync controls without peer HTTP endpoints", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "sync" });

    await plugin(bb);

    expect(harness.inspection.registrations.httpRoutes).toEqual([]);
    expect(harness.inspection.registrations.rpcMethods).toEqual(["status", "syncNow"]);
  });
});
