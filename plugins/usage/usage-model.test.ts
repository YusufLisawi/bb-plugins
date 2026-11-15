import assert from "node:assert/strict";
import { test } from "node:test";
import { accountWindows, groupWindow, isUltra, planLabel, planMultiplier, type UsageAccount } from "./usage-model.ts";
import { availableSelection, parseSelection, toggleProvider } from "./provider-selection.ts";

const now = Date.now();
const account = (patch: Partial<UsageAccount> = {}): UsageAccount => ({
  id: "a", provider: "claude", subscriptionType: "pro", rateLimitTier: null,
  fiveHourUtilization: 0.2, fiveHourResetAt: now + 100_000,
  sevenDayUtilization: 0.4, sevenDayResetAt: now + 200_000, ...patch,
});

test("Ultra's weekly allowance is 10x for new and legacy metadata", () => {
  for (const patch of [
    { subscriptionType: "ultra" }, { subscriptionType: "claude_ultra" },
    { rateLimitTier: "default_claude_ultra" },
    { subscriptionType: "max", rateLimitTier: "default_claude_max_20x" },
  ]) {
    const a = account(patch);
    assert.equal(isUltra(a), true);
    assert.equal(planMultiplier(a, 10_080), 10);
    assert.equal(planLabel(a), "Ultra · 10x");
  }
});

test("an Ultra override hides stale five-hour data in every representation", () => {
  const a = account({ rateLimitTier: "default_claude_max_5x", limitWindows: [
    { slot: "primary", windowMinutes: 300, utilization: 0.9, resetAt: now + 300_000 },
  ] });
  assert.deepEqual(accountWindows(a, "ultra").map((w) => w.minutes), [10_080]);
  assert.equal(planMultiplier(a, 10_080, "ultra"), 10);
  assert.equal(groupWindow([a], 300, { a: "ultra" }), null);
  assert.equal(accountWindows(a).length, 2);
});

test("detected Ultra drops an expired session but preserves a live verification limit", () => {
  assert.equal(accountWindows(account({ subscriptionType: "ultra", fiveHourResetAt: now - 1 })).length, 1);
  assert.equal(accountWindows(account({ subscriptionType: "ultra" })).length, 2);
  assert.equal(accountWindows(account({ subscriptionType: "ultra", fiveHourResetAt: null })).length, 1);
});

test("mixed-plan weekly totals use 10x Ultra and exclude it from session totals", () => {
  const accounts = [account({ id: "ultra", sevenDayUtilization: 0.8 }),
    account({ id: "max", rateLimitTier: "default_claude_max_5x", sevenDayUtilization: 0.2, fiveHourUtilization: 0.5 })];
  assert.equal(groupWindow(accounts, 10_080, { ultra: "ultra" })?.utilization, 0.6);
  assert.equal(groupWindow(accounts, 300, { ultra: "ultra" })?.utilization, 0.5);
});

test("Pro, Max 5x, Team and Codex keep their existing capacity", () => {
  assert.equal(planMultiplier(account()), 1);
  assert.equal(planMultiplier(account({ subscriptionType: "max", rateLimitTier: "default_claude_max_5x" })), 5);
  assert.equal(planMultiplier(account({ subscriptionType: "claude_team" })), 1.25);
  assert.equal(planMultiplier(account({ provider: "codex", subscriptionType: "ultra" }), 10_080, "ultra"), 1);
});

test("weekly-only Codex stays weekly-only and does not dilute a session total", () => {
  const a = account({ provider: "codex", fiveHourUtilization: null, sevenDayUtilization: null,
    limitWindows: [{ slot: "primary", windowMinutes: 10_080, utilization: 0.6, resetAt: now + 300_000 }] });
  assert.deepEqual(accountWindows(a).map((w) => w.label), ["Weekly"]);
  assert.equal(groupWindow([a], 300), null);
  assert.equal(groupWindow([a], 10_080)?.utilization, 0.6);
});

test("provider selection migrates old preferences, validates storage and survives missing providers", () => {
  assert.deepEqual(parseSelection(null, "codex"), ["codex"]);
  assert.deepEqual(parseSelection('["codex","claudeCode","codex","invalid"]', null), ["claudeCode", "codex"]);
  assert.deepEqual(parseSelection('{bad json', "claudeCode"), ["claudeCode"]);
  assert.deepEqual(availableSelection(["claudeCode", "codex"], ["claudeCode"]), ["claudeCode"]);
  assert.deepEqual(availableSelection(["cursor"], ["codex"]), ["codex"]);
});

test("providers can be combined and individually removed, with one always visible", () => {
  assert.deepEqual(toggleProvider(["claudeCode"], "codex"), ["claudeCode", "codex"]);
  assert.deepEqual(toggleProvider(["claudeCode", "codex"], "claudeCode"), ["codex"]);
  assert.deepEqual(toggleProvider(["codex"], "codex"), ["codex"]);
});
