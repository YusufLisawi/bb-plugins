import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { buildTree } from "../src/folderThreads";
import { subthreadCleanupPlan } from "../src/subthreadCleanup";

const thread = (
  id: string,
  parentThreadId: string | null = null,
  indicator: PluginSidebarThread["indicator"] = "none",
  hasPendingInteraction = false,
) =>
  ({
    id,
    parentThreadId,
    updatedAt: 0,
    indicator,
    hasPendingInteraction,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0, goals: 0 },
  }) as PluginSidebarThread;

const plan = (all: PluginSidebarThread[], id: string) => {
  const result = subthreadCleanupPlan(id, buildTree(all).childrenOf);
  return { archive: result.archive.map((t) => t.id), archivedCount: result.archivedCount, keptCount: result.keptCount };
};

describe("clean up subthreads", () => {
  it("archives every finished subthread, counting what each one takes with it", () => {
    const all = [thread("p"), thread("a", "p"), thread("a1", "a"), thread("b", "p", "unread-success")];
    expect(plan(all, "p")).toEqual({ archive: ["a", "b"], archivedCount: 3, keptCount: 0 });
  });

  it("keeps a running subthread and never archives a finished one that has a running child", () => {
    const all = [
      thread("p"),
      thread("run", "p", "runtime"),
      thread("idle-parent", "p"),
      thread("busy-grandchild", "idle-parent", "background-agent"),
      thread("idle-grandchild", "idle-parent"),
    ];
    expect(plan(all, "p")).toEqual({ archive: ["idle-grandchild"], archivedCount: 1, keptCount: 3 });
  });

  it("keeps subthreads waiting on you", () => {
    const all = [thread("p"), thread("asks", "p", "none", true), thread("waits", "p", "waiting-for-input")];
    expect(plan(all, "p")).toEqual({ archive: [], archivedCount: 0, keptCount: 2 });
  });

  it("never archives the parent itself, and a thread without subthreads has nothing to clean", () => {
    const all = [thread("p"), thread("c", "p")];
    expect(plan(all, "p").archive).not.toContain("p");
    expect(plan(all, "c")).toEqual({ archive: [], archivedCount: 0, keptCount: 0 });
  });
});
