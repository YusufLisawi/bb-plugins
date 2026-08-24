import { randomUUID } from "node:crypto";
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  SYNC_PROTOCOL_VERSION,
  actionTargetFingerprint,
  planSync,
  syncActionSchema,
  syncBaselineSchema,
  syncPlanSchema,
  syncSnapshotSchema,
  type SyncAction,
  type SyncPlan,
  type SyncSnapshot,
} from "./sync-model";

const syncRunSchema = z.object({
  configured: z.boolean(),
  peerUrl: z.string().nullable(),
  localServerId: z.string(),
  lastRunAt: z.number().int().nullable(),
  lastRunStatus: z.string().nullable(),
  actions: z.array(syncActionSchema),
  applied: z.number().int(),
  failures: z.array(z.string()),
  message: z.string(),
});

export type SyncRun = z.infer<typeof syncRunSchema>;

export const rpcContract = defineRpcContract({
  pairingToken: {
    input: z.null(),
    output: z.object({ token: z.string().min(1) }),
  },
  status: {
    input: z.null(),
    output: syncRunSchema,
  },
  plan: {
    input: z.null(),
    output: syncRunSchema,
  },
  syncNow: {
    input: z.null(),
    output: syncRunSchema,
  },
});

const applyRequestSchema = z
  .object({
    originServerId: z.string().min(1),
    actions: z.array(syncActionSchema).min(1),
  })
  .strict();

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function normalizePeerUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isPortableSource(source: string): boolean {
  return !source.startsWith("path:");
}

type PluginSettingsSnapshot = {
  schema: Record<string, { type: string; secret?: boolean }>;
  values: Record<string, unknown>;
};

function isUnavailablePluginSettings(error: unknown): boolean {
  return error instanceof Error && /HTTP 404: unknown plugin, or plugin is not running/.test(error.message);
}

