import { spawn } from "node:child_process";
import { basename, dirname } from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { PluginCliError, cliCommand, defineCli } from "@get-bb/plugin-sdk";
import {
  extractGeneratedImages,
  type GeneratedImageRecord,
} from "./image-events";
import {
  extractEmbeddedImagePaths,
  resolveImportImagePaths,
  type ImportRoot,
} from "./workspace-import";

interface StoredImageRow {
  thread_id: string;
  item_id: string;
  seq: number;
  saved_path: string;
  revised_prompt: string | null;
  mime_type: string;
  created_at: number;
}

interface ImageSummary {
  itemId: string;
  seq: number;
  revisedPrompt: string | null;
  mimeType: string;
  url: string;
}

const IMAGE_EVENT_TYPES = ["provider/unhandled"] as const;
const MAX_EVENT_PAGE_SIZE = 100;
const MAX_IMPORTED_IMAGE_BYTES = 25 * 1024 * 1024;

const AGENT_INSTRUCTIONS = `Generated Images viewer: whenever you create, render, download or screenshot an image the user should see, or point them to an existing image file, register it in this thread's image viewer by running \`bb generated-images import <path> [more paths]\`. Paths may be inside the thread workspace, $BB_THREAD_STORAGE or /tmp. Local images you embed in your final reply as ![alt](path) are imported automatically when the turn ends, but run the command for any other image. Codex built-in image generation is picked up on its own.`;

class ImageImportError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

interface ImportOptions {
  cwd?: string;
  signal?: AbortSignal;
  /** Skip paths that are outside the allowed roots, missing or unreadable. */
  lenient?: boolean;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message }, 400);
}

function notFound(message: string): Response {
  return jsonResponse({ error: message }, 404);
}

function imageUrl(pluginId: string, threadId: string, itemId: string): string {
  const route = `/api/v1/plugins/${encodeURIComponent(pluginId)}/http/image`;
  return `${route}?threadId=${encodeURIComponent(threadId)}&itemId=${encodeURIComponent(itemId)}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function revealInFinder(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("open", ["-R", path], { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Finder reveal exited with code ${String(code)}`));
      }
    });
  });
}

