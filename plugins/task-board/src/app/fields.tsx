import { useId, useMemo, type ReactNode } from "react";
import type { PluginSidebarProject, PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ProjectDot } from "./status.js";

const NEW_THREAD = "__new__";
export const TRIGGER_CLASS = "h-9 rounded-lg border-border/80 bg-background/60 text-[13px] shadow-none";

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="text-[12px] leading-snug text-muted-foreground/80">{hint}</span> : null}
    </div>
  );
}

export function projectName(project: PluginSidebarProject | undefined): string {
  if (!project) return "Project";
  return project.isPersonal ? "Personal" : project.name;
}

export function sortProjects(projects: readonly PluginSidebarProject[]): PluginSidebarProject[] {
  return [...projects].sort((a, b) => Number(a.isPersonal) - Number(b.isPersonal) || a.name.localeCompare(b.name));
}

export function ProjectSelect({ projects, value, disabled, onChange }: { projects: readonly PluginSidebarProject[]; value: string; disabled?: boolean; onChange(projectId: string): void }) {
  const sorted = useMemo(() => sortProjects(projects), [projects]);
  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger aria-label="Project" className={TRIGGER_CLASS}>
        <SelectValue placeholder="Project" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {sorted.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <span className="flex items-center gap-2">
              <ProjectDot projectId={project.id} />
              {projectName(project)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** "New thread" or one of the project's live threads, newest work first. */
export function ThreadSelect({
  threads,
  projectId,
  value,
  current,
  disabled,
  onChange,
}: {
  threads: readonly PluginSidebarThread[];
  projectId: string;
  value: string | null;
  current?: PluginSidebarThread;
  disabled?: boolean;
  onChange(threadId: string | null): void;
}) {
  const options = useMemo(
    () => threads.filter((thread) => thread.projectId === projectId && !thread.isArchived && !thread.isHidden).slice(0, 80),
    [threads, projectId],
  );
  return (
    <Select value={value ?? NEW_THREAD} disabled={disabled} onValueChange={(next) => onChange(next === NEW_THREAD ? null : next)}>
      <SelectTrigger aria-label="Thread" className={TRIGGER_CLASS}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={NEW_THREAD}>
          <span className="flex items-center gap-2">
            <Icon name="Plus" className="size-3.5 text-muted-foreground" aria-hidden />
            New thread
          </span>
        </SelectItem>
        {value && !options.some((thread) => thread.id === value) ? <SelectItem value={value}>{current?.displayTitle ?? "Current thread"}</SelectItem> : null}
        {options.map((thread) => (
          <SelectItem key={thread.id} value={thread.id}>
            <span className="block max-w-72 truncate">{thread.displayTitle}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * One switch: a new thread works on its own git branch, or in the project's
 * checkout. bb picks the branch name.
 */
export function WorktreeSwitch({
  checked,
  disabledReason,
  onChange,
}: {
  checked: boolean;
  disabledReason: string | null;
  onChange(checked: boolean): void;
}) {
  const id = useId();
  const disabled = disabledReason !== null;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-background/60 px-3 py-2.5 transition-colors hover:bg-state-hover",
        checked && !disabled && "border-emerald-500/40 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.09]",
        disabled && "cursor-not-allowed opacity-60 hover:bg-background/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground",
          checked && !disabled && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        )}
      >
        <Icon name="GitBranch" fallback="Layers" className="size-4" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[13px] font-medium text-foreground">Own worktree</span>
        <span className="text-[12px] leading-snug text-muted-foreground">
          {disabledReason ?? (checked ? "Works on a fresh branch. bb names it for you." : "Works directly in the project folder.")}
        </span>
      </span>
      <Switch id={id} size="default" checked={checked && !disabled} disabled={disabled} onCheckedChange={onChange} aria-label="Own worktree" />
    </label>
  );
}

export function worktreeBlocker(project: PluginSidebarProject | undefined, threadId: string | null): string | null {
  if (threadId !== null) return "Uses the thread's own workspace.";
  if (project?.isPersonal) return "Personal tasks have no git repository.";
  return null;
}
