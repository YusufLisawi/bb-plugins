#!/usr/bin/env bun
/**
 * farm: renders Remotion compositions in Chrome capture mode (the browser renderer, HTML-in-canvas) across the
 * GPU machines' Chrome windows (default: every machine in workers.json, 3 windows each), and re-renders only what
 * changed. Part of the remotion-render-farm skill; `farm setup` installs it to ~/.local/share/bb-farm.
 *
 *   farm render  <project> <composition> [--preview | --scale 0.5] [--full] [--on this:3,mouad:3] [--props '{…}']
 *                [--props-file f.json] [--mode hic|dom] [--chunk 90] [--slow] [--out file.mp4]
 *   farm preview <project> <composition> …          the same at --scale 0.5 (540p from 1080p)
 *   farm comps   <project>                           the project's compositions (id, frames, fps, size)
 *   farm init    <project> [--root src/Root.tsx#RemotionRoot] [--audio Comp=public/mix.wav]…
 *   farm doctor  [project]                           checks tools, machines, versions, the project
 *   farm health                                      the machines (version, Chrome, busy windows)
 *   farm setup   [--chrome path] [--windows 3] [--bind ip,ip]   install or update this machine (worker + API)
 *   farm update                                      setup, then the runtime on every other machine
 *   farm machine add <name> <user@host> [--windows 3] [--chrome path] [--bind ip] | remove <name> | list
 *   farm serve   [--bind 127.0.0.1,100.x.y.z] [--port 7800]   the local API (installed as bb-farm-api)
 *
 * A render, step by step (each step skips what hasn't changed):
 *  1. build: the farm page with the project's Root (<project>/.farm/dist), shipped to machines that lack it;
 *  2. probe: the composition's frames, fps and size;
 *  3. scan: every frame fingerprinted without drawing it (page/frame-scan.tsx), across every window;
 *  4. render: only the 3-second chunks whose fingerprint isn't in this size's cache (<project>/out/farm/cache/);
 *  5. join: every chunk stream-copied with its exact length, plus the sound (farm.json "audio" file, or the
 *     composition's own sound rendered once and cached by its fingerprint) → <project>/out/farm/<comp>@<size>.mp4.
 * stdout: one JSON status; stderr: progress. Config: ~/.config/bb-farm/{token,workers.json}; data: ~/.cache/bb-farm.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

const HOME = homedir();
const INSTALL = join(HOME, ".local/share/bb-farm");
const CONF = join(HOME, ".config/bb-farm");
const DATA = join(HOME, ".cache/bb-farm");
const HERE = import.meta.dir;
const MIN_REMOTION = "4.0.539"; // tested: @remotion/web-renderer with allowHtmlInCanvas
const CHROME_FOR_TESTING = "155.0.8059.84"; // tested; Chrome capture needs Chrome 148 or newer
const RUNTIME_FILES = ["farm.ts", "worker.ts", "build-page.ts", "package.json", "page/index.html", "page/farm-page.tsx", "page/frame-scan.tsx"];

const hash = (s: string | Buffer) => createHash("sha256").update(s).digest("hex").slice(0, 24);
const runtimeVersion = (dir: string) => hash(RUNTIME_FILES.map((f) => readFileSync(join(dir, f), "utf8")).join("\0")).slice(0, 12);
const VERSION = existsSync(join(HERE, "VERSION")) ? readFileSync(join(HERE, "VERSION"), "utf8").trim() : runtimeVersion(HERE);
const log = (s: string) => process.stderr.write(`${s}\n`);
const token = () => readFileSync(join(CONF, "token"), "utf8").trim();
const auth = () => ({ authorization: `Bearer ${token()}` });

const sh = (cmd: string[], cwd?: string, input?: string) => {
  const r = Bun.spawnSync(cmd, { cwd, stdin: input === undefined ? "ignore" : new TextEncoder().encode(input), stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${cmd.slice(0, 3).join(" ")} failed: ${(r.stderr.toString() || r.stdout.toString()).trim().slice(-600)}`);
  return r.stdout.toString();
};
const has = (bin: string) => Bun.spawnSync(["sh", "-c", `command -v ${bin}`]).exitCode === 0;
const ssh = (target: string, cmd: string, input?: string) => sh(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", target, cmd], undefined, input);
const clock = (frame: number, fps: number) => {
  const s = frame / fps;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};
const semver = (v: string) => v.split(/[.-]/).slice(0, 3).map(Number);
const atLeast = (v: string, min: string) => {
  const [a, b] = [semver(v), semver(min)];
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
};
const readJson = <T,>(f: string, fallback: T): T => (existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as T) : fallback);

/** Every request has a deadline and is retried: a stalled connection to another machine must never hang a render.
 *  Fresh connections each time (a reused keep-alive connection to the other machine once stalled for good). */
const call = async (url: string, init: RequestInit = {}, ms = 15000, tries = 4): Promise<Response> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, { ...init, keepalive: false, headers: { ...auth(), connection: "close", ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(ms) });
    } catch (e) {
      if (attempt >= tries) throw e;
      await Bun.sleep(500 * attempt);
    }
  }
};

/** Large files come through curl: Bun's fetch once stalled for good on a 58 MB chunk from another machine.
 *  The token goes in through stdin, never on the command line. */
const download = async (url: string, file: string) => {
  for (let attempt = 1; ; attempt++) {
    const p = Bun.spawn(["curl", "-sS", "--fail", "--max-time", "600", "--retry", "2", "-K", "-", "-o", file, url], { stdin: "pipe", stdout: "ignore", stderr: "pipe" });
    p.stdin.write(`header = "Authorization: Bearer ${token()}"\n`);
    p.stdin.end();
    if ((await p.exited) === 0) return;
    if (attempt >= 3) throw new Error(`download failed: ${await new Response(p.stderr).text()}`);
  }
};

/* ── machines ── */
type Worker = { name: string; url: string; windows: number; ssh?: string };
const WORKERS_FILE = join(CONF, "workers.json");
const loadWorkers = () => readJson<Worker[]>(WORKERS_FILE, []);
const saveWorkers = (ws: Worker[]) => {
  mkdirSync(CONF, { recursive: true });
  writeFileSync(WORKERS_FILE, `[\n${ws.map((w) => `  ${JSON.stringify(w)}`).join(",\n")}\n]\n`);
};
const parseOn = (on?: string): Worker[] => {
  const all = loadWorkers();
  if (!all.length) throw new Error("no machines: run `farm setup` (and `farm machine add` for the others)");
  if (!on) return all;
  return on.split(",").map((part) => {
    const [name, n] = part.split(":");
    const w = all.find((x) => x.name === name);
    if (!w) throw new Error(`no machine named ${name}; known: ${all.map((x) => x.name).join(", ")}`);
    return { ...w, windows: n ? Number(n) : w.windows };
  });
};
type Health = { name: string; ok: boolean; version?: string; chromeFound?: boolean; busy?: number; max?: number; host?: string; error?: string };
const health = async (ws = loadWorkers()): Promise<Health[]> =>
  Promise.all(
    ws.map(async (w) => {
      try {
        const r = await call(`${w.url}/health`, {}, 5000, 2);
        if (!r.ok) return { name: w.name, ok: false, error: `HTTP ${r.status}` };
        const h = (await r.json()) as Omit<Health, "name" | "ok">;
        const error = !h.chromeFound ? "Chrome not found" : h.version !== VERSION ? `runtime ${h.version}, this is ${VERSION}: run farm update` : undefined;
        return { name: w.name, ok: !error, ...h, error };
      } catch (e) {
        return { name: w.name, ok: false, error: String(e).slice(0, 200) };
      }
    }),
  );

