import { createHash, randomUUID } from "node:crypto";
import { cp, lstat, mkdir, readdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";

export type ManagedSkillState = Record<string, { digest: string }>;

export interface SkillSyncResult {
  sourceAvailable: boolean;
  repositorySkillIds: string[];
  installedSkillIds: string[];
  updatedSkillIds: string[];
  removedSkillIds: string[];
  skippedSkillIds: string[];
  failures: string[];
  managedSkills: ManagedSkillState;
}

interface RepositorySkill {
  id: string;
  path: string;
}

const skillIdPattern = /^[a-z0-9][a-z0-9._-]*$/i;

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

async function lstatOrNull(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

async function directoryDigest(path: string): Promise<string | null> {
  const root = await lstatOrNull(path);
  if (!root) return null;
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`${path} must be a real directory.`);
  }

  const hash = createHash("sha256");
  hash.update("bb-skill-directory-v1\0");

  async function visit(directory: string, relativePath: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const childPath = join(directory, entry.name);
      const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const stats = await lstat(childPath);

      if (stats.isSymbolicLink()) {
        throw new Error(`${childPath} is a symbolic link; repository skills may not contain symbolic links.`);
      }
      if (stats.isDirectory()) {
        hash.update(`directory\0${childRelativePath}\0`);
        await visit(childPath, childRelativePath);
        continue;
      }
      if (stats.isFile()) {
        hash.update(`file\0${childRelativePath}\0`);
        hash.update(await readFile(childPath));
        continue;
      }
      throw new Error(`${childPath} is not a regular file or directory.`);
    }
  }

  await visit(path, "");
  return hash.digest("hex");
}

async function discoverRepositorySkills(sourceRoot: string): Promise<{
  sourceAvailable: boolean;
  skills: RepositorySkill[];
  presentIds: Set<string>;
}> {
  const root = await lstatOrNull(sourceRoot);
  if (!root) return { sourceAvailable: false, skills: [], presentIds: new Set() };
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`${sourceRoot} must be a real directory when it exists.`);
  }

  const skills: RepositorySkill[] = [];
  const presentIds = new Set<string>();
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (!entry.isDirectory() || !skillIdPattern.test(entry.name)) continue;

    const skillPath = join(sourceRoot, entry.name);
    presentIds.add(entry.name);
    const skillFile = await lstatOrNull(join(skillPath, "SKILL.md"));
    if (skillFile?.isFile() && !skillFile.isSymbolicLink()) {
      skills.push({ id: entry.name, path: skillPath });
    }
  }

  return { sourceAvailable: true, skills, presentIds };
}

async function replaceDirectory(
  source: string,
  destination: string,
  stagingRoot: string,
  expectedDestinationDigest: string | null,
): Promise<void> {
  await mkdir(stagingRoot, { recursive: true });
  const stagingPath = join(stagingRoot, `${randomUUID()}-next`);
  const backupPath = join(stagingRoot, `${randomUUID()}-previous`);

  try {
    await cp(source, stagingPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
      preserveTimestamps: true,
      verbatimSymlinks: true,
    });

    const actualDestinationDigest = await directoryDigest(destination);
    if (actualDestinationDigest !== expectedDestinationDigest) {
      throw new Error("Local skill changed while it was being synchronized.");
    }

    const previous = await lstatOrNull(destination);
    if (previous) await rename(destination, backupPath);

    try {
      await rename(stagingPath, destination);
    } catch (error) {
      if (previous) await rename(backupPath, destination);
      throw error;
    }

    if (previous) await rm(backupPath, { recursive: true, force: true });
  } finally {
    await rm(stagingPath, { recursive: true, force: true });
  }
}

async function removeDirectory(
  destination: string,
  stagingRoot: string,
  expectedDestinationDigest: string,
): Promise<void> {
  const actualDestinationDigest = await directoryDigest(destination);
  if (actualDestinationDigest !== expectedDestinationDigest) {
    throw new Error("Local skill changed while its removal was being synchronized.");
  }

  await mkdir(stagingRoot, { recursive: true });
  const backupPath = join(stagingRoot, `${randomUUID()}-removed`);
  await rename(destination, backupPath);
  try {
    await rm(backupPath, { recursive: true, force: true });
  } catch (error) {
    await rename(backupPath, destination);
    throw error;
  }
}

export function normalizeManagedSkillState(value: unknown): ManagedSkillState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const normalized: ManagedSkillState = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!skillIdPattern.test(id) || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const digest = (entry as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.length > 0) normalized[id] = { digest };
  }
  return normalized;
}

export async function synchronizeRepositorySkills({
  sourceRoot,
  destinationRoot,
  stagingRoot,
  previous,
}: {
  sourceRoot: string;
  destinationRoot: string;
  stagingRoot: string;
  previous: ManagedSkillState;
}): Promise<SkillSyncResult> {
  const discovery = await discoverRepositorySkills(sourceRoot);
  const managedSkills: ManagedSkillState = { ...previous };
  const installedSkillIds: string[] = [];
  const updatedSkillIds: string[] = [];
  const removedSkillIds: string[] = [];
  const skippedSkillIds: string[] = [];
  const failures: string[] = [];

  if (!discovery.sourceAvailable) {
    return {
      sourceAvailable: false,
      repositorySkillIds: [],
      installedSkillIds,
      updatedSkillIds,
      removedSkillIds,
      skippedSkillIds,
      failures,
      managedSkills,
    };
  }

  await mkdir(destinationRoot, { recursive: true });

  for (const skill of discovery.skills) {
    try {
      const sourceDigest = await directoryDigest(skill.path);
      if (!sourceDigest) throw new Error("Repository skill directory disappeared.");

      const destinationPath = join(destinationRoot, skill.id);
      const destinationDigest = await directoryDigest(destinationPath);
      const previousDigest = previous[skill.id]?.digest ?? null;

      if (destinationDigest === sourceDigest) {
        managedSkills[skill.id] = { digest: sourceDigest };
        continue;
      }

      if (destinationDigest !== null && (!previousDigest || destinationDigest !== previousDigest)) {
        skippedSkillIds.push(skill.id);
        continue;
      }

      await replaceDirectory(skill.path, destinationPath, stagingRoot, destinationDigest);
      managedSkills[skill.id] = { digest: sourceDigest };
      if (previousDigest) updatedSkillIds.push(skill.id);
      else installedSkillIds.push(skill.id);
    } catch (error) {
      failures.push(`Could not synchronize ${skill.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const [id, state] of Object.entries(previous)) {
    if (discovery.presentIds.has(id)) continue;

    try {
      const destinationPath = join(destinationRoot, id);
      const destinationDigest = await directoryDigest(destinationPath);
      if (destinationDigest === null) {
        delete managedSkills[id];
        continue;
      }
      if (destinationDigest !== state.digest) {
        skippedSkillIds.push(id);
        continue;
      }

      await removeDirectory(destinationPath, stagingRoot, state.digest);
      delete managedSkills[id];
      removedSkillIds.push(id);
    } catch (error) {
      failures.push(`Could not remove ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    sourceAvailable: true,
    repositorySkillIds: discovery.skills.map((skill) => skill.id),
    installedSkillIds,
    updatedSkillIds,
    removedSkillIds,
    skippedSkillIds,
    failures,
    managedSkills,
  };
}
