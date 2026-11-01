// bb-plugin-auto-archive — backend entry.
//
// Sweeps all root threads on load and then hourly, archiving any that have
// had no activity for the configured number of days. Activity is bb's
// `latestAttentionAt` (last turn completion / error / creation) — reads and
// metadata edits never count. Archiving a parent cascades to its children.
// Child threads (sub-agents, forks) also have their own, shorter threshold:
// an idle child is archived on its own while its parent stays.
//
// Pins are always protected. Optional archive cleanup deletes old archived
// leaves without cascades; recent, active, hidden, and exempt families are kept.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  createExemptions,
  exemptionResultSchema,
  type Exemptions,
} from "./exemptions";
import {
  runCleanup,
  parseDeletionDays,
  type CleanupConfig,
  type CleanupStats,
} from "./cleanup";
import {
  archiveProtectedIds,
  childArchiveProtectedIds,
  readThreadIndex,
  refreshFamily,
} from "./thread-safety";
import {
  msUntilNextHour,
  parseChildInactivityDays,
  parseInactivityDays,
  selectChildrenToArchive,
  selectThreadsToArchive,
  sleep,
  type SweepConfig,
  type SweepStats,
} from "./sweep.js";

export interface ResolvedSweepConfig extends SweepConfig, CleanupConfig {
  /** Log candidates without archiving anything. */
  dryRun: boolean;
}

export interface RunSweepOptions {
  /** Injectable clock for tests. */
  now?: number;
  /** Override the config's dry-run for this sweep (CLI `--dry-run`). */
  dryRun?: boolean;
  /** Abort the sweep between pages/archives when the caller disconnects. */
  signal?: AbortSignal;
  exemptions?: Exemptions;
}

export const rpcContract = defineRpcContract({
  getExemptions: { input: z.null(), output: exemptionResultSchema },
  setExemption: {
    input: z
      .object({ threadId: z.string().min(1).max(512), exempt: z.boolean() })
      .strict(),
    output: exemptionResultSchema,
  },
});

/**
 * Run one archive sweep: page through non-archived threads (hidden included
 * so the config can decide), select stale roots and, when enabled, stale
 * children, archive them, and record the outcome in kv for
 * `bb auto-archive status`.
 */
