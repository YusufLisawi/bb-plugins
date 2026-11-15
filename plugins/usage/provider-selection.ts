export const PROVIDER_KEYS = ["claudeCode", "codex", "cursor"] as const;
export type ProviderKey = typeof PROVIDER_KEYS[number];

export function parseSelection(stored: string | null, legacy: string | null): ProviderKey[] {
  try {
    const value: unknown = JSON.parse(stored ?? "null");
    if (Array.isArray(value)) {
      const selected = PROVIDER_KEYS.filter((key) => value.includes(key));
      if (selected.length > 0) return selected;
    }
  } catch {}
  return PROVIDER_KEYS.filter((key) => key === legacy);
}

export function availableSelection(requested: ProviderKey[], available: ProviderKey[]): ProviderKey[] {
  const selected = available.filter((key) => requested.includes(key));
  return selected.length > 0 ? selected : available.slice(0, 1);
}

export function toggleProvider(selected: ProviderKey[], key: ProviderKey): ProviderKey[] {
  if (selected.includes(key))
    return selected.length === 1 ? selected : selected.filter((item) => item !== key);
  return PROVIDER_KEYS.filter((item) => selected.includes(item) || item === key);
}
