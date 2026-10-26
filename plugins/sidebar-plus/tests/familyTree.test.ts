import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import {
  groupUnderAncestors,
  shouldAutoExpand,
  subtree,
  type TreeNode,
} from "../src/familyTree";
import { buildTree } from "../src/folderThreads";

const thread = (
  id: string,
  parentThreadId: string | null = null,
  indicator: PluginSidebarThread["indicator"] = "none",
) =>
  ({
    id,
    parentThreadId,
    updatedAt: 0,
    indicator,
    hasPendingInteraction: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
  }) as PluginSidebarThread;
const shape = (node: TreeNode): unknown => {
  const id = node.context ? `(${node.thread.id})` : node.thread.id;
  return node.children.length ? { [id]: node.children.map(shape) } : id;
};

describe("status section grouping", () => {
  it("nests a running child under its idle parent and grandparent as context rows", () => {
    const all = [
      thread("root"),
      thread("mid", "root"),
      thread("leaf", "mid", "runtime"),
    ];
    const byId = new Map(all.map((t) => [t.id, t]));
    expect(groupUnderAncestors([all[2]], byId).map(shape)).toEqual([
      { "(root)": [{ "(mid)": ["leaf"] }] },
    ]);
  });
  it("shares one parent between matching siblings and keeps a matching parent as a real row", () => {
    const all = [
      thread("parent", null, "runtime"),
      thread("a", "parent", "runtime"),
      thread("b", "parent", "runtime"),
      thread("solo", null, "runtime"),
    ];
    const byId = new Map(all.map((t) => [t.id, t]));
    const matches = [all[1], all[3], all[0], all[2]];
    expect(groupUnderAncestors(matches, byId).map(shape)).toEqual([
      { parent: ["a", "b"] },
      "solo",
    ]);
  });
  it("survives a parent cycle without looping", () => {
    const all = [thread("x", "y", "runtime"), thread("y", "x")];
    const byId = new Map(all.map((t) => [t.id, t]));
    expect(groupUnderAncestors([all[0]], byId).map(shape)).toEqual([
      { "(y)": ["x"] },
    ]);
  });
});

describe("pinned families", () => {
  it("brings every descendant and opens itself when one of them is working", () => {
    const all = [
      thread("pin"),
      thread("idle", "pin"),
      thread("deep", "idle", "runtime"),
    ];
    const node = subtree(all[0], buildTree(all).childrenOf);
    expect(shape(node)).toEqual({ pin: [{ idle: ["deep"] }] });
    expect(shouldAutoExpand(node, null)).toBe(true);
    const quiet = subtree(
      thread("pin"),
      buildTree([thread("pin"), thread("idle", "pin")]).childrenOf,
    );
    expect(shouldAutoExpand(quiet, null)).toBe(false);
    expect(shouldAutoExpand(quiet, "idle")).toBe(true);
  });
});
