import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { inferMimeType } from "./image-events.ts";

export interface WorkspaceImageImport {
  itemId: string;
  savedPath: string;
  relativePath: string;
  mimeType: string;
}

function isWithinRoot(rootPath: string, filePath: string): boolean {
  const rel = relative(rootPath, filePath);
  return (
    rel.length > 0 &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
}

/**
 * Resolve and validate paths before the server reads or registers them.
 * Workspace confinement keeps the import command from exposing arbitrary host
 * files through the generated-images HTTP route.
 */
export function resolveWorkspaceImagePaths(
  workspacePath: string,
  workingDirectory: string,
  requestedPaths: readonly string[],
): WorkspaceImageImport[] {
  const workspaceRoot = resolve(workspacePath);
  const cwd = resolve(workingDirectory);
  const uniquePaths = new Set<string>();
  const imports: WorkspaceImageImport[] = [];

  if (requestedPaths.length === 0) {
    throw new Error("Provide at least one image path to import.");
  }

  for (const requestedPath of requestedPaths) {
    const savedPath = resolve(cwd, requestedPath);
    if (!isWithinRoot(workspaceRoot, savedPath)) {
      throw new Error(
        `Image path must be inside the thread workspace: ${requestedPath}`,
      );
    }
    if (uniquePaths.has(savedPath)) {
      continue;
    }
    uniquePaths.add(savedPath);

    const mimeType = inferMimeType(savedPath);
    if (!mimeType?.startsWith("image/")) {
      throw new Error(`Unsupported image file type: ${requestedPath}`);
    }

    const relativePath = relative(workspaceRoot, savedPath)
      .split(sep)
      .join("/");
    const itemId = `workspace-${createHash("sha256")
      .update(relativePath)
      .digest("hex")
      .slice(0, 24)}`;

    imports.push({ itemId, savedPath, relativePath, mimeType });
  }

  return imports;
}
