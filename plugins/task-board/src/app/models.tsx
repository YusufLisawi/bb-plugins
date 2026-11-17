import { useEffect, useState } from "react";
import {
  experimental_ProviderIcon as ProviderIcon,
  experimental_useProviders,
  useSdk,
} from "@get-bb/plugin-sdk/app";

type Sdk = ReturnType<typeof useSdk>;

/** "GPT-6.1-Sol" → "6.1-Sol": the provider icon already says which family it is. */
function shortName(name: string): string {
  return name.replace(/^GPT[-\s]?/iu, "");
}

/** Display names per provider, fetched once per app session and shared. */
const catalogs = new Map<string, Promise<Map<string, string>>>();

function catalogFor(sdk: Sdk, providerId: string): Promise<Map<string, string>> {
  let catalog = catalogs.get(providerId);
  if (!catalog) {
    catalog = sdk.providers.models({ providerId, preferCached: true }).then(
      (result) => new Map(result.models.map((model) => [model.id, shortName(model.displayName)])),
      () => {
        catalogs.delete(providerId);
        return new Map<string, string>();
      },
    );
    catalogs.set(providerId, catalog);
  }
  return catalog;
}

/** "claude-opus-5-5" → "Opus 5.5" from bb's catalog, or the id as a fallback. */
export function useModelName(providerId: string | null, model: string | null): string | null {
  const sdk = useSdk();
  const [name, setName] = useState<string | null>(model);
  useEffect(() => {
    setName(model);
    if (!providerId || !model) return;
    let cancelled = false;
    void catalogFor(sdk, providerId).then((catalog) => {
      if (!cancelled) setName(catalog.get(model) ?? shortName(model));
    });
    return () => {
      cancelled = true;
    };
  }, [sdk, providerId, model]);
  return name;
}

/** The provider's mark and the model's name, sized for a card chip. */
export function ModelLabel({ providerId, model }: { providerId: string | null; model: string | null }) {
  const name = useModelName(providerId, model);
  const { providers } = experimental_useProviders();
  if (!name) return null;
  const provider = providers.find((candidate) => candidate.id === providerId) ?? (providerId ? { id: providerId } : null);
  return (
    <>
      {provider ? <ProviderIcon providerKind="agent" provider={provider} fallback="Bot" className="size-3 shrink-0" aria-hidden /> : null}
      <span className="truncate">{name}</span>
    </>
  );
}
