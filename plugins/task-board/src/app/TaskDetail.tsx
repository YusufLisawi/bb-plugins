import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ThreadChat,
  experimental_VoiceInputTextarea as VoiceInputTextarea,
  experimental_useFixedTabTarget,
  useBbNavigate,
  type PluginNavPanelProps,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { RepeatKind, Task, TaskPatch, TaskTrigger, TriggerKind } from "../contract.js";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TASK_TAB, useTask, useTaskRpc, useTasks, useThreadDirectory, type TaskTabTarget } from "./data.js";
import { ExecutionPicker } from "./execution.js";
import { Field, ProjectSelect, ThreadSelect, TRIGGER_CLASS, WorktreeSwitch, projectName, worktreeBlocker } from "./fields.js";
import { PRIORITIES, REPEAT_LABELS, WEEKDAYS, errorMessage, formatWhen, fromLocalInput, parseTaskId, taskLabel, toLocalInput } from "./format.js";
import { Chip, ProjectDot, StatusGlyph, TONES, isWaitingOnUser, toneOf } from "./status.js";
import { PriorityGlyph, ThreadLabel } from "./TaskCard.js";

const INPUT_CLASS =
  "h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-[13px] text-foreground outline-none focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]";

/** The host tab a card opens. */
export function TaskDetailPanel({ subPath }: PluginNavPanelProps) {
  const target = experimental_useFixedTabTarget<TaskTabTarget>(TASK_TAB);
  const taskId = target?.target.taskId ?? parseTaskId(subPath);
  if (!taskId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <StatusGlyph tone="todo" className="size-5" />
        <p className="text-[13px] text-muted-foreground">Pick a card to see its thread and settings here.</p>
      </div>
    );
  }
  return (
    <TooltipProvider delayDuration={300}>
      <TaskDetail key={`${target?.sequence ?? 0}-${taskId}`} taskId={taskId} onGone={() => target?.clear()} />
    </TooltipProvider>
  );
}

