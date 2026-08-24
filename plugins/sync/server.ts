import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const defaultCheckoutPath = `${homedir()}/Developer/bb-plugins`;

const syncRunSchema = z.object({
  configured: z.boolean(),
  repoPath: z.string(),
  localServerId: z.string(),
  lastRunAt: z.number().int().nullable(),
  lastRunStatus: z.string().nullable(),
  updated: z.boolean(),
  reloadedPluginIds: z.array(z.string()),
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
    options: Partial<Pick<SyncRun, "updated" | "reloadedPluginIds" | "failures">> = {},
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
      reloadedPluginIds: options.reloadedPluginIds ?? [],
      failures: options.failures ?? [],
      message,
    };
  }

  async function syncNow(): Promise<SyncRun> {
    const startedAt = Date.now();
    const current = await settings.get();
    const repoPath = checkoutPath(current.repoPath);

    try {
      const root = await git(repoPath, ["rev-parse", "--show-toplevel"]);
      if (resolve(root) !== repoPath) {
        throw new Error(`Plugin repository folder resolves to ${root}; choose the repository root, not a subfolder.`);
      }
      const changes = await git(repoPath, ["status", "--porcelain"]);
      if (changes) {
        throw new Error("Your local plugin repository has uncommitted changes. Commit or stash them before syncing so nothing is overwritten.");
      }

      const before = await git(repoPath, ["rev-parse", "HEAD"]);
      await git(repoPath, ["pull", "--ff-only"]);
      const after = await git(repoPath, ["rev-parse", "HEAD"]);
      const updated = before !== after;
      const reloadedPluginIds: string[] = [];
      const failures: string[] = [];

      if (updated) {
        const installed = await bb.sdk.plugins.list();
        const pluginIds = installed.plugins
          .filter((item) => item.id !== bb.pluginId)
          .map((item) => ({ id: item.id, managedId: pathPluginId(item.source, repoPath) }))
          .filter((item): item is { id: string; managedId: string } => item.managedId !== null)
          .map((item) => item.id)
          .sort();

        for (const pluginId of pluginIds) {
          try {
            await bb.sdk.plugins.reload({ pluginId });
            reloadedPluginIds.push(pluginId);
          } catch (error) {
            failures.push(`Could not reload ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      const status = failures.length === 0 ? "ok" : "error";
      recordRun(status, updated ? `Pulled new commit; reloaded ${reloadedPluginIds.length} plugin(s).` : "Already up to date.", startedAt);
      return statusResult(
        updated
          ? failures.length === 0
            ? `Updated from GitHub and reloaded ${reloadedPluginIds.length} plugin(s).`
            : "Updates were pulled, but one or more plugins could not reload."
          : "Already up to date.",
        { updated, reloadedPluginIds, failures },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordRun("error", message, startedAt);
      return statusResult(message, { failures: [message] });
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
