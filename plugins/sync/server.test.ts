import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { afterEach, describe, expect, it } from "vitest";
import plugin from "./server";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];
const hosts: Array<ReturnType<typeof createFakePluginHost>> = [];

async function git(cwd: string, ...args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

async function repositoryFixture() {
  const root = await mkdtemp(join(tmpdir(), "bb-sync-server-"));
  temporaryRoots.push(root);
  const remote = join(root, "remote.git");
  const seed = join(root, "seed");
  const clone = join(root, "clone");
  const dataDir = join(root, "data");

  await mkdir(seed, { recursive: true });
  await git(root, "init", "--bare", remote);
  await git(seed, "init", "--initial-branch=main");
  await git(seed, "config", "user.email", "bb-sync-test@example.com");
  await git(seed, "config", "user.name", "BB Sync Test");
  await mkdir(join(seed, ".bb"), { recursive: true });
  await mkdir(join(seed, "plugins", "sync"), { recursive: true });
  await mkdir(join(seed, "skills", "alpha"), { recursive: true });
  await writeFile(join(seed, ".bb", "plugins.json"), JSON.stringify({
    schemaVersion: 1,
    plugins: [{ name: "sync", source: "./plugins/sync" }],
  }));
  await writeFile(join(seed, "plugins", "sync", "package.json"), "{}\n");
  await writeFile(join(seed, "skills", "alpha", "SKILL.md"), "first version\n");
  await git(seed, "add", ".");
  await git(seed, "commit", "-m", "initial");
  await git(seed, "remote", "add", "origin", remote);
  await git(seed, "push", "--set-upstream", "origin", "main");
  await execFileAsync("git", ["clone", "--branch", "main", remote, clone], { encoding: "utf8" });

  return { root, remote, seed, clone, dataDir };
}

afterEach(async () => {
  await Promise.all(hosts.splice(0).map((host) => host.harness.lifecycle.dispose()));
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("plugin Git sync", () => {
  it("registers local Git sync controls without peer HTTP endpoints", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "sync" });

    await plugin(bb);

    expect(harness.inspection.registrations.httpRoutes).toEqual([]);
    expect(harness.inspection.registrations.rpcMethods).toEqual(["status", "syncNow"]);
  });

  it("defers a reload when a pulled path-managed copy includes new plugin code", async () => {
    const paths = await repositoryFixture();
    await writeFile(join(paths.seed, "skills", "alpha", "SKILL.md"), "second version\n");
    await git(paths.seed, "add", ".");
    await git(paths.seed, "commit", "-m", "skill update");
    await git(paths.seed, "push");

    const host = createFakePluginHost({
      pluginId: "sync",
      settings: { repoPath: paths.clone },
      dataDir: paths.dataDir,
      sdk: {
        system: { config: () => ({ dataDir: paths.dataDir }) },
        plugins: {
          list: () => ({
            plugins: [{
              id: "sync",
              source: `path:${join(paths.clone, "plugins", "sync")}`,
              rootDir: join(paths.clone, "plugins", "sync"),
            }],
          }),
          reload: () => ({}),
        },
      },
    });
    hosts.push(host);

    await plugin(host.bb);
    const result = await host.harness.behavior.callRpc("syncNow", null);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(result).toMatchObject({ updated: true, selfRefreshScheduled: true });
    expect(host.harness.inspection.sdk.callsTo("plugins.reload")).toEqual([[{ pluginId: "sync" }]]);
    await expect(readFile(join(paths.dataDir, "skills", "alpha", "SKILL.md"), "utf8")).resolves.toBe("second version\n");
  });

  it("defers applying an update for a Git-managed copy", async () => {
    const paths = await repositoryFixture();
    const host = createFakePluginHost({
      pluginId: "sync",
      settings: { repoPath: paths.clone },
      dataDir: paths.dataDir,
      sdk: {
        system: { config: () => ({ dataDir: paths.dataDir }) },
        plugins: {
          list: () => ({
            plugins: [{
              id: "sync",
              source: "git:https://github.com/YusufLisawi/bb-plugins.git@main",
              rootDir: "/tmp/bb-managed-sync",
            }],
          }),
          checkUpdates: () => [{ id: "sync", outcome: "update-available" }],
          applyUpdate: () => ({ outcome: "updated" }),
        },
      },
    });
    hosts.push(host);

    await plugin(host.bb);
    const result = await host.harness.behavior.callRpc("syncNow", null);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(result).toMatchObject({ updated: false, selfRefreshScheduled: true });
    expect(host.harness.inspection.sdk.callsTo("plugins.checkUpdates")).toEqual([[{ pluginId: "sync" }]]);
    expect(host.harness.inspection.sdk.callsTo("plugins.applyUpdate")).toEqual([[{ pluginId: "sync" }]]);
  });
});