function IconAction({ label, shortcut, icon, onClick }: { label: string; shortcut?: string; icon: string; onClick(): void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-foreground" aria-label={label} onClick={onClick}>
          <Icon name={icon} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut ? <span className="ml-2 opacity-60">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function TaskDetail({ taskId, onGone }: { taskId: string; onGone(): void }) {
  const rpc = useTaskRpc();
  const navigate = useBbNavigate();
  const { task, setTask, error } = useTask(taskId);
  const directory = useThreadDirectory();
  const [tab, setTab] = useState<"thread" | "task" | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const thread = task?.threadId ? directory.threads.get(task.threadId) : undefined;
  const activeTab = task?.threadId ? (tab ?? "thread") : "task";

  // Ctrl/⌘ ⇧ O opens the full thread; Ctrl/⌘ ⇧ S opens it in a split.
  useEffect(() => {
    const threadId = task?.threadId;
    if (!threadId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key !== "o" && key !== "s") return;
      event.preventDefault();
      navigate.toThread(threadId, key === "s" ? { split: true } : undefined);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, task?.threadId]);

  if (task === undefined) {
    return error ? (
      <div role="alert" className="p-6 text-[13px] text-red-600 dark:text-red-400">{error}</div>
    ) : (
      <div className="grid gap-3 p-5" aria-busy>
        <div className="h-6 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted/70" />
        <div className="mt-2 h-48 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }
  if (task === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-[13px] text-muted-foreground">
        This task was deleted.
        <Button size="sm" variant="outline" onClick={() => { onGone(); navigate.toPluginPanel("board", { subPath: "", replace: true }); }}>
          Back to the board
        </Button>
      </div>
    );
  }

  const current = task;
  const ownTone = toneOf(current, thread);
  const tone = ownTone === "running" && current.threadId && directory.descendants(current.threadId).some(isWaitingOnUser) ? "waiting" : ownTone;
  const runningClean = current.status === "running" && current.error === null;
  const project = directory.projects.get(current.projectId);

  async function act(work: () => Promise<{ task: Task; message: string | null } | Task>) {
    setBusy(true);
    try {
      const result = await work();
      if ("message" in result) {
        setTask(result.task);
        if (result.message) toast(result.message);
      } else {
        setTask(result);
      }
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function save(patch: TaskPatch) {
    try {
      setTask(await rpc.call("updateTask", { id: current.id, patch }));
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  const primary = current.error
    ? { label: "Retry", icon: "RotateCcw", run: () => act(() => rpc.call("retryTask", { id: current.id })) }
    : current.status === "running"
      ? { label: "Mark done", icon: "Check", run: () => act(() => rpc.call("markDone", { id: current.id })) }
      : { label: current.status === "done" ? "Run again" : "Run now", icon: "Play", run: () => act(() => rpc.call("runTask", { id: current.id })) };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pb-3 pt-3.5">
        <div className="flex items-start gap-2">
          <span className={cn("mt-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md", TONES[tone].soft)}>
            <StatusGlyph tone={tone} />
          </span>
          <TitleField task={current} onSave={(title) => save({ title })} />
          <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
            {current.threadId ? (
              <>
                <IconAction label="Open in split" shortcut="Ctrl/⌘ ⇧ S" icon="Columns2" onClick={() => navigate.toThread(current.threadId!, { split: true })} />
                <IconAction label="Open full thread" shortcut="Ctrl/⌘ ⇧ O" icon="ArrowUpRight" onClick={() => navigate.toThread(current.threadId!)} />
              </>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground" aria-label="More actions">
                  <Icon name="MoreHorizontal" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {current.status !== "done" ? <DropdownMenuItem onSelect={() => void act(() => rpc.call("markDone", { id: current.id }))}>Mark done</DropdownMenuItem> : null}
                {current.status !== "todo" && !runningClean ? (
                  <DropdownMenuItem onSelect={() => void act(() => rpc.call("moveTask", { id: current.id, status: "todo", beforeId: null }))}>Back to Todo</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onSelect={() => void rpc.call("duplicateTask", { id: current.id }).then(() => toast("Duplicated to Todo"), (cause) => toast.error(errorMessage(cause)))}
                >
                  Duplicate
                </DropdownMenuItem>
                {current.status === "done" ? (
                  <DropdownMenuItem onSelect={() => void act(() => rpc.call("setPinned", { id: current.id, pinned: current.pinnedAt === null }))}>
                    {current.pinnedAt === null ? "Pin (never hide or delete)" : "Unpin"}
                  </DropdownMenuItem>
                ) : null}
                {!runningClean ? (
                  <DropdownMenuItem onSelect={() => void act(() => rpc.call("setHidden", { id: current.id, hidden: current.hiddenAt === null }))}>
                    {current.hiddenAt === null ? "Hide from board" : "Show on board"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 dark:text-red-400" onSelect={() => setConfirmDelete(true)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-8">
          <Chip className={cn(TONES[tone].soft, TONES[tone].text)}>{TONES[tone].label}</Chip>
          <Chip>
            <ProjectDot projectId={current.projectId} className="size-1.5" />
            <span className="truncate">{projectName(project)}</span>
          </Chip>
          <Chip className="max-w-56">
            <ThreadLabel thread={thread} threadId={current.threadId} worktree={current.worktree} />
          </Chip>
          {current.priority > 0 ? (
            <Chip>
              <PriorityGlyph priority={current.priority} />
              {PRIORITIES[current.priority]!.label}
            </Chip>
          ) : null}
          <span className="flex-1" />
          <Button size="sm" className="h-8 gap-1.5 rounded-lg px-3" disabled={busy} onClick={() => void primary.run()}>
            <Icon name={primary.icon} className="size-3.5" aria-hidden />
            {primary.label}
          </Button>
        </div>

        {current.error ? (
          <div role="status" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-[12.5px] leading-snug text-red-600 dark:text-red-400">
            <span className="font-medium">{current.error}.</span> Tasks waiting on this one stay paused until you retry or mark it done.
          </div>
        ) : current.status === "queued" && current.waitingReason ? (
          <p className="mt-2 pl-8 text-[12px] text-muted-foreground">{current.waitingReason}</p>
        ) : null}
      </header>

      {current.threadId ? (
        <div role="tablist" aria-label="Task view" className="mx-4 flex shrink-0 gap-4 border-b border-border/70">
          {(["thread", "task"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={activeTab === value}
              onClick={() => setTab(value)}
              className={cn(
                "-mb-px border-b-2 border-transparent pb-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                activeTab === value && "border-foreground text-foreground",
              )}
            >
              {value === "thread" ? "Thread" : "Settings"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mx-4 shrink-0 border-b border-border/70" />
      )}

      {activeTab === "thread" && current.threadId ? (
        <div className="min-h-0 flex-1">
          <ThreadChat key={current.threadId} threadId={current.threadId} variant="compact" className="h-full" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TaskForm task={current} thread={thread} directory={directory} onSave={save} />
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{taskLabel(current)}”?</AlertDialogTitle>
            <AlertDialogDescription>The card goes away. Its thread and conversation stay in bb.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-600/90"
              onClick={() =>
                void rpc.call("deleteTask", { id: current.id }).then(
                  () => {
                    onGone();
                    navigate.toPluginPanel("board", { subPath: "", replace: true });
                  },
                  (cause) => toast.error(errorMessage(cause)),
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TitleField({ task, onSave }: { task: Task; onSave(title: string): void }) {
  const [value, setValue] = useState(task.title);
  useEffect(() => setValue(task.title), [task.title]);
  return (
    <textarea
      aria-label="Title"
      rows={1}
      value={value}
      placeholder={taskLabel({ title: "", prompt: task.prompt })}
      onChange={(event) => setValue(event.target.value.replace(/\n/gu, ""))}
      onBlur={() => {
        if (value !== task.title) onSave(value.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="field-sizing-content min-w-0 flex-1 resize-none rounded-md bg-transparent px-1 py-1 text-[16px] font-semibold leading-snug text-foreground outline-none placeholder:text-foreground/80 hover:bg-state-hover focus-visible:bg-muted/50"
    />
  );
}

type Directory = ReturnType<typeof useThreadDirectory>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-border/60 px-4 py-4 last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80">{title}</h3>
      {children}
    </section>
  );
}

function TaskForm({ task, thread, directory, onSave }: { task: Task; thread: PluginSidebarThread | undefined; directory: Directory; onSave(patch: TaskPatch): Promise<void> }) {
  const locked = task.status === "running" && task.error === null;
  const [prompt, setPrompt] = useState(task.prompt);
  const [voiceActive, setVoiceActive] = useState(false);
  useEffect(() => setPrompt(task.prompt), [task.prompt]);
  const { tasks } = useTasks();
  const otherTasks = useMemo(() => (tasks ?? []).filter((candidate) => candidate.id !== task.id), [tasks, task.id]);
  const project = directory.projects.get(task.projectId);

  return (
    <div>
      <Section title="Prompt">
        <VoiceInputTextarea
          value={prompt}
          onValueChange={setPrompt}
          onVoiceInputActiveChange={setVoiceActive}
          readOnly={locked}
          aria-label="Prompt"
          placeholder="What should the agent do?"
          rows={6}
          onBlur={() => {
            if (!voiceActive && prompt !== task.prompt) void onSave({ prompt });
          }}
          className="min-h-36 w-full resize-y rounded-xl border border-border/80 bg-background/60 px-3.5 py-3 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40 read-only:opacity-70"
        />
        <p className="text-[12px] text-muted-foreground/80">{locked ? "Sent. Follow up in the Thread tab." : "Saves when you click away."}</p>
      </Section>

      <Section title="Where it runs">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project">
            <ProjectSelect projects={directory.projectList} value={task.projectId} disabled={locked || task.threadId !== null} onChange={(projectId) => void onSave({ projectId })} />
          </Field>
          <Field label="Thread">
            <ThreadSelect
              threads={directory.threadList}
              projectId={task.projectId}
              value={task.threadId}
              current={thread}
              disabled={task.status === "running"}
              onChange={(threadId) => void onSave({ threadId })}
            />
          </Field>
        </div>
        <WorktreeSwitch
          checked={task.worktree}
          disabledReason={task.status === "running" ? "Already running." : worktreeBlocker(project, task.threadId)}
          onChange={(worktree) => void onSave({ worktree })}
        />
        <Field label="Model">
          <ExecutionPicker
            projectId={task.projectId}
            threadId={task.threadId}
            thread={thread}
            value={task.execution}
            disabled={locked}
            onChange={(execution) => void onSave({ execution })}
          />
        </Field>
      </Section>

      <Section title="When it runs">
        <StartField task={task} otherTasks={otherTasks} locked={locked} onSave={onSave} />
        <RepeatField task={task} locked={locked} onSave={onSave} />
        <Field label="Priority">
          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={task.priority === option.value}
                onClick={() => void onSave({ priority: option.value })}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground",
                  task.priority === option.value && "border-foreground/30 bg-foreground/[0.07] text-foreground",
                )}
              >
                {option.value > 0 ? <PriorityGlyph priority={option.value} /> : null}
                {option.value === 0 ? "None" : option.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 px-4 py-4 text-[12px] text-muted-foreground">
        <dt>Created</dt>
        <dd className="text-foreground/80">{formatWhen(task.createdAt)}</dd>
        {task.startedAt ? (
          <>
            <dt>Started</dt>
            <dd className="text-foreground/80">{formatWhen(task.startedAt)}</dd>
          </>
        ) : null}
        {task.finishedAt ? (
          <>
            <dt>Finished</dt>
            <dd className="text-foreground/80">{formatWhen(task.finishedAt)}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

const START_OPTIONS: readonly { value: TriggerKind; label: string; icon: string }[] = [
  { value: "none", label: "Manually", icon: "Hand" },
  { value: "at", label: "At a time", icon: "Clock" },
  { value: "thread-free", label: "When thread is free", icon: "MessageSquare" },
  { value: "after-task", label: "After a task", icon: "ArrowRight" },
];

function presetTimes(): { label: string; at: number }[] {
  const inOneHour = new Date();
  inOneHour.setMinutes(0, 0, 0);
  inOneHour.setHours(inOneHour.getHours() + 1);
  const tonight = new Date();
  tonight.setHours(20, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const presets = [{ label: "Next hour", at: inOneHour.getTime() }];
  if (tonight.getTime() > Date.now() + 30 * 60_000) presets.push({ label: "Tonight 20:00", at: tonight.getTime() });
  presets.push({ label: "Tomorrow 09:00", at: tomorrow.getTime() });
  return presets;
}

function StartField({ task, otherTasks, locked, onSave }: { task: Task; otherTasks: Task[]; locked: boolean; onSave(patch: TaskPatch): Promise<void> }) {
  const trigger = task.trigger;
  const [at, setAt] = useState(trigger.at ? toLocalInput(trigger.at) : "");
  useEffect(() => setAt(trigger.at ? toLocalInput(trigger.at) : ""), [trigger.at]);

  function setKind(kind: TriggerKind) {
    if (kind === trigger.kind) return;
    const next: TaskTrigger =
      kind === "at"
        ? { kind, at: trigger.at ?? presetTimes()[0]!.at, taskId: null }
        : kind === "after-task"
          ? { kind, at: null, taskId: otherTasks.find((candidate) => candidate.status !== "done")?.id ?? otherTasks[0]?.id ?? null }
          : { kind, at: null, taskId: null };
    if (kind === "after-task" && next.taskId === null) {
      toast("Add another task first.");
      return;
    }
    void onSave({ trigger: next });
  }

  const hint =
    trigger.kind === "none"
      ? "Stays in Todo until you run it."
      : trigger.kind === "thread-free"
        ? "Starts as soon as the thread has no running turn. Tasks on one thread go one at a time."
        : trigger.kind === "after-task"
          ? "Starts when that task finishes. If it fails, this one waits."
          : trigger.at
            ? `Starts ${formatWhen(trigger.at)}.`
            : undefined;

  return (
    <Field label="Start" hint={hint}>
      <div className="grid grid-cols-2 gap-1.5">
        {START_OPTIONS.map((option) => {
          const unavailable = option.value === "thread-free" && task.threadId === null;
          return (
            <button
              key={option.value}
              type="button"
              disabled={locked || unavailable}
              aria-pressed={trigger.kind === option.value}
              title={unavailable ? "Pick a thread first" : undefined}
              onClick={() => setKind(option.value)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg border border-border/80 px-3 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
                trigger.kind === option.value && "border-amber-500/45 bg-amber-500/[0.08] text-foreground",
              )}
            >
              <Icon name={option.icon} fallback="Clock" className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
      {trigger.kind === "at" ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {presetTimes().map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={locked}
              onClick={() => void onSave({ trigger: { kind: "at", at: preset.at, taskId: null } })}
              className="h-8 rounded-full border border-border/80 px-3 text-[12px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
          <input
            type="datetime-local"
            aria-label="Start time"
            value={at}
            disabled={locked}
            onChange={(event) => setAt(event.target.value)}
            onBlur={() => {
              const time = fromLocalInput(at);
              if (time !== null && time !== trigger.at) void onSave({ trigger: { kind: "at", at: time, taskId: null } });
            }}
            className={INPUT_CLASS}
          />
        </div>
      ) : null}
      {trigger.kind === "after-task" ? (
        <Select value={trigger.taskId ?? ""} disabled={locked} onValueChange={(taskId) => void onSave({ trigger: { kind: "after-task", at: null, taskId } })}>
          <SelectTrigger className={cn(TRIGGER_CLASS, "mt-1")} aria-label="Task to wait for">
            <SelectValue placeholder="Pick a task" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {otherTasks.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                <span className="flex items-center gap-2">
                  <StatusGlyph tone={toneOf(candidate)} />
                  <span className="block max-w-64 truncate">{taskLabel(candidate)}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </Field>
  );
}

function RepeatField({ task, locked, onSave }: { task: Task; locked: boolean; onSave(patch: TaskPatch): Promise<void> }) {
  const repeat = task.repeat;
  const [time, setTime] = useState(repeat.time);
  useEffect(() => setTime(repeat.time), [repeat.time]);
  return (
    <Field label="Repeat" hint={repeat.kind === "none" ? undefined : "Each run goes to the same thread. The next run is queued when this one finishes."}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={repeat.kind} disabled={locked} onValueChange={(kind) => void onSave({ repeat: { ...repeat, kind: kind as RepeatKind } })}>
          <SelectTrigger className={cn(TRIGGER_CLASS, "w-44")} aria-label="Repeat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(REPEAT_LABELS) as RepeatKind[]).map((kind) => (
              <SelectItem key={kind} value={kind}>
                {REPEAT_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {repeat.kind === "weekly" ? (
          <Select value={String(repeat.weekday)} disabled={locked} onValueChange={(day) => void onSave({ repeat: { ...repeat, weekday: Number(day) } })}>
            <SelectTrigger className={cn(TRIGGER_CLASS, "w-36")} aria-label="Day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((day, index) => (
                <SelectItem key={day} value={String(index)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {repeat.kind !== "none" ? (
          <input
            type="time"
            aria-label={repeat.kind === "hourly" ? "Minute past the hour" : "Time"}
            value={time}
            disabled={locked}
            onChange={(event) => setTime(event.target.value)}
            onBlur={() => {
              if (/^\d\d:\d\d$/u.test(time) && time !== repeat.time) void onSave({ repeat: { ...repeat, time } });
            }}
            className={cn(INPUT_CLASS, "w-28")}
          />
        ) : null}
      </div>
    </Field>
  );
}
