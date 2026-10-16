// Balanced routing: spread new conversations so every account fills at the
// same rate relative to its own plan. Comparing usage as a share of each
// plan sends a 5x account about four times the traffic of a 1.25x seat, so
// the pool behaves like one subscription the size of all accounts together.
import type { Account, AccountQuota, ModelFamily } from "./contracts.js";

/**
 * Above this share of its tightest window a pinned conversation may move to
 * a much emptier account; below it, conversations stay put to keep their
 * prompt cache.
 */
export const REBALANCE_FROM = 0.85;
/** How much emptier the other account must be before a pin moves. */
export const REBALANCE_MARGIN = 0.25;
/** Score added per request already running on an account, per plan unit. */
const IN_FLIGHT_PENALTY = 0.01;

/**
 * Claude plan size relative to Pro: Max 5x / 20x from the tier, Team 1.25x.
 * Codex plans are not expressed as multiples and count as 1; balancing
 * itself compares usage percentages, so this only breaks ties and scales
 * the in-flight penalty.
 */
export function planWeight(
  account: Pick<Account, "rateLimitTier" | "subscriptionType"> &
    Partial<Pick<Account, "provider">>,
): number {
  if (account.provider === "codex") return 1;
  const max = (account.rateLimitTier ?? "").match(/max_(\d+)x/u);
  if (max?.[1] !== undefined) return Number(max[1]);
  const plan = (account.subscriptionType ?? "").toLowerCase();
  if (plan.includes("team")) return 1.25;
  if (plan === "max") return 5;
  return 1;
}

/**
 * Share used of the account's tightest live window for this model family:
 * five-hour, weekly, any reported limit window and the family's weekly
 * window. Windows past their reset and unmeasured windows count as empty.
 */
export function tightestUsage(
  quota: AccountQuota,
  family: ModelFamily,
  now: number,
): number {
  const live = (utilization: number | null, resetAt: number | null) =>
    utilization === null || (resetAt !== null && resetAt <= now)
      ? 0
      : utilization;
  const familyWindow = quota.familyWeekly[family];
  return Math.max(
    live(quota.fiveHourUtilization, quota.fiveHourResetAt),
    live(quota.sevenDayUtilization, quota.sevenDayResetAt),
    ...quota.limitWindows.map((window) =>
      live(window.utilization, window.resetAt),
    ),
    familyWindow === null
      ? 0
      : live(familyWindow.utilization, familyWindow.resetAt),
  );
}

export interface BalanceCandidate {
  account: Account;
  quota: AccountQuota;
}

/**
 * Lower is better: usage of the tightest window, nudged up by requests
 * already running so a burst of new conversations spreads out before fresh
 * usage readings arrive.
 */
export function balanceScore(
  candidate: BalanceCandidate,
  family: ModelFamily,
  inFlight: number,
  now: number,
): number {
  return (
    tightestUsage(candidate.quota, family, now) +
    (inFlight * IN_FLIGHT_PENALTY) / planWeight(candidate.account)
  );
}

/** The candidate with the most room; ties go to bigger plans, then priority. */
export function pickBalanced<T extends BalanceCandidate>(
  candidates: readonly T[],
  family: ModelFamily,
  inFlightOf: (accountId: string) => number,
  now: number,
): T | undefined {
  let best: { candidate: T; score: number } | undefined;
  for (const candidate of candidates) {
    const score = balanceScore(
      candidate,
      family,
      inFlightOf(candidate.account.id),
      now,
    );
    if (
      best === undefined ||
      score < best.score - 1e-9 ||
      (Math.abs(score - best.score) <= 1e-9 &&
        (planWeight(candidate.account) > planWeight(best.candidate.account) ||
          (planWeight(candidate.account) ===
            planWeight(best.candidate.account) &&
            candidate.account.priority < best.candidate.account.priority)))
    ) {
      best = { candidate, score };
    }
  }
  return best?.candidate;
}

/** Whether a pinned conversation should move to a much emptier account. */
export function shouldRebalance(
  bound: BalanceCandidate,
  best: BalanceCandidate,
  family: ModelFamily,
  now: number,
): boolean {
  if (bound.account.id === best.account.id) return false;
  const boundUsage = tightestUsage(bound.quota, family, now);
  return (
    boundUsage >= REBALANCE_FROM &&
    tightestUsage(best.quota, family, now) <= boundUsage - REBALANCE_MARGIN
  );
}
