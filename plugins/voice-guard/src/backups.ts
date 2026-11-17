import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type RecordingStatus = "transcribing" | "done" | "failed";

/** The sidecar `<id>.json` written next to every saved recording. */
export interface RecordingMeta {
  id: string;
  createdAt: string;
  audioFile: string;
  mimeType: string;
  bytes: number;
  status: RecordingStatus;
  /** Which service produced the transcript. */
  service: "codex" | "groq" | null;
  /** True when bb had already given up before the transcript was ready. */
  finishedAfterBbTimeout: boolean;
  transcriptFile: string | null;
  durationMs: number | null;
  errors: string[];
}

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function expandHome(path: string): string {
  return resolve(path.replace(/^~(?=$|\/)/u, homedir()));
}

function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType.split(";")[0]!.trim().toLowerCase()] ?? "webm";
}

function stamp(date: Date): { day: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  };
}

/**
 * Recordings live as plain files, one folder per day:
 * `<root>/2026-11-15/223301-ab12cd.webm` with `.json` metadata and, once
 * transcribed, a `.txt` transcript. Plain files mean any agent can read them.
 */
export class BackupStore {
  constructor(private readonly rootPath: () => string) {}

  get root(): string {
    return expandHome(this.rootPath());
  }

  async save(audio: Uint8Array, mimeType: string): Promise<{ meta: RecordingMeta; dir: string }> {
    const now = new Date();
    const { day, time } = stamp(now);
    const id = `${day}_${time}-${randomUUID().slice(0, 6)}`;
    const dir = join(this.root, day);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const audioFile = `${id}.${extensionFor(mimeType)}`;
    await writeFile(join(dir, audioFile), audio, { mode: 0o600 });
    const meta: RecordingMeta = {
      id,
      createdAt: now.toISOString(),
      audioFile,
      mimeType,
      bytes: audio.byteLength,
      status: "transcribing",
      service: null,
      finishedAfterBbTimeout: false,
      transcriptFile: null,
      durationMs: null,
      errors: [],
    };
    await this.writeMeta(dir, meta);
    return { meta, dir };
  }

  async writeMeta(dir: string, meta: RecordingMeta): Promise<void> {
    await writeFile(join(dir, `${meta.id}.json`), `${JSON.stringify(meta, null, 2)}\n`, { mode: 0o600 });
  }

  async writeTranscript(dir: string, meta: RecordingMeta, text: string): Promise<RecordingMeta> {
    const transcriptFile = `${meta.id}.txt`;
    await writeFile(join(dir, transcriptFile), `${text.trim()}\n`, { mode: 0o600 });
    return { ...meta, transcriptFile };
  }

  /** Every recording, newest first. */
  async list(): Promise<{ meta: RecordingMeta; dir: string }[]> {
    const out: { meta: RecordingMeta; dir: string }[] = [];
    let days: string[];
    try {
      days = await readdir(this.root);
    } catch {
      return out;
    }
    for (const day of days.filter((name) => /^\d{4}-\d\d-\d\d$/u.test(name)).sort().reverse()) {
      const dir = join(this.root, day);
      const files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort().reverse();
      for (const file of files) {
        try {
          out.push({ meta: JSON.parse(await readFile(join(dir, file), "utf8")) as RecordingMeta, dir });
        } catch {
          // A half-written sidecar is skipped; its audio is still on disk.
        }
      }
    }
    return out;
  }

  async find(id: string): Promise<{ meta: RecordingMeta; dir: string } | null> {
    const day = id.slice(0, 10);
    if (!/^\d{4}-\d\d-\d\d_\d{6}-[0-9a-f]{6}$/u.test(id)) return null;
    const dir = join(this.root, day);
    try {
      return { meta: JSON.parse(await readFile(join(dir, `${id}.json`), "utf8")) as RecordingMeta, dir };
    } catch {
      return null;
    }
  }

  /** Deletes day folders older than `days`. Returns how many were removed. */
  async prune(days: number): Promise<number> {
    if (days <= 0) return 0;
    const cutoff = Date.now() - days * 86_400_000;
    let removed = 0;
    let entries: string[];
    try {
      entries = await readdir(this.root);
    } catch {
      return 0;
    }
    for (const day of entries.filter((name) => /^\d{4}-\d\d-\d\d$/u.test(name))) {
      const dir = join(this.root, day);
      const time = new Date(`${day}T23:59:59`).getTime();
      if (Number.isFinite(time) && time < cutoff && (await stat(dir)).isDirectory()) {
        await rm(dir, { recursive: true, force: true });
        removed += 1;
      }
    }
    return removed;
  }
}
