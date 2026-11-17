// The RPC contract shared by server.ts and the app. The app imports only its
// types, so zod stays out of the frontend bundle.
import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

export const TASK_STATUSES = ["todo", "queued", "running", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** 0 none, 1 low, 2 medium, 3 high, 4 urgent. */
export const priorityValues = [0, 1, 2, 3, 4] as const;

/**
 * When a queued task starts. `thread-free` waits until the task's own thread
 * has no running turn; `after-task` waits for another task to finish.
 */
export const TRIGGER_KINDS = ["none", "at", "thread-free", "after-task"] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

export const REPEAT_KINDS = ["none", "hourly", "daily", "weekdays", "weekly"] as const;
export type RepeatKind = (typeof REPEAT_KINDS)[number];

export const OUTCOMES = ["completed", "failed", "interrupted", "manual"] as const;
export type Outcome = (typeof OUTCOMES)[number];

const permissionModeSchema = z.enum(["accept-edits", "auto", "full"]);

/**
 * The execution a task runs with. Null fields fall back to the thread's (or
 * the project's) defaults at launch.
 */
export const executionSchema = z.object({
  providerId: z.string().min(1).nullable(),
  model: z.string().min(1).nullable(),
  reasoningLevel: z.string().min(1).nullable(),
  serviceTier: z.string().min(1).nullable(),
  permissionMode: permissionModeSchema.nullable(),
});
export type TaskExecution = z.infer<typeof executionSchema>;

export const repeatSchema = z.object({
  kind: z.enum(REPEAT_KINDS),
  /** "HH:MM", local server time; the minute is used by `hourly`. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u),
  /** 0 Sunday … 6 Saturday, used by `weekly`. */
  weekday: z.number().int().min(0).max(6),
});
export type TaskRepeat = z.infer<typeof repeatSchema>;

export const triggerSchema = z.object({
  kind: z.enum(TRIGGER_KINDS),
  /** Epoch ms for `at`. */
  at: z.number().int().nullable(),
  /** The task to wait for, for `after-task`. */
  taskId: z.string().nullable(),
});
export type TaskTrigger = z.infer<typeof triggerSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  status: z.enum(TASK_STATUSES),
  priority: z.number().int().min(0).max(4),
  position: z.number(),
  projectId: z.string(),
  /** The thread the task runs in; null starts a new thread at launch. */
  threadId: z.string().nullable(),
  /** A new thread gets its own git worktree; bb names the branch. */
  worktree: z.boolean(),
  /**
   * "board" for tasks made here; "thread" for a card the board added on its
   * own because a thread started working outside the board.
   */
  origin: z.enum(["board", "thread"]),
  /** Set when hidden by hand, or a day after it reached Done. */
  hiddenAt: z.number().nullable(),
  /** Pinned cards are never hidden or deleted automatically. */
  pinnedAt: z.number().nullable(),
  execution: executionSchema,
  trigger: triggerSchema,
  repeat: repeatSchema,
  /** Set when a launch or turn failed or was interrupted; pauses chains. */
  error: z.string().nullable(),
  outcome: z.enum(OUTCOMES).nullable(),
  /** Why a due task has not started yet, e.g. its thread is still busy. */
  waitingReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  startedAt: z.number().nullable(),
  finishedAt: z.number().nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskPatchSchema = z
  .object({
    title: z.string().max(300),
    prompt: z.string().max(100_000),
    priority: z.number().int().min(0).max(4),
    projectId: z.string().min(1),
    threadId: z.string().min(1).nullable(),
    worktree: z.boolean(),
    execution: executionSchema,
    trigger: triggerSchema,
    repeat: repeatSchema,
  })
  .partial()
  .strict();
export type TaskPatch = z.infer<typeof taskPatchSchema>;

export const createTaskSchema = z
  .object({
    prompt: z.string().max(100_000).default(""),
    title: z.string().max(300).default(""),
    projectId: z.string().min(1),
    threadId: z.string().min(1).nullable().default(null),
    priority: z.number().int().min(0).max(4).default(0),
    worktree: z.boolean().default(false),
    execution: executionSchema.optional(),
    /** Omitted: stays in Todo until started. */
    trigger: triggerSchema.optional(),
  })
  .strict();

const idInput = z.object({ id: z.string().min(1) }).strict();

export const rpcContract = defineRpcContract({
  listTasks: {
    input: z.null(),
    output: z.object({ tasks: z.array(taskSchema), revision: z.number() }),
  },
  getTask: {
    input: idInput,
    output: z.object({ task: taskSchema.nullable() }),
  },
  createTask: {
    input: createTaskSchema,
    output: taskSchema,
  },
  updateTask: {
    input: z.object({ id: z.string().min(1), patch: taskPatchSchema }).strict(),
    output: taskSchema,
  },
  /**
   * Moves a card: to another column and/or before another card. `beforeId`
   * null puts it at the end of the column.
   */
  moveTask: {
    input: z
      .object({
        id: z.string().min(1),
        status: z.enum(TASK_STATUSES),
        beforeId: z.string().min(1).nullable(),
      })
      .strict(),
    output: z.object({ task: taskSchema, message: z.string().nullable() }),
  },
  runTask: {
    input: idInput,
    output: z.object({ task: taskSchema, message: z.string().nullable() }),
  },
  markDone: {
    input: idInput,
    output: taskSchema,
  },
  /** Clears a failure flag and starts the task again. */
  retryTask: {
    input: idInput,
    output: z.object({ task: taskSchema, message: z.string().nullable() }),
  },
  setPinned: {
    input: z.object({ id: z.string().min(1), pinned: z.boolean() }).strict(),
    output: taskSchema,
  },
  setHidden: {
    input: z.object({ id: z.string().min(1), hidden: z.boolean() }).strict(),
    output: taskSchema,
  },
  duplicateTask: {
    input: idInput,
    output: taskSchema,
  },
  deleteTask: {
    input: idInput,
    output: z.object({ deleted: z.boolean() }),
  },
  /** The project and thread a new task defaults to. */
  getPreferences: {
    input: z.null(),
    output: z.object({ lastProjectId: z.string().nullable() }),
  },
});