/* ── projects ── */
type FarmJson = { root: string; public?: string; audio?: Record<string, string>; watch?: string[] };
type Project = { dir: string; key: string; cfg: FarmJson; out: string };
const DEFAULT_WATCH = ["src", "public", "package.json", "bun.lock", "bun.lockb", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "vite.config.ts", "vite.config.js", "vite.config.mts", "tsconfig.json"];
const SOURCE = /\.(tsx|ts|jsx|js|mjs)$/;

/** The file and export of the Root that registerRoot() receives, read from the project's entry. */
const detectRoot = (dir: string) => {
  const files: string[] = [];
  const walk = (d: string, depth: number) => {
    if (depth > 4 || !existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      if (e.isDirectory()) walk(join(d, e.name), depth + 1);
      else if (SOURCE.test(e.name)) files.push(join(d, e.name));
    }
  };
  walk(join(dir, "src"), 0);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const m = text.match(/registerRoot\(\s*([A-Za-z_$][\w$]*)\s*\)/);
    if (!m) continue;
    const name = m[1];
    for (const im of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
      for (const part of im[1].split(",")) {
        const [orig, alias] = part.trim().split(/\s+as\s+/);
        if ((alias ?? orig) !== name) continue;
        const file = resolveModule(dirname(f), im[2]);
        if (file) return { root: `${relative(dir, file)}#${orig}`, entry: relative(dir, f) };
      }
    }
    const def = text.match(new RegExp(`import\\s+${name}\\s+from\\s*["']([^"']+)["']`));
    if (def) {
      const file = resolveModule(dirname(f), def[1]);
      if (file) return { root: `${relative(dir, file)}#default`, entry: relative(dir, f) };
    }
    throw new Error(`${relative(dir, f)} registers ${name} from the same file: move the Root to its own module or pass --root file#Export`);
  }
  throw new Error("no registerRoot() under src/: pass --root src/Root.tsx#RemotionRoot");
};
const resolveModule = (from: string, spec: string) => {
  if (!spec.startsWith(".")) return null;
  const base = resolve(from, spec);
  for (const c of [base, ...[".tsx", ".ts", ".jsx", ".js"].map((x) => base + x), ...["index.tsx", "index.ts", "index.jsx", "index.js"].map((x) => join(base, x))]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
};

const projectKey = (dir: string) => `${basename(dir).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${hash(dir).slice(0, 8)}`;
const loadProject = (dirArg: string, autoInit = true): Project => {
  const dir = resolve(dirArg);
  if (!existsSync(join(dir, "package.json"))) throw new Error(`${dir} is not a project (no package.json)`);
  if (!existsSync(join(dir, "farm.json"))) {
    if (!autoInit) throw new Error(`${dir} has no farm.json: run farm init ${dir}`);
    init(dir, {});
  }
  const cfg = readJson<FarmJson>(join(dir, "farm.json"), { root: "" });
  return { dir, key: projectKey(dir), cfg, out: join(dir, "out/farm") };
};

const init = (dir: string, opts: { root?: string; audio?: string[] }) => {
  const file = join(dir, "farm.json");
  const cfg = readJson<FarmJson>(file, { root: "" });
  cfg.root = opts.root ?? (cfg.root || detectRoot(dir).root);
  if (existsSync(join(dir, "public"))) cfg.public ??= "public";
  for (const a of opts.audio ?? []) {
    const [comp, path] = a.split("=");
    if (!comp || !path || !existsSync(join(dir, path))) throw new Error(`--audio ${a}: expected Composition=path/to/sound (relative to the project)`);
    (cfg.audio ??= {})[comp] = path;
  }
  writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
  const gi = join(dir, ".gitignore");
  if (existsSync(gi) && !readFileSync(gi, "utf8").split("\n").some((l) => l.trim() === ".farm/" || l.trim() === ".farm")) writeFileSync(gi, `${readFileSync(gi, "utf8").replace(/\n?$/, "\n")}.farm/\n`);
  log(`farm.json: root ${cfg.root}${cfg.audio ? `, sound ${JSON.stringify(cfg.audio)}` : ""}`);
  return cfg;
};

const pkgVersion = (dir: string, name: string) => readJson<{ version?: string }>(join(dir, "node_modules", name, "package.json"), {}).version ?? null;
type Check = { check: string; ok: boolean; detail: string; fix?: string };
const projectChecks = (dir: string): Check[] => {
  const out: Check[] = [];
  const cfg = readJson<FarmJson | null>(join(dir, "farm.json"), null);
  out.push({ check: "farm.json", ok: !!cfg?.root, detail: cfg?.root ? `root ${cfg.root}` : "missing", fix: cfg?.root ? undefined : `farm init ${dir}` });
  if (cfg?.root) {
    const [f, name] = cfg.root.split("#");
    const text = existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null;
    const exported = !!text && (name === "default" ? /export\s+default/.test(text) : new RegExp(`export\\s+(const|function|let|var)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b`).test(text));
    out.push({ check: "Root", ok: exported, detail: text ? (exported ? `${name} exported from ${f}` : `${f} doesn't export ${name}`) : `${f} not found` });
    for (const [comp, p] of Object.entries(cfg.audio ?? {})) out.push({ check: `sound of ${comp}`, ok: existsSync(join(dir, p)), detail: p });
  }
  const rv = pkgVersion(dir, "remotion");
  const wv = pkgVersion(dir, "@remotion/web-renderer");
  out.push({ check: "remotion", ok: !!rv && atLeast(rv, MIN_REMOTION), detail: rv ?? "not installed", fix: rv && atLeast(rv, MIN_REMOTION) ? undefined : `upgrade every @remotion/* package and remotion to ${MIN_REMOTION} or newer (same version for all)` });
  out.push({ check: "@remotion/web-renderer", ok: !!wv && wv === rv, detail: wv ?? "not installed", fix: wv === rv ? undefined : `bun add @remotion/web-renderer@${rv ?? MIN_REMOTION}` });
  out.push({ check: "react-dom", ok: !!pkgVersion(dir, "react-dom"), detail: pkgVersion(dir, "react-dom") ?? "not installed" });
  const vite = pkgVersion(dir, "vite") ?? (existsSync(join(HERE, "node_modules/vite")) ? `${pkgVersion(HERE, "vite")} (the farm's)` : null);
  out.push({ check: "vite", ok: !!vite, detail: vite ?? "missing", fix: vite ? undefined : "farm setup (installs the farm's own Vite)" });
  return out;
};

/* ── 1. build ── */
const newest = (p: string): number => {
  const st = statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  let m = st.mtimeMs;
  for (const e of readdirSync(p)) if (e !== "node_modules" && e !== ".farm" && e !== "out") m = Math.max(m, newest(join(p, e)));
  return m;
};

/** Rebuilds the project's page when a watched file is newer than the build (or the runtime changed), registers the
 *  build with this machine's worker and ships it to every other machine in use that lacks it. Returns its id. */
const ensureBuild = async (P: Project, workers: Worker[]) => {
  const dist = join(P.dir, ".farm/dist");
  const stamp = join(dist, "__assets.json");
  const meta = readJson<{ runtime?: string; root?: string }>(join(dist, "__farm.json"), {});
  const watch = (P.cfg.watch ?? DEFAULT_WATCH).map((w) => join(P.dir, w)).filter(existsSync);
  const stale = !existsSync(stamp) || meta.runtime !== VERSION || meta.root !== P.cfg.root || watch.some((p) => newest(p) > statSync(stamp).mtimeMs);
  if (stale) {
    const [file, name] = P.cfg.root.split("#");
    sh([process.execPath, join(HERE, "build-page.ts"), P.dir, file, name ?? "default", P.cfg.public ?? "public", VERSION], HERE);
  }
  const id = Bun.hash(readFileSync(stamp)).toString(36);
  const pub = resolve(P.dir, P.cfg.public ?? "public");
  mkdirSync(pub, { recursive: true });
  // this machine: a copy of the page, the project's files where they are
  const local = join(DATA, "builds", id);
  if (!existsSync(join(local, "build.json"))) {
    mkdirSync(local, { recursive: true });
    cpSync(dist, join(local, "dist"), { recursive: true });
    writeFileSync(join(local, "build.json"), JSON.stringify({ public: pub, project: P.dir }));
  }
  // other machines: the page and the project's public/ (rsync: only the files that changed)
  for (const w of workers.filter((x) => x.ssh)) {
    if ((await call(`${w.url}/builds/${id}`, {}, 5000)).ok) continue;
    const base = `.cache/bb-farm`;
    ssh(w.ssh!, `mkdir -p ${base}/builds/${id} ${base}/projects/${P.key}`);
    sh(["rsync", "-a", "--delete", `${dist}/`, `${w.ssh}:${base}/builds/${id}/dist/`]);
    sh(["rsync", "-a", "--delete", `${pub}/`, `${w.ssh}:${base}/projects/${P.key}/public/`]);
    ssh(w.ssh!, `cat > ${base}/builds/${id}/build.json`, JSON.stringify({ public: `projects/${P.key}/public`, project: P.dir }));
    if (!(await call(`${w.url}/builds/${id}`, {}, 5000)).ok) throw new Error(`${w.name} doesn't see build ${id} after shipping it`);
  }
  return { id, rebuilt: stale };
};

/* ── worker jobs ── */
type Output = { name: string; from: number; to: number; frames: number; seconds: number };
type JobState = { state: string; frames: number; seconds: number; files?: Output[]; error?: string };
const runJob = async (w: Worker, job: string, build: string, query: string[], fast = true): Promise<JobState> => {
  const until = Date.now() + 10 * 60e3;
  for (;;) {
    const post = await call(`${w.url}/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: job, build, query: query.join("&"), fast }) });
    if (post.status === 429 && Date.now() < until) {
      await Bun.sleep(1000); // another render holds the windows
      continue;
    }
    if (!post.ok) throw new Error(`${w.name}: ${post.status} ${await post.text()}`);
    break;
  }
  for (;;) {
    await Bun.sleep(150);
    const s = (await (await call(`${w.url}/jobs/${job}`)).json()) as JobState;
    if (s.state === "running") continue;
    if (s.state !== "done" || !s.files?.length) {
      await call(`${w.url}/jobs/${job}`, { method: "DELETE" }).catch(() => undefined);
      throw new Error(`${w.name}: ${s.error ?? "no files"}`);
    }
    return s;
  }
};
const fetchJson = async <T,>(w: Worker, name: string) => (await (await call(`${w.url}/files/${name}`, {}, 60000)).json()) as T;
const b64 = (props: Record<string, unknown>) => (Object.keys(props).length ? Buffer.from(JSON.stringify(props)).toString("base64url") : "");
const compQuery = (comp: string, props: Record<string, unknown>) => [`comp=${comp}`, ...(b64(props) ? [`props=${b64(props)}`] : [])];

/* ── 2. probe ── */
type Meta = { id: string; durationInFrames: number; fps: number; width: number; height: number; still: boolean; dynamic?: boolean };
const probe = async (w: Worker, build: string, query: string[], tag: string) => {
  const job = `${tag}-p`;
  const s = await runJob(w, job, build, ["probe=1", ...query]);
  const list = await fetchJson<Meta[]>(w, s.files![0].name);
  await call(`${w.url}/jobs/${job}`, { method: "DELETE" });
  return list;
};

/* ── 3. scan ── */
type Scan = { build?: string; props?: string; withAudio?: boolean; fps: string[]; audio: string[]; ms: number[] | null };
/** Fingerprints every frame across every window. The parts cost the same to scan, by what each frame cost last time
 *  (a busy scene takes three times as long as a quiet one); equal frames on the first scan. */
const scan = async (meta: Meta, workers: Worker[], build: string, query: string[], tag: string, last: Scan | null): Promise<Scan> => {
  const frames = meta.durationInFrames;
  const windows = workers.flatMap((w) => Array.from({ length: w.windows }, () => w));
  const n = Math.max(1, Math.min(windows.length, Math.ceil(frames / 300)));
  const cost = (f: number) => (last?.ms?.length === frames ? last.ms[f] + 0.05 : 1);
  let total = 0;
  for (let f = 0; f < frames; f++) total += cost(f);
  const parts: [number, number][] = [];
  for (let f = 0, acc = 0, start = 0; f < frames; f++) {
    acc += cost(f);
    if (parts.length < n - 1 && acc >= (total * (parts.length + 1)) / n) {
      parts.push([start, f]);
      start = f + 1;
    }
    if (f === frames - 1) parts.push([start, f]);
  }
  const results = await Promise.all(
    parts.map(async ([a, b], i) => {
      const w = windows[i];
      for (let attempt = 0; ; attempt++) {
        const job = `${tag}-s${i}-${attempt}`;
        try {
          const s = await runJob(w, job, build, [...query, `scan=${a}-${b}`]);
          const part = await fetchJson<{ fps: string[]; audio: string[]; ms: number[] }>(w, s.files![0].name);
          await call(`${w.url}/jobs/${job}`, { method: "DELETE" });
          if (part.fps.length !== b - a + 1) throw new Error(`scan of ${a}–${b} returned ${part.fps.length} frames`);
          return part;
        } catch (e) {
          if (attempt >= 2) throw e;
        }
      }
    }),
  );
  return { fps: results.flatMap((r) => r.fps), audio: results.flatMap((r) => r.audio), ms: results.flatMap((r) => r.ms) };
};

const changedRanges = (before: string[] | null, after: string[], fps: number) => {
  const out: { from: number; to: number; at: string }[] = [];
  let frames = 0;
  for (let f = 0; f < after.length; f++) {
    if (before && before[f] === after[f]) continue;
    frames++;
    const last = out[out.length - 1];
    if (last && last.to === f - 1) last.to = f;
    else out.push({ from: f, to: f, at: "" });
  }
  for (const r of out) r.at = `${clock(r.from, fps)}–${clock(r.to + 1, fps)}`;
  return { ranges: out, frames };
};

/** Sound as AAC, encoded once per content and kind: the join then only copies streams. Previews take the fast coder
 *  (2.8 s for 3.5 minutes instead of 9.4 s); full-size renders the default coder at 320 kbps. */
const encodeAudio = (input: string[], file: string, preview: boolean) => {
  sh(["ffmpeg", "-hide_banner", "-v", "error", "-y", ...input, "-vn", "-c:a", "aac", ...(preview ? ["-aac_coder", "fast", "-b:a", "256k"] : ["-b:a", "320k"]), `${file}.part.m4a`]);
  renameSync(`${file}.part.m4a`, file);
};

/* ── one render at a time on this machine (CLI and API alike): they share the windows and the caches ── */
const LOCK = join(DATA, "render.lock");
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const withLock = async <T,>(fn: () => Promise<T>, onWait?: () => void): Promise<T> => {
  mkdirSync(DATA, { recursive: true });
  for (let told = false; ; ) {
    try {
      writeFileSync(LOCK, String(process.pid), { flag: "wx" });
      break;
    } catch {
      const pid = Number(readFileSync(LOCK, "utf8"));
      if (!pid || !alive(pid) || pid === process.pid) {
        if (pid === process.pid) break;
        rmSync(LOCK, { force: true });
        continue;
      }
      if (!told) (onWait?.(), (told = true));
      await Bun.sleep(500);
    }
  }
  try {
    return await fn();
  } finally {
    rmSync(LOCK, { force: true });
  }
};

/* ── the render ── */
export type RenderOpts = { scale?: number; on?: string; full?: boolean; chunk?: number; slow?: boolean; out?: string; props?: Record<string, unknown>; mode?: "hic" | "dom"; status?: Status };
export type Status = {
  id: string;
  project: string;
  comp: string;
  scale: number;
  state: "waiting" | "building" | "probing" | "scanning" | "rendering" | "joining" | "done" | "failed";
  started: number;
  machines?: { name: string; windows: number }[];
  skipped?: { name: string; error?: string }[];
  size?: string;
  chunks: number;
  toRender: number;
  done: number;
  /** frames whose picture changed since this video's last render */
  changed?: { from: number; to: number; at: string }[];
  changedFrames?: number;
  sound?: string;
  soundChunks?: number;
  timings?: Record<string, number>;
  seconds?: number;
  out?: string;
  error?: string;
  byWorker?: Record<string, { chunks: number; frames: number; renderSeconds: number }>;
};

export const render = async (dirArg: string, comp: string, opts: RenderOpts = {}) => {
  const P = loadProject(dirArg);
  const scale = opts.scale ?? 1;
  if (!(scale > 0 && scale <= 1)) throw new Error("--scale must be between 0 and 1");
  const props = opts.props ?? {};
  const id = opts.status?.id ?? `r${Date.now().toString(36)}`;
  const status: Status = opts.status ?? { id, project: P.dir, comp, scale, state: "waiting", started: Date.now(), chunks: 0, toRender: 0, done: 0 };
  return withLock(async () => {
    const t0 = performance.now();
    let t = t0;
    const timings: Record<string, number> = {};
    const lap = (k: string) => {
      timings[k] = Math.round((performance.now() - t) / 100) / 10;
      t = performance.now();
    };

    // the machines that answer, with this runtime
    const asked = parseOn(opts.on);
    const hs = await health(asked);
    const workers = asked.filter((w) => hs.find((h) => h.name === w.name)?.ok);
    status.skipped = hs.filter((h) => !h.ok).map((h) => ({ name: h.name, error: h.error }));
    for (const s of status.skipped) log(`skipping ${s.name}: ${s.error}`);
    if (!workers.length) throw new Error("no machine is available (farm health)");
    status.machines = workers.map((w) => ({ name: w.name, windows: w.windows }));
    const slots = workers.reduce((n, w) => n + w.windows, 0);

    // 1. build
    status.state = "building";
    const build = await ensureBuild(P, workers);
    lap("build");

    // 2. probe (the build and the props decide it)
    status.state = "probing";
    const cacheRoot = join(P.out, "cache");
    mkdirSync(cacheRoot, { recursive: true });
    const query = compQuery(comp, props);
    const propsKey = hash(JSON.stringify(props)).slice(0, 8);
    const probeFile = join(cacheRoot, `${comp}.probe.json`);
    let probed = readJson<{ build?: string; props?: string; meta?: Meta }>(probeFile, {});
    if (probed.build !== build.id || probed.props !== propsKey || !probed.meta) {
      probed = { build: build.id, props: propsKey, meta: (await probe(workers[0], build.id, query, id))[0] };
      writeFileSync(probeFile, JSON.stringify(probed));
    }
    const meta = probed.meta!;
    if (meta.still) throw new Error(`${comp} is a still: the farm renders videos`);
    const w = Math.round(meta.width * scale);
    const h = Math.round(meta.height * scale);
    if (Math.abs(meta.width * scale - w) > 1e-6 || Math.abs(meta.height * scale - h) > 1e-6 || w % 2 || h % 2) throw new Error(`--scale ${scale} makes ${meta.width * scale}×${meta.height * scale}: pick a scale that gives even whole pixels (0.5, 0.25)`);
    const tag = `${Math.min(w, h)}p`;
    status.size = `${w}×${h}`;
    lap("probe");

    // 3. scan (the build and the props decide it too). The sound is fingerprinted only when it comes from the
    //    composition (that extracts every frame's samples); farm.json's sound file needs no scan.
    status.state = "scanning";
    const configured = P.cfg.audio?.[comp];
    const withAudio = !configured;
    const scanFile = join(cacheRoot, `${comp}.scan.json`);
    const last = readJson<Scan | null>(scanFile, null);
    const fresh = last?.build === build.id && last.props === propsKey && last.withAudio === withAudio && last.fps.length === meta.durationInFrames;
    const scanned: Scan = fresh ? last! : { build: build.id, props: propsKey, withAudio, ...(await scan(meta, workers, build.id, withAudio ? [...query, "audio=1"] : query, id, last)) };
    if (scanned !== last) writeFileSync(scanFile, JSON.stringify(scanned));
    lap("scan");

    // 4. chunks: the fingerprint covers the frames and what else decides the pictures (size, mode, fonts, CSS)
    const mode = opts.mode ?? "hic";
    const chunkSize = opts.chunk ?? Math.max(1, Math.round(3 * meta.fps));
    const cache = join(cacheRoot, `${comp}@${tag}${mode === "dom" ? "-dom" : ""}`);
    mkdirSync(cache, { recursive: true });
    const manifestFile = join(cache, "manifest.json");
    const manifest = readJson<{ frames?: string[]; chunks: Record<string, { fp: string; frames: number; worker: string; seconds: number; at: string }> }>(manifestFile, { chunks: {} });
    const saveManifest = () => writeFileSync(manifestFile, JSON.stringify(manifest));
    const files = readJson<Record<string, string>>(join(P.dir, ".farm/dist/__assets.json"), {});
    const global = hash(JSON.stringify({ scale, mode, fps: meta.fps, w: meta.width, h: meta.height, look: Object.entries(files).filter(([p]) => /\.(woff2?|ttf|otf|css)$/i.test(p)) }));
    const chunks: { a: number; b: number; fp: string }[] = [];
    for (let a = 0; a < meta.durationInFrames; a += chunkSize) {
      const b = Math.min(meta.durationInFrames - 1, a + chunkSize - 1);
      chunks.push({ a, b, fp: hash(global + scanned.fps.slice(a, b + 1).join("")) });
    }
    const fileOf = (c: { a: number; b: number }) => join(cache, `${c.a}-${c.b}.mp4`);
    const todo = chunks.filter((c) => opts.full || manifest.chunks[`${c.a}-${c.b}`]?.fp !== c.fp || !existsSync(fileOf(c)));
    const changes = changedRanges(manifest.frames?.length === meta.durationInFrames ? manifest.frames : null, scanned.fps, meta.fps);
    Object.assign(status, { chunks: chunks.length, toRender: todo.length, done: 0, changed: changes.ranges.slice(0, 40), changedFrames: changes.frames });

    // the sound: farm.json's file; or the composition's own, rendered in the same chunks as the picture (only the
    // chunks whose sound changed) and joined sample-exact as PCM; or none
    const preview = scale < 1;
    const kind = preview ? "-fast" : "";
    let sound: string | null = null;
    type SoundChunk = { a: number; b: number; fp: string; silent: boolean };
    let soundChunks: SoundChunk[] = [];
    let soundTodo: SoundChunk[] = [];
    const soundDir = join(cacheRoot, `${comp}@sound`);
    const soundManifestFile = join(soundDir, "manifest.json");
    const soundManifest = readJson<{ chunks: Record<string, string> }>(soundManifestFile, { chunks: {} });
    const wavOf = (c: { a: number; b: number }) => join(soundDir, `${c.a}-${c.b}.wav`);
    if (configured) {
      const src = join(P.dir, configured);
      sound = join(cacheRoot, `${comp}.audio-${Bun.hash(readFileSync(src)).toString(36)}${kind}.m4a`);
      if (!existsSync(sound)) encodeAudio(["-i", src], sound, preview);
      status.sound = configured;
    } else if (scanned.audio.some(Boolean)) {
      const remotion = pkgVersion(P.dir, "remotion");
      soundChunks = chunks.map((c) => {
        const fr = scanned.audio.slice(c.a, c.b + 1);
        return { a: c.a, b: c.b, silent: !fr.some(Boolean), fp: hash(`${fr.join("")}/${meta.fps}/${remotion}`) };
      });
      sound = join(cacheRoot, `${comp}.audio-${hash(soundChunks.map((c) => (c.silent ? "-" : c.fp)).join("|")).slice(0, 16)}${kind}.m4a`);
      if (!existsSync(sound)) {
        mkdirSync(soundDir, { recursive: true });
        soundTodo = soundChunks.filter((c) => !c.silent && (opts.full || soundManifest.chunks[`${c.a}-${c.b}`] !== c.fp || !existsSync(wavOf(c))));
      }
      status.sound = "the composition's own sound";
    } else status.sound = "none";
    // one encoded sound per kind (preview, full size) is kept
    for (const n of readdirSync(cacheRoot)) if (n.startsWith(`${comp}.audio-`) && n.endsWith(".m4a") && sound && join(cacheRoot, n) !== sound && n.endsWith("-fast.m4a") === preview) rmSync(join(cacheRoot, n), { force: true });

    // consecutive chunks are grouped so one window renders several without restarting Chrome; about two groups a window
    status.state = "rendering";
    const todoFrames = todo.reduce((n, c) => n + c.b - c.a + 1, 0);
    const target = Math.max(chunkSize, Math.ceil(todoFrames / (slots * 2)));
    type Task = { i: number; tries: number; chunks: { a: number; b: number; fp: string }[]; sound?: boolean };
    const queue: Task[] = [];
    for (const [list, isSound] of [[soundTodo, true], [todo, false]] as const)
      for (const c of list) {
        const lastTask = queue[queue.length - 1];
        const end = lastTask?.chunks[lastTask.chunks.length - 1];
        const size = lastTask ? lastTask.chunks.reduce((n, x) => n + x.b - x.a + 1, 0) : 0;
        if (lastTask && !!lastTask.sound === isSound && end && end.b + 1 === c.a && size + (c.b - c.a + 1) <= target) lastTask.chunks.push(c);
        else queue.push({ i: queue.length, tries: 0, chunks: [c], sound: isSound });
      }
    status.soundChunks = soundTodo.length;
    const byWorker: NonNullable<Status["byWorker"]> = {};
    const runTask = async (wk: Worker, task: Task) => {
      const job = `${id}-${task.sound ? "a" : "b"}${task.i}-${task.tries}`;
      if (task.sound) {
        const s = await runJob(wk, job, build.id, [...query, `audioranges=${task.chunks.map((c) => `${c.a}-${c.b}`).join(",")}`], !opts.slow);
        for (const f of s.files!) {
          const c = task.chunks.find((x) => x.a === f.from);
          if (!c) throw new Error(`${wk.name} returned ${f.name} for frames ${f.from}–${f.to}`);
          await download(`${wk.url}/files/${f.name}`, `${wavOf(c)}.part`);
          renameSync(`${wavOf(c)}.part`, wavOf(c));
          soundManifest.chunks[`${c.a}-${c.b}`] = c.fp;
        }
        await call(`${wk.url}/jobs/${job}`, { method: "DELETE" });
        writeFileSync(soundManifestFile, JSON.stringify(soundManifest));
        return;
      }
      const s = await runJob(wk, job, build.id, [...query, `ranges=${task.chunks.map((c) => `${c.a}-${c.b}`).join(",")}`, `mode=${mode}`, ...(scale !== 1 ? [`scale=${scale}`] : [])], !opts.slow);
      for (const f of s.files!) {
        const c = task.chunks.find((x) => x.a === f.from);
        if (!c || f.frames !== c.b - c.a + 1) throw new Error(`${wk.name} returned ${f.name} for frames ${f.from}–${f.to}`);
        await download(`${wk.url}/files/${f.name}`, `${fileOf(c)}.part`);
        renameSync(`${fileOf(c)}.part`, fileOf(c));
        manifest.chunks[`${c.a}-${c.b}`] = { fp: c.fp, frames: f.frames, worker: wk.name, seconds: f.seconds, at: new Date().toISOString() };
        const bw = (byWorker[wk.name] ??= { chunks: 0, frames: 0, renderSeconds: 0 });
        bw.chunks++;
        bw.frames += f.frames;
        bw.renderSeconds = Math.round((bw.renderSeconds + f.seconds) * 10) / 10;
        status.done++;
      }
      await call(`${wk.url}/jobs/${job}`, { method: "DELETE" });
      saveManifest();
      log(`  ${status.done}/${todo.length} chunks`);
    };
    // every window of every machine pulls the next task until none are left
    await Promise.all(
      workers.flatMap((wk) =>
        Array.from({ length: wk.windows }, async () => {
          for (let task = queue.shift(); task; task = queue.shift()) {
            try {
              await runTask(wk, task);
            } catch (e) {
              if (++task.tries > 2) throw e;
              log(`  retrying the ${task.sound ? "sound" : "picture"} of frames ${task.chunks[0].a}–${task.chunks[task.chunks.length - 1].b}: ${String(e).slice(0, 160)}`);
              queue.push(task);
            }
          }
        }),
      ),
    );
    // the composition's sound in one piece: silent chunks as silence of the same format and exact length
    if (sound && !existsSync(sound) && soundChunks.length) {
      const ref = soundChunks.find((c) => !c.silent)!;
      const st = (JSON.parse(sh(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=sample_rate,channels,codec_name", "-of", "json", wavOf(ref)])) as { streams: { sample_rate: string; channels: number; codec_name: string }[] }).streams[0];
      for (const c of soundChunks.filter((x) => x.silent)) {
        if (soundManifest.chunks[`${c.a}-${c.b}`] === "silent" && existsSync(wavOf(c))) continue;
        const samples = Math.round(((c.b - c.a + 1) * Number(st.sample_rate)) / meta.fps);
        sh(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-filter_complex", `anullsrc=r=${st.sample_rate}:cl=${st.channels === 1 ? "mono" : "stereo"},atrim=end_sample=${samples}`, "-c:a", st.codec_name, wavOf(c)]);
        soundManifest.chunks[`${c.a}-${c.b}`] = "silent";
      }
      writeFileSync(soundManifestFile, JSON.stringify(soundManifest));
      const slist = join(soundDir, "list.txt");
      writeFileSync(slist, soundChunks.map((c) => `file '${wavOf(c)}'\n`).join(""));
      encodeAudio(["-f", "concat", "-safe", "0", "-i", slist], sound, preview);
      const keepWav = new Set(soundChunks.map((c) => `${c.a}-${c.b}.wav`));
      for (const n of readdirSync(soundDir)) if (n.endsWith(".wav") && !keepWav.has(n)) rmSync(join(soundDir, n), { force: true });
    }
    lap("render");

    // 5. join: stream copy with each chunk's exact length (the concat demuxer otherwise drops a frame per seam)
    status.state = "joining";
    const list = join(cache, "list.txt");
    writeFileSync(list, chunks.map((c) => `file '${fileOf(c)}'\nduration ${((c.b - c.a + 1) / meta.fps).toFixed(6)}\n`).join(""));
    const out = join(P.out, `${comp}@${tag}${mode === "dom" ? "-dom" : ""}${Object.keys(props).length ? `-${propsKey.slice(0, 6)}` : ""}.mp4`);
    const tmp = `${out}.part.mp4`;
    sh(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, ...(sound ? ["-i", sound, "-map", "0:v", "-map", "1:a", "-shortest"] : ["-map", "0:v"]), "-c", "copy", "-movflags", "+faststart", tmp]);
    const joined = Number(sh(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=nb_frames", "-of", "csv=p=0", tmp]).trim());
    if (joined !== meta.durationInFrames) throw new Error(`joined ${joined} frames, expected ${meta.durationInFrames}`);
    renameSync(tmp, out);
    if (opts.out) copyFileSync(out, resolve(opts.out));
    // chunks of an older grid (another --chunk, another length) are never used again
    const keep = new Set(chunks.map((c) => `${c.a}-${c.b}.mp4`));
    for (const n of readdirSync(cache)) if ((n.endsWith(".mp4") && !keep.has(n)) || n.endsWith(".part")) rmSync(join(cache, n), { force: true });
    for (const k of Object.keys(manifest.chunks)) if (!keep.has(`${k}.mp4`)) delete manifest.chunks[k];
    // every chunk now shows the frames just scanned (a reused chunk has the same fingerprint, so the same frames)
    manifest.frames = scanned.fps;
    saveManifest();
    lap("join");

    Object.assign(status, { state: "done", seconds: Math.round((performance.now() - t0) / 100) / 10, timings, out: opts.out ? resolve(opts.out) : out, byWorker });
    log(`${comp} ${status.size}: ${status.toRender}/${status.chunks} chunks rendered, ${status.changedFrames} frames changed, ${status.seconds} s (${Object.entries(timings).map(([k, v]) => `${k} ${v}`).join(", ")}) → ${status.out}`);
    return status;
  }, () => {
    log("another render is running on this machine: waiting for it");
  });
};

const comps = async (dirArg: string) => {
  const P = loadProject(dirArg);
  const workers = parseOn();
  const hs = await health(workers);
  const ok = workers.filter((w) => hs.find((h) => h.name === w.name)?.ok);
  if (!ok.length) throw new Error("no machine is available (farm health)");
  const local = ok.filter((w) => !w.ssh);
  const use = local.length ? local : ok.slice(0, 1);
  const build = await ensureBuild(P, use);
  return probe(use[0], build.id, [], `c${Date.now().toString(36)}`);
};

/* ── setup: this machine and the others ── */
const findChrome = () => {
  const cft = join(INSTALL, "browsers/chrome");
  const candidates = [
    ...(existsSync(cft) ? readdirSync(cft).sort().reverse().map((d) => join(cft, d, "chrome-linux64/chrome")) : []),
    "/snap/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find(existsSync) ?? null;
};
const chromeMajor = (version: string) => Number(version.match(/(\d+)\.\d+\.\d+/)?.[1] ?? 0);
const unitText = (desc: string, exec: string, env: Record<string, string>) =>
  `[Unit]\nDescription=${desc}\nAfter=network-online.target\n\n[Service]\nWorkingDirectory=%h/.local/share/bb-farm\n${Object.entries(env)
    .map(([k, v]) => `Environment=${k}=${v}\n`)
    .join("")}ExecStart=${exec}\nRestart=always\nRestartSec=3\n\n[Install]\nWantedBy=default.target\n`;

const setup = async (opts: { chrome?: string; windows?: number; bind?: string }) => {
  for (const bin of ["ffmpeg", "ffprobe", "rsync", "curl", "ssh", "systemctl"]) if (!has(bin)) throw new Error(`${bin} is missing on this machine`);
  // the runtime
  mkdirSync(INSTALL, { recursive: true });
  if (resolve(HERE) !== resolve(INSTALL)) sh(["rsync", "-a", "--delete", "--exclude", "node_modules", "--exclude", "browsers", "--exclude", "VERSION", `${HERE}/`, `${INSTALL}/`]);
  if (!existsSync(join(INSTALL, "node_modules/vite"))) sh([process.execPath, "install", "--production"], INSTALL);
  const version = runtimeVersion(INSTALL);
  writeFileSync(join(INSTALL, "VERSION"), `${version}\n`);
  // the token every request carries
  mkdirSync(CONF, { recursive: true });
  if (!existsSync(join(CONF, "token"))) writeFileSync(join(CONF, "token"), randomBytes(32).toString("hex"), { mode: 0o600 });
  chmodSync(join(CONF, "token"), 0o600);
  // Chrome
  let chrome = opts.chrome ?? findChrome();
  if (!chrome) {
    log(`installing Chrome for Testing ${CHROME_FOR_TESTING}`);
    sh([process.execPath, "x", "@puppeteer/browsers", "install", `chrome@${CHROME_FOR_TESTING}`, "--path", join(INSTALL, "browsers")], INSTALL);
    chrome = findChrome();
  }
  if (!chrome) throw new Error("no Chrome found: pass --chrome /path/to/chrome");
  const cv = sh([chrome, "--version"]).trim();
  if (chromeMajor(cv) < 148) throw new Error(`${cv}: Chrome capture needs Chrome 148 or newer`);
  // a snap Chrome can only write in its own folder (see worker.ts)
  const probeDir = chrome.startsWith("/snap/") ? join(HOME, "snap", basename(chrome), "common", "bb-farm-check") : join(DATA, "chrome-check");
  rmSync(probeDir, { recursive: true, force: true });
  const test = Bun.spawnSync([chrome, "--headless=new", "--no-first-run", "--password-store=basic", `--user-data-dir=${probeDir}`, "--dump-dom", "about:blank"], { stdout: "pipe", stderr: "pipe", timeout: 60000 });
  rmSync(probeDir, { recursive: true, force: true });
  const noSandbox = /No usable sandbox/i.test(test.stderr.toString());
  // the services: worker on loopback, API on loopback and the Tailscale address
  const bun = process.execPath;
  const tailscale = has("tailscale") ? (Bun.spawnSync(["tailscale", "ip", "-4"]).stdout.toString().trim().split("\n")[0] ?? "") : "";
  const apiBind = opts.bind ?? ["127.0.0.1", tailscale].filter(Boolean).join(",");
  const units = join(HOME, ".config/systemd/user");
  mkdirSync(units, { recursive: true });
  writeFileSync(join(units, "bb-farm-worker.service"), unitText("Render farm worker: Chrome capture windows on this GPU (remotion-render-farm)", `${bun} %h/.local/share/bb-farm/worker.ts`, { FARM_BIND: "127.0.0.1", FARM_CHROME: chrome, ...(noSandbox ? { FARM_NO_SANDBOX: "1" } : {}) }));
  writeFileSync(join(units, "bb-farm-api.service"), unitText("Render farm API: renders across the machines (remotion-render-farm)", `${bun} %h/.local/share/bb-farm/farm.ts serve --bind ${apiBind} --port 7800`, {}));
  sh(["systemctl", "--user", "daemon-reload"]);
  sh(["systemctl", "--user", "enable", "bb-farm-worker", "bb-farm-api"]);
  sh(["systemctl", "--user", "restart", "bb-farm-worker", "bb-farm-api"]);
  Bun.spawnSync(["loginctl", "enable-linger", process.env.USER ?? ""]);
  // this machine in the list, and `farm` on the PATH
  const ws = loadWorkers();
  const me = ws.find((x) => !x.ssh);
  if (me) me.windows = opts.windows ?? me.windows;
  else ws.unshift({ name: "this", url: "http://127.0.0.1:7801", windows: opts.windows ?? 3 });
  saveWorkers(ws);
  const bin = join(HOME, ".local/bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, "farm"), `#!/bin/sh\nexec "${bun}" "$HOME/.local/share/bb-farm/farm.ts" "$@"\n`, { mode: 0o755 });
  await Bun.sleep(1500);
  return { runtime: INSTALL, version, chrome: cv, sandbox: !noSandbox, api: `${apiBind}:7800`, machines: await health() };
};

const machineAdd = async (name: string, target: string, opts: { windows?: number; chrome?: string; bind?: string }) => {
  if (!/^[a-z0-9-]{1,24}$/.test(name)) throw new Error("machine names: a-z, 0-9 and -");
  ssh(target, "true");
  const bun = ssh(target, 'if [ -x "$HOME/.bun/bin/bun" ]; then echo "$HOME/.bun/bin/bun"; else command -v bun || true; fi').trim();
  if (!bun) throw new Error(`bun is missing on ${target}: install it there (curl -fsSL https://bun.sh/install | bash), then run this again`);
  // the runtime and the token (through stdin, never on a command line)
  ssh(target, "mkdir -p .local/share/bb-farm .config/bb-farm .cache/bb-farm .config/systemd/user");
  sh(["rsync", "-a", "--delete", "--exclude", "node_modules", "--exclude", "browsers", "--exclude", "VERSION", `${HERE}/`, `${target}:.local/share/bb-farm/`]);
  ssh(target, "cat > .local/share/bb-farm/VERSION", `${VERSION}\n`);
  ssh(target, "umask 077 && cat > .config/bb-farm/token", token());
  // Chrome: given, already there, or Chrome for Testing
  let chrome = opts.chrome ?? ssh(target, "ls -d .local/share/bb-farm/browsers/chrome/*/chrome-linux64/chrome 2>/dev/null | sort | tail -1").trim();
  if (!chrome) {
    log(`installing Chrome for Testing ${CHROME_FOR_TESTING} on ${name}`);
    ssh(target, `cd .local/share/bb-farm && ${bun} x @puppeteer/browsers install chrome@${CHROME_FOR_TESTING} --path "$HOME/.local/share/bb-farm/browsers" >/dev/null`);
    chrome = ssh(target, "ls -d .local/share/bb-farm/browsers/chrome/*/chrome-linux64/chrome 2>/dev/null | sort | tail -1").trim();
  }
  if (!chrome) throw new Error(`no Chrome on ${name}: pass --chrome /path/to/chrome`);
  if (!chrome.startsWith("/")) chrome = `${ssh(target, "echo $HOME").trim()}/${chrome}`;
  const cv = ssh(target, `"${chrome}" --version`).trim();
  if (chromeMajor(cv) < 148) throw new Error(`${name}: ${cv}; Chrome capture needs Chrome 148 or newer`);
  const test = ssh(target, `d=$(mktemp -d); "${chrome}" --headless=new --no-first-run --password-store=basic --user-data-dir="$d" --dump-dom about:blank 2>&1 >/dev/null | head -c 4000; rm -rf "$d"; true`);
  const noSandbox = /No usable sandbox/i.test(test);
  // listens on the address this machine reaches it by
  const host = target.split("@").pop()!;
  const bind = opts.bind ?? (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : ssh(target, "tailscale ip -4 2>/dev/null | head -1").trim());
  if (!bind) throw new Error(`can't tell ${name}'s address: pass --bind <ip>`);
  ssh(target, "cat > .config/systemd/user/bb-farm-worker.service", unitText("Render farm worker: Chrome capture windows on this GPU (remotion-render-farm)", `${bun} %h/.local/share/bb-farm/worker.ts`, { FARM_BIND: bind, FARM_CHROME: chrome, ...(noSandbox ? { FARM_NO_SANDBOX: "1" } : {}) }));
  ssh(target, "systemctl --user daemon-reload && systemctl --user enable bb-farm-worker && systemctl --user restart bb-farm-worker; loginctl enable-linger \"$USER\" 2>/dev/null; true");
  const ws = loadWorkers().filter((x) => x.name !== name);
  ws.push({ name, url: `http://${bind}:7801`, windows: opts.windows ?? 3, ssh: target });
  saveWorkers(ws);
  for (let i = 0; i < 20; i++) {
    const [hh] = await health(ws.filter((x) => x.name === name));
    if (hh.ok) return { machine: name, chrome: cv, sandbox: !noSandbox, url: `http://${bind}:7801`, health: hh };
    await Bun.sleep(500);
  }
  throw new Error(`${name} doesn't answer on http://${bind}:7801 (journalctl --user -u bb-farm-worker on ${target})`);
};

const update = async () => {
  const local = await setup({});
  const others = [];
  for (const w of loadWorkers().filter((x) => x.ssh)) {
    sh(["rsync", "-a", "--delete", "--exclude", "node_modules", "--exclude", "browsers", "--exclude", "VERSION", `${INSTALL}/`, `${w.ssh}:.local/share/bb-farm/`]);
    ssh(w.ssh!, "cat > .local/share/bb-farm/VERSION", `${local.version}\n`);
    ssh(w.ssh!, "systemctl --user restart bb-farm-worker");
    others.push(w.name);
  }
  await Bun.sleep(1500);
  return { version: local.version, updated: ["this", ...others], machines: await health() };
};

const doctor = async (project?: string) => {
  const checks: Check[] = [];
  checks.push({ check: "runtime", ok: existsSync(join(INSTALL, "VERSION")), detail: existsSync(join(INSTALL, "VERSION")) ? `${INSTALL} (${readFileSync(join(INSTALL, "VERSION"), "utf8").trim()})` : "not installed", fix: "farm setup" });
  for (const bin of ["ffmpeg", "ffprobe", "rsync", "curl"]) checks.push({ check: bin, ok: has(bin), detail: has(bin) ? "found" : "missing" });
  checks.push({ check: "token", ok: existsSync(join(CONF, "token")), detail: join(CONF, "token"), fix: "farm setup" });
  if (existsSync(join(CONF, "token"))) for (const hh of await health()) checks.push({ check: `machine ${hh.name}`, ok: hh.ok, detail: hh.ok ? `${hh.host}, ${hh.busy}/${hh.max} windows busy` : (hh.error ?? "down"), fix: hh.ok ? undefined : "farm update (or farm machine add again)" });
  if (project) checks.push(...projectChecks(resolve(project)));
  for (const c of checks) log(`${c.ok ? "ok  " : "FAIL"} ${c.check}: ${c.detail}${!c.ok && c.fix ? `  → ${c.fix}` : ""}`);
  return { ok: checks.every((c) => c.ok), checks };
};

/* ── the API ── */
const serve = (binds: string[], port: number) => {
  const renders = new Map<string, Status>();
  let line: Promise<unknown> = Promise.resolve();
  const ok = (req: Request) => {
    const got = Buffer.from(req.headers.get("authorization") ?? "");
    const want = Buffer.from(`Bearer ${token()}`);
    return got.length === want.length && timingSafeEqual(got, want);
  };
  const projectOf = (p: unknown) => {
    if (typeof p !== "string" || !p.startsWith("/") || !existsSync(join(p, "farm.json"))) throw new Error("project must be an absolute path to a folder with farm.json (farm init)");
    return p;
  };
  const handler = async (req: Request) => {
    if (!ok(req)) return new Response("unauthorized", { status: 401 });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/health") return Response.json({ version: VERSION, machines: await health() });
      if (url.pathname === "/comps") return Response.json(await comps(projectOf(url.searchParams.get("project"))));
      if (url.pathname === "/renders" && req.method === "POST") {
        const body = (await req.json().catch(() => null)) as { project?: string; comp?: string; preview?: boolean; scale?: number; full?: boolean; on?: string; props?: Record<string, unknown>; chunk?: number; mode?: "hic" | "dom" } | null;
        if (!body?.comp || !/^[A-Za-z0-9_-]+$/.test(body.comp)) return new Response("comp missing", { status: 400 });
        const project = projectOf(body.project);
        const status: Status = { id: `r${Date.now().toString(36)}`, project, comp: body.comp, scale: body.scale ?? (body.preview ? 0.5 : 1), state: "waiting", started: Date.now(), chunks: 0, toRender: 0, done: 0 };
        renders.set(status.id, status);
        line = line.then(() => render(project, body.comp!, { scale: status.scale, full: body.full, on: body.on, props: body.props, chunk: body.chunk, mode: body.mode, status }).catch((e) => Object.assign(status, { state: "failed", error: String(e) })));
        return Response.json({ id: status.id });
      }
      const m = url.pathname.match(/^\/renders\/(r[a-z0-9]+)(\/video)?$/);
      const s = m ? renders.get(m[1]) : undefined;
      if (s && !m![2]) return Response.json(s);
      if (s && m![2] && s.state === "done" && s.out && existsSync(s.out)) return new Response(Bun.file(s.out), { headers: { "content-type": "video/mp4" } });
      return new Response("not found", { status: 404 });
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 400 });
    }
  };
  for (const hostname of binds) Bun.serve({ hostname, port, fetch: handler, idleTimeout: 120 });
  log(`render farm API ${VERSION} on ${binds.map((b) => `${b}:${port}`).join(", ")}`);
};

