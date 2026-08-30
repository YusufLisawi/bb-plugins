import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { normalizeManagedSkillState, synchronizeRepositorySkills } from "./skill-sync.js";

const execFileAsync = promisify(execFile);
const defaultCheckoutPath = `${homedir()}/Developer/bb-plugins`;
const privateCollectionSource = "git:https://github.com/YusufLisawi/bb-plugins.git@main";

const collectionManifestSchema = z.object({
  schemaVersion: z.literal(1),
  plugins: z.array(z.object({
    name: z.string().min(1),
    source: z.string().regex(/^\.\/plugins\/[^/]+$/),
  })),
});

type CollectionManifest = z.infer<typeof collectionManifestSchema>;
type SelfRefreshMode = "reload" | "update";

const syncRunSchema = z.object({
  configured: z.boolean(),
  repoPath: z.string(),
  skillRoot: z.string(),
  localServerId: z.string(),
  lastRunAt: z.number().int().nullable(),
  lastRunStatus: z.string().nullable(),
  updated: z.boolean(),
  selfRefreshScheduled: z.boolean(),
  installedPluginIds: z.array(z.string()),
  updatedPluginIds: z.array(z.string()),
  reloadedPluginIds: z.array(z.string()),
  skippedPluginIds: z.array(z.string()),
  installedSkillIds: z.array(z.string()),
  updatedSkillIds: z.array(z.string()),
  removedSkillIds: z.array(z.string()),
  skippedSkillIds: z.array(z.string()),
  failures: z.array(z.string()),
  message: z.string(),
});

export type SyncRun = z.infer<typeof syncRunSchema>;

export const rpcContract = defineRpcContract({
  status: { input: z.null(), output: syncRunSchema },
  syncNow: { input: z.null(), output: syncRunSchema },
});

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolveWait) => {
    const timer = setTimeout(resolveWait, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolveWait();
    }, { once: true });
  });
}

function checkoutPath(value: string): string {
  return resolve(value.trim() || defaultCheckoutPath);
}

function pathPluginId(source: string, repoPath: string): string | null {
  if (!source.startsWith("path:")) return null;
  const pluginRoot = `${repoPath}${sep}plugins${sep}`;
  const sourcePath = resolve(source.slice("path:".length));
  if (!sourcePath.startsWith(pluginRoot)) return null;
  const relative = sourcePath.slice(pluginRoot.length);
  return relative && !relative.includes(sep) ? relative : null;
}

function rootPluginId(rootDir: string, repoPath: string): string | null {
  try {
    return pathPluginId(`path:${realpathSync(rootDir)}`, repoPath);
  } catch {
    return null;
  }
}

function isPrivateCollectionSource(source: string): boolean {
  return source === privateCollectionSource || source.startsWith(`${privateCollectionSource}@`);
}

async function readCollectionManifest(repoPath: string): Promise<CollectionManifest> {
  const raw = await readFile(resolve(repoPath, ".bb", "plugins.json"), "utf8");
  return collectionManifestSchema.parse(JSON.parse(raw));
}

function statusPaths(status: string): string[] {
  return status.split("\n").filter(Boolean).map((line) => {
    // git() trims the complete command output, so the leading XY status column
    // may lose its first space on the first line. Parse both forms.
    const normalized = line.trim();
    const path = (normalized[1] === " " ? normalized.slice(2) : normalized.slice(3)).trim();
    const renameParts = path.split(" -> ");
    return renameParts[renameParts.length - 1] ?? path;
  });
}

function isGeneratedArtifact(path: string): boolean {
  return /^plugins\/[^/]+\/dist\//.test(path);
}

