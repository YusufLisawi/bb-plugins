import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { synchronizeRepositorySkills } from "./skill-sync";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "bb-skill-sync-"));
  temporaryRoots.push(root);
  return {
    sourceRoot: join(root, "repository", "skills"),
    destinationRoot: join(root, "data", "skills"),
    stagingRoot: join(root, "data", "plugins", "sync", "skill-staging"),
  };
}

async function writeSkill(sourceRoot: string, id: string, content: string): Promise<void> {
  const skillRoot = join(sourceRoot, id);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(join(skillRoot, "SKILL.md"), `---\nname: ${id}\ndescription: Test skill\n---\n\n${content}\n`);
}

describe("repository skill synchronization", () => {
  it("installs and updates a skill owned by the repository", async () => {
    const paths = await fixture();
    await writeSkill(paths.sourceRoot, "alpha", "first version");

    const initial = await synchronizeRepositorySkills({ ...paths, previous: {} });
    expect(initial.installedSkillIds).toEqual(["alpha"]);
    expect(await readFile(join(paths.destinationRoot, "alpha", "SKILL.md"), "utf8")).toContain("first version");

    await writeSkill(paths.sourceRoot, "alpha", "second version");
    const updated = await synchronizeRepositorySkills({ ...paths, previous: initial.managedSkills });
    expect(updated.updatedSkillIds).toEqual(["alpha"]);
    expect(await readFile(join(paths.destinationRoot, "alpha", "SKILL.md"), "utf8")).toContain("second version");
  });

  it("keeps a locally edited managed skill instead of overwriting it", async () => {
    const paths = await fixture();
    await writeSkill(paths.sourceRoot, "alpha", "repository version");
    const initial = await synchronizeRepositorySkills({ ...paths, previous: {} });

    await writeFile(join(paths.destinationRoot, "alpha", "SKILL.md"), "local edit\n");
    await writeSkill(paths.sourceRoot, "alpha", "new repository version");
    const result = await synchronizeRepositorySkills({ ...paths, previous: initial.managedSkills });

    expect(result.skippedSkillIds).toEqual(["alpha"]);
    expect(await readFile(join(paths.destinationRoot, "alpha", "SKILL.md"), "utf8")).toBe("local edit\n");
  });

  it("removes a deleted repository skill only when its installed copy is unchanged", async () => {
    const paths = await fixture();
    await writeSkill(paths.sourceRoot, "alpha", "repository version");
    const initial = await synchronizeRepositorySkills({ ...paths, previous: {} });

    await rm(join(paths.sourceRoot, "alpha"), { recursive: true });
    const result = await synchronizeRepositorySkills({ ...paths, previous: initial.managedSkills });

    expect(result.removedSkillIds).toEqual(["alpha"]);
    await expect(readFile(join(paths.destinationRoot, "alpha", "SKILL.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
