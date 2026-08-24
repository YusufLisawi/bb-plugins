import { createHash } from "node:crypto";
import { z } from "zod";

export const SYNC_PROTOCOL_VERSION = 1;

const settingValueSchema = z.union([z.string(), z.boolean()]);

export const syncPluginSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    resolved: z.string().min(1),
    version: z.string().min(1),
    enabled: z.boolean(),
    settings: z.record(z.string(), settingValueSchema),
    secretKeys: z.array(z.string()).default([]),
  })
  .strict();

export const syncSnapshotSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    serverId: z.string().min(1),
    generatedAt: z.number().int().nonnegative(),
    plugins: z.array(syncPluginSchema),
  })
  .strict();

export const syncBaselineSchema = z
  .object({
    local: syncSnapshotSchema,
    peer: syncSnapshotSchema,
  })
  .strict();

export const syncActionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum([
      "install",
      "update",
      "set-enabled",
      "update-settings",
      "conflict",
      "unsupported",
      "secret-confirmation",
    ]),
    direction: z.enum(["push", "pull", "none"]),
    pluginId: z.string().min(1),
    description: z.string().min(1),
    source: z.string().optional(),
    resolved: z.string().optional(),
    version: z.string().optional(),
    enabled: z.boolean().optional(),
    settings: z.record(z.string(), settingValueSchema).optional(),
    expectedTarget: z.string(),
  })
  .strict();

export const syncPlanSchema = z
  .object({
    localServerId: z.string(),
    peerServerId: z.string(),
    generatedAt: z.number().int(),
    actions: z.array(syncActionSchema),
  })
  .strict();

export type SyncAction = z.infer<typeof syncActionSchema>;
export type SyncBaseline = z.infer<typeof syncBaselineSchema>;
export type SyncPlan = z.infer<typeof syncPlanSchema>;
export type SyncPlugin = z.infer<typeof syncPluginSchema>;
export type SyncSnapshot = z.infer<typeof syncSnapshotSchema>;

type Decision = "same" | "push" | "pull" | "conflict";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")} ]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function sourceState(plugin: SyncPlugin | undefined): string | null {
  if (!plugin) return null;
  return `${plugin.source}\n${plugin.resolved}\n${plugin.version}`;
}

function decide(
  local: unknown,
  peer: unknown,
  baseLocal: unknown,
  basePeer: unknown,
  hasBaseline: boolean,
): Decision {
  if (stable(local) === stable(peer)) return "same";
  if (!hasBaseline) return "conflict";

  const localChanged = stable(local) !== stable(baseLocal);
  const peerChanged = stable(peer) !== stable(basePeer);
  if (localChanged && !peerChanged) return "push";
  if (!localChanged && peerChanged) return "pull";
  return "conflict";
}

function sourceIsPortable(source: string): boolean {
  return !source.startsWith("path:");
}

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

function parseVersion(value: string): ParsedVersion | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart);
    const rightNumber = /^\d+$/.test(rightPart);
    if (leftNumber && rightNumber) return Number(leftPart) - Number(rightPart);
    if (leftNumber) return -1;
    if (rightNumber) return 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
}

function isStrictVersionIncrease(candidate: string, current: string): boolean {
  const next = parseVersion(candidate);
  const installed = parseVersion(current);
  if (!next || !installed) return false;
  for (const key of ["major", "minor", "patch"] as const) {
    if (next[key] !== installed[key]) return next[key] > installed[key];
  }
  return comparePrerelease(next.prerelease, installed.prerelease) > 0;
}

function actionId(
  direction: SyncAction["direction"],
  kind: SyncAction["kind"],
  pluginId: string,
  suffix = "",
): string {
  return `${direction}:${kind}:${pluginId}:${suffix}`;
}

