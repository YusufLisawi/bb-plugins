import type { BbPluginApi } from "@get-bb/plugin-sdk";

const OVERRIDES_KEY = "project-map-overrides";
const PROJECT_MAP_CACHE_TTL_MS = 5 * 60_000;

let cachedProjectMap: { value: Record<string, string>; expiresAt: number } | null = null;
let projectMapRequest: Promise<Record<string, string>> | null = null;
let projectMapGeneration = 0;

export async function discoverProjectMap(bb: BbPluginApi): Promise<Record<string, string>> {
  if (cachedProjectMap && cachedProjectMap.expiresAt > Date.now()) {
    return cachedProjectMap.value;
  }
  if (projectMapRequest) return projectMapRequest;

  const generation = projectMapGeneration;
  const request = loadProjectMap(bb);
  projectMapRequest = request;

  try {
    const map = await request;
    if (generation === projectMapGeneration) {
      cachedProjectMap = {
        value: map,
        expiresAt: Date.now() + PROJECT_MAP_CACHE_TTL_MS,
      };
    }
    return map;
  } finally {
    if (projectMapRequest === request) projectMapRequest = null;
  }
}

/**
 * Resolve only the current BB project when the task list needs a default.
 * This avoids scanning every project source before the Dispatch page can render.
 */
export async function findDispatchSlugForBbProject(
  bb: BbPluginApi,
  bbProjectId: string,
): Promise<string | null> {
  if (cachedProjectMap && cachedProjectMap.expiresAt > Date.now()) {
    return cachedProjectMap.value[bbProjectId] ?? null;
  }

  const overrides = await bb.storage.kv.get<Record<string, string>>(OVERRIDES_KEY);
  if (isRecord(overrides) && typeof overrides[bbProjectId] === "string") {
    return overrides[bbProjectId];
  }

  try {
    const project = await bb.sdk.projects.get({ projectId: bbProjectId });
    return discoverProjectSlug(bb, project.sources ?? []);
  } catch {
    return null;
  }
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
  invalidateProjectMapCache();
}

export async function findBbProjectForDispatchSlug(
  bb: BbPluginApi,
  dispatchSlug: string,
): Promise<string | null> {
  const map = await discoverProjectMap(bb);
  return Object.entries(map).find(([, slug]) => slug === dispatchSlug)?.[0] ?? null;
}

export function invalidateProjectMapCache(): void {
  projectMapGeneration += 1;
  cachedProjectMap = null;
  projectMapRequest = null;
}

async function loadProjectMap(bb: BbPluginApi): Promise<Record<string, string>> {
  const [projects, overrides] = await Promise.all([
    bb.sdk.projects.list(),
    bb.storage.kv.get<Record<string, string>>(OVERRIDES_KEY),
  ]);
  const entries = await Promise.all(
    projects.map(async (project) => {
      const slug = await discoverProjectSlug(bb, project.sources ?? []);
      return slug ? ([project.id, slug] as const) : null;
    }),
  );
  const discovered = Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null));
  return { ...discovered, ...(isRecord(overrides) ? overrides : {}) };
}

async function discoverProjectSlug(
  bb: BbPluginApi,
  sources: ReadonlyArray<{ hostId: string; path: string }>,
): Promise<string | null> {
  for (const source of sources) {
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
        return config.project.trim();
      }
    } catch {
      // A project may have a remote source, no .dispatch.json, or a source
      // the current host cannot read. Unmapped projects remain selectable.
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null;
}
