import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { AiProvider } from "../shared/types.js";

const RUN_TIMEOUT_MS = 180_000;
const binaries = new Map<string, Promise<string | null>>();

/** Find a CLI the way the user's terminal would; BB's server PATH is narrower. */
function resolveBinary(name: "claude" | "codex"): Promise<string | null> {
  let found = binaries.get(name);
  if (!found) {
    found = new Promise((resolve) => {
      execFile("bash", ["-lc", `command -v ${name}`], { timeout: 10_000 }, (error, stdout) => {
        const path = stdout.trim().split("\n").pop();
        if (!error && path) return resolve(path);
        const guesses = [join(homedir(), ".local/bin", name), join(homedir(), ".npm-global/bin", name), `/usr/local/bin/${name}`, `/opt/homebrew/bin/${name}`];
        Promise.all(guesses.map((guess) => readFile(guess).then(() => guess, () => null)))
          .then((hits) => resolve(hits.find(Boolean) ?? null), () => resolve(null));
      });
    });
    binaries.set(name, found);
    void found.then((path) => { if (!path) binaries.delete(name); });
  }
  return found;
}

function run(command: string, args: string[], input: string, cwd: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    // BB's server is an IPC child; those variables must not leak into the CLI.
    const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };
    delete env.NODE_CHANNEL_FD;
    delete env.NODE_CHANNEL_SERIALIZATION_MODE;
    const child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"], env });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), RUN_TIMEOUT_MS);
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (code === 0) return resolve(stdout);
      // Claude reports failures as JSON on stdout; surface its message.
      try {
        const parsed = JSON.parse(stdout) as { result?: unknown };
        if (typeof parsed.result === "string" && parsed.result) return reject(new Error(parsed.result.slice(0, 300)));
      } catch {
        // Not JSON: fall through to the raw output.
      }
      reject(new Error((stderr || stdout).trim().split("\n").slice(-3).join(" ").slice(0, 400) || `exited with ${code}`));
    });
    child.stdin.end(input);
  });
}

/**
 * Ask the user's own Claude Code or Codex CLI for JSON matching `schema`. No
 * tools are enabled and the working directory is empty, so email text can
 * only influence the answer, never act.
 */
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export interface AiFile {
  name: string;
  data: Buffer;
}

export async function runStructured(provider: Exclude<AiProvider, "off">, model: string, prompt: string, schema: object, signal?: AbortSignal, reasoning = "low", files: AiFile[] = []): Promise<unknown> {
  // Codex takes "none" (no reasoning, fastest); Claude's lowest is "low". "ultra" maps to "max".
  const effort = EFFORTS.has(reasoning) ? reasoning : reasoning === "none" ? (provider === "codex" ? "none" : "low") : "max";
  const dir = await mkdtemp(join(tmpdir(), "bb-mail-ai-"));
  try {
    // Files the model should look at (images) go into its empty working directory.
    const paths: string[] = [];
    for (const [index, file] of files.entries()) {
      const safe = `${index + 1}-${file.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
      await writeFile(join(dir, safe), file.data);
      paths.push(join(dir, safe));
    }
    if (paths.length) prompt = `${prompt}\n\nFiles to look at (in your working directory): ${paths.map((path) => path.split("/").pop()).join(", ")}`;
    if (provider === "claude") {
      const binary = await resolveBinary("claude");
      if (!binary) throw new Error("The claude CLI was not found on this machine.");
      // Read is enabled only to open the files placed in the empty working directory.
      const args = ["-p", "--output-format", "json", "--tools", paths.length ? "Read" : "", "--no-session-persistence", "--json-schema", JSON.stringify(schema)];
      if (model) args.push("--model", model);
      args.push("--effort", effort);
      const output = JSON.parse(await run(binary, args, prompt, dir, signal)) as { structured_output?: unknown; result?: string; is_error?: boolean };
      if (output.is_error) throw new Error(String(output.result ?? "Claude returned an error."));
      return output.structured_output ?? JSON.parse(String(output.result));
    }
    const binary = await resolveBinary("codex");
    if (!binary) throw new Error("The codex CLI was not found on this machine.");
    const schemaFile = join(dir, "schema.json");
    const outFile = join(dir, "out.json");
    await writeFile(schemaFile, JSON.stringify(schema));
    const args = ["exec", "--ephemeral", "--skip-git-repo-check", "-s", "read-only", "-C", dir, "--output-schema", schemaFile, "-o", outFile, "-c", `model_reasoning_effort="${effort}"`];
    if (model) args.push("-m", model);
    for (const path of paths) args.push(`--image=${path}`);
    args.push("-");
    await run(binary, args, prompt, dir, signal);
    return JSON.parse(await readFile(outFile, "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export interface ModelOption {
  id: string;
  name: string;
}

/** Pull `{ model|id, displayName|name }` entries out of BB's provider model listing. */
export function extractModels(value: unknown, providerId?: string): ModelOption[] {
  // Prefer the requested provider's own `models` list when the response nests them.
  if (providerId) {
    let scoped: unknown = null;
    const find = (node: unknown, depth: number) => {
      if (scoped || depth > 6 || node === null || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach((item) => find(item, depth + 1));
      const record = node as Record<string, unknown>;
      if ((record.id === providerId || record.providerId === providerId) && Array.isArray(record.models)) scoped = record.models;
      else Object.values(record).forEach((child) => find(child, depth + 1));
    };
    find(value, 0);
    if (scoped) return extractModels(scoped);
  }
  const found: ModelOption[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 6 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.models)) {
      // A provider entry: look inside it, never list the provider itself.
      visit(record.models, depth + 1);
      return;
    }
    // Models carry `model` or `displayName`; providers (id + name only) are skipped.
    const id = typeof record.model === "string" ? record.model : typeof record.id === "string" && typeof record.displayName === "string" ? record.id : null;
    const name = typeof record.displayName === "string" ? record.displayName : typeof record.name === "string" ? record.name : id;
    if (id && name && !found.some((entry) => entry.id === id)) found.push({ id, name });
    for (const child of Object.values(record)) if (typeof child === "object") visit(child, depth + 1);
  };
  visit(value, 0);
  return found;
}