function currentTargetFingerprint(
  plugin: SyncPlugin | undefined,
  kind: SyncAction["kind"],
  settingKeys: string[] = [],
): string {
  if (kind === "install" || kind === "update") return plugin ? hash(sourceState(plugin)) : "missing";
  if (kind === "set-enabled") return plugin ? hash(plugin.enabled) : "missing";
  if (kind === "update-settings") {
    const values = Object.fromEntries(
      settingKeys.map((key) => [key, plugin?.settings[key] ?? null]),
    );
    return hash(values);
  }
  return "not-applicable";
}

function byId(snapshot: SyncSnapshot): Map<string, SyncPlugin> {
  return new Map(snapshot.plugins.map((plugin) => [plugin.id, plugin]));
}

function conflict(
  actions: SyncAction[],
  pluginId: string,
  description: string,
): void {
  actions.push({
    id: actionId("none", "conflict", pluginId, String(actions.length)),
    kind: "conflict",
    direction: "none",
    pluginId,
    description,
    expectedTarget: "not-applicable",
  });
}

export function planSync(
  local: SyncSnapshot,
  peer: SyncSnapshot,
  baseline?: SyncBaseline,
): SyncPlan {
  const actions: SyncAction[] = [];
  const localById = byId(local);
  const peerById = byId(peer);
  const baseLocalById = baseline ? byId(baseline.local) : new Map();
  const basePeerById = baseline ? byId(baseline.peer) : new Map();
  const ids = new Set([...localById.keys(), ...peerById.keys()]);

  for (const pluginId of [...ids].sort()) {
    const here = localById.get(pluginId);
    const there = peerById.get(pluginId);
    const baseHere = baseLocalById.get(pluginId);
    const baseThere = basePeerById.get(pluginId);
    const sourceDecision = decide(
      sourceState(here),
      sourceState(there),
      sourceState(baseHere),
      sourceState(baseThere),
      Boolean(baseline),
    );

    if (!here || !there) {
      if (sourceDecision === "conflict") {
        conflict(
          actions,
          pluginId,
          `Plugin exists only on ${here ? "this server" : "the peer"}; choose a direction before installing it.`,
        );
        continue;
      }
      if (sourceDecision === "same") continue;

      const sourcePlugin = sourceDecision === "push" ? here : there;
      const targetPlugin = sourceDecision === "push" ? there : here;
      if (!sourcePlugin) continue;
      if (!sourceIsPortable(sourcePlugin.source)) {
        actions.push({
          id: actionId(sourceDecision, "unsupported", pluginId),
          kind: "unsupported",
          direction: sourceDecision,
          pluginId,
          description: "Path-based plugins require a source-transfer confirmation and are not installed automatically.",
          source: sourcePlugin.source,
          expectedTarget: currentTargetFingerprint(targetPlugin, "install"),
        });
        continue;
      }
      actions.push({
        id: actionId(sourceDecision, "install", pluginId),
        kind: "install",
        direction: sourceDecision,
        pluginId,
        description: `Install ${pluginId} from the ${sourceDecision === "push" ? "local" : "peer"} source.`,
        source: sourcePlugin.source,
        enabled: sourcePlugin.enabled,
        expectedTarget: currentTargetFingerprint(targetPlugin, "install"),
      });
      continue;
    }

    if (
      sourceDecision !== "same" &&
      sourceDecision !== "conflict"
    ) {
      const sourcePlugin = sourceDecision === "push" ? here : there;
      const targetPlugin = sourceDecision === "push" ? there : here;
      if (
        sourcePlugin &&
        targetPlugin &&
        sourcePlugin.source === targetPlugin.source &&
        sourceIsPortable(sourcePlugin.source) &&
        isStrictVersionIncrease(sourcePlugin.version, targetPlugin.version)
      ) {
        actions.push({
          id: actionId(sourceDecision, "update", pluginId),
          kind: "update",
          direction: sourceDecision,
          pluginId,
          description: `Update ${pluginId} to ${sourcePlugin.version} on the ${sourceDecision === "push" ? "peer" : "local"} server.`,
          source: sourcePlugin.source,
          resolved: sourcePlugin.resolved,
          version: sourcePlugin.version,
          expectedTarget: currentTargetFingerprint(targetPlugin, "update"),
        });
        continue;
      }
    }

    if (sourceDecision !== "same") {
      conflict(
        actions,
        pluginId,
        `Plugin source or version differs${sourceDecision === "conflict" ? " on both sides" : ""}; reinstalling an existing plugin always requires review.`,
      );
      continue;
    }

    const enabledDecision = decide(
      here.enabled,
      there.enabled,
      baseHere?.enabled,
      baseThere?.enabled,
      Boolean(baseline),
    );
    if (enabledDecision === "conflict") {
      conflict(actions, pluginId, "Enabled state changed differently on both servers.");
    } else if (enabledDecision !== "same") {
      const sourcePlugin = enabledDecision === "push" ? here : there;
      const targetPlugin = enabledDecision === "push" ? there : here;
      actions.push({
        id: actionId(enabledDecision, "set-enabled", pluginId),
        kind: "set-enabled",
        direction: enabledDecision,
        pluginId,
        description: `${sourcePlugin.enabled ? "Enable" : "Disable"} ${pluginId} on the ${enabledDecision === "push" ? "peer" : "local"} server.`,
        enabled: sourcePlugin.enabled,
        expectedTarget: currentTargetFingerprint(targetPlugin, "set-enabled"),
      });
    }

    const settingsKeys = new Set([
      ...Object.keys(here.settings),
      ...Object.keys(there.settings),
    ]);
    for (const key of [...settingsKeys].sort()) {
      const settingDecision = decide(
        here.settings[key],
        there.settings[key],
        baseHere?.settings[key],
        baseThere?.settings[key],
        Boolean(baseline),
      );
      if (settingDecision === "same") continue;
      if (settingDecision === "conflict") {
        conflict(actions, pluginId, `Setting “${key}” differs and needs review.`);
        continue;
      }
      const sourcePlugin = settingDecision === "push" ? here : there;
      const targetPlugin = settingDecision === "push" ? there : here;
      const value = sourcePlugin.settings[key];
      if (value === undefined) {
        actions.push({
          id: actionId(settingDecision, "unsupported", pluginId, key),
          kind: "unsupported",
          direction: settingDecision,
          pluginId,
          description: `Removing setting “${key}” is not automatic.`,
          expectedTarget: currentTargetFingerprint(targetPlugin, "update-settings", [key]),
        });
        continue;
      }
      actions.push({
        id: actionId(settingDecision, "update-settings", pluginId, key),
        kind: "update-settings",
        direction: settingDecision,
        pluginId,
        description: `Copy setting “${key}” to the ${settingDecision === "push" ? "peer" : "local"} server.`,
        settings: { [key]: value },
        expectedTarget: currentTargetFingerprint(targetPlugin, "update-settings", [key]),
      });
    }

    const localSecretKeys = [...here.secretKeys].sort();
    const peerSecretKeys = [...there.secretKeys].sort();
    if (stable(localSecretKeys) !== stable(peerSecretKeys)) {
      actions.push({
        id: actionId("none", "secret-confirmation", pluginId),
        kind: "secret-confirmation",
        direction: "none",
        pluginId,
        description: "Secret settings differ. Their values are withheld until an explicit transfer confirmation is implemented.",
        expectedTarget: "not-applicable",
      });
    }
  }

  return {
    localServerId: local.serverId,
    peerServerId: peer.serverId,
    generatedAt: Date.now(),
    actions,
  };
}

export function actionTargetFingerprint(
  snapshot: SyncSnapshot,
  action: SyncAction,
): string {
  const plugin = byId(snapshot).get(action.pluginId);
  return currentTargetFingerprint(
    plugin,
    action.kind,
    action.settings ? Object.keys(action.settings) : [],
  );
}

export function snapshotFingerprint(snapshot: SyncSnapshot): string {
  return hash({
    protocolVersion: snapshot.protocolVersion,
    serverId: snapshot.serverId,
    plugins: snapshot.plugins,
  });
}
