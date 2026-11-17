import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  experimental_useSidebarThreads,
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
  type ExperimentalTabTargetReference,
  type JsonValue,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { TASKS_CHANGED } from "../channels.js";
import type { Task, rpcContract } from "../contract.js";
import { errorMessage } from "./format.js";

const NO_DESCENDANTS: readonly PluginSidebarThread[] = [];

export type TaskTabTarget = { taskId: string } & Record<string, JsonValue>;

function isTaskTabTarget(value: JsonValue): value is TaskTabTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.taskId === "string" &&
    /^[\w-]{1,64}$/u.test(value.taskId)
  );
}

/** The right-panel tab a card opens, scoped to the board's nav panel. */
export const TASK_TAB = {
  id: "task",
  context: { kind: "nav-panel", panelId: "board" },
  availability: "fixed",
  experimental_target: { validate: isTaskTabTarget },
} as const satisfies ExperimentalTabTargetReference<TaskTabTarget>;

export function useTaskRpc() {
  return useRpc<typeof rpcContract>();
}

type Rpc = ReturnType<typeof useTaskRpc>;

interface TaskSnapshot {
  tasks: Task[] | null;
  error: string | null;
  revision: number;
}

interface PushPayload {
  revision?: unknown;
  tasks?: unknown;
}

const CACHE_KEY = "task-board:cache:v1";

function readCache(): TaskSnapshot {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { tasks?: unknown };
      if (Array.isArray(parsed.tasks)) return { tasks: parsed.tasks as Task[], error: null, revision: 0 };
    }
  } catch {
    // A broken cache only costs the instant first paint.
  }
  return { tasks: null, error: null, revision: 0 };
}

/**
 * One task list for the whole app: the board, the sidebar badge, and every
 * panel read it. It paints from the last session's copy at once, keeps one
 * request in flight, and takes pushed lists from the server without a round
 * trip.
 */
const store = (() => {
  let snapshot: TaskSnapshot = readCache();
  const listeners = new Set<() => void>();
  let rpc: Rpc | null = null;
  let inflight = false;
  let queued = false;
  let cacheTimer: ReturnType<typeof setTimeout> | null = null;

  function emit(next: TaskSnapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
    if (cacheTimer === null) {
      cacheTimer = setTimeout(() => {
        cacheTimer = null;
        try {
          if (snapshot.tasks) window.localStorage.setItem(CACHE_KEY, JSON.stringify({ tasks: snapshot.tasks.slice(0, 500) }));
        } catch {
          // Storage full or blocked: the board still works.
        }
      }, 500);
    }
  }

  function apply(tasks: Task[], revision: number) {
    // Every open view hears the same push; only the first one applies it.
    if (revision <= snapshot.revision) return;
    emit({ tasks, error: null, revision });
  }

  async function fetchNow(): Promise<void> {
    if (!rpc) return;
    if (inflight) {
      queued = true;
      return;
    }
    inflight = true;
    try {
      const result = await rpc.call("listTasks");
      apply(result.tasks, result.revision);
    } catch (cause) {
      emit({ ...snapshot, error: errorMessage(cause) });
    } finally {
      inflight = false;
      if (queued) {
        queued = false;
        void fetchNow();
      }
    }
  }

  return {
    get: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    bind(next: Rpc) {
      const first = rpc === null;
      rpc = next;
      if (first) void fetchNow();
    },
    refetch: () => void fetchNow(),
    onPush(payload: unknown) {
      const { revision, tasks } = (payload ?? {}) as PushPayload;
      if (typeof revision === "number" && Array.isArray(tasks)) apply(tasks as Task[], revision);
      else void fetchNow();
    },
    /** Shows a change at once; the server's next list confirms or replaces it. */
    patch(id: string, change: Partial<Task>) {
      if (!snapshot.tasks) return;
      emit({ ...snapshot, tasks: snapshot.tasks.map((task) => (task.id === id ? { ...task, ...change } : task)) });
    },
    upsert(task: Task) {
      const tasks = snapshot.tasks ?? [];
      const exists = tasks.some((candidate) => candidate.id === task.id);
      emit({ ...snapshot, tasks: exists ? tasks.map((candidate) => (candidate.id === task.id ? task : candidate)) : [...tasks, task] });
    },
  };
})();

/** Keeps the shared list live. Mounted by every hook; cheap after the first. */
function useTaskStore() {
  const rpc = useTaskRpc();
  useEffect(() => store.bind(rpc), [rpc]);
  useRealtime(TASKS_CHANGED, store.onPush);
  const connection = useRealtimeConnectionState();
  const lastConnection = useRef(connection);
  useEffect(() => {
    if (lastConnection.current !== "connected" && connection === "connected") store.refetch();
    lastConnection.current = connection;
  }, [connection]);
  return useSyncExternalStore(store.subscribe, store.get);
}

export function useTasks() {
  const snapshot = useTaskStore();
  return { tasks: snapshot.tasks, error: snapshot.error, refetch: store.refetch, patchLocal: store.patch };
}

/** One task from the shared list; null once the list is loaded and it is gone. */
export function useTask(id: string) {
  const snapshot = useTaskStore();
  const found = snapshot.tasks?.find((candidate) => candidate.id === id);
  // Only the server's list (revision > 0), not the cached copy, can say it is gone.
  const task = found ?? (snapshot.tasks !== null && snapshot.revision > 0 ? null : undefined);
  const setTask = useCallback((next: Task) => store.upsert(next), []);
  return { task, setTask, error: snapshot.error, refetch: store.refetch };
}

/** Live threads and projects, the same view bb's sidebar draws. */
export function useThreadDirectory() {
  const state = experimental_useSidebarThreads();
  const threads = useMemo(() => new Map(state.threads.map((thread) => [thread.id, thread])), [state.threads]);
  const projects = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects]);
  const children = useMemo(() => {
    const byParent = new Map<string, PluginSidebarThread[]>();
    for (const thread of state.threads) {
      if (thread.parentThreadId === null || thread.isArchived) continue;
      const list = byParent.get(thread.parentThreadId) ?? [];
      list.push(thread);
      byParent.set(thread.parentThreadId, list);
    }
    return byParent;
  }, [state.threads]);
  /** Every live sub-agent under a thread, at any depth. */
  // Cached per thread until the sidebar changes, so a card gets the same
  // array back on every render and its memo holds.
  const descendants = useMemo(() => {
    const cache = new Map<string, readonly PluginSidebarThread[]>();
    return (threadId: string): readonly PluginSidebarThread[] => {
      const cached = cache.get(threadId);
      if (cached) return cached;
      const out: PluginSidebarThread[] = [];
      const queue = [...(children.get(threadId) ?? [])];
      while (queue.length > 0 && out.length < 50) {
        const next = queue.shift()!;
        out.push(next);
        queue.push(...(children.get(next.id) ?? []));
      }
      const result = out.length === 0 ? NO_DESCENDANTS : out;
      cache.set(threadId, result);
      return result;
    };
  }, [children]);
  return { threads, projects, threadList: state.threads, projectList: state.projects, status: state.status, descendants };
}
