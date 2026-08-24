import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it } from "vitest";
import plugin, { redactedPluginSettings } from "./server";

describe("plugin HTTP routes", () => {
  it("registers public peer endpoints with absolute paths", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "sync" });

    await plugin(bb);

    expect(harness.inspection.registrations.httpRoutes.map((route) => route.path)).toEqual([
      "/identity",
      "/snapshot",
      "/apply",
    ]);
  });

  it("keeps a disabled plugin in a snapshot when its settings factory is unavailable", async () => {
    await expect(
      redactedPluginSettings(async () => {
        throw new Error("HTTP 404: unknown plugin, or plugin is not running");
      }),
    ).resolves.toEqual({ settings: {}, secretKeys: [] });
  });
});