export default async function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, [
    `CREATE TABLE IF NOT EXISTS generated_images (
       thread_id TEXT NOT NULL,
       item_id TEXT NOT NULL,
       seq INTEGER NOT NULL,
       saved_path TEXT NOT NULL,
       revised_prompt TEXT,
       mime_type TEXT NOT NULL,
       created_at INTEGER NOT NULL,
       PRIMARY KEY (thread_id, item_id)
     )`,
    `CREATE INDEX IF NOT EXISTS generated_images_thread_seq
       ON generated_images (thread_id, seq)`,
  ]);

  const upsertImage = db.prepare(`
    INSERT INTO generated_images
      (thread_id, item_id, seq, saved_path, revised_prompt, mime_type, created_at)
    VALUES
      (@threadId, @itemId, @seq, @savedPath, @revisedPrompt, @mimeType, @createdAt)
    ON CONFLICT (thread_id, item_id) DO UPDATE SET
      seq = excluded.seq,
      saved_path = excluded.saved_path,
      revised_prompt = excluded.revised_prompt,
      mime_type = excluded.mime_type,
      created_at = excluded.created_at
  `);
  const listImages = db.prepare(`
    SELECT thread_id, item_id, seq, saved_path, revised_prompt, mime_type, created_at
    FROM generated_images
    WHERE thread_id = ?
    ORDER BY seq ASC, item_id ASC
  `);
  const getImage = db.prepare(`
    SELECT thread_id, item_id, seq, saved_path, revised_prompt, mime_type, created_at
    FROM generated_images
    WHERE thread_id = ? AND item_id = ?
  `);
  const deleteThreadImages = db.prepare(
    "DELETE FROM generated_images WHERE thread_id = ?",
  );

  // Sequence cursors keep the browser's short polling loop cheap. The first
  // request for a thread scans its existing history; later requests ask only
  // for provider events after the last sequence seen.
  const lastScannedSeq = new Map<string, number>();
  const inFlightScans = new Map<string, Promise<void>>();

  const persistImages = db.transaction((records: GeneratedImageRecord[]) => {
    for (const record of records) {
      upsertImage.run({
        threadId: record.threadId,
        itemId: record.itemId,
        seq: record.seq,
        savedPath: record.savedPath,
        revisedPrompt: record.revisedPrompt,
        mimeType: record.mimeType,
        createdAt: record.createdAt,
      });
    }
  });

  /**
   * Register image files for a thread. Paths must sit inside the thread's
   * workspace, its thread storage or /tmp on the thread's host; files are
   * verified there but not copied.
   */
  async function importImages(
    threadId: string,
    paths: readonly string[],
    options: ImportOptions = {},
  ): Promise<GeneratedImageRecord[]> {
    const signal = options.signal ? { signal: options.signal } : {};
    const thread = await bb.sdk.threads.get({ threadId, ...signal });
    if (!thread.environmentId) {
      throw new ImageImportError(
        "This thread has no workspace environment to import images from.",
        "workspace_required",
      );
    }

    const environment = await bb.sdk.environments.get({
      environmentId: thread.environmentId,
      ...signal,
    });
    if (!environment.path) {
      throw new ImageImportError(
        "This thread's workspace path is unavailable.",
        "workspace_unavailable",
      );
    }

    const roots: ImportRoot[] = [{ kind: "workspace", path: environment.path }];
    try {
      const storage = await bb.sdk.threads.storageLocation({ threadId, ...signal });
      if (storage.hostId === environment.hostId) {
        roots.push({ kind: "thread-storage", path: storage.storageRootPath });
      }
    } catch (error) {
      bb.log.warn(`Could not resolve thread storage for ${threadId}: ${String(error)}`);
    }
    roots.push({ kind: "tmp", path: "/tmp" });

    let candidates;
    try {
      candidates = resolveImportImagePaths(
        roots,
        options.cwd ?? environment.path,
        paths,
        { skipInvalid: options.lenient === true },
      );
    } catch (error) {
      throw new ImageImportError(
        error instanceof Error ? error.message : "Invalid image path.",
        "invalid_image_path",
      );
    }

    const existingRows = listImages.all(threadId) as StoredImageRow[];
    let nextSeq =
      existingRows.reduce((highest, row) => Math.max(highest, row.seq), 0) + 1;
    const records: GeneratedImageRecord[] = [];

    for (const candidate of candidates) {
      let sizeBytes: number;
      try {
        const file = await bb.sdk.files.read({
          hostId: environment.hostId,
          path: candidate.savedPath,
          rootPath: candidate.rootPath,
          ...signal,
        });
        sizeBytes = file.sizeBytes;
      } catch (error) {
        if (options.lenient) {
          continue;
        }
        throw new ImageImportError(
          `Could not read ${candidate.relativePath}: ${error instanceof Error ? error.message : String(error)}`,
          "image_unreadable",
        );
      }
      const problem =
        sizeBytes <= 0
          ? new ImageImportError(`${candidate.relativePath} is empty.`, "empty_image")
          : sizeBytes > MAX_IMPORTED_IMAGE_BYTES
            ? new ImageImportError(
                `${candidate.relativePath} exceeds the 25 MB import limit.`,
                "image_too_large",
              )
            : null;
      if (problem) {
        if (options.lenient) {
          continue;
        }
        throw problem;
      }

      const existing = getImage.get(threadId, candidate.itemId) as
        | StoredImageRow
        | undefined;
      records.push({
        threadId,
        itemId: candidate.itemId,
        seq: existing?.seq ?? nextSeq++,
        savedPath: candidate.savedPath,
        revisedPrompt: existing?.revised_prompt ?? `Image: ${candidate.relativePath}`,
        mimeType: candidate.mimeType,
        createdAt: existing?.created_at ?? Date.now(),
      });
    }

    persistImages(records);
    return records;
  }

  bb.cli.register(
    defineCli({
      name: "generated-images",
      summary: "Manage images in the generated images viewer",
      commands: {
        import: cliCommand({
          summary: "Show workspace image files in a thread's image viewer",
          description:
            "Registers image files already inside the thread workspace. Files are not copied.",
          positionals: [
            {
              name: "paths",
              description: "One or more image paths inside the thread workspace",
              required: true,
              variadic: true,
            },
          ],
          options: {
            thread: {
              type: "string",
              description: "BB thread id (defaults to the invoking thread)",
            },
          },
          async run(input, context) {
            const threadId = input.options.thread ?? context.threadId;
            if (!threadId) {
              throw new PluginCliError(
                "Run this command from a BB thread or pass --thread <thread-id>.",
                { code: "thread_required" },
              );
            }

            let records: GeneratedImageRecord[];
            try {
              records = await importImages(threadId, input.positionals.paths, {
                ...(context.cwd ? { cwd: context.cwd } : {}),
                ...(context.signal ? { signal: context.signal } : {}),
              });
            } catch (error) {
              if (error instanceof ImageImportError) {
                throw new PluginCliError(error.message, { code: error.code });
              }
              throw error;
            }
            return {
              exitCode: 0,
              stdout: `Imported ${records.length} image${records.length === 1 ? "" : "s"} into thread ${threadId}:\n${records
                .map((record) => `- ${basename(record.savedPath)}`)
                .join("\n")}`,
            };
          },
        }),
      },
    }),
  );

  async function scanThread(threadId: string): Promise<void> {
    const existing = inFlightScans.get(threadId);
    if (existing) {
      return existing;
    }

    const scan = (async () => {
      const afterSeq = lastScannedSeq.get(threadId);
      const records: GeneratedImageRecord[] = [];
      let cursor = afterSeq;
      let highestSeq = afterSeq ?? 0;

      while (true) {
        const rows = await bb.sdk.threads.events.list({
          threadId,
          types: IMAGE_EVENT_TYPES,
          order: "asc",
          limit: String(MAX_EVENT_PAGE_SIZE),
          ...(cursor === undefined ? {} : { afterSeq: String(cursor) }),
        });
        if (rows.length === 0) {
          break;
        }

        records.push(...extractGeneratedImages(rows, threadId));
        const pageHighestSeq = rows.reduce(
          (highest, row) => Math.max(highest, row.seq),
          cursor ?? 0,
        );
        if (pageHighestSeq <= (cursor ?? 0)) {
          break;
        }

        highestSeq = pageHighestSeq;
        cursor = pageHighestSeq;
        if (rows.length < MAX_EVENT_PAGE_SIZE) {
          break;
        }
      }

      if (records.length > 0) {
        persistImages(records);
      }
      lastScannedSeq.set(threadId, highestSeq);
    })().finally(() => {
      inFlightScans.delete(threadId);
    });

    inFlightScans.set(threadId, scan);
    return scan;
  }

  function summariesForThread(threadId: string): ImageSummary[] {
    const rows = listImages.all(threadId) as StoredImageRow[];
    return rows.map((row) => ({
      itemId: row.item_id,
      seq: row.seq,
      revisedPrompt: row.revised_prompt,
      mimeType: row.mime_type,
      url: imageUrl(bb.pluginId, threadId, row.item_id),
    }));
  }

  bb.http.route(
    "GET",
    "/images",
    async (context) => {
      const { threadId } = context.req.query();
      if (!threadId) {
        return badRequest("threadId is required");
      }

      try {
        await scanThread(threadId);
        return jsonResponse({ images: summariesForThread(threadId) });
      } catch (error) {
        bb.log.warn(
          `Could not index generated images for ${threadId}: ${String(error)}`,
        );
        return jsonResponse({ images: summariesForThread(threadId) });
      }
    },
    { auth: "local" },
  );

  bb.http.route(
    "GET",
    "/image",
    async (context) => {
      const { threadId, itemId } = context.req.query();
      if (!threadId || !itemId) {
        return badRequest("threadId and itemId are required");
      }

      const row = getImage.get(threadId, itemId) as StoredImageRow | undefined;
      if (!row) {
        return notFound("Generated image not found");
      }

      try {
        const thread = await bb.sdk.threads.get({ threadId });
        let hostId: string | undefined;
        if (thread.environmentId) {
          const environment = await bb.sdk.environments.get({
            environmentId: thread.environmentId,
          });
          hostId = environment.hostId;
        }

        const file = await bb.sdk.files.read({
          ...(hostId ? { hostId } : {}),
          path: row.saved_path,
          // The path came from a completed provider event and is then looked
          // up by the exact thread/item key above. Keep the host read confined
          // to its containing directory as a second safety boundary.
          rootPath: dirname(row.saved_path),
        });
        const body =
          file.contentEncoding === "base64"
            ? Uint8Array.from(Buffer.from(file.content, "base64"))
            : new TextEncoder().encode(file.content);

        return new Response(body, {
          headers: {
            "Cache-Control": "private, max-age=3600",
            "Content-Length": String(body.byteLength),
            "Content-Type": row.mime_type,
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch (error) {
        bb.log.warn(
          `Could not read generated image ${threadId}/${itemId}: ${String(error)}`,
        );
        return notFound("Generated image file is unavailable");
      }
    },
    { auth: "local" },
  );

  bb.http.route(
    "POST",
    "/reveal",
    async (context) => {
      let body: unknown;
      try {
        body = await context.req.json();
      } catch {
        return badRequest("A JSON body is required");
      }

      const request = body as Record<string, unknown>;
      const threadId = request?.threadId;
      const itemId = request?.itemId;
      if (!isNonEmptyString(threadId) || !isNonEmptyString(itemId)) {
        return badRequest("threadId and itemId are required");
      }
      if (process.platform !== "darwin") {
        return jsonResponse(
          { error: "Reveal in Finder is available on macOS only" },
          501,
        );
      }

      const row = getImage.get(threadId, itemId) as
        | StoredImageRow
        | undefined;
      if (!row) {
        return notFound("Generated image not found");
      }

      try {
        await revealInFinder(row.saved_path);
        return jsonResponse({ ok: true });
      } catch (error) {
        bb.log.warn(
          `Could not reveal generated image ${threadId}/${itemId}: ${String(error)}`,
        );
        return jsonResponse({ error: "Could not reveal image in Finder" }, 500);
      }
    },
    { auth: "local" },
  );

  bb.events.on("thread.idle", ({ thread, lastAssistantText }) => {
    void scanThread(thread.id).catch((error) => {
      bb.log.warn(`Could not index idle thread ${thread.id}: ${String(error)}`);
    });

    const embedded = extractEmbeddedImagePaths(lastAssistantText);
    if (embedded.length > 0) {
      void importImages(thread.id, embedded, { lenient: true }).catch((error) => {
        bb.log.warn(
          `Could not import embedded images for ${thread.id}: ${String(error)}`,
        );
      });
    }
  });

  bb.agents.contributeInstructions(() => AGENT_INSTRUCTIONS);

  bb.events.on("thread.deleted", ({ thread }) => {
    deleteThreadImages.run(thread.id);
    lastScannedSeq.delete(thread.id);
  });

  bb.onDispose(() => {
    lastScannedSeq.clear();
    inFlightScans.clear();
  });

  bb.log.info("loaded — generated images will stay visible in conversations");
}
