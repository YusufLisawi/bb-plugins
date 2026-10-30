#!/usr/bin/env bun
/**
 * Render farm worker (remotion-render-farm skill): runs jobs of the farm page in headless Chrome windows on this
 * machine's GPU, in Chrome capture mode (HTML-in-canvas). Installed and started by `farm setup` / `farm machine add`.
 *
 *  - Page server, loopback only: http://b-<build>.localhost:<page port>/ serves that build's page
 *    (<data>/builds/<build>/dist) and its project's public/ files, and takes the page's results (POST /__farm/save).
 *    Each build is its own origin (a secure context, like localhost), so a project's absolute paths work as in Remotion.
 *  - Control API on FARM_BIND, every request with `Authorization: Bearer <token>`:
 *      GET  /health          this machine, its Chrome, the runtime version, busy windows
 *      GET  /builds/:id      200 when the build and its public files are here
 *      POST /jobs            { id, build, query, fast? } → one Chrome window loads the page with that query
 *      GET  /jobs/:id        { state: running | done | failed, files, frames, seconds, wall, error }
 *      GET  /files/:name     a file a job saved;  DELETE /jobs/:id removes the job and all its files
 *
 * env: FARM_TOKEN_FILE (~/.config/bb-farm/token), FARM_BIND (127.0.0.1), FARM_PORT (7801), FARM_PAGE_PORT (7802),
 *      FARM_DIR (~/.cache/bb-farm), FARM_CHROME (/snap/bin/chromium), FARM_MAX_WINDOWS (4), FARM_PROFILES (where
 *      Chrome profiles go; a snap Chrome can't write in hidden folders, so ~/snap/<name>/common/bb-farm-chrome),
 *      FARM_NO_SANDBOX=1 where AppArmor blocks Chrome's sandbox (Ubuntu 23.10+ with Chrome for Testing); Chrome only
 *      ever opens this worker's own pages.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { cpus, homedir, hostname } from "node:os";
import { basename, join, resolve, sep } from "node:path";

const TOKEN = readFileSync(process.env.FARM_TOKEN_FILE ?? join(homedir(), ".config/bb-farm/token"), "utf8").trim();
if (TOKEN.length < 32) throw new Error("the farm token is missing or too short");
const BIND = process.env.FARM_BIND ?? "127.0.0.1";
const PORT = Number(process.env.FARM_PORT ?? 7801);
const PAGE_PORT = Number(process.env.FARM_PAGE_PORT ?? 7802);
const DIR = resolve(process.env.FARM_DIR ?? join(homedir(), ".cache/bb-farm"));
const CHROME = process.env.FARM_CHROME ?? "/snap/bin/chromium";
const MAX = Number(process.env.FARM_MAX_WINDOWS ?? 4);
const NO_SANDBOX = process.env.FARM_NO_SANDBOX === "1";
const VERSION = existsSync(join(import.meta.dir, "VERSION")) ? readFileSync(join(import.meta.dir, "VERSION"), "utf8").trim() : "dev";
const OUT = join(DIR, "out");
const BUILDS = join(DIR, "builds");
// a snap Chrome can only write in its own folder (not in hidden folders like ~/.cache): its profiles go there
const PROFILES = process.env.FARM_PROFILES ?? (CHROME.startsWith("/snap/") ? join(homedir(), "snap", basename(CHROME), "common", "bb-farm-chrome") : join(DIR, "chrome"));
for (const d of [OUT, BUILDS, PROFILES]) mkdirSync(d, { recursive: true });

const FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}$/;
const ID = /^[a-z0-9-]{1,48}$/;
const BUILD = /^[a-z0-9]{1,40}$/;
const QUERY = /^[A-Za-z0-9=&_.,-]{1,4000}$/;
const authorized = (req: Request) => {
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${TOKEN}`);
  return got.length === want.length && timingSafeEqual(got, want);
};

/** A build: its page (dist) and its project's public/ files (build.json: absolute, or relative to the data dir). */
const buildDirs = (id: string) => {
  const base = join(BUILDS, id);
  const meta = join(base, "build.json");
  if (!existsSync(join(base, "dist", "index.html")) || !existsSync(meta)) return null;
  const pub = resolve(DIR, (JSON.parse(readFileSync(meta, "utf8")) as { public: string }).public);
  return existsSync(pub) ? { base, dist: join(base, "dist"), pub } : null;
};