export async function redactedPluginSettings(
  getSettings: () => Promise<PluginSettingsSnapshot>,
): Promise<{ settings: Record<string, string | boolean>; secretKeys: string[] }> {
  let pluginSettings: PluginSettingsSnapshot;
  try {
    pluginSettings = await getSettings();
  } catch (error) {
    if (isUnavailablePluginSettings(error)) return { settings: {}, secretKeys: [] };
    throw error;
  }
  const secretKeys = Object.entries(pluginSettings.schema)
    .filter(([, descriptor]) => descriptor.type === "string" && descriptor.secret)
    .map(([key]) => key)
    .sort();
  const settings = Object.fromEntries(
    Object.entries(pluginSettings.values).filter(
      ([key, value]) => !secretKeys.includes(key) && (typeof value === "string" || typeof value === "boolean"),
    ),
  ) as Record<string, string | boolean>;
  return { settings, secretKeys };
}

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    peerUrl: {
      type: "string",
      label: "Peer BB URL",
      description: "For example: https://yusuf.getbb.app",
      default: "",
    },
    peerToken: {
      type: "string",
      label: "Peer sync token",
      description: "Create this on the other BB server with `bb sync token`.",
      secret: true,
    },
    autoSyncMinutes: {
      type: "select",
      label: "Automatic sync",
      description: "Only unambiguous plugin changes are applied automatically.",
      options: ["off", "15", "60", "240"],
      default: "off",
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

  async function snapshot(): Promise<SyncSnapshot> {
    const listed = await bb.sdk.plugins.list();
    const plugins = await Promise.all(
      listed.plugins
        .filter((item) => item.id !== bb.pluginId)
        .map(async (item) => {
          const [source, settings] = await Promise.all([
            bb.sdk.plugins.getSource({ pluginId: item.id }),
            redactedPluginSettings(() => bb.sdk.plugins.getSettings({ pluginId: item.id })),
          ]);
          return {
            id: item.id,
            source: source.requested,
            resolved: source.resolved,
            version: item.version,
            enabled: item.enabled,
            settings: settings.settings,
            secretKeys: settings.secretKeys,
          };
        }),
    );
    return {
      protocolVersion: SYNC_PROTOCOL_VERSION,
      serverId: await serverId(),
      generatedAt: Date.now(),
      plugins: plugins.sort((left, right) => left.id.localeCompare(right.id)),
    };
  }

  function baselineKey(peerServerId: string): string {
    return `baseline:${peerServerId}`;
  }

  async function loadBaseline(peerServerId: string) {
    const value = await bb.storage.kv.get<unknown>(baselineKey(peerServerId));
    return value ? syncBaselineSchema.safeParse(value).data : undefined;
  }

  async function fetchPeerSnapshot(): Promise<SyncSnapshot> {
    const current = await settings.get();
    const peerUrl = normalizePeerUrl(current.peerUrl);
    if (!peerUrl || !current.peerToken) {
      throw new Error("Set Peer BB URL and Peer sync token in this plugin’s settings first.");
    }
    const response = await fetch(
      `${peerUrl}/api/v1/plugins/${bb.pluginId}/http/snapshot`,
      { headers: { "x-bb-plugin-token": current.peerToken } },
    );
    if (!response.ok) throw new Error(`Peer snapshot request failed (${response.status}).`);
    return syncSnapshotSchema.parse(await response.json());
  }

  async function applyAction(action: SyncAction): Promise<string> {
    const current = await snapshot();
    if (actionTargetFingerprint(current, action) !== action.expectedTarget) {
      throw new Error(`${action.pluginId} changed after planning; fetch a new plan before applying it.`);
    }
    if (action.kind === "install") {
      if (!action.source || !isPortableSource(action.source)) {
        throw new Error(`${action.pluginId} needs a manual source transfer.`);
      }
      await bb.sdk.plugins.install({ source: action.source });
      if (action.enabled === false) await bb.sdk.plugins.disable({ pluginId: action.pluginId });
      return `Installed ${action.pluginId}.`;
    }
    if (action.kind === "update") {
      if (!action.source || !action.resolved || !action.version || !isPortableSource(action.source)) {
        throw new Error(`${action.pluginId} needs a managed update source and target version.`);
      }
      const available = await bb.sdk.plugins.checkUpdates();
      const candidate = available.find((item) => item.id === action.pluginId);
      if (candidate?.outcome !== "update-available" || candidate.candidate?.version !== action.version) {
        throw new Error(`${action.pluginId} does not have the expected compatible update available.`);
      }
      const result = await bb.sdk.plugins.applyUpdate({ pluginId: action.pluginId });
      if (!result.applied || result.outcome !== "updated") {
        throw new Error(`${action.pluginId} update was not applied${result.detail ? `: ${result.detail}` : "."}`);
      }
      const updated = await snapshot();
      const updatedPlugin = updated.plugins.find((item) => item.id === action.pluginId);
      if (
        !updatedPlugin ||
        updatedPlugin.source !== action.source ||
        updatedPlugin.resolved !== action.resolved ||
        updatedPlugin.version !== action.version
      ) {
        throw new Error(`${action.pluginId} updated, but did not reach the peer's expected revision; review the conflict.`);
      }
      return `Updated ${action.pluginId} to ${action.version}.`;
    }
    if (action.kind === "set-enabled") {
      if (action.enabled === undefined) throw new Error(`Missing enabled state for ${action.pluginId}.`);
      if (action.enabled) await bb.sdk.plugins.enable({ pluginId: action.pluginId });
      else await bb.sdk.plugins.disable({ pluginId: action.pluginId });
      return `${action.enabled ? "Enabled" : "Disabled"} ${action.pluginId}.`;
    }
    if (action.kind === "update-settings") {
      if (!action.settings) throw new Error(`Missing settings for ${action.pluginId}.`);
      await bb.sdk.plugins.updateSettings({
        pluginId: action.pluginId,
        values: action.settings,
      });
      return `Updated settings for ${action.pluginId}.`;
    }
    throw new Error(`${action.kind} cannot be applied automatically.`);
  }

  async function pushActions(actions: SyncAction[]): Promise<string[]> {
    if (actions.length === 0) return [];
    const current = await settings.get();
    const peerUrl = normalizePeerUrl(current.peerUrl);
    if (!peerUrl || !current.peerToken) throw new Error("Peer is not configured.");
    const response = await fetch(`${peerUrl}/api/v1/plugins/${bb.pluginId}/http/apply`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bb-plugin-token": current.peerToken,
      },
      body: JSON.stringify({ originServerId: await serverId(), actions }),
    });
    if (!response.ok) throw new Error(`Peer apply request failed (${response.status}).`);
    const payload = z.object({ results: z.array(z.string()) }).parse(await response.json());
    return payload.results;
  }

  function recordRun(status: "ok" | "error", detail: string, startedAt: number): void {
    db.prepare(
      "INSERT INTO sync_runs (started_at, finished_at, status, detail) VALUES (?, ?, ?, ?)",
    ).run(startedAt, Date.now(), status, detail.slice(0, 8_000));
  }

  function lastRun(): { finishedAt: number; status: string } | null {
    return db
      .prepare("SELECT finished_at AS finishedAt, status FROM sync_runs ORDER BY id DESC LIMIT 1")
      .get() as { finishedAt: number; status: string } | undefined ?? null;
  }

  async function statusResult(message: string, actions: SyncAction[] = [], applied = 0, failures: string[] = []) {
    const current = await settings.get();
    const last = lastRun();
    return {
      configured: Boolean(normalizePeerUrl(current.peerUrl) && current.peerToken),
      peerUrl: normalizePeerUrl(current.peerUrl) || null,
      localServerId: await serverId(),
      lastRunAt: last?.finishedAt ?? null,
      lastRunStatus: last?.status ?? null,
      actions,
      applied,
      failures,
      message,
    };
  }

  async function createPlan(): Promise<{ local: SyncSnapshot; peer: SyncSnapshot; plan: SyncPlan }> {
    const [local, peer] = await Promise.all([snapshot(), fetchPeerSnapshot()]);
    const baseline = await loadBaseline(peer.serverId);
    return { local, peer, plan: planSync(local, peer, baseline) };
  }

  async function syncNow(): Promise<z.infer<typeof syncRunSchema>> {
    const startedAt = Date.now();
    try {
      const { local, peer, plan } = await createPlan();
      const failures: string[] = [];
      let applied = 0;
      for (const action of plan.actions.filter((item) => item.direction === "pull" && ["install", "update", "set-enabled", "update-settings"].includes(item.kind))) {
        try {
          await applyAction(action);
          applied += 1;
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }
      const pushes = plan.actions.filter((item) => item.direction === "push" && ["install", "update", "set-enabled", "update-settings"].includes(item.kind));
      if (pushes.length > 0) {
        try {
          const results = await pushActions(pushes);
          applied += results.length;
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }

      const freshLocal = await snapshot();
      const freshPeer = await fetchPeerSnapshot();
      await bb.storage.kv.set(baselineKey(freshPeer.serverId), { local: freshLocal, peer: freshPeer });
      const status = failures.length === 0 ? "ok" : "error";
      recordRun(status, `${applied} action(s) applied; ${failures.length} failure(s).`, startedAt);
      return statusResult(
        failures.length === 0 ? `Synchronized ${applied} unambiguous change(s).` : "Sync completed with failures; review the list below.",
        plan.actions,
        applied,
        failures,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordRun("error", message, startedAt);
      return statusResult(message, [], 0, [message]);
    }
  }

  bb.http.route("GET", "/identity", async (context) =>
    context.json({ protocolVersion: SYNC_PROTOCOL_VERSION, serverId: await serverId(), pluginId: bb.pluginId }),
  { auth: "token" });
  bb.http.route("GET", "/snapshot", async (context) => context.json(await snapshot()), { auth: "token" });
  bb.http.route("POST", "/apply", async (context) => {
    let raw: unknown;
    try {
      raw = await context.req.json();
    } catch {
      return context.json({ error: "Expected JSON request body." }, 400);
    }
    const parsed = applyRequestSchema.safeParse(raw);
    if (!parsed.success) return context.json({ error: "Invalid apply request." }, 400);
    const results: string[] = [];
    for (const action of parsed.data.actions) results.push(await applyAction(action));
    return context.json({ results });
  }, { auth: "token" });

  bb.rpc.register(rpcContract, {
    pairingToken: async () => bb.sdk.plugins.token({ pluginId: bb.pluginId }),
    status: () => statusResult("Ready. Configure a peer URL and token to start syncing."),
    plan: async () => {
      try {
        const { plan } = await createPlan();
        return statusResult(`Found ${plan.actions.length} planned item(s).`, plan.actions);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return statusResult(message, [], 0, [message]);
      }
    },
    syncNow,
  });

  bb.cli.register({
    name: "sync",
    summary: "Synchronize BB plugin setup with a paired BB server",
    commands: [
      { name: "status", summary: "Show pairing and recent sync status", usage: "bb sync status [--json]" },
      { name: "plan", summary: "Show changes without writing", usage: "bb sync plan [--json]" },
      { name: "now", summary: "Apply unambiguous changes", usage: "bb sync now [--json]" },
      { name: "token", summary: "Print this server’s pairing token", usage: "bb sync token" },
    ],
    async run(argv) {
      const [command = "status"] = argv;
      if (command === "token") {
        const token = await bb.sdk.plugins.token({ pluginId: bb.pluginId });
        return { exitCode: 0, stdout: `${token.token}\n` };
      }
      const result = command === "plan" ? await createPlan().then(({ plan }) => statusResult(`Found ${plan.actions.length} planned item(s).`, plan.actions))
        : command === "now" ? await syncNow()
        : command === "status" ? await statusResult("Ready. Configure a peer URL and token to start syncing.")
        : null;
      if (!result) return { exitCode: 2, stderr: "Usage: bb sync <status|plan|now|token>\n" };
      return {
        exitCode: result.failures.length > 0 ? 1 : 0,
        stdout: `${JSON.stringify(result, null, 2)}\n`,
      };
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
