// Account groups and per-thread account selections.
//
// A group is a named set of account ids. A thread can be limited to one group
// or to an explicit set of accounts; the hub then only routes that thread's
// requests through those accounts. Threads without a selection, and providers
// the selection has no accounts for, keep using the whole pool.
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PluginKvStorage } from "@get-bb/plugin-sdk";
import type { Account, PoolProvider } from "./contracts.js";

const GROUPS_KEY = "groups:v1";
const THREAD_PREFIX = "thread-accounts:";

const THREAD_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const HUB_TOKEN_LENGTH = 43;

export const threadIdSchema = z.string().regex(THREAD_ID_PATTERN);

export const accountGroupSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(40),
    accountIds: z.array(z.string().uuid()),
  })
  .strict();

export type AccountGroup = z.infer<typeof accountGroupSchema>;

export const accountGroupSaveInputSchema = accountGroupSchema.extend({
  id: z.string().min(1).max(64).optional(),
});

export const threadSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("group"), groupId: z.string().min(1) }).strict(),
  z
    .object({
      kind: z.literal("accounts"),
      accountIds: z.array(z.string().uuid()).min(1),
    })
    .strict(),
  /** Several groups and/or accounts: the thread may use any of them. */
  z
    .object({
      kind: z.literal("mix"),
      groupIds: z.array(z.string().min(1)),
      accountIds: z.array(z.string().uuid()),
    })
    .strict(),
]);

export type ThreadSelection = z.infer<typeof threadSelectionSchema>;

export const threadSelectionStateSchema = z
  .object({
    threadId: threadIdSchema,
    selection: threadSelectionSchema.nullable(),
    /** The selection's accounts, or null when the thread uses every account. */
    accountIds: z.array(z.string().uuid()).nullable(),
    /** Set when the selection's groups no longer exist and nothing is left. */
    missingGroup: z.boolean(),
  })
  .strict();

export type ThreadSelectionState = z.infer<typeof threadSelectionStateSchema>;

export const threadSelectionSetInputSchema = z
  .object({
    threadId: threadIdSchema,
    selection: threadSelectionSchema.nullable(),
  })
  .strict();

/**
 * Split a presented hub credential into the machine token and the thread it
 * was issued for. Thread-scoped credentials are `<machine token>.<thread id>`;
 * machine tokens are 43 base64url characters and never contain a dot.
 */
export function splitThreadCredential(presented: string | null): {
  token: string | null;
  threadId: string | null;
} {
  if (presented === null || presented.charAt(HUB_TOKEN_LENGTH) !== ".") {
    return { token: presented, threadId: null };
  }
  const threadId = presented.slice(HUB_TOKEN_LENGTH + 1);
  return THREAD_ID_PATTERN.test(threadId)
    ? { token: presented.slice(0, HUB_TOKEN_LENGTH), threadId }
    : { token: presented, threadId: null };
}

export function threadCredential(token: string, threadId: string): string {
  return THREAD_ID_PATTERN.test(threadId) ? `${token}.${threadId}` : token;
}