/* ── command line ── */
const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const flags = (name: string) => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] ? [argv[i + 1]] : []));
const num = (name: string) => (flag(name) !== undefined ? Number(flag(name)) : undefined);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--full", "--slow", "--preview", "--json"].includes(argv[i - 1])));
const print = (x: unknown) => console.log(JSON.stringify(x, null, 1));
const USAGE = `usage:
  farm render  <project> <composition> [--preview | --scale 0.5] [--full] [--on this:3,mouad:3] [--props '{…}'] [--mode hic|dom] [--out f.mp4]
  farm preview <project> <composition> [same options]
  farm comps   <project>
  farm init    <project> [--root src/Root.tsx#RemotionRoot] [--audio Comp=public/mix.wav]
  farm doctor  [project]
  farm health
  farm setup   [--chrome path] [--windows 3] [--bind ip,ip]
  farm update
  farm machine add <name> <user@host> [--windows 3] [--chrome path] [--bind ip] | remove <name> | list
  farm serve   [--bind 127.0.0.1,100.x.y.z] [--port 7800]`;

const main = async () => {
  const [cmd, a, b] = positional;
  const props = flag("props-file") ? JSON.parse(readFileSync(flag("props-file")!, "utf8")) : flag("props") ? JSON.parse(flag("props")!) : undefined;
  const mode = flag("mode") === "dom" ? "dom" : undefined;
  switch (cmd) {
    case "render":
    case "preview": {
      if (!a || !b) throw new Error(USAGE);
      const scale = num("scale") ?? (cmd === "preview" || argv.includes("--preview") ? 0.5 : 1);
      return print(await render(a, b, { scale, full: argv.includes("--full"), on: flag("on"), chunk: num("chunk"), slow: argv.includes("--slow"), out: flag("out"), props, mode }));
    }
    case "comps":
      if (!a) throw new Error(USAGE);
      return print(await comps(a));
    case "init":
      if (!a) throw new Error(USAGE);
      init(resolve(a), { root: flag("root"), audio: flags("audio") });
      return print(await doctor(a));
    case "doctor": {
      const r = await doctor(a);
      print(r);
      if (!r.ok) process.exitCode = 1;
      return;
    }
    case "health":
    case "machines":
      return print(await health());
    case "setup":
      return print(await setup({ chrome: flag("chrome"), windows: num("windows"), bind: flag("bind") }));
    case "update":
      return print(await update());
    case "machine":
      if (a === "add" && b && positional[3]) return print(await machineAdd(b, positional[3], { windows: num("windows"), chrome: flag("chrome"), bind: flag("bind") }));
      if (a === "remove" && b) {
        saveWorkers(loadWorkers().filter((x) => x.name !== b));
        return print(loadWorkers());
      }
      if (a === "list") return print(loadWorkers());
      throw new Error(USAGE);
    case "serve":
      return serve((flag("bind") ?? "127.0.0.1").split(","), Number(flag("port") ?? 7800));
    default:
      console.log(USAGE);
  }
};

await main().catch((e) => {
  log(`farm: ${e instanceof Error ? e.message : String(e)}`);
  print({ state: "failed", error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
