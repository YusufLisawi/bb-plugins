/** Display-only plan policy. Account Pooler+ remains the owner of routing. */
export type PlanOverride = "ultra";
export type PlanOverrides = Record<string, PlanOverride>;

export interface UsageAccount {
  id: string;
  provider: "claude" | "codex";
  subscriptionType: string | null;
  rateLimitTier: string | null;
  fiveHourUtilization: number | null;
  fiveHourResetAt: number | null;
  sevenDayUtilization: number | null;
  sevenDayResetAt: number | null;
  limitWindows?: Array<{
    slot: string;
    windowMinutes: number | null;
    utilization: number | null;
    resetAt: number | null;
  }>;
}

export interface UsageWindowValue {
  label: string;
  minutes: number;
  utilization: number;
  resetAt: number | null;
}

export function isUltra(account: UsageAccount, override?: PlanOverride): boolean {
  if (account.provider !== "claude") return false;
  // Existing OAuth imports can retain Max 20x's old tier after the rename.
  return override === "ultra" || /ultra/iu.test(
    `${account.subscriptionType ?? ""} ${account.rateLimitTier ?? ""}`,
  ) || /max_20x(?:\b|_)/iu.test(account.rateLimitTier ?? "");
}

/** Capacity is per window: Ultra is 10x weekly, legacy session size was 20x. */
export function planMultiplier(
  account: UsageAccount,
  minutes = 10_080,
  override?: PlanOverride,
): number {
  if (account.provider === "codex") return 1;
  if (isUltra(account, override)) return minutes === 300 ? 20 : 10;
  const max = (account.rateLimitTier ?? "").match(/max_(\d+)x/iu);
  if (max?.[1] !== undefined && Number(max[1]) > 0) return Number(max[1]);
  const plan = (account.subscriptionType ?? "").toLowerCase();
  if (plan.includes("team")) return 1.25;
  if (plan === "max") return 5;
  return 1;
}

export function formatMultiplier(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/u, "")}x`;
}

export function planLabel(account: UsageAccount, override?: PlanOverride) {
  if (account.provider === "codex") {
    const plan = account.subscriptionType ?? "ChatGPT";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
  if (isUltra(account, override)) return "Ultra · 10x";
  if ((account.subscriptionType ?? "").toLowerCase().includes("team")) return "Team";
  return formatMultiplier(planMultiplier(account));
}

export function windowLabel(minutes: number) {
  if (minutes === 300) return "5h";
  if (minutes === 10_080) return "Weekly";
  if (minutes === 1_440) return "Daily";
  return minutes % 1_440 === 0 ? `${minutes / 1_440}d` : `${minutes / 60}h`;
}

/** Only reported windows contribute to totals; a missing window is not 0% usage. */
export function accountWindows(
  account: UsageAccount,
  override?: PlanOverride,
  now = Date.now(),
): UsageWindowValue[] {
  const windows: UsageWindowValue[] = [];
  const push = (minutes: number, utilization: number | null, resetAt: number | null) => {
    if (utilization === null || !Number.isFinite(utilization)) return;
    // The explicit Ultra option describes a verified account. For automatic
    // detection retain a live session bucket: unverified Ultra can still have one.
    if (minutes === 300 && isUltra(account, override) && (
      override === "ultra" || resetAt === null || resetAt <= now
    )) return;
    if (windows.some((window) => window.minutes === minutes)) return;
    windows.push({ label: windowLabel(minutes), minutes, utilization, resetAt });
  };
  push(300, account.fiveHourUtilization, account.fiveHourResetAt);
  push(10_080, account.sevenDayUtilization, account.sevenDayResetAt);
  for (const window of account.limitWindows ?? []) {
    push(window.windowMinutes ?? (window.slot === "primary" ? 300 : 10_080),
      window.utilization, window.resetAt);
  }
  return windows.sort((left, right) => left.minutes - right.minutes);
}

export function groupWindow(
  accounts: UsageAccount[],
  minutes: number,
  overrides: PlanOverrides = {},
): UsageWindowValue | null {
  let used = 0;
  let capacity = 0;
  let resetAt: number | null = null;
  for (const account of accounts) {
    const override = overrides[account.id];
    const window = accountWindows(account, override).find((item) => item.minutes === minutes);
    if (window === undefined) continue;
    const weight = planMultiplier(account, minutes, override);
    used += window.utilization * weight;
    capacity += weight;
    if (window.resetAt !== null && (resetAt === null || window.resetAt < resetAt))
      resetAt = window.resetAt;
  }
  return capacity === 0 ? null : {
    label: windowLabel(minutes), minutes, utilization: used / capacity, resetAt,
  };
}