export class AccountGroupStore {
  private writes: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly kv: PluginKvStorage,
    private readonly onChanged: () => void = () => {},
  ) {}

  async listGroups(): Promise<AccountGroup[]> {
    const parsed = z
      .array(accountGroupSchema)
      .safeParse(await this.kv.get(GROUPS_KEY));
    return parsed.success ? parsed.data : [];
  }

  saveGroup(
    input: z.infer<typeof accountGroupSaveInputSchema>,
  ): Promise<AccountGroup> {
    return this.serialized(async () => {
      const groups = await this.listGroups();
      const group = accountGroupSchema.parse({
        ...input,
        id: input.id ?? randomUUID(),
        accountIds: [...new Set(input.accountIds)],
      });
      const index = groups.findIndex((item) => item.id === group.id);
      await this.kv.set(
        GROUPS_KEY,
        index === -1
          ? [...groups, group]
          : groups.map((item, at) => (at === index ? group : item)),
      );
      return group;
    });
  }

  deleteGroup(id: string): Promise<boolean> {
    return this.serialized(async () => {
      const groups = await this.listGroups();
      const next = groups.filter((item) => item.id !== id);
      if (next.length === groups.length) return false;
      await this.kv.set(GROUPS_KEY, next);
      return true;
    });
  }

  /** Find a group by id, or by name ignoring case. */
  async findGroup(idOrName: string): Promise<AccountGroup | null> {
    const groups = await this.listGroups();
    const name = idOrName.trim().toLowerCase();
    return (
      groups.find((group) => group.id === idOrName) ??
      groups.find((group) => group.name.toLowerCase() === name) ??
      null
    );
  }

  /** Drop a removed account from every group and explicit thread selection. */
  forgetAccount(accountId: string): Promise<void> {
    return this.serialized(async () => {
      const groups = await this.listGroups();
      if (groups.some((group) => group.accountIds.includes(accountId))) {
        await this.kv.set(
          GROUPS_KEY,
          groups.map((group) => ({
            ...group,
            accountIds: group.accountIds.filter((id) => id !== accountId),
          })),
        );
      }
      for (const key of await this.kv.list(THREAD_PREFIX)) {
        const parsed = threadSelectionSchema.safeParse(await this.kv.get(key));
        if (!parsed.success || parsed.data.kind === "group") continue;
        const selection = parsed.data;
        const accountIds = selection.accountIds.filter(
          (id) => id !== accountId,
        );
        if (accountIds.length === selection.accountIds.length) continue;
        const groupIds = selection.kind === "mix" ? selection.groupIds : [];
        if (accountIds.length === 0 && groupIds.length === 0)
          await this.kv.delete(key);
        else if (selection.kind === "mix")
          await this.kv.set(key, { kind: "mix", groupIds, accountIds });
        else await this.kv.set(key, { kind: "accounts", accountIds });
      }
    });
  }

  async getThread(threadId: string): Promise<ThreadSelectionState> {
    const parsed = threadSelectionSchema.safeParse(
      await this.kv.get(THREAD_PREFIX + threadId),
    );
    const selection = parsed.success ? parsed.data : null;
    if (selection === null) {
      return { threadId, selection, accountIds: null, missingGroup: false };
    }
    if (selection.kind === "accounts") {
      return {
        threadId,
        selection,
        accountIds: selection.accountIds,
        missingGroup: false,
      };
    }
    if (selection.kind === "mix") {
      const groups = await this.listGroups();
      const accountIds = new Set(selection.accountIds);
      for (const groupId of selection.groupIds) {
        for (const id of groups.find((item) => item.id === groupId)
          ?.accountIds ?? []) {
          accountIds.add(id);
        }
      }
      return {
        threadId,
        selection,
        accountIds: accountIds.size === 0 ? null : [...accountIds],
        missingGroup: accountIds.size === 0,
      };
    }
    const group = (await this.listGroups()).find(
      (item) => item.id === selection.groupId,
    );
    return {
      threadId,
      selection,
      accountIds: group?.accountIds ?? null,
      missingGroup: group === undefined,
    };
  }

  async setThread(
    threadId: string,
    selection: ThreadSelection | null,
  ): Promise<ThreadSelectionState> {
    if (
      selection?.kind === "mix" &&
      selection.groupIds.length === 0 &&
      selection.accountIds.length === 0
    ) {
      selection = null;
    }
    await this.serialized(async () => {
      if (selection === null) await this.kv.delete(THREAD_PREFIX + threadId);
      else await this.kv.set(THREAD_PREFIX + threadId, selection);
    });
    return this.getThread(threadId);
  }

  /**
   * The accounts a thread may use for one provider, or null when it may use
   * all of them: no selection, a deleted group, or a selection without any
   * account of this provider.
   */
  async allowedAccountIds(
    threadId: string | null,
    provider: PoolProvider,
    accounts: readonly Account[],
  ): Promise<Set<string> | null> {
    if (threadId === null) return null;
    const { accountIds } = await this.getThread(threadId);
    if (accountIds === null) return null;
    const selected = new Set(accountIds);
    const allowed = accounts.filter(
      (account) => account.provider === provider && selected.has(account.id),
    );
    return allowed.length === 0
      ? null
      : new Set(allowed.map((account) => account.id));
  }

  private serialized<T>(run: () => Promise<T>): Promise<T> {
    const next = this.writes.then(run).then((result) => {
      this.onChanged();
      return result;
    });
    this.writes = next.catch(() => undefined);
    return next;
  }
}
