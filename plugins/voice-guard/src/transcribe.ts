import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface AudioInput {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  hint: string | null;
}

export type ServiceName = "codex" | "groq";

/** Codex rejects recordings above 20 MB; Groq's free tier takes 25 MB. */
const CODEX_MAX_BYTES = 20 * 1024 * 1024;
const GROQ_MAX_BYTES = 25 * 1024 * 1024;
/** Groq's prompt is capped at 224 tokens; keep the hint well under it. */
const GROQ_HINT_CHARS = 600;

function blobOf(audio: AudioInput): Blob {
  return new Blob([audio.bytes as Uint8Array<ArrayBuffer>], { type: audio.mimeType });
}

async function readCodexAuth(): Promise<{ accessToken: string; accountId: string } | null> {
  const home = process.env.CODEX_HOME?.trim() || join(homedir(), ".codex");
  try {
    const parsed = JSON.parse(await readFile(resolve(home, "auth.json"), "utf8")) as {
      tokens?: { access_token?: unknown; account_id?: unknown };
    };
    const accessToken = parsed.tokens?.access_token;
    const accountId = parsed.tokens?.account_id;
    return typeof accessToken === "string" && typeof accountId === "string" ? { accessToken, accountId } : null;
  } catch {
    return null;
  }
}

export async function codexReady(): Promise<boolean> {
  return (await readCodexAuth()) !== null;
}

async function failure(service: string, response: Response): Promise<Error> {
  const body = (await response.text().catch(() => "")).slice(0, 300);
  return new Error(`${service} HTTP ${response.status}${body ? `: ${body}` : ""}`);
}

/** The same request bb's Codex voice service sends, with your Codex login. */
export async function transcribeWithCodex(audio: AudioInput, signal: AbortSignal): Promise<string> {
  if (audio.bytes.byteLength > CODEX_MAX_BYTES) throw new Error("Codex takes recordings up to 20 MB");
  const auth = await readCodexAuth();
  if (!auth) throw new Error("No Codex login on this machine (run codex login)");
  const form = new FormData();
  form.set("file", blobOf(audio), audio.filename);
  form.set("model", "gpt-transcribe");
  if (audio.hint) form.set("prompt", audio.hint);
  const response = await fetch("https://chatgpt.com/backend-api/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "chatgpt-account-id": auth.accountId,
      originator: "bb",
      "User-Agent": "bb-voice-guard",
    },
    body: form,
    signal,
  });
  if (!response.ok) throw await failure("Codex", response);
  const json = (await response.json()) as { text?: unknown };
  if (typeof json.text !== "string") throw new Error("Codex returned no transcript");
  return json.text;
}

export async function transcribeWithGroq(audio: AudioInput, apiKey: string, model: string, signal: AbortSignal): Promise<string> {
  if (!apiKey) throw new Error("No Groq API key set");
  if (audio.bytes.byteLength > GROQ_MAX_BYTES) throw new Error("Groq takes recordings up to 25 MB");
  const form = new FormData();
  form.set("file", blobOf(audio), audio.filename);
  form.set("model", model);
  form.set("response_format", "json");
  if (audio.hint) form.set("prompt", audio.hint.slice(0, GROQ_HINT_CHARS));
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  });
  if (!response.ok) throw await failure("Groq", response);
  const json = (await response.json()) as { text?: unknown };
  if (typeof json.text !== "string") throw new Error("Groq returned no transcript");
  return json.text.trim();
}

export interface RaceOptions {
  /** How long the primary gets alone before the backup also starts. */
  hedgeMs: number;
  /** Hard limit for the whole attempt, independent of bb's own deadline. */
  timeoutMs: number;
  primary: ServiceName;
  run: Record<ServiceName, ((signal: AbortSignal) => Promise<string>) | null>;
}

export interface RaceResult {
  text: string;
  service: ServiceName;
  errors: string[];
}

/**
 * Starts the primary service, then the backup after `hedgeMs` or as soon as
 * the primary fails, whichever is first. The first transcript wins and the
 * other request is cancelled. Rejects with every error when both fail.
 */
export function raceTranscription(options: RaceOptions): Promise<RaceResult> {
  const backup: ServiceName = options.primary === "codex" ? "groq" : "codex";
  const errors: string[] = [];
  const controllers = new Map<ServiceName, AbortController>();

  return new Promise<RaceResult>((resolvePromise, rejectPromise) => {
    let settled = false;
    let running = 0;
    let backupStarted = false;
    const deadline = setTimeout(() => finishWithError(`Timed out after ${Math.round(options.timeoutMs / 1000)}s`), options.timeoutMs);
    const hedge = setTimeout(() => startBackup(), Math.max(0, options.hedgeMs));

    function cleanup() {
      settled = true;
      clearTimeout(deadline);
      clearTimeout(hedge);
      for (const controller of controllers.values()) controller.abort();
    }
    function finishWithError(message: string) {
      if (settled) return;
      errors.push(message);
      cleanup();
      rejectPromise(new Error(errors.join("; ")));
    }
    function start(service: ServiceName) {
      const run = options.run[service];
      if (!run) {
        errors.push(`${service}: not configured`);
        return false;
      }
      const controller = new AbortController();
      controllers.set(service, controller);
      running += 1;
      run(controller.signal).then(
        (text) => {
          if (settled) return;
          if (!text.trim()) {
            onFailure(service, "empty transcript");
            return;
          }
          cleanup();
          resolvePromise({ text, service, errors });
        },
        (cause: unknown) => onFailure(service, cause instanceof Error ? cause.message : String(cause)),
      );
      return true;
    }
    function onFailure(service: ServiceName, message: string) {
      if (settled) return;
      errors.push(`${service}: ${message}`);
      running -= 1;
      if (!backupStarted) startBackup();
      if (running === 0 && backupStarted) finishWithError("All services failed");
    }
    function startBackup() {
      if (settled || backupStarted) return;
      backupStarted = true;
      clearTimeout(hedge);
      start(backup);
      if (running === 0) finishWithError("All services failed");
    }

    if (!start(options.primary)) startBackup();
  });
}