export async function runSweep(
  bb: BbPluginApi,
  config: ResolvedSweepConfig,
  options: RunSweepOptions = {},
): Promise<SweepStats> {
  const now = options.now ?? Date.now();
  const dryRun = options.dryRun ?? config.dryRun;
  const stats: SweepStats = {
    scanned: 0,
    candidates: 0,
    archived: 0,
    errors: 0,
    dryRun,
    childCandidates: 0,
    childArchived: 0,
  };

  const exemptions = options.exemptions ?? createExemptions(bb);
  const explicit = await exemptions.withProtectedThreads(async (ids) => ids);
  const exempt = new Set(await exemptions.read());
  const index = await readThreadIndex(bb, options.signal);
  const protectedIds = archiveProtectedIds(index, explicit, config, now);
  // Collect first: archive changes which page a thread belongs to.
  const live = [...index.values()].filter(
    (thread) => thread.archivedAt === null,
  );
  const roots = live.filter((thread) => thread.parentThreadId === null);
  const childSweep =
    config.childInactivityDays !== null &&
    config.childInactivityDays !== undefined;
  stats.scanned = childSweep ? live.length : roots.length;
  const rootCandidates = selectThreadsToArchive(roots, config, now).filter(
    (thread) => !protectedIds.has(thread.id),
  );
  const childProtected = childArchiveProtectedIds(
    index,
    explicit,
    exempt,
    config,
    now,
  );
  const childCandidates = selectChildrenToArchive(live, config, now).filter(
    (thread) => !childProtected.has(thread.id),
  );
  // A candidate below another candidate goes with that archive's cascade.
  const chosen = new Set(
    [...rootCandidates, ...childCandidates].map((thread) => thread.id),
  );
  const coveredByCascade = (thread: (typeof live)[number]) => {
    const seen = new Set([thread.id]);
    for (
      let parentId = thread.parentThreadId;
      parentId !== null && !seen.has(parentId);
      parentId = index.get(parentId)?.parentThreadId ?? null
    ) {
      if (chosen.has(parentId)) return true;
      seen.add(parentId);
    }
    return false;
  };
  const candidates = [
    ...rootCandidates.map((thread) => ({ thread, child: false })),
    ...childCandidates
      .filter((thread) => !coveredByCascade(thread))
      .map((thread) => ({ thread, child: true })),
  ].map(({ thread, child }) => ({
    id: thread.id,
    child,
    label: threadTitle(thread),
  }));
  stats.candidates = candidates.length;
  stats.childCandidates = candidates.filter((c) => c.child).length;

  for (const candidate of candidates) {
    if (options.signal?.aborted) break;
    const kind = candidate.child ? "child " : "";
    if (dryRun) {
      bb.log.info(
        `[dry-run] would archive ${kind}${candidate.id} — ${candidate.label}`,
      );
      continue;
    }
    try {
      // Recheck under the same lock as exemption changes. Also recheck core
      // activity/pin state: work may have started while the list was paged.
      await exemptions.withProtectedThreads(async (ids) => {
        if (options.signal?.aborted || ids.has(candidate.id)) return;
        const fresh = await readThreadIndex(bb, options.signal);
        if (!fresh.has(candidate.id)) return;
        await refreshFamily(bb, fresh, candidate.id, options.signal);
        const current = fresh.get(candidate.id)!;
        if (options.signal?.aborted) return;
        if (candidate.child) {
          const exemptNow = new Set(await exemptions.read());
          if (
            childArchiveProtectedIds(fresh, ids, exemptNow, config, now).has(
              candidate.id,
            ) ||
            selectChildrenToArchive([current], config, now).length === 0
          )
            return;
        } else if (
          archiveProtectedIds(fresh, ids, config, now).has(candidate.id) ||
          selectThreadsToArchive([current], config, now).length === 0
        )
          return;
        await bb.sdk.threads.archive({ threadId: candidate.id });
        stats.archived += 1;
        if (candidate.child) stats.childArchived! += 1;
        bb.log.info(`archived ${kind}${candidate.id} — ${candidate.label}`);
      });
    } catch (error) {
      stats.errors += 1;
      bb.log.error(
        `failed to archive ${kind}${candidate.id} — ${errorMessage(error)}`,
      );
    }
  }

  await bb.storage.kv.set("last-sweep", { at: now, ...stats });
  return stats;
}

