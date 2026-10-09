#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const usage = `Usage: node create-app.mjs --out /path/to/new-app --slug app-name --name "App Name" --bundle-id com.example.appname`;
const { values } = parseArgs({ options: {
  out: { type: "string" },
  slug: { type: "string" },
  name: { type: "string" },
  "bundle-id": { type: "string" },
  help: { type: "boolean" }
}});
if (values.help) { console.log(usage); process.exit(0); }
const { out, slug, name } = values;
const bundleId = values["bundle-id"];
if (!out || !slug || !name || !bundleId) throw new Error(usage);
if (!/^[a-z][a-z0-9-]{1,39}$/.test(slug)) throw new Error("slug must use lowercase letters, digits, hyphens and start with a letter");
if (!/^[A-Za-z0-9][A-Za-z0-9 .'-]{0,79}$/.test(name)) throw new Error("name must be 1–80 simple display characters");
if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(bundleId)) throw new Error("bundle-id must look like com.example.appname");

const destination = resolve(out);
if (existsSync(destination)) throw new Error(`Target already exists: ${destination}`);
const source = resolve(dirname(fileURLToPath(import.meta.url)), "../starter");
mkdirSync(dirname(destination), { recursive: true });
cpSync(source, destination, { recursive: true });
renameSync(join(destination, "_gitignore"), join(destination, ".gitignore"));
renameSync(join(destination, "apps/mobile/_env.example"), join(destination, "apps/mobile/.env.example"));

const tokens = {
  __APP_SLUG__: slug,
  __APP_NAME__: name,
  __BUNDLE_ID__: bundleId
};
function applyTokens(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { applyTokens(file); continue; }
    let content = readFileSync(file, "utf8");
    for (const [token, value] of Object.entries(tokens)) content = content.replaceAll(token, value);
    writeFileSync(file, content);
  }
}
applyTokens(destination);
const env = readFileSync(join(destination, ".env.example"), "utf8")
  .replace("replace-with-a-random-secret-at-least-24-characters", randomBytes(32).toString("hex"));
writeFileSync(join(destination, ".env"), env, { mode: 0o600 });
writeFileSync(join(destination, "apps/mobile/.env"), readFileSync(join(destination, "apps/mobile/.env.example"), "utf8"));
console.log(`Created ${destination}`);
console.log(`Next: cd ${destination} && npm install && npm run api:dev`);
