import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { buildTree, folderThreads } from "../src/folderThreads";
const thread = (
  id: string,
  updatedAt: number,
  parentThreadId: string | null = null,
  isPinned = false,
) => ({ id, updatedAt, parentThreadId, isPinned }) as PluginSidebarThread;
describe("project folder pagination", () => {
  it("shows newest five and advances by five until the final partial page", () => {
    const threads = Array.from({ length: 12 }, (_, i) => thread(String(i), i));
    expect(folderThreads(threads, new Set(), 5).page.map((t) => t.id)).toEqual([
      "11",
      "10",
      "9",
      "8",
      "7",
    ]);
    expect(folderThreads(threads, new Set(), 10).hiddenCount).toBe(2);
    expect(folderThreads(threads, new Set(), 15).page).toHaveLength(12);
  });
  it("keeps project pins visible outside the five recent threads", () => {
    const threads = [
      thread("pin", 0, null, true),
      ...Array.from({ length: 8 }, (_, i) => thread(String(i), i + 1)),
    ];
    const result = folderThreads(threads, new Set(["pin"]), 5);
    expect(result.pinned.map((t) => t.id)).toEqual(["pin"]);
    expect(result.page).toHaveLength(5);
    expect(result.page.some((t) => t.id === "pin")).toBe(false);
  });
  it("counts child threads in the page and keeps children reachable when their parent is outside it", () => {
    const threads = [
      thread("parent", 0),
      ...Array.from({ length: 9 }, (_, i) =>
        thread(String(i), i + 1, "parent"),
      ),
    ];
    const page = folderThreads(threads, new Set(), 5).page;
    expect(page).toHaveLength(5);
    expect(buildTree(page).roots).toHaveLength(5);
    const tree = buildTree(folderThreads(threads, new Set(), 10).page);
    expect(tree.roots.map((t) => t.id)).toEqual(["parent"]);
    expect(tree.childrenOf.get("parent")).toHaveLength(9);
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
