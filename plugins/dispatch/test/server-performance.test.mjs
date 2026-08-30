import assert from "node:assert/strict";
import test from "node:test";
import plugin from "../dist/server.js";

const project = {
  id: "p1",
  name: "Alpha",
  slug: "alpha",
  description: "",
  agentContext: "",
  color: "",
};

const task = {
  id: "t1",
  projectId: "p1",
  sharedProjectIds: [],
  title: "Fast load",
  description: "",
  size: null,
  status: "todo",
  priority: "medium",
  visibility: "public",
  assigneeIds: [],
  parentTaskId: null,
  createdBy: "u1",
  claimedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  subtasks: [],
};

function jsonResponse(payload) {
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
}

function within(promise, milliseconds) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out after ${milliseconds}ms`)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

function createBb(onRegister) {
  return {
    pluginId: "dispatch",
    settings: {
      define: () => ({
        get: async () => ({ baseUrl: "https://dispatch.test", apiKey: "test-key" }),
        onChange: () => {},
      }),
    },
    rpc: { register: (_contract, handlers) => onRegister(handlers) },
    storage: {
      kv: {
        get: async () => undefined,
        set: async () => {},
        delete: async () => {},
        list: async () => [],
      },
    },
    sdk: {
      plugins: { updateSettings: async () => {} },
      projects: {
        list: async () => [],
        get: async () => ({ sources: [] }),
      },
      files: { read: async () => ({ contentEncoding: "utf8", content: "{}" }) },
    },
    log: { info: () => {}, error: () => {} },
  };
}

test("Dispatch keeps dashboard and detail loads off sequential request paths", async () => {
  const originalFetch = globalThis.fetch;
  let resolveProfile;
  let calls = [];
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname.replace("/api/v1", "");
    calls.push(path);
    if (path === "/me") {
      return new Promise((resolve) => {
        resolveProfile = () => resolve(jsonResponse({
          id: "u1",
          name: "Test User",
          email: "test@example.com",
          role: "member",
        }));
      });
    }
    if (path === "/me/tasks") {
      return jsonResponse({ projects: { p1: project }, mine: [task], open: [] });
    }
    if (path === "/tasks/t1") return jsonResponse({ task });
    if (path === "/tasks/t1/comments") return jsonResponse({ comments: [] });
    if (path === "/projects/alpha/members") return jsonResponse({ members: [] });
    if (path === "/projects") return jsonResponse({ projects: [project] });
    return jsonResponse({ tasks: [], nextCursor: null });
  };

  try {
    let handlers;
    await plugin(createBb((registered) => { handlers = registered; }));

    // Keep /me unresolved: dashboard data must still arrive from /me/tasks.
    const dashboard = await within(handlers.loadDashboard(), 500);
    assert.ok(dashboard.data);
    assert.equal(dashboard.status.connected, true);
    assert.equal(typeof resolveProfile, "function");

    resolveProfile();
    await new Promise((resolve) => setImmediate(resolve));
    calls = [];

    const detail = await handlers.loadTaskDetail({ id: "t1" });
    assert.equal(detail.detail.task.id, "t1");
    assert.deepEqual(calls.sort(), [
      "/projects/alpha/members",
      "/tasks/t1",
      "/tasks/t1/comments",
    ]);
  } finally {
    resolveProfile?.();
    globalThis.fetch = originalFetch;
  }
});