/* ── the page server (this machine only) ── */
Bun.serve({
  hostname: "127.0.0.1",
  port: PAGE_PORT,
  maxRequestBodySize: 4_000_000_000,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/__farm/save" && req.method === "POST") {
      const name = url.searchParams.get("name") ?? "";
      if (!FILE.test(name)) return new Response("bad name", { status: 400 });
      await Bun.write(join(OUT, name), await req.arrayBuffer());
      return new Response("ok");
    }
    const m = (req.headers.get("host") ?? "").split(":")[0].match(/^b-([a-z0-9]{1,40})\.localhost$/);
    const b = m ? buildDirs(m[1]) : null;
    if (!b) return new Response("no such build", { status: 404 });
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    // the page first, then the project's files as they are
    for (const root of [b.dist, b.pub]) {
      const file = resolve(root, `.${path}`);
      if (!file.startsWith(root + sep)) return new Response("forbidden", { status: 403 });
      const f = Bun.file(file);
      if (await f.exists()) return new Response(f, { headers: { "cache-control": "public, max-age=86400" } });
    }
    return new Response("not found", { status: 404 });
  },
});

/* ── jobs: one Chrome window each ── */
type Output = { name: string; from: number; to: number; frames: number; seconds: number };
type Job = { id: string; build: string; query: string; fast: boolean; state: "running" | "done" | "failed"; started: number; files?: Output[]; frames?: number; seconds?: number; wall?: number; error?: string };
const jobs = new Map<string, Job>();
const busy = () => [...jobs.values()].filter((j) => j.state === "running").length;
const chromeFlags = (dataDir: string, fast: boolean) => [
  "--headless=new",
  `--user-data-dir=${dataDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--mute-audio",
  // no keyring over SSH: without this Chrome waits out a 25 s D-Bus timeout before loading the page
  "--password-store=basic",
  "--autoplay-policy=no-user-gesture-required",
  // a background page stops painting and its render hangs
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  // Chrome capture mode (HTML-in-canvas) and the GPU
  "--enable-features=CanvasDrawElement",
  "--enable-blink-features=CanvasDrawElement",
  "--use-gl=angle",
  "--use-angle=gl-egl",
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
  "--window-size=1920,1080",
  ...(NO_SANDBOX ? ["--no-sandbox"] : []),
  // capture waits for a paint every frame: without vsync, paints don't wait for the next 60 Hz tick
  ...(fast ? ["--disable-gpu-vsync", "--disable-frame-rate-limit"] : []),
];

const run = async (job: Job) => {
  const dataDir = join(PROFILES, job.id);
  mkdirSync(dataDir, { recursive: true });
  const b = join(BUILDS, job.build);
  const now = new Date();
  utimesSync(b, now, now); // kept while in use (see prune)
  const url = `http://b-${job.build}.localhost:${PAGE_PORT}/index.html?${job.query}&who=${job.id}`;
  const proc = Bun.spawn([CHROME, ...chromeFlags(dataDir, job.fast), url], { stdout: "ignore", stderr: "ignore" });
  // a crash ends with a signal and no exit code: watch for the exit itself
  let exited = false;
  void proc.exited.then(() => (exited = true));
  const resultFile = join(OUT, `${job.id}-result.json`);
  const deadline = Date.now() + 30 * 60 * 1000;
  let result: { files?: Output[]; seconds?: number; error?: string } | null = null;
  while (Date.now() < deadline && !exited) {
    if (existsSync(resultFile)) {
      try {
        result = JSON.parse(readFileSync(resultFile, "utf8"));
        break;
      } catch {
        // still being written
      }
    }
    await Bun.sleep(100);
  }
  proc.kill();
  await proc.exited.catch(() => undefined);
  rmSync(dataDir, { recursive: true, force: true });
  job.wall = (Date.now() - job.started) / 1000;
  const missing = result?.files?.find((f) => !existsSync(join(OUT, f.name)));
  if (!result || result.error || !result.files || missing) {
    job.state = "failed";
    job.error = result?.error ?? (missing ? `${missing.name} was not saved` : exited ? `chrome exited (${proc.exitCode ?? proc.signalCode})` : "no result within 30 minutes");
    return;
  }
  Object.assign(job, { state: "done", files: result.files, frames: result.files.reduce((n, f) => n + f.frames, 0), seconds: result.seconds });
};

