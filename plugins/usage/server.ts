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

const providerMetaSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  logoUrl: z.string().nullable(),
  icon: z.object({ glyph: z.string() }).nullable(),
  strings: z.object({
    iconTint: z.object({ light: z.string(), dark: z.string() }).nullable(),
  }),
});

export type ProviderMeta = z.infer<typeof providerMetaSchema>;

const usageResponseSchema = z.object({
  claudeCode: providerUsageSchema,
  codex: providerUsageSchema,
  cursor: providerUsageSchema,
  /** Logo and name per provider, for the provider tabs. */
  providers: z
    .object({
      claudeCode: providerMetaSchema.nullable(),
      codex: providerMetaSchema.nullable(),
      cursor: providerMetaSchema.nullable(),
    })
    .optional(),
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

      let catalog: Awaited<ReturnType<typeof bb.sdk.providers.list>> = [];
      try {
        catalog = await bb.sdk.providers.list();
      } catch {
        // Tabs fall back to generic icons.
      }
      const meta = (id: string): ProviderMeta | null => {
        const provider = catalog.find((item) => item.id === id);
        if (provider === undefined) return null;
        const tint = provider.strings?.iconTint;
        return {
          id: provider.id,
          displayName: provider.displayName,
          logoUrl: provider.logoUrl ?? null,
          icon: provider.icon ?? null,
          strings: {
            iconTint:
              tint?.light && tint.dark
                ? { light: tint.light, dark: tint.dark }
                : null,
          },
        };
      };

      return {
        claudeCode:
          providers["claude-code"] ?? providers.claudeCode ?? notInstalled,
        codex: providers.codex ?? notInstalled,
        cursor: providers["acp-cursor"] ?? providers.cursor ?? notInstalled,
        providers: {
          claudeCode: meta("claude-code"),
          codex: meta("codex"),
          cursor: meta("acp-cursor"),
        },
        fetchedAt: new Date().toISOString(),
      };
    },
  });
}
