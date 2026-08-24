import { extname, isAbsolute } from "node:path";

export interface GeneratedImageRecord {
  threadId: string;
  itemId: string;
  seq: number;
  savedPath: string;
  revisedPrompt: string | null;
  mimeType: string;
  createdAt: number;
}

type UnknownRecord = Record<string, unknown>;

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function inferMimeType(savedPath: string): string | null {
  return MIME_TYPES[extname(savedPath).toLowerCase()] ?? null;
}

/**
 * Parse the provider/unhandled representation emitted by the Codex provider.
 * The native provider already saves the binary result to `savedPath`; keeping
 * only that path in the plugin database avoids duplicating multi-megabyte
 * base64 results in BB's plugin storage.
 */
export function extractGeneratedImage(
  row: unknown,
  fallbackThreadId?: string,
): GeneratedImageRecord | null {
  const rowRecord = asRecord(row);
  if (rowRecord?.type !== "provider/unhandled") {
    return null;
  }

  const data = asRecord(rowRecord.data);
  const rawEvent = asRecord(data?.rawEvent);
  const params = asRecord(rawEvent?.params);
  const item = asRecord(params?.item);
  if (
    item?.type !== "imageGeneration" ||
    item.status !== "completed" ||
    (item.failure !== undefined && item.failure !== null)
  ) {
    return null;
  }

  const itemId = stringValue(item.id);
  const savedPath = stringValue(item.savedPath);
  if (!itemId || !savedPath || !isAbsolute(savedPath)) {
    return null;
  }

  const mimeType = inferMimeType(savedPath);
  if (!mimeType) {
    return null;
  }

  const threadId =
    stringValue(rowRecord.threadId) ??
    stringValue(data?.threadId) ??
    fallbackThreadId;
  if (!threadId) {
    return null;
  }

  const revisedPrompt =
    typeof item.revisedPrompt === "string" ? item.revisedPrompt : null;

  return {
    threadId,
    itemId,
    seq: numberValue(rowRecord.seq, 0),
    savedPath,
    revisedPrompt,
    mimeType,
    createdAt: numberValue(rowRecord.createdAt, Date.now()),
  };
}

export function extractGeneratedImages(
  rows: readonly unknown[],
  fallbackThreadId?: string,
): GeneratedImageRecord[] {
  const byKey = new Map<string, GeneratedImageRecord>();
  for (const row of rows) {
    const record = extractGeneratedImage(row, fallbackThreadId);
    if (record) {
      byKey.set(`${record.threadId}:${record.itemId}`, record);
    }
  }

  return [...byKey.values()].sort(
    (left, right) => left.seq - right.seq || left.itemId.localeCompare(right.itemId),
  );
}
