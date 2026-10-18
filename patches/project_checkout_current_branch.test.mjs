import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, after } from 'node:test';

// Exercise the actual patched provider registration with its host/RPC boundary.
// BB supplies these same SDK/Zod runtime modules when loading bundled providers.
const runtime = process.env.CHECKOUT_QA_RUNTIME;
const sourcePath = process.env.CHECKOUT_QA_SERVER;
assert.ok(runtime && sourcePath, 'Set CHECKOUT_QA_RUNTIME and CHECKOUT_QA_SERVER');
const temporary = await mkdtemp(join(tmpdir(), 'checkout-current-branch-'));
const source = (await readFile(sourcePath, 'utf8'))
  .replaceAll('"@get-bb/plugin-sdk"', JSON.stringify(pathToFileURL(join(runtime, 'plugin-sdk-runtime.js')).href))
  .replaceAll('"zod"', JSON.stringify(pathToFileURL(join(runtime, 'zod-runtime.js')).href));
const modulePath = join(temporary, 'provider.mjs');
await writeFile(modulePath, source);
const { default: plugin } = await import(pathToFileURL(modulePath).href);
after(() => rm(temporary, { recursive: true, force: true }));

async function fixture({ shared = true, branch = 'playroom-update-20261009', inspectFailure = false, foreign = false, dirty = false } = {}) {
  const calls = [];
  let provider;
  await plugin({
    hosts: { experimental_client() { return {
      experimental_onSignal() {},
      async call(method, input) {
        calls.push({ method, input });
        if (method === 'inspectCheckout') {
          if (inspectFailure) throw new Error('host unavailable');
          return { isGitRepo: true, checkout: { kind: 'branch', branchName: branch, headSha: 'abc' }, hasUncommittedChanges: dirty, operation: { kind: 'none' } };
        }
        assert.equal(method, 'attach');
        return { status: 'attached', path: input.path, branchName: input.branch?.name ?? branch };
      },
    }; } },
    sdk: {
      environments: { async list() { return [{ id: 'env', environmentProviderId: foreign ? 'personal-workspace' : 'project-checkout', status: 'ready' }]; } },
      threads: { async list() { return shared ? [{ id: 'other', status: 'active' }] : []; } },
    },
    experimental_environments: { register(value) { provider = value; } },
  });
  const context = {
    host: { id: 'host' }, projectCheckout: { path: '/games' }, thread: { id: 'new' },
    pathKey: 'new', attempt: 1, signal: new AbortController().signal,
    experimental_claimPath: async () => true, report: { log() {}, step() {} },
  };
  return { provider, context, calls };
}

test('a named current branch is accepted while another thread uses the checkout', async () => {
  const { provider, context } = await fixture();
  assert.deepEqual(await provider.validate({ ...context, inputs: { branch: { kind: 'existing', name: 'playroom-update-20261009' } } }), { action: 'accept' });
});

test('creation also allows the current branch and preserves the host no-op request', async () => {
  const { provider, context, calls } = await fixture({ dirty: true });
  const result = await provider.create({ ...context, inputs: { branch: { kind: 'existing', name: 'playroom-update-20261009' } } });
  assert.equal(result.status, 'created');
  assert.deepEqual(calls.find(call => call.method === 'attach').input.branch, { kind: 'existing', name: 'playroom-update-20261009' });
});

test('validation still refuses an actual branch switch in a shared checkout', async () => {
  const { provider, context } = await fixture();
  assert.equal((await provider.validate({ ...context, inputs: { branch: { kind: 'existing', name: 'main' } } })).message, 'Cannot checkout branch while another thread is using this workspace');
});

test('creation refuses an actual branch switch without contacting attach', async () => {
  const { provider, context, calls } = await fixture();
  const result = await provider.create({ ...context, inputs: { branch: { kind: 'existing', name: 'main' } } });
  assert.equal(result.status, 'failed');
  assert.equal(calls.some(call => call.method === 'attach'), false);
});

test('a new branch remains blocked while another thread uses the checkout', async () => {
  const { provider, context, calls } = await fixture();
  const result = await provider.validate({ ...context, inputs: { branch: { kind: 'new', baseBranch: 'main' } } });
  assert.equal(result.action, 'refuse');
  assert.equal(calls.length, 0);
});

test('failure to inspect the current branch preserves the shared-workspace refusal', async () => {
  const { provider, context, calls } = await fixture({ inspectFailure: true });
  const result = await provider.validate({ ...context, inputs: { branch: { kind: 'existing', name: 'playroom-update-20261009' } } });
  assert.equal(result.action, 'refuse');
  assert.equal(calls.some(call => call.method === 'attach'), false);
});

test('a foreign managed environment is still refused before inspecting the checkout', async () => {
  const { provider, context, calls } = await fixture({ foreign: true });
  const result = await provider.validate({ ...context, inputs: { branch: { kind: 'existing', name: 'playroom-update-20261009' } } });
  assert.equal(result.message, 'This directory belongs to environment env; reuse that environment instead.');
  assert.equal(calls.length, 0);
});

test('an unshared clean checkout may still switch branches', async () => {
  const { provider, context, calls } = await fixture({ shared: false });
  const inputs = { branch: { kind: 'existing', name: 'main' } };
  assert.deepEqual(await provider.validate({ ...context, inputs }), { action: 'accept' });
  assert.equal((await provider.create({ ...context, inputs })).status, 'created');
  assert.equal(calls.find(call => call.method === 'attach').input.branch.name, 'main');
});
