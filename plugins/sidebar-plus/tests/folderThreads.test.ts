import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { folderThreads } from "../src/folderThreads";
import type { TreeNode } from "../src/familyTree";
const thread = (
  id: string,
  updatedAt: number,
  parentThreadId: string | null = null,
  isPinned = false,
) => ({ id, updatedAt, parentThreadId, isPinned }) as PluginSidebarThread;
const ids = (nodes: readonly TreeNode[]) => nodes.map((node) => node.thread.id);
const shape = (node: TreeNode): unknown =>
  node.children.length
    ? { [node.thread.id]: node.children.map(shape) }
    : node.thread.id;
describe("project folder pagination", () => {
  it("shows newest five families and advances by five until the final partial page", () => {
    const threads = Array.from({ length: 12 }, (_, i) => thread(String(i), i));
    expect(ids(folderThreads(threads, new Set(), 5).page)).toEqual([
      "11",
      "10",
      "9",
      "8",
      "7",
    ]);
    expect(folderThreads(threads, new Set(), 10).hiddenCount).toBe(2);
    expect(folderThreads(threads, new Set(), 15).page).toHaveLength(12);
  });
  it("keeps project pins visible outside the five recent families", () => {
    const threads = [
      thread("pin", 0, null, true),
      ...Array.from({ length: 8 }, (_, i) => thread(String(i), i + 1)),
    ];
    const result = folderThreads(threads, new Set(["pin"]), 5);
    expect(ids(result.pinned)).toEqual(["pin"]);
    expect(result.page).toHaveLength(5);
    expect(ids(result.page)).not.toContain("pin");
  });
  it("keeps children under an older parent and ranks the family by its newest child", () => {
    const threads = [
      thread("parent", 0),
      ...Array.from({ length: 9 }, (_, i) => thread(`c${i}`, i + 10, "parent")),
      ...Array.from({ length: 6 }, (_, i) => thread(`r${i}`, i + 1)),
    ];
    const { page, hiddenCount } = folderThreads(threads, new Set(), 5);
    expect(ids(page)).toEqual(["parent", "r5", "r4", "r3", "r2"]);
    expect(page[0].children).toHaveLength(9);
    expect(hiddenCount).toBe(2);
  });
  it("moves a project pin's whole family above the page, grandchildren included", () => {
    const threads = [
      thread("pin", 0, null, true),
      thread("child", 5, "pin"),
      thread("grandchild", 6, "child"),
      thread("other", 3),
    ];
    const result = folderThreads(threads, new Set(["pin"]), 5);
    expect(result.pinned.map(shape)).toEqual([
      { pin: [{ child: ["grandchild"] }] },
    ]);
    expect(ids(result.page)).toEqual(["other"]);
  });
  it("lifts a project-pinned child out of its parent's family with its own children", () => {
    const threads = [
      thread("parent", 9),
      thread("pinned-child", 1, "parent", true),
      thread("grandchild", 2, "pinned-child"),
      thread("sibling", 3, "parent"),
    ];
    const result = folderThreads(threads, new Set(["pinned-child"]), 5);
    expect(result.pinned.map(shape)).toEqual([
      { "pinned-child": ["grandchild"] },
    ]);
    expect(result.page.map(shape)).toEqual([{ parent: ["sibling"] }]);
  });
  it("does not treat an externally unpinned thread as a project pin", () => {
    const result = folderThreads(
      [thread("old-pin", 1)],
      new Set(["old-pin"]),
      5,
    );
    expect(result.pinned).toEqual([]);
    expect(result.page).toHaveLength(1);
  });
});
