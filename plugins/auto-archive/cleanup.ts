import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { createExemptions, type Exemptions } from "./exemptions";
import {
  deletionCandidates,
  readThreadIndex,
  refreshFamily,
} from "./thread-safety";

export interface CleanupConfig {
  deleteArchivedThreads: boolean;
  deleteArchivedAfterDays: number | null;
  dryRun: boolean;
}
export interface CleanupStats {
  scanned: number;
  candidates: number;
  deleted: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  enabled: boolean;
}
export const MAX_DELETIONS_PER_SWEEP = 25;

/** Invalid retention values disable deletion instead of choosing a fallback. */
export function parseDeletionDays(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const days = Number(raw);
  return Number.isSafeInteger(days) && days >= 1 && days <= 36500 ? days : null;
}

export async function runCleanup(
  bb: BbPluginApi,
  config: CleanupConfig,
  options: {
    now?: number;
    dryRun?: boolean;
    preview?: boolean;
    signal?: AbortSignal;
    exemptions?: Exemptions;
    canDelete?: () => Promise<boolean>;
  } = {},
): Promise<CleanupStats> {
  const now = options.now ?? Date.now();
  const dryRun = options.preview === true || (options.dryRun ?? config.dryRun);
  const days = config.deleteArchivedAfterDays;
  const enabled = config.deleteArchivedThreads && days !== null;
  const stats: CleanupStats = {
    scanned: 0,
    candidates: 0,
    deleted: 0,
    skipped: 0,
    errors: 0,
    dryRun,
    enabled,
  };
  if (
    (!enabled && !options.preview) ||
    days === null ||
    !Number.isSafeInteger(days) ||
    days < 1 ||
    !Number.isFinite(now)
  )
    return stats;
  const exemptions = options.exemptions ?? createExemptions(bb);
  const explicit = await exemptions.withProtectedThreads(async (ids) => ids);
  const index = await readThreadIndex(bb, options.signal);
  stats.scanned = index.size;
  const candidates = deletionCandidates(index, explicit, days, now);
  stats.candidates = candidates.length;
  const selected = dryRun
    ? candidates
    : candidates.slice(0, MAX_DELETIONS_PER_SWEEP);
  stats.skipped = candidates.length - selected.length;

  for (const [position, candidate] of selected.entries()) {
    if (options.signal?.aborted) break;
    if (dryRun) {
      bb.log.info(
        `[dry-run] would delete archived thread ${candidate.id} — ${candidate.title ?? candidate.titleFallback ?? "untitled"}`,
      );
      continue;
    }
    if (options.canDelete && !(await options.canDelete())) {
      stats.skipped += selected.length - position;
      break;
    }
    try {
      await exemptions.withProtectedThreads(async (protectedIds) => {
        // Refresh the whole relation graph, including hidden lifecycle children.
        const fresh = await readThreadIndex(bb, options.signal);
        if (!fresh.has(candidate.id)) {
          stats.skipped++;
          return;
        }
        await refreshFamily(bb, fresh, candidate.id, options.signal);
        if (
          options.signal?.aborted ||
          !deletionCandidates(fresh, protectedIds, days, now).some(
            (thread) => thread.id === candidate.id,
          )
        ) {
          stats.skipped++;
          return;
        }
        if (options.canDelete && !(await options.canDelete())) {
          stats.skipped++;
          return;
        }
        // Refuse child cascades even if a child was attached after the scan.
        await bb.sdk.threads.delete({
          threadId: candidate.id,
          childThreadsConfirmed: false,
        });
        stats.deleted++;
        bb.log.info(`deleted archived thread ${candidate.id}`);
      });
    } catch (error) {
      stats.errors++;
      bb.log.error(
        `retained ${candidate.id}: cleanup failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  await bb.storage.kv.set("last-cleanup", { at: now, ...stats });
  return stats;
}
