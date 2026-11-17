// Task Board: a calm kanban for BB threads. Tasks are prompts that run in a
// thread; a thread can hold many tasks over time. The engine (src/server)
// starts queued tasks when their time comes, their thread frees up, or the
// task they wait for finishes, and moves running tasks to Done when the
// thread's turn ends.
import {
  experimental_PluginRpcRefusal,
  type BbPluginApi,
} from "@get-bb/plugin-sdk";
import {
  rpcContract,
  type TaskPatch,
} from "./src/contract.js";
import { nextOccurrence } from "./src/repeat.js";
import { TaskEngine } from "./src/server/engine.js";
import { NO_TRIGGER, TaskStore, toPublic, type StoredTask } from "./src/server/store.js";

export { rpcContract };

const SWEEP_MS = 15_000;
const LAST_PROJECT_KEY = "lastProjectId";

function refuse(code: "not_found" | "conflict" | "invalid", message: string): never {
  throw new experimental_PluginRpcRefusal({ code, message });
}

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    trackThreads: {
      type: "boolean",
      label: "Show work from every thread",
      default: true,
    },
    autoHideDoneHours: {
      type: "number",
      label: "Hide Done cards after (hours, 0 keeps them)",
      default: 24,
    },
    deleteHiddenAfterDays: {
      type: "number",
      label: "Delete hidden Done cards after (days, 0 keeps them)",
      default: 30,
    },
  });
  let current = await settings.get();
  settings.onChange((next) => {
    current = next;
  });

  const store = new TaskStore(bb);
  const engine = new TaskEngine(bb, store, {
    trackThreads: () => current.trackThreads,
    autoHideMs: () => Math.max(0, current.autoHideDoneHours) * 3_600_000,
    deleteHiddenMs: () => Math.max(0, current.deleteHiddenAfterDays) * 86_400_000,
  });

  function mustGet(id: string): StoredTask {
    return store.get(id) ?? refuse("not_found", "That task no longer exists.");
  }

  async function threadProject(threadId: string): Promise<string> {
    let thread;
    try {
      thread = await bb.sdk.threads.get({ threadId });
    } catch {
      return refuse("invalid", "That thread could not be found.");
    }
    if (thread.deletedAt !== null) refuse("invalid", "That thread was deleted.");
    return thread.projectId;
  }

  /** Applies an edit and re-derives Todo/Queued from the start condition. */
  async function applyPatch(task: StoredTask, patch: TaskPatch): Promise<StoredTask> {
    const running = task.status === "running" && task.error === null;
    if (running) {
      const allowed = new Set(["title", "priority"]);
      if (Object.keys(patch).some((key) => !allowed.has(key))) {
        refuse("conflict", "This task is running. Only its title and priority can change until it finishes.");
      }
    }

    const next: StoredTask = { ...task };
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.prompt !== undefined) next.prompt = patch.prompt;
    if (patch.priority !== undefined) next.priority = patch.priority;
    if (patch.execution !== undefined) next.execution = patch.execution;
    if (patch.worktree !== undefined) next.worktree = patch.worktree;
    if (patch.projectId !== undefined && patch.projectId !== task.projectId) {
      next.projectId = patch.projectId;
      if (patch.threadId === undefined) next.threadId = null;
    }
    if (patch.threadId !== undefined && patch.threadId !== task.threadId) {
      if (task.status === "running") refuse("conflict", "Finish or mark this task done before moving it to another thread.");
      if (patch.threadId !== null) next.projectId = await threadProject(patch.threadId);
      next.threadId = patch.threadId;
      // The thread fixes the provider; drop a model picked for a new thread.
      if (patch.threadId !== null && patch.execution === undefined) {
        next.execution = { ...next.execution, providerId: null, model: null, reasoningLevel: null, serviceTier: null };
      }
      if (patch.threadId === null && next.trigger.kind === "thread-free") next.trigger = NO_TRIGGER;
    }
    if (patch.repeat !== undefined) {
      next.repeat = patch.repeat;
      const at = nextOccurrence(patch.repeat, Date.now());
      if (at !== null && patch.trigger === undefined) next.trigger = { kind: "at", at, taskId: null };
    }
    if (patch.trigger !== undefined) next.trigger = patch.trigger;

    const trigger = next.trigger;
    if (trigger.kind === "at" && trigger.at === null) refuse("invalid", "Pick a time for the task to start.");
    if (trigger.kind === "thread-free" && next.threadId === null) refuse("invalid", "Pick a thread first: a new thread is always free.");
    if (trigger.kind === "after-task") {
      if (trigger.taskId === null || trigger.taskId === next.id) refuse("invalid", "Pick another task to wait for.");
      if (!store.get(trigger.taskId)) refuse("invalid", "The task to wait for no longer exists.");
    }

    if (next.status !== "running") {
      const startConditionChanged = patch.trigger !== undefined || patch.repeat !== undefined;
      if (trigger.kind === "none") {
        if (next.status === "queued") next.status = "todo";
      } else if (next.status !== "done" || startConditionChanged) {
        next.status = "queued";
        next.outcome = null;
        next.error = null;
      }
      if (next.status !== task.status) next.position = store.endPosition(next.status);
      next.waitingReason = null;
    }
    return store.save(next);
  }

  bb.rpc.register(rpcContract, {
    listTasks: () => ({ tasks: store.list().map(toPublic), revision: engine.revision }),

    getTask: ({ id }) => {
      const task = store.get(id);
      return { task: task ? toPublic(task) : null };
    },

    createTask: async (input) => {
      const projectId = input.threadId ? await threadProject(input.threadId) : input.projectId;
      const task = store.create({
        title: input.title,
        prompt: input.prompt,
        priority: input.priority,
        projectId,
        threadId: input.threadId,
        worktree: input.threadId === null && input.worktree,
        ...(input.execution ? { execution: input.execution } : {}),
        status: "todo",
      });
      if (input.trigger && input.trigger.kind !== "none") {
        const scheduled = await engine.serial(() => applyPatch(task, { trigger: input.trigger }));
        engine.changed();
        await engine.pump();
        await bb.storage.kv.set(LAST_PROJECT_KEY, projectId);
        return toPublic(store.get(scheduled.id) ?? scheduled);
      }
      await bb.storage.kv.set(LAST_PROJECT_KEY, projectId);
      engine.changed();
      return toPublic(task);
    },

    updateTask: async ({ id, patch }) => {
      const saved = await engine.serial(() => applyPatch(mustGet(id), patch));
      engine.changed();
      await engine.pump();
      return toPublic(store.get(id) ?? saved);
    },

    moveTask: async ({ id, status, beforeId }) => {
      const task = mustGet(id);
      const position = beforeId === null ? store.endPosition(status) : store.positionBefore(status, beforeId, id);
      if (task.status === status) {
        const saved = await engine.serial(async () => store.save({ ...mustGet(id), position }));
        engine.changed();
        return { task: toPublic(saved), message: null };
      }
      if (task.status === "running" && task.error === null && status !== "done") {
        refuse("conflict", "This task is running. It moves to Done when its turn ends, or mark it done yourself.");
      }
      const result = await engine.setColumn(task, status, position);
      return { task: toPublic(result.task), message: result.message };
    },

    runTask: async ({ id }) => {
      const task = mustGet(id);
      if (task.status === "running" && task.error === null) refuse("conflict", "This task is already running.");
      const result = await engine.runNow({ ...task, error: null });
      return { task: toPublic(result.task), message: result.message };
    },

    retryTask: async ({ id }) => {
      const task = mustGet(id);
      const result = await engine.runNow({ ...task, error: null, outcome: null });
      return { task: toPublic(result.task), message: result.message };
    },

    markDone: async ({ id }) => {
      const done = await engine.serial(async () => engine.complete(mustGet(id), "manual"));
      engine.changed();
      await engine.pump();
      return toPublic(done);
    },

    setPinned: async ({ id, pinned }) => {
      const saved = await engine.serial(async () =>
        store.save({ ...mustGet(id), pinnedAt: pinned ? Date.now() : null, ...(pinned ? { hiddenAt: null } : {}) }),
      );
      engine.changed();
      return toPublic(saved);
    },

    setHidden: async ({ id, hidden }) => {
      const saved = await engine.serial(async () => store.save({ ...mustGet(id), hiddenAt: hidden ? Date.now() : null }));
      engine.changed();
      return toPublic(saved);
    },

    duplicateTask: async ({ id }) => {
      const source = mustGet(id);
      const copy = store.create({
        title: source.title,
        prompt: source.prompt,
        priority: source.priority,
        projectId: source.projectId,
        threadId: source.threadId,
        worktree: source.worktree,
        execution: source.execution,
        status: "todo",
        trigger: NO_TRIGGER,
      });
      engine.changed();
      return toPublic(copy);
    },

    deleteTask: async ({ id }) => {
      const deleted = await engine.serial(async () => store.delete(id));
      engine.changed();
      await engine.pump();
      return { deleted };
    },

    getPreferences: async () => ({
      lastProjectId: (await bb.storage.kv.get<string>(LAST_PROJECT_KEY)) ?? null,
    }),
  });

  bb.onDispose(() => engine.dispose());

  // Thread lifecycle drives Done and starts whatever waited on the thread.
  bb.events.on("thread.active", ({ thread }) => engine.onThreadActive(thread.id));
  bb.events.on("thread.idle", ({ thread }) => engine.onThreadSettled(thread.id, null));
  bb.events.on("thread.failed", ({ thread, error }) =>
    engine.onThreadSettled(thread.id, error ?? "The thread stopped with an error"),
  );
  bb.events.on("message.dispatched", ({ entry }) => engine.onDispatched(entry.id));
  bb.events.on("message.cancelled", ({ entry }) => engine.onCancelled(entry.id));
  bb.events.on("thread.archived", () => engine.sweep());
  bb.events.on("thread.deleted", () => engine.sweep());

  // Times come due and missed events are reconciled on a short sweep.
  bb.background.service("scheduler", {
    async start(signal) {
      while (!signal.aborted) {
        try {
          await engine.sweep();
        } catch (cause) {
          bb.log.warn(`sweep failed: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, SWEEP_MS);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
      }
    },
  });

  const usage = [
    "Usage:",
    "  bb task-board list [--status todo|queued|running|done] [--json]",
    "  bb task-board add <prompt> (--project <id> | --thread <id>) [--json]",
    "  bb task-board run <task-id> [--json]",
  ].join("\n");

  function takeFlag(args: string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index === -1) return undefined;
    const value = args[index + 1];
    args.splice(index, 2);
    return value;
  }

  function line(task: StoredTask): string {
    const label = task.title.trim() || task.prompt.trim().split("\n")[0] || "(empty)";
    const flagged = task.error ? " !" : "";
    return `${task.id}  ${task.status.padEnd(7)}${flagged}  ${label.slice(0, 80)}`;
  }

  bb.cli.register({
    name: "task-board",
    summary: "List, add, and start Task Board tasks",
    commands: [
      { name: "list", summary: "List tasks", usage: "bb task-board list [--status <status>] [--json]" },
      { name: "add", summary: "Add a task to Todo", usage: "bb task-board add <prompt> (--project <id> | --thread <id>) [--json]" },
      { name: "run", summary: "Start a task now, or when its thread is free", usage: "bb task-board run <task-id> [--json]" },
    ],
    async run(argv) {
      const json = argv.includes("--json");
      const args = argv.filter((arg) => arg !== "--json");
      const command = args.shift();
      const reply = (value: unknown, text: string) => ({ exitCode: 0, stdout: json ? JSON.stringify(value) : text });
      switch (command) {
        case undefined:
        case "help":
        case "--help":
          return { exitCode: 0, stdout: usage };
        case "list": {
          const status = takeFlag(args, "--status");
          const tasks = store.list().filter((task) => !status || task.status === status).slice(0, 200);
          return reply(tasks.map(toPublic), tasks.length === 0 ? "No tasks." : tasks.map(line).join("\n"));
        }
        case "add": {
          const threadId = takeFlag(args, "--thread") ?? null;
          let projectId = takeFlag(args, "--project") ?? null;
          const prompt = args.join(" ").trim();
          if (!prompt || (!threadId && !projectId)) break;
          try {
            if (threadId) projectId = await threadProject(threadId);
          } catch (cause) {
            return { exitCode: 1, stderr: cause instanceof Error ? cause.message : String(cause) };
          }
          const task = store.create({ prompt, projectId: projectId!, threadId, status: "todo" });
          engine.changed();
          return reply(toPublic(task), `Added ${line(task)}`);
        }
        case "run": {
          const task = args[0] ? store.get(args[0]) : null;
          if (!task) return { exitCode: 1, stderr: "No task with that id. Run `bb task-board list`." };
          const result = await engine.runNow({ ...task, error: null });
          return reply(toPublic(result.task), result.message ?? `Started ${line(result.task)}`);
        }
      }
      return { exitCode: 1, stderr: usage };
    },
  });
}