/** Old builds, results nobody fetched and Chrome profiles of killed jobs don't pile up. */
const prune = () => {
  const now = Date.now();
  const builds = readdirSync(BUILDS)
    .map((n) => ({ n, t: statSync(join(BUILDS, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const [i, b] of builds.entries()) if (i >= 10 && now - b.t > 3 * 86400e3) rmSync(join(BUILDS, b.n), { recursive: true, force: true });
  for (const n of readdirSync(OUT)) if (now - statSync(join(OUT, n)).mtimeMs > 6 * 3600e3) rmSync(join(OUT, n), { force: true });
  const running = new Set([...jobs.values()].filter((j) => j.state === "running").map((j) => j.id));
  for (const n of readdirSync(PROFILES)) if (!running.has(n)) rmSync(join(PROFILES, n), { recursive: true, force: true });
};
prune();
setInterval(prune, 3600e3);

/* ── the control API ── */
Bun.serve({
  hostname: BIND,
  port: PORT,
  async fetch(req) {
    if (!authorized(req)) return new Response("unauthorized", { status: 401 });
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ host: hostname(), cpus: cpus().length, version: VERSION, chrome: CHROME, chromeFound: existsSync(CHROME), sandbox: !NO_SANDBOX, busy: busy(), max: MAX });
    const bm = url.pathname.match(/^\/builds\/([a-z0-9]{1,40})$/);
    if (bm) return buildDirs(bm[1]) ? Response.json({ build: bm[1] }) : new Response("no such build", { status: 404 });
    if (url.pathname === "/jobs" && req.method === "POST") {
      const body = (await req.json().catch(() => null)) as { id?: string; build?: string; query?: string; fast?: boolean } | null;
      if (!body || !ID.test(body.id ?? "") || !BUILD.test(body.build ?? "") || !QUERY.test(body.query ?? "")) return new Response("bad job", { status: 400 });
      if (!buildDirs(body.build!)) return new Response("no such build", { status: 404 });
      if (jobs.get(body.id!)?.state === "running") return new Response("already running", { status: 409 });
      if (busy() >= MAX) return Response.json({ error: "all windows busy" }, { status: 429 });
      const job: Job = { id: body.id!, build: body.build!, query: body.query!, fast: body.fast !== false, state: "running", started: Date.now() };
      jobs.set(job.id, job);
      void run(job);
      return Response.json({ accepted: job.id });
    }
    const jm = url.pathname.match(/^\/jobs\/([a-z0-9-]{1,48})$/);
    if (jm && req.method === "GET") {
      const job = jobs.get(jm[1]);
      return job ? Response.json(job) : new Response("no such job", { status: 404 });
    }
    if (jm && req.method === "DELETE") {
      if (jobs.get(jm[1])?.state === "running") return new Response("still running", { status: 409 });
      for (const n of readdirSync(OUT)) if (n.startsWith(`${jm[1]}-`)) rmSync(join(OUT, n), { force: true });
      jobs.delete(jm[1]);
      return new Response("ok");
    }
    const fm = url.pathname.match(/^\/files\/([A-Za-z0-9][A-Za-z0-9._-]{0,160})$/);
    if (fm && req.method === "GET") {
      const f = Bun.file(join(OUT, fm[1]));
      return (await f.exists()) ? new Response(f) : new Response("not found", { status: 404 });
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`farm worker ${hostname()} (${VERSION}): control ${BIND}:${PORT}, pages 127.0.0.1:${PAGE_PORT}, chrome ${CHROME}, up to ${MAX} windows`);
