import type { BbPluginApi } from "@get-bb/plugin-sdk";

const OVERRIDES_KEY = "project-map-overrides";

export async function discoverProjectMap(bb: BbPluginApi): Promise<Record<string, string>> {
  const discovered: Record<string, string> = {};
  const projects = await bb.sdk.projects.list();

  for (const project of projects) {
    for (const source of project.sources ?? []) {
      try {
        const rootPath = source.path.replace(/[\\/]$/, "");
        const file = await bb.sdk.files.read({
          hostId: source.hostId,
          path: `${rootPath}/.dispatch.json`,
          rootPath,
        });
        if (file.contentEncoding !== "utf8") continue;
        const config = JSON.parse(file.content) as unknown;
        if (isRecord(config) && typeof config.project === "string" && config.project.trim()) {
          discovered[project.id] = config.project.trim();
          break;
        }
      } catch {
        // A project may have a remote source, no .dispatch.json, or a source
        // the current host cannot read. Unmapped projects remain selectable.
      }
    }
  }

  const overrides = await bb.storage.kv.get<Record<string, string>>(OVERRIDES_KEY);
  return { ...discovered, ...(isRecord(overrides) ? overrides : {}) };
}

export async function rememberProjectMapping(
  bb: BbPluginApi,
  bbProjectId: string,
  dispatchSlug: string,
): Promise<void> {
  const current = await bb.storage.kv.get<Record<string, string>>(OVERRIDES_KEY);
  const next = isRecord(current) ? { ...current } : {};
  next[bbProjectId] = dispatchSlug;
  await bb.storage.kv.set(OVERRIDES_KEY, next);
}

export async function findBbProjectForDispatchSlug(
  bb: BbPluginApi,
  dispatchSlug: string,
): Promise<string | null> {
  const map = await discoverProjectMap(bb);
  return Object.entries(map).find(([, slug]) => slug === dispatchSlug)?.[0] ?? null;
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null;
}
