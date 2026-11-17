import { useEffect, useState } from "react";
import { experimental_VoiceInputTextarea as VoiceInputTextarea } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { Task, TaskExecution } from "../contract.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaskRpc, useThreadDirectory } from "./data.js";
import { DEFAULT_EXECUTION, ExecutionPicker } from "./execution.js";
import { Field, ProjectSelect, ThreadSelect, TRIGGER_CLASS, WorktreeSwitch, worktreeBlocker } from "./fields.js";
import { PRIORITIES, errorMessage, formatWhen, fromLocalInput, toLocalInput } from "./format.js";
import { StatusGlyph, type Tone } from "./status.js";
import { PriorityGlyph } from "./TaskCard.js";
import { cn } from "@/lib/utils";

const WORKTREE_KEY = "task-board:worktree";

function readWorktreePreference(): boolean {
  try {
    return window.localStorage.getItem(WORKTREE_KEY) === "1";
  } catch {
    return false;
  }
}

type When = "later" | "now" | "at" | "thread-free";

const WHEN_OPTIONS: readonly { value: When; label: string; detail: string; tone: Tone; activeClass: string }[] = [
  { value: "later", label: "Later", detail: "Keep in Todo", tone: "todo", activeClass: "border-foreground/35 bg-foreground/[0.06]" },
  { value: "now", label: "Now", detail: "Start right away", tone: "running", activeClass: "border-sky-500/50 bg-sky-500/[0.08]" },
  { value: "at", label: "At a time", detail: "Pick when", tone: "queued", activeClass: "border-amber-500/50 bg-amber-500/[0.08]" },
  { value: "thread-free", label: "After thread", detail: "When it's free", tone: "queued", activeClass: "border-amber-500/50 bg-amber-500/[0.08]" },
];

const ACTIONS: Record<When, { label: string; busy: string; icon: string }> = {
  later: { label: "Add to Todo", busy: "Adding…", icon: "Plus" },
  now: { label: "Run now", busy: "Starting…", icon: "Play" },
  at: { label: "Schedule", busy: "Scheduling…", icon: "Clock" },
  "thread-free": { label: "Queue on thread", busy: "Queuing…", icon: "Clock" },
};

