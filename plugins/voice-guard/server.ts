// Voice Guard: a bb voice-input service that never loses a dictation.
// Every recording is written to disk before anything else happens, then
// transcribed by Codex with Groq Whisper as a fast backup. If bb stops
// waiting (it gives a voice service about 10 seconds), the work continues
// and the transcript lands next to the audio, where `bb voice-guard` or an
// agent can pick it up.
import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { BackupStore, expandHome, type RecordingMeta } from "./src/backups.js";
import {
  codexReady,
  raceTranscription,
  transcribeWithCodex,
  transcribeWithGroq,
  type AudioInput,
  type ServiceName,
} from "./src/transcribe.js";

const SERVICE_ID = "guarded";
/** Above this size Codex rarely answers inside bb's window, so both start at once. */
const LARGE_RECORDING_BYTES = 1_500_000;
/** Background attempts may run far past bb's deadline. */
const BACKGROUND_TIMEOUT_MS = 5 * 60_000;

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    groqApiKey: { type: "string", label: "Groq API key", secret: true },
    groqModel: {
      type: "select",
      label: "Groq model",
      options: ["whisper-large-v3-turbo", "whisper-large-v3"],
      experimental_optionLabels: { "whisper-large-v3-turbo": "Whisper large v3 turbo (fastest)", "whisper-large-v3": "Whisper large v3 (most accurate)" },
      default: "whisper-large-v3-turbo",
    },
    primary: {
      type: "select",
      label: "Try first",
      options: ["codex", "groq"],
      experimental_optionLabels: { codex: "Codex, then Groq", groq: "Groq, then Codex" },
      default: "codex",
    },
    hedgeSeconds: { type: "number", label: "Seconds before the backup also starts (short recordings)", default: 3 },
    backupDir: { type: "string", label: "Folder for saved recordings", default: "~/.bb/voice-backups" },
    retentionDays: { type: "number", label: "Delete saved recordings after (days, 0 keeps them)", default: 30 },
  });

  let current = await settings.get();
  settings.onChange((next) => {
    current = next;
  });
  const store = new BackupStore(() => current.backupDir);

  function groqKey(): string {
    return typeof current.groqApiKey === "string" ? current.groqApiKey.trim() : "";
  }

  function runners(audio: AudioInput): Record<ServiceName, ((signal: AbortSignal) => Promise<string>) | null> {
    const key = groqKey();
    return {
      codex: (signal) => transcribeWithCodex(audio, signal),
      groq: key ? (signal) => transcribeWithGroq(audio, key, current.groqModel, signal) : null,
    };
  }

  /** Transcribes a saved recording and records the outcome beside it. */
  async function transcribeSaved(audio: AudioInput, saved: { meta: RecordingMeta; dir: string }, hedgeMs: number, bbGaveUp: () => boolean): Promise<RecordingMeta> {
    const started = Date.now();
    let meta = saved.meta;
    try {
      const result = await raceTranscription({ primary: current.primary === "groq" ? "groq" : "codex", hedgeMs, timeoutMs: BACKGROUND_TIMEOUT_MS, run: runners(audio) });
      meta = await store.writeTranscript(saved.dir, meta, result.text);
      meta = { ...meta, status: "done", service: result.service, errors: result.errors, durationMs: Date.now() - started, finishedAfterBbTimeout: bbGaveUp() };
      if (meta.finishedAfterBbTimeout) bb.log.warn(`transcribed ${meta.id} after bb stopped waiting; saved to ${join(saved.dir, meta.transcriptFile!)}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      meta = { ...meta, status: "failed", errors: [message], durationMs: Date.now() - started };
      bb.log.warn(`could not transcribe ${meta.id}: ${message}`);
    }
    await store.writeMeta(saved.dir, meta);
    return meta;
  }

  bb.experimental_aiServices.register({
    id: SERVICE_ID,
    displayName: "Voice Guard (Codex + Groq, saved to disk)",
    async status() {
      if (groqKey() || (await codexReady())) return { ready: true };
      return { ready: false, message: "Run codex login on this machine, or set a Groq key with `bb plugin config voice-guard set groqApiKey <key>`." };
    },
    async transcribe(file, { signal, hint }) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const audio: AudioInput = { bytes, mimeType: file.type || "audio/webm", filename: file.name || "recording.webm", hint };
      // The recording is safe on disk before any network call.
      const saved = await store.save(bytes, audio.mimeType);
      const hedgeMs = bytes.byteLength > LARGE_RECORDING_BYTES ? 0 : Math.max(0, current.hedgeSeconds) * 1000;
      let gaveUp = false;
      const work = transcribeSaved(audio, saved, hedgeMs, () => gaveUp);

      return new Promise<string>((resolvePromise, rejectPromise) => {
        const onAbort = () => {
          gaveUp = true;
          rejectPromise(new Error(`Still transcribing. The recording is saved as ${saved.meta.id}; run \`bb voice-guard last\` for the text.`));
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
        void work.then((meta) => {
          signal.removeEventListener("abort", onAbort);
          if (gaveUp) return;
          if (meta.status === "done" && meta.transcriptFile) {
            readFile(join(saved.dir, meta.transcriptFile), "utf8").then((text) => resolvePromise(text.trim()), rejectPromise);
          } else {
            rejectPromise(new Error(`${meta.errors.join("; ")}. The recording is saved as ${meta.id}.`));
          }
        });
      });
    },
  });

  bb.background.schedule("prune", "17 4 * * *", async () => {
    const removed = await store.prune(current.retentionDays);
    if (removed > 0) bb.log.info(`removed ${removed} day folder(s) of old recordings`);
  });

  const usage = [
    "Usage:",
    "  bb voice-guard list [-n <count>] [--json]   saved recordings, newest first",
    "  bb voice-guard last [--json]                the newest transcript (or its status)",
    "  bb voice-guard show <id> [--json]           one recording's transcript and files",
    "  bb voice-guard transcribe <id|audio-file>   transcribe again, with no time limit",
    "  bb voice-guard path                         the folder recordings are saved in",
  ].join("\n");

  async function describe(entry: { meta: RecordingMeta; dir: string }) {
    const transcript = entry.meta.transcriptFile ? (await readFile(join(entry.dir, entry.meta.transcriptFile), "utf8").catch(() => "")).trim() : null;
    return { ...entry.meta, audioPath: join(entry.dir, entry.meta.audioFile), transcript };
  }

  function line(meta: RecordingMeta): string {
    const mb = (meta.bytes / 1_048_576).toFixed(1);
    const via = meta.service ? ` via ${meta.service}` : "";
    const late = meta.finishedAfterBbTimeout ? " (after bb timed out)" : "";
    return `${meta.id}  ${meta.status}${via}${late}  ${mb} MB`;
  }

  async function retranscribe(target: string) {
    const entry = await store.find(target);
    let audio: AudioInput;
    let saved: { meta: RecordingMeta; dir: string };
    if (entry) {
      const bytes = new Uint8Array(await readFile(join(entry.dir, entry.meta.audioFile)));
      audio = { bytes, mimeType: entry.meta.mimeType, filename: entry.meta.audioFile, hint: null };
      saved = { meta: { ...entry.meta, status: "transcribing", errors: [] }, dir: entry.dir };
    } else {
      const path = expandHome(target);
      const bytes = new Uint8Array(await readFile(path));
      const ext = extname(path).slice(1).toLowerCase();
      const mimeType = { ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav" }[ext] ?? "audio/webm";
      audio = { bytes, mimeType, filename: basename(path), hint: null };
      saved = await store.save(bytes, mimeType);
    }
    // Outside bb's window, Groq goes first: it is faster on long audio.
    const key = groqKey();
    const result = await raceTranscription({
      primary: key ? "groq" : "codex",
      hedgeMs: 15_000,
      timeoutMs: BACKGROUND_TIMEOUT_MS,
      run: runners(audio),
    });
    let meta = await store.writeTranscript(saved.dir, saved.meta, result.text);
    meta = { ...meta, status: "done", service: result.service, errors: result.errors };
    await store.writeMeta(saved.dir, meta);
    return describe({ meta, dir: saved.dir });
  }

  bb.cli.register({
    name: "voice-guard",
    summary: "Find and recover saved voice recordings and their transcripts",
    commands: [
      { name: "list", summary: "Saved recordings, newest first", usage: "bb voice-guard list [-n <count>] [--json]" },
      { name: "last", summary: "The newest transcript", usage: "bb voice-guard last [--json]" },
      { name: "show", summary: "One recording", usage: "bb voice-guard show <id> [--json]" },
      { name: "transcribe", summary: "Transcribe a saved recording or audio file again", usage: "bb voice-guard transcribe <id|audio-file> [--json]" },
      { name: "path", summary: "Where recordings are saved", usage: "bb voice-guard path" },
    ],
    async run(argv) {
      const json = argv.includes("--json");
      const args = argv.filter((arg) => arg !== "--json");
      const command = args.shift();
      const reply = (value: unknown, text: string) => ({ exitCode: 0, stdout: json ? JSON.stringify(value, null, 2) : text });
      const fail = (message: string) => ({ exitCode: 1, stderr: message });
      try {
        switch (command) {
          case undefined:
          case "help":
          case "--help":
            return { exitCode: 0, stdout: usage };
          case "path":
            return { exitCode: 0, stdout: store.root };
          case "list": {
            const countFlag = args.indexOf("-n");
            const count = countFlag === -1 ? 20 : Math.max(1, Number(args[countFlag + 1]) || 20);
            const entries = (await store.list()).slice(0, count);
            return reply(entries.map((entry) => ({ ...entry.meta, audioPath: join(entry.dir, entry.meta.audioFile) })), entries.length ? entries.map((entry) => line(entry.meta)).join("\n") : `No recordings in ${store.root}`);
          }
          case "last":
          case "show": {
            const entry = command === "last" ? (await store.list())[0] : args[0] ? await store.find(args[0]) : null;
            if (!entry) return fail(command === "last" ? `No recordings in ${store.root}` : "No recording with that id. Run `bb voice-guard list`.");
            const detail = await describe(entry);
            const text = [line(entry.meta), `audio: ${detail.audioPath}`, detail.errors.length ? `errors: ${detail.errors.join("; ")}` : null, "", detail.transcript ?? "(no transcript yet)"]
              .filter((part) => part !== null)
              .join("\n");
            return reply(detail, text);
          }
          case "transcribe": {
            if (!args[0]) break;
            const detail = await retranscribe(args[0]);
            return reply(detail, `${line(detail)}\n\n${detail.transcript ?? ""}`);
          }
        }
        return fail(usage);
      } catch (cause) {
        return fail(cause instanceof Error ? cause.message : String(cause));
      }
    },
  });
}
