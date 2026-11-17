import { randomUUID } from "node:crypto";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type {
  Outcome,
  RepeatKind,
  Task,
  TaskExecution,
  TaskRepeat,
  TaskStatus,
  TaskTrigger,
  TriggerKind,
} from "../contract.js";

type Database = ReturnType<BbPluginApi["storage"]["database"]>;

interface TaskRow {
  id: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  priority: number;
  position: number;
  project_id: string;
  thread_id: string | null;
  worktree: number;
  origin: "board" | "thread";
  hidden_at: number | null;
  pinned_at: number | null;
  provider_id: string | null;
  model: string | null;
  reasoning_level: string | null;
  service_tier: string | null;
  permission_mode: TaskExecution["permissionMode"];
  trigger_kind: TriggerKind;
  trigger_at: number | null;
  trigger_task_id: string | null;
  repeat_kind: RepeatKind;
  repeat_time: string;
  repeat_weekday: number;
  error: string | null;
  outcome: Outcome | null;
  waiting_reason: string | null;
  awaiting_dispatch_id: string | null;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  finished_at: number | null;
}

/** Server-only fields a task carries beside its public shape. */
export interface StoredTask extends Task {
  /** A queued bb message the task's turn waits behind, if delivery queued. */
  awaitingDispatchId: string | null;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    prompt TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    position REAL NOT NULL,
    project_id TEXT NOT NULL,
    thread_id TEXT,
    provider_id TEXT,
    model TEXT,
    reasoning_level TEXT,
    service_tier TEXT,
    permission_mode TEXT,
    trigger_kind TEXT NOT NULL DEFAULT 'none',
    trigger_at INTEGER,
    trigger_task_id TEXT,
    repeat_kind TEXT NOT NULL DEFAULT 'none',
    repeat_time TEXT NOT NULL DEFAULT '09:00',
    repeat_weekday INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    outcome TEXT,
    waiting_reason TEXT,
    awaiting_dispatch_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    started_at INTEGER,
    finished_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_status ON tasks (status)`,
  `CREATE INDEX IF NOT EXISTS tasks_thread ON tasks (thread_id)`,
  `ALTER TABLE tasks ADD COLUMN worktree INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tasks ADD COLUMN origin TEXT NOT NULL DEFAULT 'board'`,
  `ALTER TABLE tasks ADD COLUMN hidden_at INTEGER`,
  `CREATE INDEX IF NOT EXISTS tasks_awaiting_dispatch ON tasks (awaiting_dispatch_id) WHERE awaiting_dispatch_id IS NOT NULL`,
  `ALTER TABLE tasks ADD COLUMN pinned_at INTEGER`,
];

function fromRow(row: TaskRow): StoredTask {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    status: row.status,
    priority: row.priority,
    position: row.position,
    projectId: row.project_id,
    threadId: row.thread_id,
    worktree: row.worktree === 1,
    origin: row.origin,
    hiddenAt: row.hidden_at,
    pinnedAt: row.pinned_at,
    execution: {
      providerId: row.provider_id,
      model: row.model,
      reasoningLevel: row.reasoning_level,
      serviceTier: row.service_tier,
      permissionMode: row.permission_mode,
    },
    trigger: { kind: row.trigger_kind, at: row.trigger_at, taskId: row.trigger_task_id },
    repeat: { kind: row.repeat_kind, time: row.repeat_time, weekday: row.repeat_weekday },
    error: row.error,
    outcome: row.outcome,
    waitingReason: row.waiting_reason,
    awaitingDispatchId: row.awaiting_dispatch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function toRow(task: StoredTask): TaskRow {
  return {
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    status: task.status,
    priority: task.priority,
    position: task.position,
    project_id: task.projectId,
    thread_id: task.threadId,
    worktree: task.worktree ? 1 : 0,
    origin: task.origin,
    hidden_at: task.hiddenAt,
    pinned_at: task.pinnedAt,
    provider_id: task.execution.providerId,
    model: task.execution.model,
    reasoning_level: task.execution.reasoningLevel,
    service_tier: task.execution.serviceTier,
    permission_mode: task.execution.permissionMode,
    trigger_kind: task.trigger.kind,
    trigger_at: task.trigger.at,
    trigger_task_id: task.trigger.taskId,
    repeat_kind: task.repeat.kind,
    repeat_time: task.repeat.time,
    repeat_weekday: task.repeat.weekday,
    error: task.error,
    outcome: task.outcome,
    waiting_reason: task.waitingReason,
    awaiting_dispatch_id: task.awaitingDispatchId,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    started_at: task.startedAt,
    finished_at: task.finishedAt,
  };
}

/** Strips server-only fields before a task crosses the RPC boundary. */
export function toPublic(task: StoredTask): Task {
  const { awaitingDispatchId: _hidden, ...rest } = task;
  return rest;
}

export const NO_EXECUTION: TaskExecution = {
  providerId: null,
  model: null,
  reasoningLevel: null,
  serviceTier: null,
  permissionMode: null,
};
export const NO_TRIGGER: TaskTrigger = { kind: "none", at: null, taskId: null };
export const NO_REPEAT: TaskRepeat = { kind: "none", time: "09:00", weekday: 1 };

/** Scheduled tasks live in the Todo column, so the two share one order. */
function columnStatuses(status: TaskStatus): TaskStatus[] {
  return status === "todo" || status === "queued" ? ["todo", "queued"] : [status];
}

export class TaskStore {
  private readonly db: Database;

  constructor(bb: BbPluginApi) {
    this.db = bb.storage.database();
    bb.storage.migrate(this.db, MIGRATIONS);
  }

  list(): StoredTask[] {
    const rows = this.db.prepare("SELECT * FROM tasks ORDER BY position").all() as TaskRow[];
    return rows.map(fromRow);
  }

  get(id: string): StoredTask | null {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    return row ? fromRow(row) : null;
  }

  byStatus(status: TaskStatus): StoredTask[] {
    const rows = this.db
      .prepare("SELECT * FROM tasks WHERE status = ? ORDER BY position")
      .all(status) as TaskRow[];
    return rows.map(fromRow);
  }

  /** The task currently occupying a thread: running, flagged or not. */
  runningOnThread(threadId: string): StoredTask | null {
    const row = this.db
      .prepare("SELECT * FROM tasks WHERE status = 'running' AND thread_id = ? LIMIT 1")
      .get(threadId) as TaskRow | undefined;
    return row ? fromRow(row) : null;
  }

  /** The newest card the board added on its own for a thread, if any. */
  latestThreadCard(threadId: string): StoredTask | null {
    const row = this.db
      .prepare("SELECT * FROM tasks WHERE thread_id = ? AND origin = 'thread' ORDER BY created_at DESC LIMIT 1")
      .get(threadId) as TaskRow | undefined;
    return row ? fromRow(row) : null;
  }

  byDispatch(queuedMessageId: string): StoredTask | null {
    const row = this.db.prepare("SELECT * FROM tasks WHERE awaiting_dispatch_id = ? LIMIT 1").get(queuedMessageId) as TaskRow | undefined;
    return row ? fromRow(row) : null;
  }

  /**
   * Deletes Done cards hidden before `cutoff`, unless another task still
   * waits on them. Returns how many.
   */
  deleteHiddenDoneBefore(cutoff: number): number {
    return this.db
      .prepare(
        `DELETE FROM tasks WHERE status = 'done' AND hidden_at IS NOT NULL AND hidden_at < ? AND pinned_at IS NULL
           AND id NOT IN (SELECT trigger_task_id FROM tasks WHERE trigger_task_id IS NOT NULL)`,
      )
      .run(cutoff).changes;
  }

  /** Hides Done cards that finished before `cutoff`. Returns how many. */
  hideDoneBefore(cutoff: number, now: number): number {
    return this.db
      .prepare("UPDATE tasks SET hidden_at = ?, updated_at = ? WHERE status = 'done' AND hidden_at IS NULL AND pinned_at IS NULL AND finished_at IS NOT NULL AND finished_at < ?")
      .run(now, now, cutoff).changes;
  }

  /** A position before every card in the column: where finished work lands. */
  startPosition(status: TaskStatus): number {
    const row = this.db
      .prepare("SELECT MIN(position) AS min FROM tasks WHERE status = ?")
      .get(status) as { min: number | null };
    return (row.min ?? 0) - 1024;
  }

  /** A position after every card in the column. */
  endPosition(status: TaskStatus): number {
    const statuses = columnStatuses(status);
    const row = this.db
      .prepare(`SELECT MAX(position) AS max FROM tasks WHERE status IN (${statuses.map(() => "?").join(", ")})`)
      .get(...statuses) as { max: number | null };
    return (row.max ?? 0) + 1024;
  }

  /** A position just before `beforeId` in its column. */
  positionBefore(status: TaskStatus, beforeId: string, movingId: string): number {
    const column = columnStatuses(status)
      .flatMap((member) => this.byStatus(member))
      .sort((a, b) => a.position - b.position)
      .filter((task) => task.id !== movingId);
    const index = column.findIndex((task) => task.id === beforeId);
    if (index === -1) return this.endPosition(status);
    const next = column[index]!.position;
    const previous = index === 0 ? next - 2048 : column[index - 1]!.position;
    return (previous + next) / 2;
  }

  create(fields: Partial<StoredTask> & Pick<StoredTask, "projectId" | "status">): StoredTask {
    const now = Date.now();
    const task: StoredTask = {
      id: randomUUID().slice(0, 12),
      title: "",
      prompt: "",
      priority: 0,
      position: this.endPosition(fields.status),
      threadId: null,
      worktree: false,
      origin: "board",
      hiddenAt: null,
      pinnedAt: null,
      execution: NO_EXECUTION,
      trigger: NO_TRIGGER,
      repeat: NO_REPEAT,
      error: null,
      outcome: null,
      waitingReason: null,
      awaitingDispatchId: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
      ...fields,
    };
    const row = toRow(task);
    const columns = Object.keys(row);
    this.db
      .prepare(
        `INSERT INTO tasks (${columns.join(", ")}) VALUES (${columns.map((c) => `@${c}`).join(", ")})`,
      )
      .run(row);
    return task;
  }

  save(task: StoredTask): StoredTask {
    const next = { ...task, updatedAt: Date.now() };
    const row = toRow(next);
    const assignments = Object.keys(row)
      .filter((column) => column !== "id")
      .map((column) => `${column} = @${column}`)
      .join(", ");
    this.db.prepare(`UPDATE tasks SET ${assignments} WHERE id = @id`).run(row);
    return next;
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    // A chain that pointed at the deleted task starts as if it had finished.
    this.db
      .prepare("UPDATE tasks SET trigger_kind = 'thread-free', trigger_task_id = NULL WHERE trigger_task_id = ? AND thread_id IS NOT NULL")
      .run(id);
    this.db
      .prepare("UPDATE tasks SET trigger_kind = 'none', trigger_task_id = NULL, status = 'todo' WHERE trigger_task_id = ? AND status = 'queued'")
      .run(id);
    return result.changes > 0;
  }
}