export function threadTitle(thread: {
  title: string | null;
  titleFallback: string | null;
}): string {
  return thread.title ?? thread.titleFallback ?? "untitled";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");
  const exemptions = createExemptions(bb);
  bb.events.on("thread.deleted", async ({ thread }) => {
    await exemptions.set(thread.id, false);
  });
  bb.rpc.register(rpcContract, {
    getExemptions: async () => ({ threadIds: await exemptions.read() }),
    setExemption: async ({ threadId, exempt }) => ({
      threadIds: await exemptions.set(threadId, exempt),
    }),
  });

  const settings = bb.settings.define({
    inactivityDays: {
      type: "string",
      label: "Inactivity threshold (days)",
      description:
        "Archive threads whose last activity is older than this many days. " +
        "Only threads that went idle AFTER this plugin was installed are " +
        "ever archived — a pre-existing backlog is left untouched, and " +
        "nothing happens until the threshold has elapsed since install.",
      default: "15",
    },
    childInactivityDays: {
      type: "string",
      label: "Archive sub-threads after (days)",
      description:
        "Archive a child thread (a sub-agent or fork started under a parent) " +
        "on its own once it has been idle this many days, while its parent " +
        "stays. Pinned and exempt threads keep their sub-threads; working or " +
        "recently active sub-threads are kept. 0 or blank turns this off and " +
        "leaves children to their parent.",
      default: "2",
    },
    archiveHidden: {
      type: "boolean",
      label: "Archive hidden threads",
      description:
        "Also archive hidden background-worker threads. Off by default — " +
        "their owners manage their lifecycle.",
      default: false,
    },
    archiveRunning: {
      type: "boolean",
      label: "Archive threads with work in flight",
      description:
        "Also archive threads that are starting, active, or stopping. " +
        "Archiving stops running work, so this is off by default.",
      default: false,
    },
    deleteArchivedThreads: {
      type: "boolean",
      label: "Automatically delete archived threads",
      description:
        "Permanently remove old archived threads. Off by default. Pinned, exempt, recently used, hidden, and busy threads and their families are protected. No cascading deletion.",
      default: false,
    },
    deleteArchivedAfterDays: {
      type: "string",
      label: "Delete after days in archive",
      description:
        "Whole days since archiving and last use (13 by default). Existing old archives can qualify when cleanup is enabled. Invalid values disable deletion. Preview with bb auto-archive cleanup --dry-run.",
      default: "13",
    },
    dryRun: {
      type: "boolean",
      label: "Dry run",
      description:
        "Report archive and deletion candidates without changing any threads.",
      default: false,
    },
  });

  async function resolveConfig(): Promise<ResolvedSweepConfig> {
    const values = await settings.get();
    const installedAt = await ensureInstalledAt(bb);
    return {
      inactivityDays: parseInactivityDays(values.inactivityDays),
      childInactivityDays: parseChildInactivityDays(values.childInactivityDays),
      archiveHidden: values.archiveHidden,
      archiveRunning: values.archiveRunning,
      dryRun: values.dryRun,
      deleteArchivedThreads: values.deleteArchivedThreads,
      deleteArchivedAfterDays: parseDeletionDays(
        values.deleteArchivedAfterDays,
      ),
      sinceInstallAt: installedAt,
    };
  }

  async function canDelete(days: number | null): Promise<boolean> {
    const values = await settings.get();
    return (
      values.deleteArchivedThreads &&
      !values.dryRun &&
      parseDeletionDays(values.deleteArchivedAfterDays) === days
    );
  }

  // Sweep once on load, then at the top of every hour. Settings are re-read
  // per sweep so a `bb plugin config` change applies on the next run.
  bb.background.service("sweeper", {
    async start(signal) {
      while (!signal.aborted) {
        try {
          const config = await resolveConfig();
          const stats = await runSweep(bb, config, { signal, exemptions });
          bb.log.info(
            `sweep complete — scanned ${stats.scanned}, archived ${stats.archived}, ` +
              `errors ${stats.errors}${stats.dryRun ? " (dry run)" : ""}`,
          );
          const cleanupConfig = await resolveConfig();
          const cleanup = await runCleanup(bb, cleanupConfig, {
            signal,
            exemptions,
            canDelete: () => canDelete(cleanupConfig.deleteArchivedAfterDays),
          });
          if (cleanup.enabled) bb.log.info(formatCleanup(cleanup));
        } catch (error) {
          bb.log.error(`sweep failed: ${errorMessage(error)}`);
        }
        await sleep(msUntilNextHour(), signal);
      }
    },
  });

  bb.cli.register({
    name: "auto-archive",
    summary: "Auto-archive threads with no recent activity",
    commands: [
      {
        name: "run",
        summary: "Run an archive sweep now",
        usage: "bb auto-archive run [--dry-run]",
      },
      {
        name: "cleanup",
        summary:
          "Clean old archived threads or safely preview deletion candidates",
        usage: "bb auto-archive cleanup [--dry-run]",
      },
      {
        name: "status",
        summary: "Show the last sweep result and current configuration",
        usage: "bb auto-archive status",
      },
    ],
    async run(argv, ctx) {
      const [sub, ...rest] = argv;
      if (sub === "run") {
        const config = await resolveConfig();
        const stats = await runSweep(
          bb,
          {
            ...config,
            dryRun: rest.includes("--dry-run") ? true : config.dryRun,
          },
          { signal: ctx.signal, exemptions },
        );
        return {
          exitCode: 0,
          stdout: formatStats(stats),
        };
      }
      if (sub === "cleanup") {
        const config = await resolveConfig();
        const preview = rest.includes("--dry-run");
        const stats = await runCleanup(bb, config, {
          signal: ctx.signal,
          exemptions,
          preview,
          canDelete: () => canDelete(config.deleteArchivedAfterDays),
        });
        return { exitCode: 0, stdout: formatCleanup(stats) };
      }
      if (sub === "status") {
        const config = await resolveConfig();
        const last = await bb.storage.kv.get<SweepStats & { at: number }>(
          "last-sweep",
        );
        const lines = [
          `threshold: ${config.inactivityDays} day(s)`,
          `sub-thread threshold: ${config.childInactivityDays === null || config.childInactivityDays === undefined ? "off (children follow their parent)" : `${config.childInactivityDays} day(s)`}`,
          "pinned threads: always protected from automatic archive and deletion",
          `archive hidden: ${config.archiveHidden}`,
          `archive running: ${config.archiveRunning}`,
          `dry run: ${config.dryRun}`,
          `auto-delete archived: ${config.deleteArchivedThreads}`,
          `archive retention: ${config.deleteArchivedAfterDays === null ? "invalid (deletion disabled)" : `${config.deleteArchivedAfterDays} day(s)`}`,
          "deletion safeguards: no cascades; protect recent/active/queued/hidden/exempt families; max 25 per sweep",
          `exempt threads: ${(await exemptions.read()).length}`,
          `installed: ${new Date(config.sinceInstallAt).toISOString()}`,
        ];
        if (last) {
          lines.push(
            `last sweep: ${new Date(last.at).toISOString()}`,
            formatStats(last),
          );
        } else {
          lines.push("last sweep: never");
        }
        const cleanup = await bb.storage.kv.get<CleanupStats & { at: number }>(
          "last-cleanup",
        );
        if (cleanup)
          lines.push(
            `last cleanup: ${new Date(cleanup.at).toISOString()}`,
            formatCleanup(cleanup),
          );
        return { exitCode: 0, stdout: lines.join("\n") };
      }
      return {
        exitCode: 2,
        stderr: "usage: bb auto-archive <run|cleanup|status>",
      };
    },
  });
}

