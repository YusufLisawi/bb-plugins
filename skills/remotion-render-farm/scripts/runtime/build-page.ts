#!/usr/bin/env bun
/**
 * Builds the farm page for one project (run by farm.ts, in its own process):
 *   bun build-page.ts <project> <root file> <root export> <public dir> <runtime version>
 * Copies page/ into <project>/.farm/page, points its entry at the project's Root, bundles it with the project's own
 * Vite when it has one (its plugins, aliases and CSS setup then apply) or the farm's, into <project>/.farm/dist, and
 * writes dist/__assets.json: URL path → content hash of every file the page can load (the build and public/). Its
 * hash is the build's id. React, Remotion and @remotion/web-renderer resolve from the project's node_modules.
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

const [projectArg, rootFile, rootExport, publicArg, version] = process.argv.slice(2);
const P = resolve(projectArg);
const farm = join(P, ".farm");
const page = join(farm, "page");
const dist = join(farm, "dist");

rmSync(page, { recursive: true, force: true });
cpSync(join(import.meta.dir, "page"), page, { recursive: true });
let rel = relative(page, join(P, rootFile)).replace(/\\/g, "/").replace(/\.(tsx|ts|jsx|js)$/, "");
if (!rel.startsWith(".")) rel = `./${rel}`;
writeFileSync(join(page, "entry.tsx"), `import * as root from ${JSON.stringify(rel)};\nimport { start } from "./farm-page";\n\nvoid start((root as Record<string, unknown>)[${JSON.stringify(rootExport)}] as never);\n`);

const fromProject = createRequire(join(P, "package.json"));
let vitePath: string;
try {
  vitePath = fromProject.resolve("vite");
} catch {
  vitePath = createRequire(import.meta.path).resolve("vite");
}
const vite = (await import(vitePath)) as typeof import("vite");

// the project's Vite config keeps its plugins, aliases and CSS setup; everything about the build itself is ours
const configFile = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"].map((f) => join(P, f)).find((f) => existsSync(f));
const own = configFile ? ((await vite.loadConfigFromFile({ command: "build", mode: "production" }, configFile, P, "error"))?.config ?? {}) : {};
await vite.build({
  configFile: false,
  root: page,
  base: "/",
  publicDir: false,
  logLevel: "error",
  plugins: own.plugins ?? [],
  resolve: own.resolve,
  define: own.define,
  css: own.css,
  esbuild: { jsx: "automatic", ...(typeof own.esbuild === "object" ? own.esbuild : {}) },
  build: { outDir: dist, emptyOutDir: true, reportCompressedSize: false, chunkSizeWarningLimit: 100000, rollupOptions: { input: join(page, "index.html") } },
});

// every file the page can load, by content: the first root with a path wins, as in the worker's page server
const files: Record<string, string> = {};
const walk = (root: string, dir: string) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const url = `/${relative(root, p).replace(/\\/g, "/")}`;
    if (e.isDirectory()) walk(root, p);
    else if (e.isFile() && !(url in files)) files[url] = Bun.hash(readFileSync(p)).toString(36);
  }
};
walk(dist, dist);
const pub = resolve(P, publicArg);
if (existsSync(pub)) walk(pub, pub);
writeFileSync(join(dist, "__farm.json"), JSON.stringify({ runtime: version, root: `${rootFile}#${rootExport}`, built: new Date().toISOString() }));
writeFileSync(join(dist, "__assets.json"), JSON.stringify(files));
console.log(JSON.stringify({ files: Object.keys(files).length }));
