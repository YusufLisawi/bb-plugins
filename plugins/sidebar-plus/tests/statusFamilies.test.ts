import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import type { TreeNode } from "../src/familyTree";
import { buildTree } from "../src/folderThreads";
import { statusFamilies } from "../src/statusFamilies";

const thread = (
  id: string,
  parentThreadId: string | null = null,
  indicator: PluginSidebarThread["indicator"] = "none",
  updatedAt = 10,
) =>
  ({
    id,
    parentThreadId,
    updatedAt,
    indicator,
    hasPendingInteraction: false,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0, goals: 0 },
  }) as PluginSidebarThread;
const shape = (node: TreeNode): unknown => {
  const id = node.context ? `(${node.thread.id})` : node.thread.id;
  return node.children.length ? { [id]: node.children.map(shape) } : id;
};
const run = (all: PluginSidebarThread[], skipRoot?: (t: PluginSidebarThread) => boolean) => {
  const byId = new Map(all.map((t) => [t.id, t]));
  const result = statusFamilies(all, byId, buildTree(all).childrenOf, { doneSince: 0, skipRoot });
  return {
    running: result.running.map(shape),
    done: result.done.map(shape),
    runningIds: [...result.runningIds].sort(),
    doneIds: [...result.doneIds].sort(),
  };
};

describe("In progress and Done by family", () => {
  it("moves an idle parent with a working sub-agent to In progress, with all its subthreads", () => {
    const all = [thread("task"), thread("agent", "task", "background-agent"), thread("idle-agent", "task")];
    const r = run(all);
    expect(r.running).toEqual([{ task: ["agent", "idle-agent"] }]);
    expect(r.runningIds).toEqual(["agent", "idle-agent", "task"]);
  });

  it("lists a working task with working subthreads once, as one family", () => {
    const all = [thread("task", null, "runtime"), thread("a", "task", "runtime"), thread("b", "task", "runtime")];
    expect(run(all).running).toEqual([{ task: ["a", "b"] }]);
  });

  it("puts a finished task and its subthreads in Done only", () => {
    const all = [thread("task", null, "unread-success"), thread("sub", "task")];
    const r = run(all);
    expect(r.done).toEqual([{ task: ["sub"] }]);
    expect(r.doneIds).toEqual(["sub", "task"]);
    expect(r.running).toEqual([]);
  });

  it("keeps a finished subthread of a running family inside In progress, not in Done", () => {
    const all = [thread("task", null, "runtime"), thread("sub", "task", "unread-success")];
    const r = run(all);
    expect(r.running).toEqual([{ task: ["sub"] }]);
    expect(r.done).toEqual([]);
  });

  it("shows a finished subthread of an idle task under its parent, without claiming the parent", () => {
    const all = [thread("task"), thread("sub", "task", "unread-success"), thread("other", "task")];
    const r = run(all);
    expect(r.done).toEqual([{ "(task)": ["sub"] }]);
    expect(r.doneIds).toEqual(["sub"]);
  });

  it("leaves families whose root is skipped (project pins) where they are", () => {
    const all = [thread("pin"), thread("agent", "pin", "runtime")];
    expect(run(all, (root) => root.id === "pin").running).toEqual([]);
  });

  it("orders families by their latest activity", () => {
    const all = [
      thread("old", null, "runtime", 1),
      thread("new"),
      thread("new-agent", "new", "runtime", 50),
    ];
    expect(run(all).running).toEqual([{ new: ["new-agent"] }, "old"]);
  });
});
