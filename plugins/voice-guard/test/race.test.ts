import assert from "node:assert/strict";
import { test } from "node:test";
import { raceTranscription } from "../src/transcribe.js";

const after = (ms: number, value: string) => (signal: AbortSignal) =>
  new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    });
  });
const failsAfter = (ms: number, message: string) => () => new Promise<string>((_, reject) => setTimeout(() => reject(new Error(message)), ms));

test("a fast primary wins and the backup never starts", async () => {
  let groqCalls = 0;
  const result = await raceTranscription({
    primary: "codex",
    hedgeMs: 200,
    timeoutMs: 2000,
    run: { codex: after(20, "from codex"), groq: (signal) => { groqCalls += 1; return after(5, "from groq")(signal); } },
  });
  assert.deepEqual([result.service, result.text, groqCalls], ["codex", "from codex", 0]);
});

test("a slow primary is overtaken by the backup after the hedge", async () => {
  const result = await raceTranscription({ primary: "codex", hedgeMs: 30, timeoutMs: 2000, run: { codex: after(500, "late"), groq: after(20, "from groq") } });
  assert.equal(result.service, "groq");
});

test("a failing primary starts the backup at once", async () => {
  const started = Date.now();
  const result = await raceTranscription({ primary: "codex", hedgeMs: 1000, timeoutMs: 2000, run: { codex: failsAfter(10, "HTTP 401"), groq: after(10, "ok") } });
  assert.equal(result.service, "groq");
  assert.ok(Date.now() - started < 500);
  assert.match(result.errors.join(), /401/u);
});

test("a missing backup still lets the primary answer", async () => {
  const result = await raceTranscription({ primary: "codex", hedgeMs: 0, timeoutMs: 2000, run: { codex: after(20, "only codex"), groq: null } });
  assert.equal(result.text, "only codex");
});

test("both failing rejects with every reason", async () => {
  await assert.rejects(
    raceTranscription({ primary: "codex", hedgeMs: 0, timeoutMs: 2000, run: { codex: failsAfter(5, "codex down"), groq: failsAfter(10, "groq down") } }),
    /codex down.*groq down/u,
  );
});

test("an overall timeout rejects", async () => {
  await assert.rejects(raceTranscription({ primary: "groq", hedgeMs: 0, timeoutMs: 50, run: { codex: after(1000, "x"), groq: after(1000, "y") } }), /Timed out/u);
});
