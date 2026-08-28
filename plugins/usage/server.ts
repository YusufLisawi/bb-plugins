// bb-plugin-usage — surfaces BB's provider usage & limits in a sidebar panel.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

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

const usageResponseSchema = z.object({
  claudeCode: providerUsageSchema,
  codex: providerUsageSchema,
  cursor: providerUsageSchema,
  fetchedAt: z.string(),
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;

export const rpcContract = defineRpcContract({
  getUsage: {
    input: z.null(),
    output: usageResponseSchema,
  },
});

export default async function plugin(bb: BbPluginApi) {
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

      return {
        claudeCode:
          providers["claude-code"] ?? providers.claudeCode ?? notInstalled,
        codex: providers.codex ?? notInstalled,
        cursor: providers["acp-cursor"] ?? providers.cursor ?? notInstalled,
        fetchedAt: new Date().toISOString(),
      };
    },
  });
}
