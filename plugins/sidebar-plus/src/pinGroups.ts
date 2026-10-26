// Sidebar-only organization: project folder labels and named groups of
// project pins. Shared by server (kv storage + validation) and app.
import { z } from "zod";

export const NAME_MAX = 80;
const nameSchema = z.string().trim().min(1).max(NAME_MAX);

export const pinGroupSchema = z.object({
  id: z.string().min(1).max(64),
  projectId: z.string().min(1).max(512),
  name: nameSchema,
  threadIds: z.array(z.string().min(1).max(512)).max(1000),
});
export type PinGroup = z.infer<typeof pinGroupSchema>;

/** Drop malformed groups; a thread belongs to its first group only. */
export function normalizePinGroups(value: unknown): PinGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: PinGroup[] = [];
  const ids = new Set<string>();
  const grouped = new Set<string>();
  for (const item of value) {
    const parsed = pinGroupSchema.safeParse(item);
    if (!parsed.success || ids.has(parsed.data.id)) continue;
    ids.add(parsed.data.id);
    const threadIds = parsed.data.threadIds.filter((id) => !grouped.has(id));
    for (const id of threadIds) grouped.add(id);
    groups.push({ ...parsed.data, threadIds: [...new Set(threadIds)] });
  }
  return groups;
}

/** Project id → the folder name the user chose; bb's project is untouched. */
export function normalizeProjectLabels(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {};
  const labels: Record<string, string> = {};
  for (const [projectId, label] of Object.entries(value)) {
    const parsed = nameSchema.safeParse(label);
    if (projectId.length > 0 && projectId.length <= 512 && parsed.success)
      labels[projectId] = parsed.data;
  }
  return labels;
}

/** Trim a typed name; null when it is empty or too long to store. */
export function cleanName(value: string): string | null {
  const parsed = nameSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
