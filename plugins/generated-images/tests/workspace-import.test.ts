import assert from "node:assert/strict";
import test from "node:test";
import {
  extractEmbeddedImagePaths,
  resolveImportImagePaths,
  type ImportRoot,
} from "../workspace-import.ts";

const workspace = "/home/user/project";
const workspaceOnly: ImportRoot[] = [{ kind: "workspace", path: workspace }];
const allRoots: ImportRoot[] = [
  { kind: "workspace", path: workspace },
  { kind: "thread-storage", path: "/home/user/.bb/thread-storage/thr_1" },
  { kind: "tmp", path: "/tmp" },
];

test("resolves image files inside the workspace and deduplicates paths", () => {
  const imports = resolveImportImagePaths(workspaceOnly, workspace, [
    "output/avatar.png",
    "/home/user/project/output/avatar.png",
  ]);

  assert.equal(imports.length, 1);
  assert.equal(imports[0].savedPath, "/home/user/project/output/avatar.png");
  assert.equal(imports[0].rootPath, workspace);
  assert.equal(imports[0].relativePath, "output/avatar.png");
  assert.equal(imports[0].mimeType, "image/png");
  assert.match(imports[0].itemId, /^workspace-[a-f0-9]{24}$/);
});

test("accepts thread storage and /tmp images with absolute display paths", () => {
  const imports = resolveImportImagePaths(allRoots, workspace, [
    "/home/user/.bb/thread-storage/thr_1/shot.jpg",
    "/tmp/render/frame.webp",
  ]);

  assert.deepEqual(
    imports.map((entry) => [entry.rootPath, entry.relativePath]),
    [
      ["/home/user/.bb/thread-storage/thr_1", "/home/user/.bb/thread-storage/thr_1/shot.jpg"],
      ["/tmp", "/tmp/render/frame.webp"],
    ],
  );
  assert.match(imports[0].itemId, /^file-[a-f0-9]{24}$/);
});

test("rejects paths that escape every allowed root", () => {
  assert.throws(
    () => resolveImportImagePaths(allRoots, workspace, ["../private/avatar.png"]),
    /inside the thread workspace, thread storage, \/tmp/,
  );
});

test("rejects unsupported file extensions", () => {
  assert.throws(
    () => resolveImportImagePaths(workspaceOnly, workspace, ["notes.txt"]),
    /Unsupported image file type/,
  );
});

test("skipInvalid drops bad paths instead of throwing", () => {
  const imports = resolveImportImagePaths(
    allRoots,
    workspace,
    ["/etc/secret.png", "notes.txt", "out/a.png"],
    { skipInvalid: true },
  );
  assert.deepEqual(imports.map((entry) => entry.relativePath), ["out/a.png"]);
});

test("extracts local markdown and html image embeds", () => {
  const message = [
    "Here is the result:",
    "![hero](out/hero.png) and ![alt](</tmp/with space.jpg> \"title\")",
    "![remote](https://example.com/a.png) ![data](data:image/png;base64,AAA)",
    '<img src="file:///home/user/project/b%20c.webp" width="200">',
    "[a link](out/link.png) is not an embed, nor is `![x](code.png)`",
    "```md",
    "![example](fenced.png)",
    "```",
    "![dup](out/hero.png) ![doc](README.md)",
  ].join("\n");

  assert.deepEqual(extractEmbeddedImagePaths(message), [
    "out/hero.png",
    "/tmp/with space.jpg",
    "/home/user/project/b c.webp",
  ]);
  assert.deepEqual(extractEmbeddedImagePaths(null), []);
});