function formatStats(stats: SweepStats): string {
  const suffix = stats.dryRun ? " (dry run)" : "";
  const children = stats.childCandidates
    ? ` (sub-threads: candidates ${stats.childCandidates}, archived ${stats.childArchived ?? 0})`
    : "";
  return (
    `scanned ${stats.scanned}, candidates ${stats.candidates}, ` +
    `archived ${stats.archived}, errors ${stats.errors}${children}${suffix}`
  );
}

function formatCleanup(stats: CleanupStats): string {
  return (
    `cleanup ${stats.enabled ? "enabled" : "disabled"}${stats.dryRun ? " (dry run)" : ""} — ` +
    `scanned ${stats.scanned}, candidates ${stats.candidates}, deleted ${stats.deleted}, skipped ${stats.skipped}, errors ${stats.errors}`
  );
}

const INSTALLED_AT_KEY = "installed-at";

/**
 * Return the epoch ms the plugin was first installed, recording it on first
 * load. The timestamp persists across updates, so a pre-install backlog stays
 * protected even after the plugin is upgraded.
 */
async function ensureInstalledAt(bb: BbPluginApi): Promise<number> {
  const existing = await bb.storage.kv.get<number>(INSTALLED_AT_KEY);
  if (typeof existing === "number") {
    return existing;
  }
  const now = Date.now();
  await bb.storage.kv.set(INSTALLED_AT_KEY, now);
  bb.log.info(
    `first run — recording install time ${new Date(now).toISOString()}; ` +
      "threads that were already idle before install will never be " +
      "auto-archived",
  );
  return now;
}