async function git(repoPath: string, args: string[], signal?: AbortSignal): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      maxBuffer: 1_000_000,
      signal,
    });
    return `${stdout}${stderr}`.trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Git ${args.join(" ")} failed: ${detail}`);
  }
}

async function unmergedPaths(repoPath: string): Promise<string[]> {
  const output = await git(repoPath, ["diff", "--name-only", "--diff-filter=U"]);
  return output.split(/\r?\n/).filter(Boolean);
}

async function restoreUntrackedGeneratedArtifacts(repoPath: string, stashRef: string): Promise<boolean> {
  let output: string;
  try {
    output = await git(repoPath, ["ls-tree", "-r", "--name-only", `${stashRef}^3`]);
  } catch {
    return false;
  }

  const paths = output.split(/\r?\n/).filter(isGeneratedArtifact);
  if (paths.length === 0) return false;

  for (const path of paths) {
    await git(repoPath, ["checkout", `${stashRef}^3`, "--", path]);
  }
  await git(repoPath, ["reset", "HEAD", "--", ...paths]);
  return true;
}

async function clearAutoMergeMarker(repoPath: string): Promise<void> {
  const marker = resolve(repoPath, await git(repoPath, ["rev-parse", "--git-path", "AUTO_MERGE"]));
  try {
    await unlink(marker);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

async function resolveGeneratedArtifactConflicts(repoPath: string): Promise<boolean> {
  const conflicts = await unmergedPaths(repoPath);
  if (conflicts.length === 0) return false;

  const sourceConflicts = conflicts.filter((path) => !isGeneratedArtifact(path));
  if (sourceConflicts.length > 0) {
    throw new Error(`Your local plugin repository has unresolved source merge conflicts (${sourceConflicts.join(", ")}). Resolve them before syncing.`);
  }

  for (const path of conflicts) {
    try {
      // A stash apply records the stashed artifact as "theirs". Prefer it so
      // a generated local build remains available after the pull.
      await git(repoPath, ["checkout", "--theirs", "--", path]);
    } catch {
      // If the stashed side deleted the artifact, there is no "theirs" blob.
      // Preserve that deletion; the generated output is disposable in this
      // case. Fall back to the pulled side only if Git cannot remove it.
      try {
        await git(repoPath, ["rm", "--force", "--", path]);
      } catch {
        await git(repoPath, ["checkout", "--ours", "--", path]);
      }
    }
  }

  // Keep the recovered artifact in the worktree as an ordinary local change
  // while making only the conflicted paths in the index match pulled HEAD.
  // This is the key invariant that prevents the next scheduled run from
  // failing to write the index.
  await git(repoPath, ["reset", "HEAD", "--", ...conflicts]);
  await clearAutoMergeMarker(repoPath);
  return true;
}

async function restoreGeneratedArtifactStash(repoPath: string, stashRef: string): Promise<void> {
  try {
    await git(repoPath, ["stash", "apply", stashRef]);
  } catch (error) {
    const recoveredConflict = await resolveGeneratedArtifactConflicts(repoPath);
    const recoveredUntracked = await restoreUntrackedGeneratedArtifacts(repoPath, stashRef);
    if (!recoveredConflict && !recoveredUntracked) throw error;
  }

  await git(repoPath, ["stash", "drop", stashRef]);
  await clearAutoMergeMarker(repoPath);
}

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    repoPath: {
      type: "string",
      label: "BB repository folder",
      description: "Local clone of your private bb-plugins repository on this machine, including repository-managed skills.",
      default: defaultCheckoutPath,
    },
    autoSyncMinutes: {
      type: "select",
      label: "Automatic update checks",
      description: "Pull and reconcile plugin code and BB skills from GitHub on this machine.",
      options: ["off", "15", "60", "240"],
      default: "15",
    },
  });

  const db = bb.storage.database();
  bb.storage.migrate(db, [
    `CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL
    )`,
  ]);

  async function serverId(): Promise<string> {
    const existing = await bb.storage.kv.get<string>("server-id");
    if (existing) return existing;
    const created = randomUUID();
    await bb.storage.kv.set("server-id", created);
    return created;
  }

  function recordRun(status: "ok" | "error", detail: string, startedAt: number): void {
    db.prepare("INSERT INTO sync_runs (started_at, finished_at, status, detail) VALUES (?, ?, ?, ?)")
      .run(startedAt, Date.now(), status, detail.slice(0, 8_000));
  }

  function lastRun(): { finishedAt: number; status: string } | null {
    return db.prepare("SELECT finished_at AS finishedAt, status FROM sync_runs ORDER BY id DESC LIMIT 1")
      .get() as { finishedAt: number; status: string } | undefined ?? null;
  }

  async function statusResult(
    message: string,
    options: Partial<Pick<SyncRun, "updated" | "selfRefreshScheduled" | "installedPluginIds" | "updatedPluginIds" | "reloadedPluginIds" | "skippedPluginIds" | "installedSkillIds" | "updatedSkillIds" | "removedSkillIds" | "skippedSkillIds" | "failures">> = {},
  ): Promise<SyncRun> {
    const current = await settings.get();
    const repoPath = checkoutPath(current.repoPath);
    const systemConfig = await bb.sdk.system.config();
    const last = lastRun();
    let configured = false;
    try {
      await git(repoPath, ["rev-parse", "--show-toplevel"]);
      configured = true;
    } catch {
      // The action returns the actionable error instead of failing the settings page.
    }
    return {
      configured,
      repoPath,
      skillRoot: resolve(systemConfig.dataDir, "skills"),
      localServerId: await serverId(),
      lastRunAt: last?.finishedAt ?? null,
      lastRunStatus: last?.status ?? null,
      updated: options.updated ?? false,
      selfRefreshScheduled: options.selfRefreshScheduled ?? false,
      installedPluginIds: options.installedPluginIds ?? [],
      updatedPluginIds: options.updatedPluginIds ?? [],
      reloadedPluginIds: options.reloadedPluginIds ?? [],
      skippedPluginIds: options.skippedPluginIds ?? [],
      installedSkillIds: options.installedSkillIds ?? [],
      updatedSkillIds: options.updatedSkillIds ?? [],
      removedSkillIds: options.removedSkillIds ?? [],
      skippedSkillIds: options.skippedSkillIds ?? [],
      failures: options.failures ?? [],
      message,
    };
  }

  let activeSync: Promise<SyncRun> | null = null;
  let selfRefreshQueued = false;

  // BB disposes the old plugin before activating an updated one. Queue this
  // operation for the next macrotask so the current RPC/CLI request or
  // background service can settle before the sync plugin asks BB to replace
  // it. The replacement starts a fresh auto-sync service and immediately
  // reconciles the repository's skills with the new code loaded.
  function scheduleSelfRefresh(mode: SelfRefreshMode): void {
    if (selfRefreshQueued) return;
    selfRefreshQueued = true;
    setImmediate(() => {
      void (async () => {
        try {
          if (mode === "reload") {
            await bb.sdk.plugins.reload({ pluginId: bb.pluginId });
          } else {
            await bb.sdk.plugins.applyUpdate({ pluginId: bb.pluginId });
          }
        } catch (error) {
          try {
            bb.log.warn(`automatic sync: could not refresh the sync plugin: ${error instanceof Error ? error.message : String(error)}`);
          } catch {
            // A successful replacement invalidates this old API handle. There
            // is nothing else this generation can safely do after that point.
          }
        } finally {
          selfRefreshQueued = false;
        }
      })();
    });
  }

  async function performSyncNow(): Promise<SyncRun> {
    const startedAt = Date.now();
    const current = await settings.get();
    const repoPath = checkoutPath(current.repoPath);

    try {
      const root = await git(repoPath, ["rev-parse", "--show-toplevel"]);
      if (resolve(root) !== repoPath) {
        throw new Error(`Plugin repository folder resolves to ${root}; choose the repository root, not a subfolder.`);
      }
      await resolveGeneratedArtifactConflicts(repoPath);
      const changes = await git(repoPath, ["status", "--porcelain", "--untracked-files=all", "--", "."]);
      const changedPaths = statusPaths(changes);
      const sourceChanges = changedPaths.filter((path) => !isGeneratedArtifact(path));
      if (sourceChanges.length > 0) {
        throw new Error(`Your local plugin repository has uncommitted changes (${sourceChanges.join(", ")}). Commit or stash them before syncing so nothing is overwritten.`);
      }

      let generatedArtifactsStashRef: string | null = null;
      if (changedPaths.length > 0) {
        const stashResult = await git(repoPath, [
          "stash",
          "push",
          "--include-untracked",
          "--message",
          "bb-sync-generated-artifacts",
          "--",
          "plugins/**/dist/**",
        ]);
        if (!stashResult.includes("No local changes to save")) {
          generatedArtifactsStashRef = "stash@{0}";
        }
      }

      const before = await git(repoPath, ["rev-parse", "HEAD"]);
      try {
        await git(repoPath, ["pull", "--ff-only"]);
      } catch (error) {
        if (generatedArtifactsStashRef) {
          try {
            await restoreGeneratedArtifactStash(repoPath, generatedArtifactsStashRef);
          } catch (restoreError) {
            const original = error instanceof Error ? error.message : String(error);
            throw new Error(`${original} Generated artifacts were stashed for the failed pull and could not be restored automatically: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
          }
        }
        throw error;
      }
      if (generatedArtifactsStashRef) {
        try {
          await restoreGeneratedArtifactStash(repoPath, generatedArtifactsStashRef);
        } catch (restoreError) {
          throw new Error(`Git pull succeeded, but generated artifacts could not be restored automatically: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
        }
      }
      const after = await git(repoPath, ["rev-parse", "HEAD"]);
      const updated = before !== after;
      const collection = await readCollectionManifest(repoPath);
      const installed = await bb.sdk.plugins.list();
      const installedById = new Map(installed.plugins.map((item) => [item.id, item]));
      const installedPluginIds: string[] = [];
      const updatedPluginIds: string[] = [];
      const reloadedPluginIds: string[] = [];
      const skippedPluginIds: string[] = [];
      const failures: string[] = [];
      let selfRefreshMode: SelfRefreshMode | null = null;

      for (const entry of collection.plugins) {
        const currentPlugin = installedById.get(entry.name);
        if (!currentPlugin) {
          if (entry.name === bb.pluginId) {
            failures.push("Could not find the running sync plugin in BB's installed plugin list.");
            continue;
          }
          try {
            const installedPlugin = await bb.sdk.plugins.install({
              source: privateCollectionSource,
              plugin: entry.name,
            });
            installedById.set(installedPlugin.id, installedPlugin);
            installedPluginIds.push(installedPlugin.id);
          } catch (error) {
            failures.push(`Could not install ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
          }
          continue;
        }

        const managedId = pathPluginId(currentPlugin.source, repoPath) ?? rootPluginId(currentPlugin.rootDir, repoPath);
        if (entry.name === bb.pluginId) {
          if (managedId === entry.name) {
            if (updated) selfRefreshMode = "reload";
            continue;
          }

          if (isPrivateCollectionSource(currentPlugin.source)) {
            try {
              const updateResults = await bb.sdk.plugins.checkUpdates({ pluginId: currentPlugin.id });
              const update = updateResults.find((item) => item.id === currentPlugin.id);
              if (update?.outcome === "update-available") selfRefreshMode = "update";
            } catch (error) {
              failures.push(`Could not check for updates to ${currentPlugin.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
            continue;
          }

          skippedPluginIds.push(entry.name);
          continue;
        }

        if (managedId === entry.name) {
          if (!updated) continue;
          try {
            await bb.sdk.plugins.reload({ pluginId: currentPlugin.id });
            reloadedPluginIds.push(currentPlugin.id);
          } catch (error) {
            failures.push(`Could not reload ${currentPlugin.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
          continue;
        }

        if (isPrivateCollectionSource(currentPlugin.source)) {
          try {
            const updateResults = await bb.sdk.plugins.checkUpdates({ pluginId: currentPlugin.id });
            const update = updateResults.find((item) => item.id === currentPlugin.id);
            if (update?.outcome !== "update-available") continue;
            const applied = await bb.sdk.plugins.applyUpdate({ pluginId: currentPlugin.id });
            if (applied.outcome === "updated") updatedPluginIds.push(currentPlugin.id);
          } catch (error) {
            failures.push(`Could not update ${currentPlugin.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
          continue;
        }

        skippedPluginIds.push(entry.name);
      }

      const systemConfig = await bb.sdk.system.config();
      const skillRoot = resolve(systemConfig.dataDir, "skills");
      const skillSync = await synchronizeRepositorySkills({
        sourceRoot: resolve(repoPath, "skills"),
        destinationRoot: skillRoot,
        stagingRoot: resolve(systemConfig.dataDir, "plugins", bb.pluginId, "skill-sync-staging"),
        previous: normalizeManagedSkillState(await bb.storage.kv.get<unknown>("managed-skills")),
      });
      await bb.storage.kv.set("managed-skills", skillSync.managedSkills);
      failures.push(...skillSync.failures);

      const skillChanges = skillSync.installedSkillIds.length
        + skillSync.updatedSkillIds.length
        + skillSync.removedSkillIds.length;
      const madeChanges = installedPluginIds.length > 0
        || updatedPluginIds.length > 0
        || reloadedPluginIds.length > 0
        || skillChanges > 0
        || selfRefreshMode !== null;
      const selfRefreshScheduled = selfRefreshMode !== null;
      const selfRefreshNote = selfRefreshMode === "reload"
        ? " The sync plugin will reload itself after this run."
        : selfRefreshMode === "update"
          ? " The sync plugin update is queued and will restart itself after this run."
          : "";
      const selfRefreshDetail = selfRefreshMode === null
        ? ""
        : ` Sync-plugin ${selfRefreshMode} queued.`;

      const status = failures.length === 0 ? "ok" : "error";
      recordRun(status, updated
        ? `Pulled new commit; installed ${installedPluginIds.length}, updated ${updatedPluginIds.length}, reloaded ${reloadedPluginIds.length} plugin(s), and synchronized ${skillChanges} skill(s).${selfRefreshDetail}`
        : `Reconciled collection; installed ${installedPluginIds.length}, updated ${updatedPluginIds.length} plugin(s), and synchronized ${skillChanges} skill(s).${selfRefreshDetail}`, startedAt);
      const result = await statusResult(
        failures.length === 0
          ? updated
            ? `Updated from GitHub and reconciled plugins and skills.${selfRefreshNote}`
            : madeChanges
              ? `Plugins and skills reconciled.${selfRefreshNote}`
              : "Already up to date."
          : `The collection was pulled, but one or more plugin actions failed.${selfRefreshNote}`,
        {
          updated,
          selfRefreshScheduled,
          installedPluginIds,
          updatedPluginIds,
          reloadedPluginIds,
          skippedPluginIds,
          installedSkillIds: skillSync.installedSkillIds,
          updatedSkillIds: skillSync.updatedSkillIds,
          removedSkillIds: skillSync.removedSkillIds,
          skippedSkillIds: skillSync.skippedSkillIds,
          failures,
        },
      );
      if (selfRefreshMode !== null) scheduleSelfRefresh(selfRefreshMode);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordRun("error", message, startedAt);
      return statusResult(message, { failures: [message] });
    }
  }

  async function syncNow(): Promise<SyncRun> {
    if (activeSync) return activeSync;
    const run = performSyncNow();
    activeSync = run;
    try {
      return await run;
    } finally {
      if (activeSync === run) activeSync = null;
    }
  }

  bb.rpc.register(rpcContract, {
    status: () => statusResult("Ready to pull plugin and BB skill updates from GitHub."),
    syncNow,
  });

  bb.cli.register({
    name: "sync",
    summary: "Pull and reconcile BB plugins and skills from the private GitHub repository",
    commands: [
      { name: "status", summary: "Show local repository and recent sync status", usage: "bb sync status [--json]" },
      { name: "now", summary: "Pull and apply available plugin and skill updates", usage: "bb sync now [--json]" },
    ],
    async run(argv) {
      const [command = "status"] = argv;
      const result = command === "now" ? await syncNow()
        : command === "status" ? await statusResult("Ready to pull plugin and BB skill updates from GitHub.")
        : null;
      if (!result) return { exitCode: 2, stderr: "Usage: bb sync <status|now>\n" };
      return { exitCode: result.failures.length > 0 ? 1 : 0, stdout: `${JSON.stringify(result, null, 2)}\n` };
    },
  });

  let lastAutomaticSyncAt = 0;
  bb.background.service("auto-sync", {
    async start(signal) {
      while (!signal.aborted) {
        const current = await settings.get();
        const intervalMinutes = Number(current.autoSyncMinutes);
        if (Number.isFinite(intervalMinutes) && intervalMinutes > 0 && Date.now() - lastAutomaticSyncAt >= intervalMinutes * 60_000) {
          lastAutomaticSyncAt = Date.now();
          const result = await syncNow();
          if (result.failures.length > 0) bb.log.warn(`automatic sync: ${result.failures.join(" | ")}`);
        }
        await wait(60_000, signal);
      }
    },
  });
}