function presetTimes(): { label: string; at: number }[] {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  const tonight = new Date();
  tonight.setHours(20, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const presets = [{ label: "Next hour", at: next.getTime() }];
  if (tonight.getTime() > Date.now() + 30 * 60_000) presets.push({ label: "Tonight 20:00", at: tonight.getTime() });
  presets.push({ label: "Tomorrow 09:00", at: tomorrow.getTime() });
  return presets;
}

export interface NewTaskDefaults {
  projectId: string | null;
  prompt?: string;
}

/**
 * Everything a task needs, in one short form: what to do, where it runs,
 * whether it gets its own worktree, and which model. Ends in Add or Run.
 */
export function NewTaskDialog({
  open,
  defaults,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  defaults: NewTaskDefaults;
  onOpenChange(open: boolean): void;
  onCreated(task: Task, ran: boolean): void;
}) {
  const rpc = useTaskRpc();
  const directory = useThreadDirectory();
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [worktree, setWorktree] = useState(readWorktreePreference);
  const [execution, setExecution] = useState<TaskExecution>(DEFAULT_EXECUTION);
  const [priority, setPriority] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [when, setWhen] = useState<When>("later");
  const [at, setAt] = useState(() => presetTimes()[0]!.at);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrompt(defaults.prompt ?? "");
    setProjectId(defaults.projectId);
    setThreadId(null);
    setExecution(DEFAULT_EXECUTION);
    setPriority(0);
    setWhen("later");
    setAt(presetTimes()[0]!.at);
  }, [open, defaults.projectId, defaults.prompt]);

  const project = projectId ? directory.projects.get(projectId) : undefined;
  const thread = threadId ? directory.threads.get(threadId) : undefined;
  const blocker = worktreeBlocker(project, threadId);
  const effectiveWhen: When = when === "thread-free" && threadId === null ? "later" : when;
  const canSubmit = prompt.trim().length > 0 && projectId !== null && !saving && !voiceActive && (effectiveWhen !== "at" || at > Date.now());
  const action = ACTIONS[effectiveWhen];

  async function submit() {
    if (!canSubmit || !projectId) return;
    const run = effectiveWhen === "now";
    setSaving(true);
    try {
      try {
        window.localStorage.setItem(WORKTREE_KEY, worktree ? "1" : "0");
      } catch {
        // Preference only.
      }
      let task = await rpc.call("createTask", {
        prompt: prompt.trim(),
        title: "",
        projectId,
        threadId,
        priority,
        worktree: blocker === null && worktree,
        execution,
        ...(effectiveWhen === "at"
          ? { trigger: { kind: "at" as const, at, taskId: null } }
          : effectiveWhen === "thread-free"
            ? { trigger: { kind: "thread-free" as const, at: null, taskId: null } }
            : {}),
      });
      if (run) {
        const result = await rpc.call("runTask", { id: task.id });
        task = result.task;
        if (result.message) toast(result.message);
      }
      onCreated(task, run);
      onOpenChange(false);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-[15px]">New task</DialogTitle>
          <DialogDescription className="text-[13px]">Write it down now. It waits in Todo until you start it, unless you pick a time.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-5 pb-5">
          <VoiceInputTextarea
            autoFocus
            value={prompt}
            onValueChange={setPrompt}
            onVoiceInputActiveChange={setVoiceActive}
            placeholder="What should the agent do?"
            aria-label="Prompt"
            rows={5}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit();
              }
            }}
            className="min-h-[124px] w-full resize-none rounded-xl border border-border/80 bg-background/60 px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project">
              <ProjectSelect
                projects={directory.projectList}
                value={projectId ?? ""}
                onChange={(next) => {
                  setProjectId(next);
                  setThreadId(null);
                }}
              />
            </Field>
            <Field label="Thread">
              {projectId ? (
                <ThreadSelect threads={directory.threadList} projectId={projectId} value={threadId} current={thread} onChange={setThreadId} />
              ) : (
                <div className="h-9 rounded-lg border border-dashed border-border/80" />
              )}
            </Field>
          </div>

          <WorktreeSwitch checked={worktree} disabledReason={blocker} onChange={setWorktree} />

          <Field label="When">
            <div role="radiogroup" aria-label="When" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {WHEN_OPTIONS.map((option) => {
                const unavailable = option.value === "thread-free" && threadId === null;
                const active = effectiveWhen === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={unavailable}
                    title={unavailable ? "Pick a thread first" : undefined}
                    onClick={() => setWhen(option.value)}
                    className={cn(
                      "flex h-14 flex-col items-start justify-center gap-0.5 rounded-lg border border-border/80 px-3 text-left transition-colors hover:bg-state-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
                      active && option.activeClass,
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                      <StatusGlyph tone={option.tone} />
                      {option.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{option.detail}</span>
                  </button>
                );
              })}
            </div>
            {effectiveWhen === "at" ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {presetTimes().map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={Math.abs(at - preset.at) < 60_000}
                    onClick={() => setAt(preset.at)}
                    className="h-8 rounded-full border border-border/80 px-3 text-[12px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground aria-pressed:border-amber-500/50 aria-pressed:bg-amber-500/10 aria-pressed:text-foreground"
                  >
                    {preset.label}
                  </button>
                ))}
                <input
                  type="datetime-local"
                  aria-label="Start time"
                  value={toLocalInput(at)}
                  onChange={(event) => {
                    const time = fromLocalInput(event.target.value);
                    if (time !== null) setAt(time);
                  }}
                  className="h-8 rounded-lg border border-border/80 bg-background/60 px-2.5 text-[12.5px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            ) : null}
          </Field>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Model" className="flex-1">
              <ExecutionPicker projectId={projectId} threadId={threadId} thread={thread} value={execution} onChange={setExecution} />
            </Field>
            <Field label="Priority">
              <Select value={String(priority)} onValueChange={(value) => setPriority(Number(value))}>
                <SelectTrigger aria-label="Priority" className={`${TRIGGER_CLASS} w-36`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      <span className="flex items-center gap-2">
                        <span className="flex w-3.5 justify-center">
                          <PriorityGlyph priority={option.value} />
                        </span>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter className="flex-row items-center gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:justify-between">
          <span className="hidden text-[12px] text-muted-foreground sm:block">
            <kbd className="font-sans">Ctrl/⌘ Enter</kbd> {action.label.toLowerCase()}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" className="h-8" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 gap-1.5" disabled={!canSubmit} onClick={() => void submit()}>
              <Icon name={action.icon} fallback="Plus" className="size-3.5" aria-hidden />
              {saving ? action.busy : effectiveWhen === "at" ? `Schedule for ${formatWhen(at)}` : action.label}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
