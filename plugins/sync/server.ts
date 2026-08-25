import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

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

const syncRunSchema = z.object({
  configured: z.boolean(),
  repoPath: z.string(),
  localServerId: z.string(),
  lastRunAt: z.number().int().nullable(),
  lastRunStatus: z.string().nullable(),
  updated: z.boolean(),
  installedPluginIds: z.array(z.string()),
  updatedPluginIds: z.array(z.string()),
  reloadedPluginIds: z.array(z.string()),
  skippedPluginIds: z.array(z.string()),
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

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    repoPath: {
      type: "string",
      label: "Plugin repository folder",
      description: "Local clone of your private bb-plugins repository on this machine.",
      default: defaultCheckoutPath,
    },
    autoSyncMinutes: {
      type: "select",
      label: "Automatic update checks",
      description: "Pull and reload plugin code from GitHub on this machine.",
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
    options: Partial<Pick<SyncRun, "updated" | "installedPluginIds" | "updatedPluginIds" | "reloadedPluginIds" | "skippedPluginIds" | "failures">> = {},
  ): Promise<SyncRun> {
    const current = await settings.get();
    const repoPath = checkoutPath(current.repoPath);
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
      localServerId: await serverId(),
      lastRunAt: last?.finishedAt ?? null,
      lastRunStatus: last?.status ?? null,
      updated: options.updated ?? false,
      installedPluginIds: options.installedPluginIds ?? [],
      updatedPluginIds: options.updatedPluginIds ?? [],
      reloadedPluginIds: options.reloadedPluginIds ?? [],
      skippedPluginIds: options.skippedPluginIds ?? [],
      failures: options.failures ?? [],
      message,
    };
  }

  let activeSync: Promise<SyncRun> | null = null;

  async function performSyncNow(): Promise<SyncRun> {
    const startedAt = Date.now();
    const current = await settings.get();
    const repoPath = checkoutPath(current.repoPath);

    try {
      const root = await git(repoPath, ["rev-parse", "--show-toplevel"]);
      if (resolve(root) !== repoPath) {
        throw new Error(`Plugin repository folder resolves to ${root}; choose the repository root, not a subfolder.`);
      }
      const changes = await git(repoPath, ["status", "--porcelain", "--untracked-files=all", "--", "."]);
      const changedPaths = statusPaths(changes);
      const sourceChanges = changedPaths.filter((path) => !isGeneratedArtifact(path));
      if (sourceChanges.length > 0) {
        throw new Error(`Your local plugin repository has uncommitted changes (${sourceChanges.join(", ")}). Commit or stash them before syncing so nothing is overwritten.`);
      }

      let generatedArtifactsStashed = false;
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
        generatedArtifactsStashed = !stashResult.includes("No local changes to save");
      }

      const before = await git(repoPath, ["rev-parse", "HEAD"]);
      try {
        await git(repoPath, ["pull", "--ff-only"]);
      } catch (error) {
        if (generatedArtifactsStashed) {
          try {
            await git(repoPath, ["stash", "pop"]);
          } catch (restoreError) {
            const original = error instanceof Error ? error.message : String(error);
            throw new Error(`${original} Generated artifacts were stashed for the failed pull and could not be restored automatically: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
          }
        }
        throw error;
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

      for (const entry of collection.plugins) {
        if (entry.name === bb.pluginId) continue;

        const currentPlugin = installedById.get(entry.name);
        if (!currentPlugin) {
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

      const status = failures.length === 0 ? "ok" : "error";
      recordRun(status, updated
        ? `Pulled new commit; installed ${installedPluginIds.length}, updated ${updatedPluginIds.length}, reloaded ${reloadedPluginIds.length} plugin(s).`
        : `Reconciled collection; installed ${installedPluginIds.length}, updated ${updatedPluginIds.length} plugin(s).`, startedAt);
      return statusResult(
        failures.length === 0
          ? updated
            ? `Updated from GitHub and reconciled the plugin collection.`
            : installedPluginIds.length > 0 || updatedPluginIds.length > 0
              ? "Plugin collection reconciled."
              : "Already up to date."
          : "The collection was pulled, but one or more plugin actions failed.",
        { updated, installedPluginIds, updatedPluginIds, reloadedPluginIds, skippedPluginIds, failures },
      );
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
    status: () => statusResult("Ready to pull plugin updates from GitHub."),
    syncNow,
  });

  bb.cli.register({
    name: "sync",
    summary: "Pull and reload BB plugins from the private GitHub repository",
    commands: [
      { name: "status", summary: "Show local repository and recent sync status", usage: "bb sync status [--json]" },
      { name: "now", summary: "Pull and apply available plugin code updates", usage: "bb sync now [--json]" },
    ],
    async run(argv) {
      const [command = "status"] = argv;
      const result = command === "now" ? await syncNow()
        : command === "status" ? await statusResult("Ready to pull plugin updates from GitHub.")
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
