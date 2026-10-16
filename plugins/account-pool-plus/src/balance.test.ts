import { describe, expect, it } from "vitest";
import {
  pickBalanced,
  planWeight,
  shouldRebalance,
  tightestUsage,
  type BalanceCandidate,
} from "./balance.js";
import { EMPTY_FAMILY_WEEKLY, type AccountQuota } from "./contracts.js";

const NOW = 1_800_000_000_000;

function candidate(
  id: string,
  usage: { fiveHour?: number | null; sevenDay?: number | null },
  plan: { tier?: string | null; subscription?: string | null } = {},
  priority = 100,
): BalanceCandidate {
  const quota: AccountQuota = {
    accountId: id,
    usageRestriction: null,
    extraUsage: null,
    fiveHourUtilization: usage.fiveHour ?? null,
    fiveHourResetAt: NOW + 60_000,
    fiveHourStatus: "allowed",
    sevenDayUtilization: usage.sevenDay ?? null,
    sevenDayResetAt: NOW + 60_000,
    sevenDayStatus: "allowed",
    representativeClaim: null,
    familyWeekly: EMPTY_FAMILY_WEEKLY,
    limitWindows: [],
    observedAt: NOW,
    heldUntil: null,
    error: null,
  };
  return {
    account: {
      id,
      provider: "claude",
      kind: "oauth",
      label: id,
      email: null,
      accountUuid: null,
      subscriptionType: plan.subscription ?? null,
      rateLimitTier: plan.tier ?? null,
      enabled: true,
      priority,
      createdAt: 0,
      lastUsedAt: null,
      lastUsedHostId: null,
    },
    quota,
  };
}

describe("balanced routing", () => {
  it("weights plans relative to Pro", () => {
    expect(
      planWeight({ rateLimitTier: "default_claude_max_5x", subscriptionType: "max" }),
    ).toBe(5);
    expect(
      planWeight({ rateLimitTier: "default_raven", subscriptionType: "claude_team" }),
    ).toBe(1.25);
    expect(planWeight({ rateLimitTier: null, subscriptionType: "pro" })).toBe(1);
    expect(
      planWeight({ provider: "codex", rateLimitTier: null, subscriptionType: "team" }),
    ).toBe(1);
  });

  it("measures the tightest live window and ignores expired ones", () => {
    const busy = candidate("a", { fiveHour: 0.2, sevenDay: 0.7 });
    expect(tightestUsage(busy.quota, "opus", NOW)).toBe(0.7);
    expect(tightestUsage(busy.quota, "opus", NOW + 120_000)).toBe(0);
  });

  it("picks the account with the most room, bigger plans first on ties", () => {
    const max = candidate("max", { fiveHour: 0.3 }, { tier: "default_claude_max_5x" }, 1);
    const team = candidate("team", { fiveHour: 0.1 }, { subscription: "claude_team" }, 2);
    expect(pickBalanced([max, team], "opus", () => 0, NOW)?.account.id).toBe("team");
    const fresh = candidate("fresh", {}, { subscription: "claude_team" }, 3);
    const freshMax = candidate("fresh-max", {}, { tier: "default_claude_max_5x" }, 4);
    expect(pickBalanced([fresh, freshMax], "opus", () => 0, NOW)?.account.id).toBe(
      "fresh-max",
    );
  });

  it("spreads a burst by the requests already running", () => {
    const one = candidate("one", {}, {}, 1);
    const two = candidate("two", {}, {}, 2);
    const running = new Map([["one", 3]]);
    expect(
      pickBalanced([one, two], "opus", (id) => running.get(id) ?? 0, NOW)?.account.id,
    ).toBe("two");
  });

  it("moves a pinned conversation only off a nearly full account", () => {
    const full = candidate("full", { fiveHour: 0.9 });
    const empty = candidate("empty", { fiveHour: 0.2 });
    const half = candidate("half", { fiveHour: 0.5 });
    expect(shouldRebalance(full, empty, "opus", NOW)).toBe(true);
    expect(shouldRebalance(half, empty, "opus", NOW)).toBe(false);
    expect(shouldRebalance(full, candidate("near", { fiveHour: 0.8 }), "opus", NOW)).toBe(
      false,
    );
  });
});
