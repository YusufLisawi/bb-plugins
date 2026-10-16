// Thread header control that limits one thread to any mix of account groups
// and single pool accounts.
import { useCallback, useEffect, useState } from "react";
import {
  useRealtime,
  useRpc,
  type PluginThreadHeaderActionProps,
} from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { AccountSummary } from "./src/contracts.js";
import {
  ACCOUNT_POOL_ACCOUNTS_CHANGED,
  ACCOUNT_POOL_GROUPS_CHANGED,
} from "./src/realtime.js";
import type { accountPoolRpcContract } from "./src/rpc.js";
import type {
  AccountGroup,
  ThreadSelection,
  ThreadSelectionState,
} from "./src/thread-groups.js";

interface PickerData {
  accounts: AccountSummary[];
  groups: AccountGroup[];
  thread: ThreadSelectionState;
}

interface Picked {
  groupIds: string[];
  accountIds: string[];
}

function accountName(account: AccountSummary): string {
  return account.email ?? account.label;
}

/** Ticked groups and accounts for the thread's stored selection. */
function picked(thread: ThreadSelectionState): Picked {
  const selection = thread.missingGroup ? null : thread.selection;
  if (selection === null) return { groupIds: [], accountIds: [] };
  if (selection.kind === "group")
    return { groupIds: [selection.groupId], accountIds: [] };
  if (selection.kind === "accounts")
    return { groupIds: [], accountIds: selection.accountIds };
  return { groupIds: selection.groupIds, accountIds: selection.accountIds };
}

/** The simplest stored form for a set of ticked groups and accounts. */
function toSelection({ groupIds, accountIds }: Picked): ThreadSelection | null {
  const [onlyGroup] = groupIds;
  if (groupIds.length === 0 && accountIds.length === 0) return null;
  if (groupIds.length === 1 && accountIds.length === 0 && onlyGroup)
    return { kind: "group", groupId: onlyGroup };
  if (groupIds.length === 0) return { kind: "accounts", accountIds };
  return { kind: "mix", groupIds, accountIds };
}

function pickedLabel(data: PickerData, choice: Picked): string {
  const names = [
    ...choice.groupIds.map(
      (id) => data.groups.find((group) => group.id === id)?.name,
    ),
    ...choice.accountIds.map((id) => {
      const account = data.accounts.find((item) => item.id === id);
      return account === undefined ? undefined : accountName(account);
    }),
  ].filter((name): name is string => name !== undefined);
  const [first] = names;
  if (first === undefined) return "All accounts";
  return names.length === 1 ? first : `${first} +${names.length - 1}`;
}

function toggled(list: string[], id: string, on: boolean): string[] {
  return on ? [...new Set([...list, id])] : list.filter((item) => item !== id);
}

export function ThreadAccountsPicker({
  threadId,
  isCompactViewport,
}: PluginThreadHeaderActionProps) {
  const rpc = useRpc<typeof accountPoolRpcContract>();
  const [data, setData] = useState<PickerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [accounts, groups, thread] = await Promise.all([
        rpc.call("account.list", null),
        rpc.call("group.list", null),
        rpc.call("thread.get", { threadId }),
      ]);
      setData({ accounts, groups, thread });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [rpc, threadId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(ACCOUNT_POOL_ACCOUNTS_CHANGED, () => void load());
  useRealtime(ACCOUNT_POOL_GROUPS_CHANGED, () => void load());

  // Nothing to choose between without at least two pool accounts.
  if (data === null || data.accounts.length < 2) return null;

  const choice = picked(data.thread);
  const limited = choice.groupIds.length > 0 || choice.accountIds.length > 0;
  const label = pickedLabel(data, choice);
  const allowedCount = data.thread.missingGroup
    ? 0
    : (data.thread.accountIds ?? []).filter((id) =>
        data.accounts.some((account) => account.id === id),
      ).length;
  // Save each tick right away; the menu stays open for the next one.
  const save = async (next: Picked) => {
    const selection = toSelection(next);
    setData((previous) =>
      previous === null
        ? previous
        : { ...previous, thread: { ...previous.thread, selection, missingGroup: false } },
    );
    setSaving(true);
    try {
      const thread = await rpc.call("thread.set", { threadId, selection });
      setData((previous) =>
        previous === null ? previous : { ...previous, thread },
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      void load();
    } finally {
      setSaving(false);
    }
  };
  const usableGroups = data.groups.filter((group) =>
    data.accounts.some((account) => group.accountIds.includes(account.id)),
  );
  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <DropdownMenu modal={false} onOpenChange={(open) => open && void load()}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Pool accounts for this thread: ${label}`}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs",
            limited ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Icon name="Layers" aria-hidden="true" className="size-3.5" />
          {isCompactViewport ? null : (
            <span className="max-w-40 truncate">{label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        mobileTitle="Pool accounts for this thread"
        className="w-72"
      >
        <DropdownMenuCheckboxItem
          checked={!limited}
          onSelect={keepOpen}
          onCheckedChange={() => {
            if (limited) void save({ groupIds: [], accountIds: [] });
          }}
        >
          All accounts
        </DropdownMenuCheckboxItem>
        {usableGroups.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Groups
            </DropdownMenuLabel>
            {usableGroups.map((group) => (
              <DropdownMenuCheckboxItem
                key={group.id}
                checked={choice.groupIds.includes(group.id)}
                onSelect={keepOpen}
                onCheckedChange={(on) =>
                  void save({
                    ...choice,
                    groupIds: toggled(choice.groupIds, group.id, on === true),
                  })
                }
              >
                <span className="min-w-0 truncate">{group.name}</span>
                <span className="ml-auto pl-2 text-xs text-muted-foreground">
                  {
                    data.accounts.filter((account) =>
                      group.accountIds.includes(account.id),
                    ).length
                  }
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Accounts
        </DropdownMenuLabel>
        <div className="max-h-64 overflow-y-auto">
          {data.accounts.map((account) => {
            const viaGroup =
              !choice.accountIds.includes(account.id) &&
              (data.thread.accountIds ?? []).includes(account.id);
            return (
              <DropdownMenuCheckboxItem
                key={account.id}
                checked={choice.accountIds.includes(account.id)}
                onSelect={keepOpen}
                onCheckedChange={(on) =>
                  void save({
                    ...choice,
                    accountIds: toggled(
                      choice.accountIds,
                      account.id,
                      on === true,
                    ),
                  })
                }
              >
                <span className="min-w-0 truncate" title={accountName(account)}>
                  {accountName(account)}
                </span>
                {account.provider === "codex" ? (
                  <span className="ml-auto pl-2 text-xs text-muted-foreground">
                    Codex
                  </span>
                ) : null}
                {account.enabled && !viaGroup ? null : (
                  <span className="ml-auto pl-2 text-xs text-muted-foreground">
                    {account.enabled ? "in group" : "Paused"}
                  </span>
                )}
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          {error ??
            (limited
              ? `This thread can use ${allowedCount} of ${data.accounts.length} accounts. `
              : "Tick groups or accounts to limit this thread. ") +
              "Applies from its next request; paused accounts stay paused."}
          {saving ? " Saving…" : ""}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
