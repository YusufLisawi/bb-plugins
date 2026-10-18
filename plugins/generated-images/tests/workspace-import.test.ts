import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkspaceImagePaths } from "../workspace-import.ts";

const workspace = "/home/user/project";

test("resolves image files inside the workspace and deduplicates paths", () => {
  const imports = resolveWorkspaceImagePaths(workspace, workspace, [
    "output/avatar.png",
    "/home/user/project/output/avatar.png",
  ]);

  assert.equal(imports.length, 1);
  assert.equal(imports[0].savedPath, "/home/user/project/output/avatar.png");
  assert.equal(imports[0].relativePath, "output/avatar.png");
  assert.equal(imports[0].mimeType, "image/png");
  assert.match(imports[0].itemId, /^workspace-[a-f0-9]{24}$/);
});

test("rejects paths that escape the workspace", () => {
  assert.throws(
    () =>
      resolveWorkspaceImagePaths(workspace, workspace, [
        "../private/avatar.png",
      ]),
    /inside the thread workspace/,
  );
});

test("rejects unsupported file extensions", () => {
  assert.throws(
    () => resolveWorkspaceImagePaths(workspace, workspace, ["notes.txt"]),
    /Unsupported image file type/,
  );
});
