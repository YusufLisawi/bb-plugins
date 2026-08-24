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
      return { ...usage, fetchedAt: new Date().toISOString() };
    },
  });
}
