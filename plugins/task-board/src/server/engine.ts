import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { TASKS_CHANGED } from "../channels.js";
import type { TaskStatus } from "../contract.js";
import { nextOccurrence } from "../repeat.js";
import { NO_TRIGGER, toPublic, type StoredTask, type TaskStore } from "./store.js";

type Sdk = BbPluginApi["sdk"];
type Thread = Awaited<ReturnType<Sdk["threads"]["get"]>>;

/** Thread states in which a new turn can start right away. */
const FREE_STATUSES = new Set(["idle", "error"]);

/** Above this many tasks a push only signals, and clients refetch. */
const MAX_PUSHED_TASKS = 400;

/** A turn shorter than this is reconciled by events, not by the sweep. */
const SETTLE_MS = 8_000;

export interface LaunchResult {
  task: StoredTask;
  message: string | null;
}

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Owns every task transition that involves a thread: launching, noticing that
 * a turn finished, and starting whatever was waiting on it. All work runs
 * through one serial queue, so two events can never launch the same task.
 */
export class TaskEngine {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly bb: BbPluginApi,
    private readonly store: TaskStore,
    private readonly options: {
      /** Add a card when any thread starts working outside the board. */
      trackThreads: () => boolean;
      /** Hide Done cards this long after they finish; 0 keeps them. */
      autoHideMs: () => number;
      /** Delete hidden Done cards this long after hiding; 0 keeps them. */
      deleteHiddenMs: () => number;
    },
  ) {}

  /** Runs `work` after every earlier engine operation has settled. */
  serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.chain.then(work, work);
    this.chain = next.catch(() => undefined);
    return next;
  }

  private revisionValue = Date.now();
  private publishTimer: ReturnType<typeof setTimeout> | null = null;

  /** Grows on every change, and across reloads, so clients can drop stale lists. */
  get revision(): number {
    return this.revisionValue;
  }

  /**
   * Announces a change. Bursts coalesce into one push that carries the whole
   * list, so open boards update without a round trip.
   */
  changed(): void {
    this.revisionValue = Math.max(this.revisionValue + 1, Date.now());
    if (this.publishTimer !== null) return;
    this.publishTimer = setTimeout(() => {
      this.publishTimer = null;
      const tasks = this.store.list();
      this.bb.realtime.publish(TASKS_CHANGED, {
        revision: this.revisionValue,
        tasks: tasks.length <= MAX_PUSHED_TASKS ? tasks.map(toPublic) : null,
      });
    }, 30);
  }

  dispose(): void {
    if (this.publishTimer !== null) clearTimeout(this.publishTimer);
  }

  private async getThread(threadId: string): Promise<Thread | null> {
    try {
      const thread = await this.bb.sdk.threads.get({ threadId });
      return thread.deletedAt === null ? thread : null;
    } catch {
      return null;
    }
  }

  /** Why the task's thread cannot take a turn now, or null when it can. */
  private async threadBlocker(task: StoredTask): Promise<string | null> {
    if (task.threadId === null) return null;
    const occupant = this.store.runningOnThread(task.threadId);
    if (occupant && occupant.id !== task.id) {
      return occupant.error ? "Paused: an earlier task on this thread needs attention" : "Waiting for the thread's current task";
    }
    const thread = await this.getThread(task.threadId);
    if (!thread) return "The thread no longer exists";
    if (thread.archivedAt !== null) return "The thread is archived";
    if (!FREE_STATUSES.has(thread.status)) return "Waiting for the thread to finish";
    return null;
  }

  private promptText(task: StoredTask): string {
    return task.prompt.trim() || task.title.trim();
  }

  /** Starts a task now. Callers have already decided it should run. */
  private async launch(task: StoredTask): Promise<StoredTask> {
    const text = this.promptText(task);
    if (!text) {
      return this.store.save({ ...task, status: "todo", trigger: NO_TRIGGER, waitingReason: null, error: "Write a prompt before starting this task" });
    }
    const { execution } = task;
    const startedAt = Date.now();
    try {
      if (task.threadId === null) {
        const projects = await this.bb.sdk.projects.list({ includePersonal: true });
        const project = projects.find((candidate) => candidate.id === task.projectId);
        if (!project) throw new Error("The task's project no longer exists");
        const thread = await this.bb.sdk.threads.spawn({
          projectId: task.projectId,
          environment:
            project.kind === "personal"
              ? { type: "host", workspace: { type: "personal" } }
              : task.worktree
                ? { type: "host", hostId: worktreeHost(project), workspace: { type: "managed-worktree", baseBranch: { kind: "default" } } }
                : { type: "project-default" },
          prompt: text,
          ...(task.title.trim() ? { title: task.title.trim() } : {}),
          ...(execution.providerId ? { providerId: execution.providerId } : {}),
          ...(execution.model ? { model: execution.model } : {}),
          ...(execution.reasoningLevel ? { reasoningLevel: execution.reasoningLevel } : {}),
          ...(execution.serviceTier ? { serviceTier: execution.serviceTier } : {}),
          ...(execution.permissionMode ? { permissionMode: execution.permissionMode } : {}),
          pluginMetadata: { taskId: task.id },
        });
        return this.store.save({
          ...task,
          threadId: thread.id,
          status: "running",
          error: null,
          outcome: null,
          waitingReason: null,
          awaitingDispatchId: null,
          startedAt,
          finishedAt: null,
        });
      }

      const result = await this.bb.sdk.threads.send({
        threadId: task.threadId,
        mode: "auto",
        input: [{ type: "text", text, mentions: [] }],
        ...(execution.model ? { model: execution.model } : {}),
        ...(execution.reasoningLevel ? { reasoningLevel: execution.reasoningLevel } : {}),
        ...(execution.permissionMode ? { permissionMode: execution.permissionMode } : {}),
        ...(execution.serviceTier ? { serviceTier: execution.serviceTier } : {}),
      });
      return this.store.save({
        ...task,
        status: "running",
        error: null,
        outcome: null,
        waitingReason: null,
        awaitingDispatchId: result.delivery === "queued" ? result.queuedMessage.id : null,
        startedAt,
        finishedAt: null,
      });
    } catch (cause) {
      this.bb.log.warn(`launch ${task.id} failed: ${describeError(cause)}`);
      return this.store.save({ ...task, status: "running", error: `Could not start: ${describeError(cause)}`, startedAt, waitingReason: null });
    }
  }

  /**
   * Starts `task` if its thread is free; otherwise queues it to start when
   * the thread frees up.
   */
  runNow(task: StoredTask): Promise<LaunchResult> {
    return this.serial(async () => {
      const current = this.store.get(task.id) ?? task;
      const blocker = await this.threadBlocker(current);
      if (blocker === null) {
        const launched = await this.launch(current);
        this.changed();
        return { task: launched, message: launched.error };
      }
      const queued = this.store.save({
        ...current,
        status: "queued",
        trigger: { kind: "thread-free", at: null, taskId: null },
        waitingReason: blocker,
        error: null,
      });
      this.changed();
      return { task: queued, message: `${blocker}. It starts as soon as the thread is free.` };
    });
  }

  /** Whether a queued task's own condition (time, dependency) is met. */
  private triggerMet(task: StoredTask, now: number): boolean {
    switch (task.trigger.kind) {
      case "none":
        return false;
      case "at":
        return task.trigger.at !== null && task.trigger.at <= now;
      case "thread-free":
        return true;
      case "after-task": {
        if (task.trigger.taskId === null) return true;
        const dependency = this.store.get(task.trigger.taskId);
        return dependency === null || (dependency.status === "done" && dependency.outcome !== "failed" && dependency.outcome !== "interrupted");
      }
    }
  }

  /** Launches every queued task whose trigger is met and whose thread is free. */
  pump(): Promise<void> {
    return this.serial(async () => {
      const now = Date.now();
      const launchedThreads = new Set<string>();
      let changed = false;
      for (const task of this.store.byStatus("queued")) {
        if (!this.triggerMet(task, now)) continue;
        if (task.threadId !== null && launchedThreads.has(task.threadId)) continue;
        const blocker = await this.threadBlocker(task);
        if (blocker !== null) {
          if (task.waitingReason !== blocker) {
            this.store.save({ ...task, waitingReason: blocker });
            changed = true;
          }
          continue;
        }
        const launched = await this.launch(task);
        if (launched.threadId !== null) launchedThreads.add(launched.threadId);
        changed = true;
      }
      if (changed) this.changed();
    });
  }

  /** The model a thread is running with, so its auto card can show it. */
  private async threadExecution(threadId: string, providerId: string): Promise<StoredTask["execution"]> {
    try {
      const options = await this.bb.sdk.threads.defaultExecutionOptions({ threadId });
      if (options) {
        return { providerId, model: options.model, reasoningLevel: options.reasoningLevel, serviceTier: null, permissionMode: null };
      }
    } catch {
      // The card simply shows no model.
    }
    return { providerId, model: null, reasoningLevel: null, serviceTier: null, permissionMode: null };
  }

  /** The top-level thread a sub-agent belongs to; a root returns itself. */
  private async rootOf(threadId: string): Promise<string> {
    try {
      const { threads } = await this.bb.sdk.threads.experimental_listAncestors({ threadIds: [threadId] });
      const ancestors = threads.find((entry) => entry.threadId === threadId)?.ancestorIds ?? [];
      return ancestors.at(-1) ?? threadId;
    } catch {
      return threadId;
    }
  }

  /**
   * Whether the thread or any sub-agent under it is still working or waiting
   * on the user. A parent's card stays in progress until the whole family
   * is done.
   */
  private async familyBusy(rootId: string): Promise<boolean> {
    let ids = [rootId];
    try {
      const { threads } = await this.bb.sdk.threads.experimental_listDescendants({ threadIds: [rootId], includeHidden: true });
      ids = [rootId, ...(threads.find((entry) => entry.threadId === rootId)?.descendantIds ?? [])].slice(0, 200);
    } catch {
      // Without the tree, judge by the root alone.
    }
    try {
      const threads = await this.bb.sdk.threads.list({ threadIds: ids, includeHidden: true });
      if (threads.some((thread) => thread.archivedAt === null && !FREE_STATUSES.has(thread.status))) return true;
    } catch {
      return false;
    }
    for (const id of ids) {
      if (await this.waitingOnUser(id)) return true;
    }
    return false;
  }

  /** A question, approval or plan the thread is waiting on the user for. */
  private async waitingOnUser(threadId: string): Promise<boolean> {
    try {
      const pending = await this.bb.sdk.threads.interactions.list({ threadId });
      return pending.some((interaction) => interaction.status === "pending");
    } catch {
      return false;
    }
  }

  /** The way the thread's latest turn ended. */
  private async lastTurnStatus(threadId: string): Promise<"completed" | "failed" | "interrupted" | null> {
    try {
      const rows = await this.bb.sdk.threads.events.list({
        threadId,
        types: ["turn/completed"],
        order: "desc",
        limit: "1",
      });
      const row = rows[0];
      if (!row || row.type !== "turn/completed") return null;
      return row.data.status;
    } catch {
      return null;
    }
  }

  /** Records that the running task's turn ended, then continues chains. */
  private async finish(task: StoredTask, thread: Thread | null, failure: string | null): Promise<void> {
    const turn = failure !== null ? "failed" : task.threadId ? await this.lastTurnStatus(task.threadId) : null;
    if (task.origin === "thread" && turn === "interrupted") {
      // You stopped your own thread: the work is over, not broken.
      this.complete(task, "interrupted");
      return;
    }
    if (turn === "failed" || turn === "interrupted") {
      const reason = failure ?? (turn === "interrupted" ? "The turn was interrupted" : "The turn failed");
      this.store.save({ ...task, error: reason, outcome: turn });
      return;
    }
    if (thread?.status === "error") {
      this.store.save({ ...task, error: failure ?? "The thread stopped with an error", outcome: "failed" });
      return;
    }
    this.complete(task, "completed");
  }

  /** Moves a task to Done and schedules its next repeat. */
  complete(task: StoredTask, outcome: "completed" | "manual" | "interrupted"): StoredTask {
    const now = Date.now();
    const done = this.store.save({
      ...task,
      status: "done",
      outcome,
      error: null,
      waitingReason: null,
      awaitingDispatchId: null,
      trigger: NO_TRIGGER,
      position: this.store.startPosition("done"),
      finishedAt: now,
      hiddenAt: null,
    });
    const next = nextOccurrence(task.repeat, now);
    if (next !== null) {
      this.store.create({
        title: task.title,
        prompt: task.prompt,
        priority: task.priority,
        projectId: task.projectId,
        worktree: task.worktree,
        // Every run of a repeating task lands in the same thread.
        threadId: task.threadId,
        execution: task.execution,
        repeat: task.repeat,
        status: "queued",
        trigger: { kind: "at", at: next, taskId: null },
      });
      // The finished run keeps its history but stops repeating.
      this.store.save({ ...done, repeat: { ...done.repeat, kind: "none" } });
    }
    return done;
  }

  /** Called for thread lifecycle events and by the sweep. */
  onThreadSettled(threadId: string, failure: string | null): Promise<void> {
    return this.serial(async () => {
      const rootId = await this.rootOf(threadId);
      const task = this.store.runningOnThread(rootId);
      if (!task || task.error !== null || task.awaitingDispatchId !== null) return;
      // A sub-agent's failure is its parent's to handle, not the card's.
      const rootFailure = rootId === threadId ? failure : null;
      const thread = await this.getThread(rootId);
      if (rootFailure === null && thread && !FREE_STATUSES.has(thread.status)) return;
      // Paused on the user, or a sub-agent still working, is not finished.
      if (rootFailure === null && (await this.familyBusy(rootId))) return;
      await this.finish(task, thread, rootFailure);
      this.changed();
    }).then(() => this.pump());
  }

  /**
   * A thread started a turn. When no task is on it, the board shows the work
   * anyway: it brings back that thread's previous auto card, or adds one.
   */
  onThreadActive(threadId: string): Promise<void> {
    if (!this.options.trackThreads()) return Promise.resolve();
    return this.serial(async () => {
      const working = await this.getThread(threadId);
      if (!working || working.archivedAt !== null) return;
      if (working.status !== "active" && working.status !== "starting") return;
      // Sub-agents never get their own card: their work counts for the root.
      const rootId = working.parentThreadId === null ? threadId : await this.rootOf(threadId);
      if (this.store.runningOnThread(rootId)) return;
      const thread = rootId === threadId ? working : await this.getThread(rootId);
      if (!thread || thread.visibility === "hidden" || thread.archivedAt !== null) return;
      threadId = rootId;
      const now = Date.now();
      const title = thread.title ?? thread.titleFallback ?? "";
      const execution = await this.threadExecution(threadId, thread.providerId);
      const previous = this.store.latestThreadCard(threadId);
      if (previous && previous.status === "done") {
        this.store.save({
          ...previous,
          title,
          execution,
          status: "running",
          outcome: null,
          error: null,
          hiddenAt: null,
          position: this.store.endPosition("running"),
          startedAt: now,
          finishedAt: null,
        });
      } else if (!previous || previous.status !== "running") {
        this.store.create({
          title,
          projectId: thread.projectId,
          threadId,
          execution,
          origin: "thread",
          status: "running",
          startedAt: now,
        });
      }
      this.changed();
    });
  }

  onDispatched(queuedMessageId: string): Promise<void> {
    return this.serial(async () => {
      const task = this.store.byDispatch(queuedMessageId);
      if (!task) return;
      this.store.save({ ...task, awaitingDispatchId: null });
    });
  }

  onCancelled(queuedMessageId: string): Promise<void> {
    return this.serial(async () => {
      const task = this.store.byDispatch(queuedMessageId);
      if (!task) return;
      this.store.save({ ...task, awaitingDispatchId: null, error: "The queued message was removed before it ran", outcome: "interrupted" });
      this.changed();
    });
  }

  /**
   * Catches turns whose events were missed (a reload, a restart): any running
   * task whose thread is free again is settled, then due tasks are started.
   */
  /** Auto cards whose thread's model could not be read, tried again later. */
  private modelMisses = new Map<string, number>();

  /** Gives every auto card the model its thread runs on, Done ones too. */
  private async backfillModels(): Promise<void> {
    const now = Date.now();
    for (const task of this.store.list()) {
      if (task.origin !== "thread" || task.threadId === null || task.execution.model !== null) continue;
      if ((this.modelMisses.get(task.id) ?? 0) > now) continue;
      const thread = await this.getThread(task.threadId);
      const execution = thread ? await this.threadExecution(task.threadId, thread.providerId) : null;
      if (!execution || execution.model === null) {
        // Unknown for now: look again in ten minutes, not every sweep.
        this.modelMisses.set(task.id, now + 10 * 60_000);
        continue;
      }
      await this.serial(async () => {
        const current = this.store.get(task.id);
        if (current) this.store.save({ ...current, execution });
      });
      this.changed();
    }
  }

  private childCardsCleaned = false;

  /** Removes cards the board made for sub-agents before they were grouped. */
  private async removeChildCards(): Promise<void> {
    if (this.childCardsCleaned) return;
    this.childCardsCleaned = true;
    for (const task of this.store.list()) {
      if (task.origin !== "thread" || task.threadId === null) continue;
      const thread = await this.getThread(task.threadId);
      if (thread?.parentThreadId) {
        await this.serial(async () => this.store.delete(task.id));
        this.changed();
      }
    }
  }

  async sweep(): Promise<void> {
    await this.removeChildCards();
    const now = Date.now();
    const hideAfter = this.options.autoHideMs();
    if (hideAfter > 0) {
      const hidden = await this.serial(async () => this.store.hideDoneBefore(now - hideAfter, now));
      if (hidden > 0) this.changed();
    }
    const deleteAfter = this.options.deleteHiddenMs();
    if (deleteAfter > 0) {
      // Keeps the table, and every pushed list, from growing forever.
      const deleted = await this.serial(async () => this.store.deleteHiddenDoneBefore(now - deleteAfter));
      if (deleted > 0) this.changed();
    }
    if (this.options.trackThreads()) {
      // Catches threads that were already working before the plugin loaded.
      try {
        for (const running of await this.bb.sdk.threads.listRunning()) {
          if (!this.store.runningOnThread(running.id)) await this.onThreadActive(running.id);
        }
      } catch (cause) {
        this.bb.log.warn(`could not list running threads: ${describeError(cause)}`);
      }
    }
    await this.backfillModels();
    for (const task of this.store.byStatus("running")) {
      if (task.threadId === null || task.error !== null) continue;
      if (task.startedAt !== null && now - task.startedAt < SETTLE_MS) continue;
      const thread = await this.getThread(task.threadId);
      if (!thread) {
        await this.serial(async () => {
          this.store.save({ ...task, error: "The thread no longer exists", outcome: "failed" });
          this.changed();
        });
        continue;
      }
      if (task.awaitingDispatchId !== null && thread.queuedMessageCount === 0 && FREE_STATUSES.has(thread.status)) {
        // The row dispatched while the plugin was not listening.
        await this.serial(async () => {
          const current = this.store.get(task.id);
          if (current) this.store.save({ ...current, awaitingDispatchId: null });
        });
      }
      if (FREE_STATUSES.has(thread.status)) {
        await this.onThreadSettled(task.threadId, null);
      }
    }
    await this.pump();
  }

  /** Puts a card in a column the way dragging it there means. */
  setColumn(task: StoredTask, status: TaskStatus, position: number): Promise<LaunchResult> {
    if (status === "running") {
      return this.runNow({ ...task, position });
    }
    return this.serial(async () => {
      let next: StoredTask;
      let message: string | null = null;
      if (status === "done") {
        next = this.complete({ ...task }, "manual");
        next = this.store.save({ ...next, position });
      } else if (status === "todo") {
        next = this.store.save({
          ...task,
          status: "todo",
          trigger: NO_TRIGGER,
          error: null,
          outcome: null,
          waitingReason: null,
          position,
        });
      } else {
        // Queued needs a condition. A thread task waits for its thread; a
        // new-thread task keeps its time, or starts at the top of the hour.
        const trigger =
          task.trigger.kind !== "none"
            ? task.trigger
            : task.threadId !== null
              ? { kind: "thread-free" as const, at: null, taskId: null }
              : { kind: "at" as const, at: nextHour(), taskId: null };
        if (task.trigger.kind === "none" && trigger.kind === "at") {
          message = "Scheduled for the top of the hour. Open the task to pick another time.";
        }
        next = this.store.save({ ...task, status: "queued", trigger, error: null, outcome: null, position });
      }
      this.changed();
      return { task: next, message };
    }).then(async (result) => {
      await this.pump();
      return { task: this.store.get(result.task.id) ?? result.task, message: result.message };
    });
  }
}

/** The machine holding the project's checkout, where its worktrees live. */
function worktreeHost(project: { sources: readonly { hostId: string; isDefault: boolean }[] }): string {
  const source = project.sources.find((candidate) => candidate.isDefault) ?? project.sources[0];
  if (!source) throw new Error("This project has no folder on any machine, so it cannot get a worktree");
  return source.hostId;
}

function nextHour(): number {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date.getTime();
}
