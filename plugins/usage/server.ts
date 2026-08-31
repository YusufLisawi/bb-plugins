// bb-plugin-usage — surfaces BB's provider usage & limits in a sidebar panel.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const usageWindowSchema = z.object({
  label: z.string(),
  usedPercent: z.number(),
  resetsAt: z.string().nullable(),
  cost: z
    .object({ limitUsdCents: z.number(), usedUsdCents: z.number() })
    .optional(),
});

const providerUsageSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    accountEmail: z.string().nullable(),
    planLabel: z.string().nullable(),
    windows: z.array(usageWindowSchema),
  }),
  z.object({ status: z.literal("not_installed") }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("expired") }),
  z.object({
    status: z.literal("error"),
    message: z.string(),
    accountEmail: z.string().nullable().default(null),
    planLabel: z.string().nullable().default(null),
  }),
]);

type ProviderUsage = z.infer<typeof providerUsageSchema>;

const activitySchema = z.object({
  messages: z.number(),
  sessions: z.number(),
  toolCalls: z.number(),
});

const accountUsageSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  planLabel: z.string().nullable(),
  status: z.enum(["ok", "error"]),
  message: z.string().optional(),
  today: activitySchema.nullable(),
  last7Days: activitySchema.nullable(),
});

export type AccountUsage = z.infer<typeof accountUsageSchema>;

const usageResponseSchema = z.object({
  claudeCode: providerUsageSchema,
  codex: providerUsageSchema,
  cursor: providerUsageSchema,
  accounts: z.array(accountUsageSchema),
  fetchedAt: z.string(),
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;

export const rpcContract = defineRpcContract({
  getUsage: {
    input: z.null(),
    output: usageResponseSchema,
  },
});

type DailyActivity = {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
};

async function readStatsCache(dir: string): Promise<DailyActivity[] | null> {
  try {
    const raw = await readFile(join(dir, "stats-cache.json"), "utf8");
    const parsed = JSON.parse(raw) as { dailyActivity?: unknown };
    return Array.isArray(parsed.dailyActivity)
      ? (parsed.dailyActivity as DailyActivity[])
      : null;
  } catch {
    return null;
  }
}

function sumActivity(days: DailyActivity[]) {
  return days.reduce(
    (acc, d) => ({
      messages: acc.messages + (d.messageCount ?? 0),
      sessions: acc.sessions + (d.sessionCount ?? 0),
      toolCalls: acc.toolCalls + (d.toolCallCount ?? 0),
    }),
    { messages: 0, sessions: 0, toolCalls: 0 },
  );
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadActivity(dir: string) {
  const days = await readStatsCache(dir);
  if (!days) return { today: null, last7Days: null };

  const today = days.find((d) => d.date === todayString());
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = days.filter((d) => new Date(d.date).getTime() >= cutoff);

  return {
    today: sumActivity(today ? [today] : []),
    last7Days: sumActivity(recent),
  };
}

async function loadAccountAuth(dir: string) {
  try {
    const { stdout } = await execFileAsync("claude", ["auth", "status"], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
      timeout: 10_000,
    });
    const parsed = JSON.parse(stdout) as {
      loggedIn?: boolean;
      email?: string;
      subscriptionType?: string;
    };
    if (!parsed.loggedIn) {
      return { status: "error" as const, message: "Not signed in." };
    }
    return {
      status: "ok" as const,
      email: parsed.email ?? null,
      planLabel: parsed.subscriptionType ?? null,
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to check auth.",
    };
  }
}

function displayNameFor(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

async function loadClaudeAccounts(accountsDir: string): Promise<AccountUsage[]> {
  let entries: string[];
  try {
    entries = (await readdir(accountsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }

  return Promise.all(
    entries.map(async (id): Promise<AccountUsage> => {
      const dir = join(accountsDir, id);
      const [auth, activity] = await Promise.all([
        loadAccountAuth(dir),
        loadActivity(dir),
      ]);

      if (auth.status === "error") {
        return {
          id,
          displayName: displayNameFor(id),
          email: null,
          planLabel: null,
          status: "error",
          message: auth.message,
          today: activity.today,
          last7Days: activity.last7Days,
        };
      }

      return {
        id,
        displayName: displayNameFor(id),
        email: auth.email,
        planLabel: auth.planLabel,
        status: "ok",
        today: activity.today,
        last7Days: activity.last7Days,
      };
    }),
  );
}

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    claudeAccountsDir: {
      type: "string",
      label: "Claude accounts directory",
      description:
        "Directory of clp-style isolated Claude account config dirs (each subfolder is one account).",
      default: join(homedir(), ".claude-accounts"),
    },
  });

  bb.rpc.register(rpcContract, {
    async getUsage() {
      const usage = await bb.sdk.system.usageLimits();
      // `usageLimits()` is keyed by the provider's registered id in current
      // BB releases (for example, `claude-code` and `acp-cursor`). The first
      // SDK version this plugin targeted exposed the same data with the
      // display-oriented keys below, so normalize both shapes at this RPC
      // boundary and keep the frontend contract stable.
      const providers = usage as unknown as Record<string, ProviderUsage>;
      const notInstalled: ProviderUsage = { status: "not_installed" };

      const { claudeAccountsDir } = await settings.get();
      const accounts = await loadClaudeAccounts(claudeAccountsDir);

      return {
        claudeCode:
          providers["claude-code"] ?? providers.claudeCode ?? notInstalled,
        codex: providers.codex ?? notInstalled,
        cursor: providers["acp-cursor"] ?? providers.cursor ?? notInstalled,
        accounts,
        fetchedAt: new Date().toISOString(),
      };
    },
  });
}
