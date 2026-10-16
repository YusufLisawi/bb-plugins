// Account Pooler+ section for the usage popover and window: pooled accounts
// with their 5h / 7d usage, pause and resume, "use only", failover order and
// account groups. Account Pooler+ owns all of this state; this file only
// calls its RPCs.
import { useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "./lib/utils";

const POOL_PLUGIN_ID = "account-pool-plus";

export type PoolProvider = "claude" | "codex";

export interface PoolAccount {
  id: string;
  provider: PoolProvider;
  label: string;
  email: string | null;
  enabled: boolean;
  priority: number;
  createdAt: number;
  status: "disabled" | "ready" | "held" | "exhausted" | "error";
  fiveHourUtilization: number | null;
  fiveHourResetAt: number | null;
  sevenDayUtilization: number | null;
  sevenDayResetAt: number | null;
  /** Codex reports its five-hour and weekly windows here. */
  limitWindows?: Array<{
    slot: string;
    windowMinutes: number | null;
    utilization: number | null;
    resetAt: number | null;
  }>;
  error: string | null;
  subscriptionType: string | null;
  rateLimitTier: string | null;
  /** The account new conversations for this provider start on. */
  current?: boolean;
  hits?: { ok: number; movedOn: number; lastOkAt: number | null };
}

export interface AccountGroup {
  id: string;
  name: string;
  accountIds: string[];
}

interface PoolSnapshot {
  /** null until loaded, or when Account Pooler+ is not installed. */
  accounts: PoolAccount[] | null;
  groups: AccountGroup[];
  routingMode: "ordered" | "balanced" | null;
  error: string | null;
  pendingIds: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
let snapshot: PoolSnapshot = {
  accounts: null,
  groups: [],
  routingMode: null,
  error: null,
  pendingIds: new Set(),
};

function update(next: Partial<PoolSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

export function usePool(): PoolSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}

async function poolRpc<T>(method: string, input: unknown): Promise<T> {
  const response = await fetch(
    `/api/v1/plugins/${POOL_PLUGIN_ID}/rpc/${encodeURIComponent(method)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      credentials: "same-origin",
    },
  );
  const body = (await response.json().catch(() => null)) as
    | { ok: true; result: T }
    | { ok: false; error?: { message?: string } | string }
    | null;
  if (body?.ok) return body.result;
  const error = body?.error;
  throw new Error(
    typeof error === "string"
      ? error
      : (error?.message ?? `Account Pooler+ returned HTTP ${response.status}.`),
  );
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

let refreshing: Promise<void> | null = null;

export function refreshPool(): Promise<void> {
  refreshing ??= Promise.all([
    poolRpc<PoolAccount[]>("account.list", null),
    poolRpc<AccountGroup[]>("group.list", null).catch(() => []),
    poolRpc<{ routingMode?: "ordered" | "balanced" }>("config.get", null).catch(
      () => ({ routingMode: undefined }),
    ),
  ])
    .then(([accounts, groups, config]) =>
      update({
        accounts,
        groups,
        routingMode: config.routingMode ?? null,
        error: null,
      }),
    )
    .catch(() => {
      // No Account Pooler+ on this server: the section stays hidden.
      update({ accounts: null, groups: [] });
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function mutate(ids: string[], run: () => Promise<void>) {
  update({ pendingIds: new Set([...snapshot.pendingIds, ...ids]) });
  try {
    await run();
    update({ error: null });
  } catch (cause) {
    update({ error: errorMessage(cause) });
  } finally {
    const pendingIds = new Set(snapshot.pendingIds);
    for (const id of ids) pendingIds.delete(id);
    update({ pendingIds });
    await refreshPool();
  }
}

/** Failover order used by the pooler: priority, then order added. */
function ordered(accounts: PoolAccount[]): PoolAccount[] {
  return [...accounts].sort(
    (left, right) =>
      left.priority - right.priority || left.createdAt - right.createdAt,
  );
}

function setEnabled(accounts: PoolAccount[], enabled: boolean) {
  const changing = accounts.filter((account) => account.enabled !== enabled);
  return mutate(
    changing.map((account) => account.id),
    async () => {
      for (const account of changing) {
        await poolRpc(enabled ? "account.enable" : "account.disable", {
          id: account.id,
        });
      }
    },
  );
}

/**
 * Use only these accounts for their providers: enable them first so a
 * provider never has zero enabled accounts, then pause the others.
 */
function useOnly(accounts: PoolAccount[]) {
  const all = snapshot.accounts ?? [];
  const ids = new Set(accounts.map((account) => account.id));
  const providers = new Set(accounts.map((account) => account.provider));
  const enable = accounts.filter((account) => !account.enabled);
  const disable = all.filter(
    (account) =>
      providers.has(account.provider) && !ids.has(account.id) && account.enabled,
  );
  return mutate(
    [...enable, ...disable].map((account) => account.id),
    async () => {
      for (const account of enable)
        await poolRpc("account.enable", { id: account.id });
      for (const account of disable)
        await poolRpc("account.disable", { id: account.id });
    },
  );
}

function move(account: PoolAccount, to: number) {
  const list = ordered(
    (snapshot.accounts ?? []).filter(
      (item) => item.provider === account.provider,
    ),
  );
  const from = list.findIndex((item) => item.id === account.id);
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === -1 || from === target) return;
  const [moved] = list.splice(from, 1);
  if (moved === undefined) return;
  list.splice(target, 0, moved);
  void mutate([account.id], async () => {
    await poolRpc("account.reorder", {
      provider: account.provider,
      accountIds: list.map((item) => item.id),
    });
  });
}

function setRoutingMode(routingMode: "ordered" | "balanced") {
  return mutate([], async () => {
    await poolRpc("config.set", { routingMode });
  });
}

function saveGroup(group: { id?: string; name: string; accountIds: string[] }) {
  return mutate([], async () => {
    await poolRpc("group.save", group);
  });
}

function deleteGroup(id: string) {
  return mutate([], async () => {
    await poolRpc("group.delete", { id });
  });
}

function members(group: AccountGroup, accounts: PoolAccount[]) {
  const ids = new Set(group.accountIds);
  return ordered(accounts.filter((account) => ids.has(account.id)));
}



// ---------------------------------------------------------------------------
// Usage windows
// ---------------------------------------------------------------------------

export interface UsageWindowValue {
  label: string;
  minutes: number;
  utilization: number;
  resetAt: number | null;
}

function windowLabel(minutes: number) {
  if (minutes === 300) return "5h";
  if (minutes === 10_080) return "Weekly";
  if (minutes === 1_440) return "Daily";
  return minutes % 1_440 === 0 ? `${minutes / 1_440}d` : `${minutes / 60}h`;
}

/**
 * The account's live windows, shortest first. Claude reports 5h / 7d in
 * dedicated fields; Codex reports its windows as a list, and some plans
 * (Pro) only have a weekly one. Windows that are not reported are left out.
 */
export function accountWindows(account: PoolAccount): UsageWindowValue[] {
  const windows: UsageWindowValue[] = [];
  const push = (
    minutes: number,
    utilization: number | null,
    resetAt: number | null,
  ) => {
    if (utilization === null) return;
    if (windows.some((window) => window.minutes === minutes)) return;
    windows.push({ label: windowLabel(minutes), minutes, utilization, resetAt });
  };
  push(300, account.fiveHourUtilization, account.fiveHourResetAt);
  push(10_080, account.sevenDayUtilization, account.sevenDayResetAt);
  for (const window of account.limitWindows ?? []) {
    push(
      window.windowMinutes ?? (window.slot === "primary" ? 300 : 10_080),
      window.utilization,
      window.resetAt,
    );
  }
  return windows.sort((left, right) => left.minutes - right.minutes);
}

/** "2h 14m", "3d 4h", or "now". */
function timeLeft(resetAt: number | null) {
  if (resetAt === null) return null;
  const minutes = Math.ceil((resetAt - Date.now()) / 60_000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return hours % 24 === 0 ? `${days}d` : `${days}d ${hours % 24}h`;
}

/** "Fri 13:40" */
function resetDay(resetAt: number | null) {
  if (resetAt === null) return null;
  const parts = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(resetAt));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("weekday")} ${part("hour")}:${part("minute")}`;
}

function barTone(percent: number) {
  if (percent >= 90) return "bg-destructive";
  if (percent >= 70) return "bg-amber-500";
  return "bg-primary";
}

function Bar({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <span
      className={cn(
        "block h-1 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className={cn("block h-full rounded-full", barTone(clamped))}
        style={{ width: `${Math.max(clamped, 2)}%` }}
      />
    </span>
  );
}

/** Main window: label, bar, percent, time left and reset day. */
function PrimaryWindow({ window }: { window: UsageWindowValue }) {
  const percent = Math.round(window.utilization * 100);
  const left = timeLeft(window.resetAt);
  const day = resetDay(window.resetAt);
  return (
    <div className="flex items-center gap-2 text-[10px] tabular-nums">
      <span className="w-9 shrink-0 text-muted-foreground">{window.label}</span>
      <Bar percent={percent} className="min-w-0 flex-1" />
      <span
        className={cn(
          "w-8 shrink-0 text-right font-medium",
          percent >= 90 ? "text-destructive" : "text-foreground",
        )}
      >
        {percent}%
      </span>
      <span
        title={day === null ? undefined : `Resets ${day}`}
        className="w-[6.75rem] shrink-0 whitespace-nowrap text-right text-muted-foreground"
      >
        {left === null ? "—" : `${left} · ${day}`}
      </span>
    </div>
  );
}

/** Secondary (weekly) window on one quiet line. */
function SecondaryWindow({ window }: { window: UsageWindowValue }) {
  const percent = Math.round(window.utilization * 100);
  const day = resetDay(window.resetAt);
  return (
    <div className="flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
      <span className="w-9 shrink-0">{window.label}</span>
      <Bar percent={percent} className="w-14 shrink-0 opacity-70" />
      <span
        className={cn(
          "shrink-0",
          percent >= 90 ? "text-destructive" : undefined,
        )}
      >
        {percent}%
      </span>
      {day === null ? null : (
        <span className="ml-auto shrink-0">resets {day}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plans and capacity
// ---------------------------------------------------------------------------

/** Claude capacity relative to Pro (Team 1.25x); Codex counts as 1. */
export function planMultiplier(account: PoolAccount): number {
  if (account.provider === "codex") return 1;
  const max = (account.rateLimitTier ?? "").match(/max_(\d+)x/u);
  if (max?.[1] !== undefined) return Number(max[1]);
  const plan = (account.subscriptionType ?? "").toLowerCase();
  if (plan.includes("team")) return 1.25;
  if (plan === "max") return 5;
  return 1;
}

function formatMultiplier(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/u, "")}x`;
}

function planLabel(account: PoolAccount) {
  if (account.provider === "codex") {
    const plan = account.subscriptionType ?? "ChatGPT";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
  const plan = (account.subscriptionType ?? "").toLowerCase();
  if (plan.includes("team")) return "Team";
  return formatMultiplier(planMultiplier(account));
}

/** "10×1.25x" when every account has the same plan, else the total. */
function capacityLabel(accounts: PoolAccount[]) {
  if (accounts[0]?.provider === "codex") return `${accounts.length} accounts`;
  const multipliers = accounts.map(planMultiplier);
  const [first] = multipliers;
  if (
    multipliers.length > 1 &&
    first !== undefined &&
    multipliers.every((value) => value === first)
  ) {
    return `${multipliers.length}×${formatMultiplier(first)}`;
  }
  return formatMultiplier(multipliers.reduce((sum, value) => sum + value, 0));
}

/**
 * Plan-weighted usage of one window length across accounts, for the group
 * row; accounts without that window are left out.
 */
function groupWindow(
  accounts: PoolAccount[],
  minutes: number,
): UsageWindowValue | null {
  let used = 0;
  let capacity = 0;
  let resetAt: number | null = null;
  for (const account of accounts) {
    const window = accountWindows(account).find(
      (item) => item.minutes === minutes,
    );
    if (window === undefined) continue;
    const weight = planMultiplier(account);
    used += window.utilization * weight;
    capacity += weight;
    if (window.resetAt !== null && (resetAt === null || window.resetAt < resetAt))
      resetAt = window.resetAt;
  }
  return capacity === 0
    ? null
    : { label: windowLabel(minutes), minutes, utilization: used / capacity, resetAt };
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function accountName(account: PoolAccount) {
  return account.email ?? account.label;
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon name={icon} aria-hidden="true" className="size-3" />
    </button>
  );
}

function statusDot(account: PoolAccount) {
  if (!account.enabled) return "bg-muted-foreground/40";
  if (account.status === "error") return "bg-destructive";
  if (account.status === "held" || account.status === "exhausted")
    return "bg-amber-500";
  return "bg-emerald-500";
}

function NextTag() {
  return (
    <span
      title="The next new conversation starts on this account"
      className="shrink-0 rounded bg-emerald-500/15 px-1 text-[9px] font-medium uppercase text-emerald-600 dark:text-emerald-400"
    >
      next
    </span>
  );
}

function PlanBadge({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] leading-none text-muted-foreground">
      {children}
    </span>
  );
}

function AccountCard({
  account,
  position,
  count,
  pending,
  full,
}: {
  account: PoolAccount;
  position: number;
  count: number;
  pending: boolean;
  full: boolean;
}) {
  const name = accountName(account);
  const [primary, ...rest] = accountWindows(account);
  const weekly = rest.find((window) => window.minutes >= 1_440);
  return (
    <div
      className={cn(
        "space-y-1 rounded-md px-1.5 py-1 hover:bg-muted/40",
        !account.enabled && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", statusDot(account))}
        />
        <span
          title={account.error ?? `${name} · #${position + 1} in order`}
          className={cn(
            "min-w-0 flex-1 truncate",
            !account.enabled && "line-through",
          )}
        >
          {name}
        </span>
        <PlanBadge>{planLabel(account)}</PlanBadge>
        {account.current ? <NextTag /> : null}
        {full ? (
          <>
            <IconButton
              icon="ArrowUp"
              label={`Move ${name} up`}
              disabled={pending || position === 0}
              onClick={() => move(account, position - 1)}
            />
            <IconButton
              icon="ArrowDown"
              label={`Move ${name} down`}
              disabled={pending || position === count - 1}
              onClick={() => move(account, position + 1)}
            />
          </>
        ) : null}
        <IconButton
          icon="Target"
          label={`Use only ${name}`}
          disabled={pending}
          onClick={() => void useOnly([account])}
        />
        <IconButton
          icon={account.enabled ? "Pause" : "Play"}
          label={`${account.enabled ? "Pause" : "Resume"} ${name}`}
          disabled={pending}
          onClick={() => void setEnabled([account], !account.enabled)}
        />
      </div>
      {primary === undefined ? (
        <p className="text-[10px] text-muted-foreground">
          {account.error ?? "No usage reported yet."}
        </p>
      ) : (
        <PrimaryWindow window={primary} />
      )}
      {weekly === undefined ? null : <SecondaryWindow window={weekly} />}
    </div>
  );
}

function GroupEditor({
  accounts,
  initial,
  onDone,
}: {
  accounts: PoolAccount[];
  initial: AccountGroup | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState(
    () => new Set(initial?.accountIds ?? []),
  );
  const valid = name.trim().length > 0 && selected.size > 0;
  return (
    <form
      className="space-y-2 rounded-md border border-border p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        void saveGroup({
          ...(initial === null ? {} : { id: initial.id }),
          name: name.trim(),
          accountIds: [...selected],
        });
        onDone();
      }}
    >
      <input
        autoFocus
        aria-label="Group name"
        placeholder="Group name"
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-7 w-full rounded border border-border bg-transparent px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {accounts.map((account) => (
          <label
            key={account.id}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px]"
          >
            <input
              type="checkbox"
              className="size-3 shrink-0"
              checked={selected.has(account.id)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(account.id);
                else next.delete(account.id);
                setSelected(next);
              }}
            />
            <span className="min-w-0 flex-1 truncate">{accountName(account)}</span>
            <PlanBadge>{planLabel(account)}</PlanBadge>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onDone}
          className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid}
          className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
        >
          Save group
        </button>
      </div>
    </form>
  );
}

// Expanded groups survive the popover closing and reopening.
const expandedGroups = new Set<string>();

function GroupAccordion({
  group,
  list,
  order,
  pool,
  full,
  onEdit,
}: {
  group: AccountGroup;
  /** This provider's accounts in the group. */
  list: PoolAccount[];
  /** This provider's accounts in failover order. */
  order: PoolAccount[];
  pool: PoolSnapshot;
  full: boolean;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(() => expandedGroups.has(group.id));
  const active = list.filter((account) => account.enabled);
  const paused = list.length > 0 && active.length === 0;
  const pending = list.some((account) => pool.pendingIds.has(account.id));
  const measured = active.length > 0 ? active : list;
  const shortest = [300, 10_080]
    .map((minutes) => groupWindow(measured, minutes))
    .filter((window): window is UsageWindowValue => window !== null);
  const [primary, weekly] = shortest;
  const toggle = () => {
    if (open) expandedGroups.delete(group.id);
    else expandedGroups.add(group.id);
    setOpen(!open);
  };
  return (
    <div className="rounded-md border border-border/70">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
        className="cursor-pointer space-y-1 rounded-md px-1.5 py-1 hover:bg-muted/40"
      >
        <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
          <Icon
            name={open ? "ChevronDown" : "ChevronRight"}
            aria-hidden="true"
            className="size-3 shrink-0 text-muted-foreground"
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              paused && "text-muted-foreground line-through",
            )}
          >
            {group.name}
          </span>
          <span
            title="Combined capacity relative to a Pro plan; usage is weighted by plan size"
            className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
          >
            {capacityLabel(list)} · {active.length}/{list.length} on
          </span>
          {list.some((account) => account.current) ? <NextTag /> : null}
          <IconButton
            icon="Target"
            label={`Use only ${group.name}`}
            disabled={pending || list.length === 0}
            onClick={() => void useOnly(list)}
          />
          <IconButton
            icon={paused ? "Play" : "Pause"}
            label={`${paused ? "Resume" : "Pause"} ${group.name}`}
            disabled={pending || list.length === 0}
            onClick={() => void setEnabled(list, paused)}
          />
        </div>
        {primary === undefined ? null : <PrimaryWindow window={primary} />}
        {weekly === undefined ? null : <SecondaryWindow window={weekly} />}
      </div>
      {open ? (
        <div className="space-y-0.5 border-t border-border/70 p-1">
          {full ? (
            <p className="flex justify-end gap-3 px-1.5 text-[10px] text-muted-foreground">
              <button type="button" className="hover:text-foreground" onClick={onEdit}>
                Edit
              </button>
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => void deleteGroup(group.id)}
              >
                Delete
              </button>
            </p>
          ) : null}
          {list.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              position={order.findIndex((item) => item.id === account.id)}
              count={order.length}
              pending={pool.pendingIds.has(account.id)}
              full={full}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModeSwitch({ mode }: { mode: "ordered" | "balanced" }) {
  return (
    <div
      role="radiogroup"
      aria-label="How new conversations pick an account"
      className="flex shrink-0 rounded bg-muted p-0.5 text-[10px]"
    >
      {(
        [
          ["balanced", "Balanced", "Each new conversation goes to the account with the most room left"],
          ["ordered", "In order", "Use accounts one after another in order"],
        ] as const
      ).map(([value, label, help]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          title={help}
          onClick={() => {
            if (mode !== value) void setRoutingMode(value);
          }}
          className={cn(
            "rounded px-1.5 py-px",
            mode === value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Whether the pool has accounts for a provider (for showing its tab). */
export function poolHasProvider(pool: PoolSnapshot, provider: PoolProvider) {
  return (pool.accounts ?? []).some((account) => account.provider === provider);
}

/**
 * One provider's pooled accounts: groups as accordions, then the rest.
 * `full` (the click-open window) adds reordering and group editing.
 */
export function PoolSection({
  provider,
  full = false,
}: {
  provider: PoolProvider;
  full?: boolean;
}) {
  const pool = usePool();
  const [editing, setEditing] = useState<AccountGroup | "new" | null>(null);
  const accounts = ordered(
    (pool.accounts ?? []).filter((account) => account.provider === provider),
  );
  if (accounts.length === 0) return null;
  const paused = accounts.filter((account) => !account.enabled);
  const groups = pool.groups
    .map((group) => ({ group, list: members(group, accounts) }))
    .filter(({ list }) => list.length > 0);
  const grouped = new Set(groups.flatMap(({ list }) => list.map((a) => a.id)));
  const loose = accounts.filter((account) => !grouped.has(account.id));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          Accounts
          <span className="ml-1.5 text-[10px] font-normal tabular-nums text-muted-foreground">
            {accounts.length - paused.length}/{accounts.length} on
          </span>
        </p>
        {paused.length > 0 ? (
          <button
            type="button"
            className="shrink-0 rounded px-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => void setEnabled(paused, true)}
          >
            Resume all
          </button>
        ) : null}
        {pool.routingMode === null ? null : <ModeSwitch mode={pool.routingMode} />}
      </div>
      {pool.error !== null ? (
        <p className="text-[11px] text-destructive">{pool.error}</p>
      ) : null}
      {groups.map(({ group, list }) =>
        editing !== "new" && editing?.id === group.id ? (
          <GroupEditor
            key={group.id}
            accounts={accounts}
            initial={{
              ...group,
              // Keep members of other providers when editing from this tab.
              accountIds: group.accountIds,
            }}
            onDone={() => setEditing(null)}
          />
        ) : (
          <GroupAccordion
            key={group.id}
            group={group}
            list={list}
            order={accounts}
            pool={pool}
            full={full}
            onEdit={() => setEditing(group)}
          />
        ),
      )}
      {loose.length > 0 ? (
        <div className="space-y-0.5">
          {loose.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              position={accounts.findIndex((item) => item.id === account.id)}
              count={accounts.length}
              pending={pool.pendingIds.has(account.id)}
              full={full}
            />
          ))}
        </div>
      ) : null}
      {full ? (
        editing === "new" ? (
          <GroupEditor
            accounts={accounts}
            initial={null}
            onDone={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            className="flex h-6 items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setEditing("new")}
          >
            <Icon name="Plus" aria-hidden="true" className="size-3" />
            New group
          </button>
        )
      ) : null}
    </div>
  );
}

/**
 * Totals across every enabled pooled account of one provider: for each
 * window length, usage weighted by plan size, how much capacity is left,
 * and the soonest reset among the accounts that have that window.
 */
export function PoolTotals({ provider }: { provider: PoolProvider }) {
  const pool = usePool();
  const all = (pool.accounts ?? []).filter(
    (account) => account.provider === provider,
  );
  if (all.length === 0) return null;
  const enabled = all.filter((account) => account.enabled);
  const counted = enabled.length > 0 ? enabled : all;
  const capacity = counted.reduce(
    (sum, account) => sum + planMultiplier(account),
    0,
  );
  const rows = [300, 10_080]
    .map((minutes) => {
      const window = groupWindow(counted, minutes);
      if (window === null) return null;
      const covered = counted.filter((account) =>
        accountWindows(account).some((item) => item.minutes === minutes),
      );
      const coveredCapacity = covered.reduce(
        (sum, account) => sum + planMultiplier(account),
        0,
      );
      return { window, covered, coveredCapacity };
    })
    .filter((row) => row !== null);
  return (
    <div className="space-y-1.5">
      <p className="flex items-baseline gap-1.5 text-xs font-medium text-foreground">
        All accounts
        <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
          {provider === "claude"
            ? `${formatMultiplier(capacity)} · ${counted.length} accounts`
            : `${counted.length} accounts`}
        </span>
      </p>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No usage reported yet.</p>
      ) : (
        rows.map(({ window, covered, coveredCapacity }) => {
          const percent = Math.round(window.utilization * 100);
          const left = timeLeft(window.resetAt);
          const day = resetDay(window.resetAt);
          const remaining = coveredCapacity * (1 - window.utilization);
          return (
            <div key={window.minutes} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px] leading-none">
                <span className="min-w-0 truncate text-muted-foreground">
                  {window.minutes === 300 ? "5-hour" : "Weekly"}
                  {covered.length < counted.length ? (
                    <span className="ml-1 text-[10px] text-muted-foreground/70">
                      {covered.length} of {counted.length}
                    </span>
                  ) : null}
                  {day === null ? null : (
                    <span className="ml-1.5 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground/70">
                      next reset {day}
                      {left === null ? "" : ` · in ${left}`}
                    </span>
                  )}
                </span>
                <span
                  title={
                    provider === "claude"
                      ? `About ${formatMultiplier(Math.round(remaining * 10) / 10)} of ${formatMultiplier(coveredCapacity)} left`
                      : undefined
                  }
                  className={cn(
                    "shrink-0 font-medium tabular-nums",
                    percent >= 90 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {percent}%
                  {provider === "claude" ? (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      {formatMultiplier(Math.round(remaining * 10) / 10)} left
                    </span>
                  ) : null}
                </span>
              </div>
              <Bar percent={percent} />
            </div>
          );
        })
      )}
    </div>
  );
}
