import { describe, expect, it } from "vitest";
import { planSync, type SyncPlugin, type SyncSnapshot } from "./sync-model";

function plugin(overrides: Partial<SyncPlugin> = {}): SyncPlugin {
  return {
    id: "headroom",
    source: "git:https://example.test/headroom.git@v0.2.1",
    resolved: "https://example.test/headroom.git@v0.2.1 (abc123)",
    version: "0.2.1",
    enabled: true,
    settings: { verbose: false },
    secretKeys: [],
    ...overrides,
  };
}

function snapshot(serverId: string, plugins: SyncPlugin[]): SyncSnapshot {
  return {
    protocolVersion: 1,
    serverId,
    generatedAt: 1,
    plugins,
  };
}

describe("planSync", () => {
  it("requires a choice for an initial difference", () => {
    const local = snapshot("mac", [plugin({ enabled: true })]);
    const peer = snapshot("pc", [plugin({ enabled: false })]);

    const plan = planSync(local, peer);

    expect(plan.actions).toMatchObject([
      { kind: "conflict", pluginId: "headroom", direction: "none" },
    ]);
  });

  it("pushes a one-sided enabled-state change after a baseline exists", () => {
    const baseLocal = snapshot("mac", [plugin({ enabled: true })]);
    const basePeer = snapshot("pc", [plugin({ enabled: true })]);
    const local = snapshot("mac", [plugin({ enabled: false })]);
    const peer = snapshot("pc", [plugin({ enabled: true })]);

    const plan = planSync(local, peer, { local: baseLocal, peer: basePeer });

    expect(plan.actions).toMatchObject([
      { kind: "set-enabled", direction: "push", pluginId: "headroom", enabled: false },
    ]);
  });

  it("pushes a one-sided managed plugin upgrade after a baseline exists", () => {
    const baseLocal = snapshot("mac", [plugin({
      source: "git:https://example.test/headroom.git@main",
      resolved: "https://example.test/headroom.git (aaa111)",
      version: "0.2.1",
    })]);
    const basePeer = snapshot("pc", [plugin({
      source: "git:https://example.test/headroom.git@main",
      resolved: "https://example.test/headroom.git (aaa111)",
      version: "0.2.1",
    })]);
    const local = snapshot("mac", [plugin({
      source: "git:https://example.test/headroom.git@main",
      resolved: "https://example.test/headroom.git (bbb222)",
      version: "0.2.2",
    })]);
    const peer = snapshot("pc", [plugin({
      source: "git:https://example.test/headroom.git@main",
      resolved: "https://example.test/headroom.git (aaa111)",
      version: "0.2.1",
    })]);

    const plan = planSync(local, peer, { local: baseLocal, peer: basePeer });

    expect(plan.actions).toMatchObject([
      {
        kind: "update",
        direction: "push",
        pluginId: "headroom",
        source: "git:https://example.test/headroom.git@main",
        resolved: "https://example.test/headroom.git (bbb222)",
        version: "0.2.2",
      },
    ]);
  });

  it("keeps a one-sided downgrade and source replacement as conflicts", () => {
    const baseLocal = snapshot("mac", [plugin({ version: "0.2.1" })]);
    const basePeer = snapshot("pc", [plugin({ version: "0.2.1" })]);
    const downgradedLocal = snapshot("mac", [plugin({
      resolved: "https://example.test/headroom.git@v0.2.0 (aaa111)",
      version: "0.2.0",
    })]);
    const unchangedPeer = snapshot("pc", [plugin({ version: "0.2.1" })]);
    const replacedLocal = snapshot("mac", [plugin({
      source: "git:https://example.test/other.git@main",
      resolved: "https://example.test/other.git (bbb222)",
      version: "0.2.2",
    })]);

    expect(planSync(downgradedLocal, unchangedPeer, { local: baseLocal, peer: basePeer }).actions)
      .toMatchObject([{ kind: "conflict", pluginId: "headroom" }]);
    expect(planSync(replacedLocal, unchangedPeer, { local: baseLocal, peer: basePeer }).actions)
      .toMatchObject([{ kind: "conflict", pluginId: "headroom" }]);
  });

  it("keeps independently changed settings as a conflict", () => {
    const baseLocal = snapshot("mac", [plugin({ settings: { mode: "safe" } })]);
    const basePeer = snapshot("pc", [plugin({ settings: { mode: "safe" } })]);
    const local = snapshot("mac", [plugin({ settings: { mode: "fast" } })]);
    const peer = snapshot("pc", [plugin({ settings: { mode: "careful" } })]);

    const plan = planSync(local, peer, { local: baseLocal, peer: basePeer });

    expect(plan.actions).toMatchObject([
      { kind: "conflict", pluginId: "headroom", direction: "none" },
    ]);
  });
});
