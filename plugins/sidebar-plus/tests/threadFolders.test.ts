import { describe, expect, it } from "vitest";
import { folderThreads, buildTree } from "../src/folderThreads";
import {
  normalizeFolderPlacements,
  threadFolderId,
} from "../src/threadFolders";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

describe("thread folder placement", () => {
  it("falls back after a destination is removed, without losing the native project or parent", () => {
    const thread = {
      id: "child",
      projectId: "source",
      parentThreadId: "parent",
      updatedAt: 1,
    } as PluginSidebarThread;
    const placements = new Map([
      ["child", { threadId: "child", projectId: "target", movedAt: 99 }],
    ]);
    expect(
      threadFolderId(thread, placements, new Set(["source", "target"])),
    ).toBe("target");
    expect(threadFolderId(thread, placements, new Set(["source"]))).toBe(
      "source",
    );
    expect(thread.projectId).toBe("source");
    expect(thread.parentThreadId).toBe("parent");
    expect(buildTree([thread]).roots).toEqual([thread]);
  });
  it("shows a moved old thread in the first five without changing its inactivity timestamp", () => {
    const threads = Array.from(
      { length: 8 },
      (_, i) =>
        ({
          id: String(i),
          updatedAt: i,
          isPinned: false,
        }) as PluginSidebarThread,
    );
    const result = folderThreads(threads, new Set(), 5, new Map([["0", 100]]));
    expect(result.page.map((thread) => thread.id)).toEqual([
      "0",
      "7",
      "6",
      "5",
      "4",
    ]);
    expect(result.hiddenCount).toBe(3);
    expect(threads[0].updatedAt).toBe(0);
  });
  it("ignores malformed storage and uses the latest placement per thread", () => {
    expect(
      normalizeFolderPlacements([
        null,
        { threadId: "bad", projectId: "target", movedAt: -1 },
        { threadId: "one", projectId: "first", movedAt: 1 },
        { threadId: "one", projectId: "last", movedAt: 2 },
      ]),
    ).toEqual([{ threadId: "one", projectId: "last", movedAt: 2 }]);
  });
});
