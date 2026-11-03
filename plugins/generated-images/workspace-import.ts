import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { inferMimeType } from "./image-events.ts";

export type ImportRootKind = "workspace" | "thread-storage" | "tmp";

export interface ImportRoot {
  kind: ImportRootKind;
  path: string;
}

export interface WorkspaceImageImport {
  itemId: string;
  savedPath: string;
  /** The allowed root containing `savedPath`; host reads are confined to it. */
  rootPath: string;
  /** Path shown to the user: relative inside the workspace, absolute elsewhere. */
  relativePath: string;
  mimeType: string;
}

export interface ResolveImageOptions {
  /** Drop paths that fail validation instead of throwing. */
  skipInvalid?: boolean;
}

const ROOT_LABELS: Record<ImportRootKind, string> = {
  workspace: "the thread workspace",
  "thread-storage": "thread storage",
  tmp: "/tmp",
};

function isWithinRoot(rootPath: string, filePath: string): boolean {
  const rel = relative(rootPath, filePath);
  return (
    rel.length > 0 &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

/**
 * Resolve and validate paths before the server reads or registers them.
 * Root confinement keeps the import command from exposing arbitrary host
 * files through the generated-images HTTP route.
 */
export function resolveImportImagePaths(
  roots: readonly ImportRoot[],
  workingDirectory: string,
  requestedPaths: readonly string[],
  options: ResolveImageOptions = {},
): WorkspaceImageImport[] {
  const cwd = resolve(workingDirectory);
  const resolvedRoots = roots.map((root) => ({
    kind: root.kind,
    path: resolve(root.path),
  }));
  const uniquePaths = new Set<string>();
  const imports: WorkspaceImageImport[] = [];

  if (requestedPaths.length === 0 && !options.skipInvalid) {
    throw new Error("Provide at least one image path to import.");
  }

  for (const requestedPath of requestedPaths) {
    const savedPath = resolve(cwd, requestedPath);
    const root = resolvedRoots.find((candidate) =>
      isWithinRoot(candidate.path, savedPath),
    );
    if (!root) {
      if (options.skipInvalid) {
        continue;
      }
      const allowed = resolvedRoots.map((r) => ROOT_LABELS[r.kind]).join(", ");
      throw new Error(`Image path must be inside ${allowed}: ${requestedPath}`);
    }
    if (uniquePaths.has(savedPath)) {
      continue;
    }

    const mimeType = inferMimeType(savedPath);
    if (!mimeType?.startsWith("image/")) {
      if (options.skipInvalid) {
        continue;
      }
      throw new Error(`Unsupported image file type: ${requestedPath}`);
    }
    uniquePaths.add(savedPath);

    // Workspace ids hash the relative path so entries imported before other
    // roots were allowed keep their ids (and their tray position).
    const relativePath =
      root.kind === "workspace"
        ? relative(root.path, savedPath).split(sep).join("/")
        : savedPath;
    const itemId =
      root.kind === "workspace"
        ? `workspace-${shortHash(relativePath)}`
        : `file-${shortHash(savedPath)}`;

    imports.push({
      itemId,
      savedPath,
      rootPath: root.path,
      relativePath,
      mimeType,
    });
  }

  return imports;
}

const FENCED_CODE = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[^\n]*$|(?![\s\S]))/gm;
const INLINE_CODE = /`[^`\n]*`/g;
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^)\s]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)/g;
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Local file paths embedded as images (`![alt](path)` or `<img src>`) in an
 * assistant message. Code spans and fences are ignored so examples are not
 * imported; URLs other than file:// are left to the markdown renderer.
 */
export function extractEmbeddedImagePaths(markdown: string | null): string[] {
  if (!markdown) {
    return [];
  }

  const text = markdown.replace(FENCED_CODE, "").replace(INLINE_CODE, "");
  const paths: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | undefined) => {
    if (!raw) {
      return;
    }
    let path = raw.trim();
    if (/^file:\/\//i.test(path)) {
      path = path.replace(/^file:\/\/(?:localhost)?/i, "");
    } else if (URL_SCHEME.test(path) || path.startsWith("//")) {
      return;
    }
    path = path.replace(/[?#].*$/, "");
    try {
      path = decodeURIComponent(path);
    } catch {
      // Keep the literal path when it is not valid percent-encoding.
    }
    if (path.length > 0 && inferMimeType(path) && !seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  };

  for (const match of text.matchAll(MARKDOWN_IMAGE)) {
    add(match[1] ?? match[2]);
  }
  for (const match of text.matchAll(HTML_IMAGE)) {
    add(match[1] ?? match[2]);
  }
  return paths;
}
