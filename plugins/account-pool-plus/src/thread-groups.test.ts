import { describe, expect, it } from "vitest";
import type { PluginKvStorage } from "@get-bb/plugin-sdk";
import type { Account } from "./contracts.js";
import {
  AccountGroupStore,
  splitThreadCredential,
  threadCredential,
} from "./thread-groups.js";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function memoryKv(): PluginKvStorage {
  const store = new Map<string, unknown>();
  return {
    get: async <T,>(key: string) => store.get(key) as T | undefined,
    set: async (key, value) => void store.set(key, value),
    delete: async (key) => void store.delete(key),
    list: async (prefix = "") =>
      [...store.keys()].filter((key) => key.startsWith(prefix)),
  };
}

function account(id: string): Account {
  return {
    id,
    provider: "claude",
    kind: "oauth",
    label: id,
    email: null,
    accountUuid: null,
    subscriptionType: null,
    rateLimitTier: null,
    enabled: true,
    priority: 1,
    createdAt: 0,
    lastUsedAt: null,
    lastUsedHostId: null,
  };
}

describe("thread account selections", () => {
  it("round-trips thread credentials and ignores malformed ones", () => {
    const token = "x".repeat(43);
    expect(splitThreadCredential(threadCredential(token, "thr_abc"))).toEqual({
      token,
      threadId: "thr_abc",
    });
    expect(splitThreadCredential(token)).toEqual({ token, threadId: null });
    expect(splitThreadCredential(`${token}.bad id`)).toEqual({
      token: `${token}.bad id`,
      threadId: null,
    });
  });

  it("lets a thread use several groups plus single accounts", async () => {
    const store = new AccountGroupStore(memoryKv());
    const team = await store.saveGroup({ name: "Team", accountIds: [A] });
    const other = await store.saveGroup({ name: "Other", accountIds: [B] });
    const state = await store.setThread("thr_1", {
      kind: "mix",
      groupIds: [team.id, other.id],
      accountIds: [C],
    });
    expect(new Set(state.accountIds)).toEqual(new Set([A, B, C]));
    const allowed = await store.allowedAccountIds("thr_1", "claude", [
      account(A),
      account(B),
      account(C),
    ]);
    expect(allowed).toEqual(new Set([A, B, C]));

    // Editing a group updates every thread that names it.
    await store.saveGroup({ id: other.id, name: "Other", accountIds: [] });
    expect(new Set((await store.getThread("thr_1")).accountIds)).toEqual(
      new Set([A, C]),
    );

    // A removed account leaves the selection; an empty mix clears it.
    await store.forgetAccount(C);
    await store.forgetAccount(A);
    expect(await store.getThread("thr_1")).toMatchObject({
      accountIds: null,
      missingGroup: true,
    });
    expect(
      await store.setThread("thr_2", { kind: "mix", groupIds: [], accountIds: [] }),
    ).toMatchObject({ selection: null, accountIds: null });
  });
});
