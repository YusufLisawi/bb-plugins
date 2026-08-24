// The sidebar layout model: which sections show, in what order, plus a few
// presentation knobs. Shared by server (kv storage + validation) and app.
import { z } from "zod";

export const SECTION_IDS = [
  "attention",
  "running",
  "done",
  "pinned",
  "projects",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_META: Record<
  SectionId,
  { label: string; description: string }
> = {
  attention: {
    label: "Needs attention",
    description: "Questions, approvals, and failed threads waiting on you.",
  },
  running: {
    label: "In progress",
    description: "Threads the agent is actively working on.",
  },
  done: {
    label: "Done",
    description: "Finished threads you have not opened yet.",
  },
  pinned: {
    label: "Pinned",
    description: "Threads you pinned.",
  },
  projects: {
    label: "Projects",
    description: "Every project as a folder you can open.",
  },
};

export const sectionSchema = z.object({
  id: z.enum(SECTION_IDS),
  enabled: z.boolean(),
});

export const layoutSchema = z.object({
  version: z.literal(1),
  sections: z.array(sectionSchema),
  /** Render host nav rows (Extensions, plugin pages) as an icon grid. */
  navGrid: z.boolean(),
  /** Columns of the icon grid. */
  navGridColumns: z.number().int().min(3).max(8),
  /** Where New thread / Search live: top-bar icons, tiles, or bb default. */
  primaryStyle: z.enum(["chrome", "tiles", "default"]),
  /** Colored status glyphs (orange running, green done, blue attention). */
  statusColors: z.boolean(),
  /** Hide threads already shown in an open smart section from folders. */
  dedupeFolders: z.boolean(),
  /** Smart sections only list threads touched in the last N days (0 = all). */
  smartWindowDays: z.number().int().min(0).max(365),
  /** Show the project name next to rows in smart sections. */
  showProjectHint: z.boolean(),
});

export type SidebarLayout = z.infer<typeof layoutSchema>;
export type SectionSetting = z.infer<typeof sectionSchema>;

export const DEFAULT_LAYOUT: SidebarLayout = {
  version: 1,
  sections: [
    { id: "attention", enabled: true },
    { id: "running", enabled: true },
    { id: "done", enabled: true },
    { id: "pinned", enabled: true },
    { id: "projects", enabled: true },
  ],
  navGrid: true,
  navGridColumns: 6,
  primaryStyle: "chrome",
  statusColors: true,
  dedupeFolders: true,
  smartWindowDays: 7,
  showProjectHint: true,
};

/**
 * Coerce anything (old kv payloads, partial edits) into a complete layout:
 * unknown sections are dropped, missing ones appended in default order, and
 * every scalar falls back to its default.
 */
export function normalizeLayout(input: unknown): SidebarLayout {
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const seen = new Set<SectionId>();
  const sections: SectionSetting[] = [];
  if (Array.isArray(raw.sections)) {
    for (const entry of raw.sections) {
      const parsed = sectionSchema.safeParse(entry);
      if (!parsed.success || seen.has(parsed.data.id)) continue;
      seen.add(parsed.data.id);
      sections.push(parsed.data);
    }
  }
  for (const fallback of DEFAULT_LAYOUT.sections) {
    if (!seen.has(fallback.id)) sections.push({ ...fallback });
  }
  const bool = (key: keyof SidebarLayout): boolean =>
    typeof raw[key] === "boolean"
      ? (raw[key] as boolean)
      : (DEFAULT_LAYOUT[key] as boolean);
  const int = (key: keyof SidebarLayout, min: number, max: number): number => {
    const value = raw[key];
    if (typeof value === "number" && Number.isInteger(value)) {
      return Math.min(max, Math.max(min, value));
    }
    return DEFAULT_LAYOUT[key] as number;
  };
  return {
    version: 1,
    sections,
    navGrid: bool("navGrid"),
    navGridColumns: int("navGridColumns", 3, 8),
    primaryStyle:
      raw.primaryStyle === "tiles" || raw.primaryStyle === "default"
        ? raw.primaryStyle
        : DEFAULT_LAYOUT.primaryStyle,
    statusColors: bool("statusColors"),
    dedupeFolders: bool("dedupeFolders"),
    smartWindowDays: int("smartWindowDays", 0, 365),
    showProjectHint: bool("showProjectHint"),
  };
}

export function moveSection(
  sections: readonly SectionSetting[],
  id: SectionId,
  direction: -1 | 1,
): SectionSetting[] {
  const index = sections.findIndex((section) => section.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sections.length) {
    return [...sections];
  }
  const next = [...sections];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return next;
}
