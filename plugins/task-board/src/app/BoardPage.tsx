import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  experimental_useAppPanel,
  experimental_useFixedTabTarget,
  useBbNavigate,
  type PluginNavPanelProps,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { Task, TaskStatus } from "../contract.js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TASK_TAB, useTaskRpc, useTasks, useThreadDirectory } from "./data.js";
import { projectName, sortProjects, TRIGGER_CLASS } from "./fields.js";
import { COLUMNS, errorMessage, parseTaskId } from "./format.js";
import { NewTaskDialog } from "./NewTaskDialog.js";
import { ProjectDot, StatusGlyph, TONES, isWaitingOnUser } from "./status.js";
import { TaskCard, triggerLabel } from "./TaskCard.js";
import { useCollapsedSidebar } from "./useCollapsedSidebar.js";
import { usePointerDrag, type DropTarget } from "./drag.js";
import { DISPLAY_OPTIONS, useCardDisplay } from "./display.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL_PROJECTS = "__all__";
const NO_THREADS: readonly PluginSidebarThread[] = [];
const FILTER_KEY = "task-board:project-filter";
const DONE_PREVIEW = 15;

/** Four columns when they fit, a sideways scroll in between, one list on phones. */
type Layout = "columns" | "scroll" | "list";
const COLUMN_MIN = 252;

function readFilter(): string {
  try {
    return window.localStorage.getItem(FILTER_KEY) ?? ALL_PROJECTS;
  } catch {
    return ALL_PROJECTS;
  }
}

/**
 * Your order wins: cards keep the position you dragged them to. Only cards
 * that need you (failed, waiting) float up, and pinned cards lead Done.
 */
function sortColumn(status: TaskStatus, tasks: Task[], waiting: (task: Task) => boolean): Task[] {
  if (status === "done") {
    return [...tasks].sort((a, b) => Number(b.pinnedAt !== null) - Number(a.pinnedAt !== null) || a.position - b.position);
  }
  return [...tasks].sort(
    (a, b) =>
      Number(b.error !== null) - Number(a.error !== null) ||
      Number(waiting(b)) - Number(waiting(a)) ||
      a.position - b.position,
  );
}

function useLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>("columns");
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = (width: number) => setLayout(width < 600 ? "list" : width < COLUMN_MIN * 4 + 60 ? "scroll" : "columns");
    measure(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => measure(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, layout };
}

export function BoardPage({ subPath }: PluginNavPanelProps) {
  const rpc = useTaskRpc();
  const navigate = useBbNavigate();
  const panel = experimental_useAppPanel();
  const tabTarget = experimental_useFixedTabTarget(TASK_TAB);
  const { tasks, error, patchLocal, refetch } = useTasks();
  const directory = useThreadDirectory();
  const { ref, layout } = useLayout();
  useCollapsedSidebar();
  const { display, toggle: toggleDisplay, reset: resetDisplay } = useCardDisplay();
  const [projectFilter, setProjectFilter] = useState(readFilter);
  const [listStatus, setListStatus] = useState<TaskStatus>("todo");
  const [showAllDone, setShowAllDone] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  // "Working · 4m" and "2h ago" stay current without a data change.
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [creating, setCreating] = useState(false);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  const routeTaskId = parseTaskId(subPath);

  useEffect(() => {
    rpc.call("getPreferences").then((preferences) => setLastProjectId(preferences.lastProjectId), () => undefined);
  }, [rpc, creating]);

  const [flashId, setFlashId] = useState<string | null>(null);
  // Filled once the drag hook exists; a drop must not also open the card.
  const justDraggedRef = useRef<() => boolean>(() => false);
  const focusCard = useCallback((taskId: string) => {
    setFlashId(taskId);
    // Scroll now, and again once the side panel has opened and reflowed the board.
    const reveal = () => {
      const card = document.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(taskId)}"]`);
      if (!card) return;
      // Sideways first: bring the card's column fully into the board's view.
      const board = card.closest<HTMLElement>("[data-board-columns]");
      const column = card.closest<HTMLElement>("section");
      if (board && column && board.scrollWidth > board.clientWidth) {
        const boardBox = board.getBoundingClientRect();
        const columnBox = column.getBoundingClientRect();
        if (columnBox.left < boardBox.left || columnBox.right > boardBox.right) {
          board.scrollBy({ left: columnBox.left - boardBox.left - 16, behavior: "smooth" });
        }
      }
      // Then down the column's own list.
      const list = card.closest<HTMLElement>("[data-card-list]");
      if (list) {
        const listBox = list.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        if (cardBox.top < listBox.top || cardBox.bottom > listBox.bottom) {
          list.scrollBy({ top: cardBox.top - listBox.top - 12, behavior: "smooth" });
        }
      }
    };
    window.requestAnimationFrame(reveal);
    window.setTimeout(reveal, 320);
    window.setTimeout(reveal, 750);
  }, []);
  useEffect(() => {
    if (flashId === null) return;
    const timer = window.setTimeout(() => setFlashId(null), 1400);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  const openTask = useCallback(
    (taskId: string) => {
      if (justDraggedRef.current()) return;
      // Focus first: a tab already showing this task declines a second open.
      focusCard(taskId);
      if (!panel.openTab({ tab: TASK_TAB, target: { taskId } })) return;
      navigate.toPluginPanel("board", { subPath: `task/${encodeURIComponent(taskId)}` });
    },
    [focusCard, navigate, panel],
  );
  const openThreadInSplit = useCallback((threadId: string) => navigate.toThread(threadId, { split: true }), [navigate]);

  // A refreshed or shared /task/<id> route reopens its tab once.
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (!routeTaskId || restored.current === routeTaskId) return;
    restored.current = routeTaskId;
    if (tabTarget?.target.taskId !== routeTaskId) panel.openTab({ tab: TASK_TAB, target: { taskId: routeTaskId } });
    focusCard(routeTaskId);
  }, [focusCard, panel, routeTaskId, tabTarget]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_KEY, projectFilter);
    } catch {
      // Private mode: the filter simply does not persist.
    }
  }, [projectFilter]);

  const projects = useMemo(() => sortProjects(directory.projectList), [directory.projectList]);
  const filterIsKnown = projectFilter === ALL_PROJECTS || directory.projects.has(projectFilter) || directory.status !== "ready";
  const activeFilter = filterIsKnown ? projectFilter : ALL_PROJECTS;

  const tasksById = useMemo(() => new Map((tasks ?? []).map((task) => [task.id, task])), [tasks]);
  const columns = useMemo(() => {
    const inProject = (tasks ?? []).filter((task) => activeFilter === ALL_PROJECTS || task.projectId === activeFilter);
    const visible = inProject.filter((task) => (task.hiddenAt !== null) === showHidden);
    return COLUMNS.map((column) => ({
      ...column,
      tasks: sortColumn(
        column.status,
        visible.filter((task) => task.status === column.status || (column.status === "todo" && task.status === "queued")),
        (task) =>
          task.threadId !== null &&
          (isWaitingOnUser(directory.threads.get(task.threadId)) || directory.descendants(task.threadId).some(isWaitingOnUser)),
      ),
    }));
  }, [activeFilter, tasks, showHidden, directory]);
  const hiddenCount = useMemo(
    () => (tasks ?? []).filter((task) => task.hiddenAt !== null && (activeFilter === ALL_PROJECTS || task.projectId === activeFilter)).length,
    [activeFilter, tasks],
  );

  const toggleHidden = useCallback(
    (task: Task) => {
      const hidden = task.hiddenAt === null;
      patchLocal(task.id, { hiddenAt: hidden ? Date.now() : null });
      rpc.call("setHidden", { id: task.id, hidden }).then(
        () => toast(hidden ? "Hidden from the board" : "Back on the board"),
        (cause) => {
          toast.error(errorMessage(cause));
          refetch();
        },
      );
    },
    [patchLocal, refetch, rpc],
  );

  const selectedId = tabTarget?.target.taskId ?? routeTaskId;
  const defaultProjectId =
    activeFilter !== ALL_PROJECTS
      ? activeFilter
      : lastProjectId && directory.projects.has(lastProjectId)
        ? lastProjectId
        : (projects.find((project) => !project.isPersonal)?.id ?? projects[0]?.id ?? null);

  // "c" opens New task, like Linear.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.key !== "c") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/u.test(target.tagName))) return;
      event.preventDefault();
      setCreating(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function performDrop(id: string, target: DropTarget) {
    const task = tasksById.get(id);
    if (!task) return;
    // Scheduled tasks sit in Todo: moving one around Todo keeps its schedule.
    const status = target.status === "todo" && task.status === "queued" ? "queued" : target.status;
    const { beforeId } = target;
    if (beforeId === id) return;
    if (task.status !== status) patchLocal(task.id, { status });
    try {
      const result = await rpc.call("moveTask", { id: task.id, status, beforeId });
      if (result.message) toast(result.message);
      else if (status === "running" && task.status !== "running") toast("Started");
      if (status === "queued" && result.task.trigger.kind === "at" && task.trigger.kind === "none") openTask(task.id);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      refetch();
    }
  }
  const drag = usePointerDrag((id, target) => void performDrop(id, target));
  justDraggedRef.current = drag.justDragged;
  const draggedTask = drag.active ? tasksById.get(drag.active.id) : undefined;

  const togglePinned = useCallback(
    (task: Task) => {
      const pinned = task.pinnedAt === null;
      patchLocal(task.id, { pinnedAt: pinned ? Date.now() : null, ...(pinned ? { hiddenAt: null } : {}) });
      rpc.call("setPinned", { id: task.id, pinned }).then(
        () => toast(pinned ? "Pinned: it stays on the board" : "Unpinned"),
        (cause) => {
          toast.error(errorMessage(cause));
          refetch();
        },
      );
    },
    [patchLocal, refetch, rpc],
  );

  function renderCards(column: (typeof columns)[number]) {
    const doneOverflow = column.status === "done" && !showAllDone && column.tasks.length > DONE_PREVIEW;
    const shown = doneOverflow ? column.tasks.slice(0, DONE_PREVIEW) : column.tasks;
    const isDropColumn = drag.target?.status === column.status;
    const placeholder = isDropColumn && drag.active && draggedTask ? (
      <DropPlaceholder height={drag.active.height} label={dropLabel(draggedTask.status, column.status)} />
    ) : null;
    return (
      <>
        {tasks === null ? (
          <div className="grid gap-2" aria-hidden>
            <div className="h-[84px] animate-pulse rounded-xl bg-muted/70" />
            <div className="h-[84px] animate-pulse rounded-xl bg-muted/40" />
          </div>
        ) : shown.length === 0 && !isDropColumn ? (
          <EmptyColumn status={column.status} text={column.empty} onCreate={column.status === "todo" ? () => setCreating(true) : undefined} />
        ) : null}
        {shown.map((task) => (
          <div key={task.id} className={cn("group/card relative", drag.active?.id === task.id && "hidden")}>
            {isDropColumn && drag.target?.beforeId === task.id ? placeholder : null}
            {task.status === "done" ? (
              <button
                type="button"
                onClick={() => togglePinned(task)}
                aria-label={task.pinnedAt === null ? "Pin on board" : "Unpin"}
                title={task.pinnedAt === null ? "Pin: never hide or delete" : "Unpin"}
                className={cn(
                  "absolute -top-1.5 right-6 z-10 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100",
                  task.pinnedAt === null
                    ? "text-muted-foreground opacity-0 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
                    : "text-amber-600 opacity-100 dark:text-amber-400",
                )}
              >
                <Icon name="Pin" className="size-3" />
              </button>
            ) : null}
            {task.status !== "running" || task.error !== null ? (
              <button
                type="button"
                onClick={() => toggleHidden(task)}
                aria-label={task.hiddenAt === null ? "Hide from board" : "Show on board"}
                title={task.hiddenAt === null ? "Hide" : "Unhide"}
                className="absolute -right-1.5 -top-1.5 z-10 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Icon name={task.hiddenAt === null ? "EyeOff" : "Eye"} fallback="X" className="size-3" />
              </button>
            ) : null}
            <TaskCard
              task={task}
              thread={task.threadId ? directory.threads.get(task.threadId) : undefined}
              subAgents={task.threadId ? directory.descendants(task.threadId) : NO_THREADS}
              flash={flashId === task.id}
              display={display}
              onOpenThread={openThreadInSplit}
              projectName={activeFilter === ALL_PROJECTS ? projectName(directory.projects.get(task.projectId)) : null}
              trigger={task.status === "queued" ? triggerLabel(task, tasksById) : null}
              selected={selectedId === task.id}
              minute={minute}
              onOpen={openTask}
              onPointerDown={drag.start}
            />
          </div>
        ))}
        {isDropColumn && drag.target?.beforeId === null ? placeholder : null}
        {doneOverflow ? (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setShowAllDone(true)}>
            Show {column.tasks.length - DONE_PREVIEW} older
          </Button>
        ) : null}
      </>
    );
  }

  const listColumn = columns.find((column) => column.status === listStatus) ?? columns[0]!;

  return (
    <div ref={ref} className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-3 md:px-5">
        <Select value={activeFilter} onValueChange={setProjectFilter}>
          <SelectTrigger aria-label="Project" className={cn(TRIGGER_CLASS, "w-auto min-w-0 max-w-60 gap-2")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={ALL_PROJECTS}>
              <span className="flex items-center gap-2">
                <Icon name="Layers" className="size-3.5 text-muted-foreground" aria-hidden />
                All projects
              </span>
            </SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <span className="flex items-center gap-2">
                  <ProjectDot projectId={project.id} />
                  {projectName(project)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hiddenCount > 0 || showHidden ? (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={showHidden}
            onClick={() => setShowHidden((value) => !value)}
            className="h-9 gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground"
          >
            <Icon name={showHidden ? "Eye" : "EyeOff"} fallback="X" className="size-4" aria-hidden />
            {showHidden ? "Showing hidden" : "Hidden"}
            <span className="tabular-nums opacity-70">{hiddenCount}</span>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground" aria-label="Card display">
              <Icon name="SlidersHorizontal" fallback="Settings" className="size-4" aria-hidden />
              <span className="hidden sm:inline">Display</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Show on cards</DropdownMenuLabel>
            {DISPLAY_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.key}
                checked={display[option.key]}
                onCheckedChange={(checked) => toggleDisplay(option.key, checked === true)}
                onSelect={(event) => event.preventDefault()}
              >
                <span className="grid">
                  <span className="text-[13px]">{option.label}</span>
                  <span className="text-[11px] text-muted-foreground">{option.detail}</span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={resetDisplay} className="text-[13px] text-muted-foreground">
              Reset to defaults
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="flex-1" />
        <Button size="sm" className="h-9 gap-1.5 rounded-lg px-3" onClick={() => setCreating(true)} aria-keyshortcuts="c">
          <Icon name="Plus" className="size-4" aria-hidden />
          <span>New task</span>
          <kbd className="ml-1 hidden rounded border border-background/25 px-1 font-sans text-[10px] leading-4 opacity-70 sm:inline">C</kbd>
        </Button>
      </div>

      {error ? (
        <div role="alert" className="mx-4 mb-2 flex items-center gap-3 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-600 md:mx-5 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" className="h-7" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : null}

      {layout === "list" ? (
        <>
          <div role="tablist" aria-label="Status" className="flex shrink-0 gap-1 overflow-x-auto px-4 pb-2">
            {columns.map((column) => {
              const active = column.status === listStatus;
              return (
                <button
                  key={column.status}
                  data-drop-column={column.status}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setListStatus(column.status)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-state-hover",
                    active && "bg-foreground/[0.07] text-foreground",
                  )}
                >
                  <StatusGlyph tone={column.status} />
                  {column.title}
                  <CountPill status={column.status} count={column.tasks.length} />
                </button>
              );
            })}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6 pt-2" data-card-list data-drop-column={listColumn.status}>
            {renderCards(listColumn)}
          </div>
        </>
      ) : (
        <div data-board-columns className={cn("flex min-h-0 flex-1 gap-3 px-4 pb-4 md:px-5", layout === "scroll" && "snap-x snap-proximity scroll-px-4 overflow-x-auto md:scroll-px-5")}>
          {columns.map((column) => {
            const isDropColumn = drag.target?.status === column.status;
            return (
              <section
                key={column.status}
                aria-label={column.title}
                data-drop-column={column.status}
                className={cn(
                  "flex min-h-0 flex-col rounded-2xl bg-muted/35 transition-colors",
                  layout === "columns" ? "min-w-0 flex-1 basis-0" : "w-[272px] shrink-0 snap-start",
                  isDropColumn && "bg-muted/70 ring-1 ring-inset ring-foreground/15",
                  drag.active && !isDropColumn && "bg-muted/25",
                )}
              >
                <header className="flex h-11 shrink-0 items-center gap-2 px-3.5 pt-1">
                  <StatusGlyph tone={column.status} />
                  <h2 className="text-[13px] font-semibold text-foreground">{column.title}</h2>
                  <CountPill status={column.status} count={tasks === null ? null : column.tasks.length} />
                  <span className="flex-1" />
                  {column.status === "todo" ? (
                    <Button variant="ghost" size="icon" className="size-7 rounded-md text-muted-foreground" aria-label="New task" onClick={() => setCreating(true)}>
                      <Icon name="Plus" className="size-4" />
                    </Button>
                  ) : null}
                </header>
                <div data-card-list className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5 pt-2">{renderCards(column)}</div>
              </section>
            );
          })}
        </div>
      )}

      {drag.active && draggedTask ? (
        <div
          ref={drag.overlayRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-50 opacity-95 drop-shadow-2xl"
          style={{ width: drag.active.width }}
        >
          <TaskCard
            task={draggedTask}
            thread={draggedTask.threadId ? directory.threads.get(draggedTask.threadId) : undefined}
            subAgents={draggedTask.threadId ? directory.descendants(draggedTask.threadId) : NO_THREADS}
            flash={false}
            display={display}
            onOpenThread={openThreadInSplit}
            projectName={activeFilter === ALL_PROJECTS ? projectName(directory.projects.get(draggedTask.projectId)) : null}
            trigger={draggedTask.status === "queued" ? triggerLabel(draggedTask, tasksById) : null}
            selected={false}
            onOpen={noop}
            onPointerDown={noop}
          />
        </div>
      ) : null}

      <NewTaskDialog
        open={creating}
        defaults={{ projectId: defaultProjectId }}
        onOpenChange={setCreating}
        onCreated={(task) => {
          refetch();
          if (layout === "list") setListStatus(task.status);
        }}
      />
    </div>
  );
}

function CountPill({ status, count }: { status: TaskStatus; count: number | null }) {
  if (count === null) return null;
  return (
    <span className={cn("inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums", count > 0 ? TONES[status].soft : "bg-foreground/[0.05]", count > 0 ? TONES[status].text : "text-muted-foreground")}>
      {count}
    </span>
  );
}

function EmptyColumn({ status, text, onCreate }: { status: TaskStatus; text: string; onCreate?: () => void }) {
  if (onCreate) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-7 text-center text-[13px] text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-state-hover hover:text-foreground"
      >
        <Icon name="Plus" className="size-4" aria-hidden />
        Add a task
      </button>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-[12px] text-muted-foreground/80">
      <StatusGlyph tone={status} className="size-4 opacity-60" />
      {text}
    </div>
  );
}

const noop = () => undefined;

/** What dropping a card in a column will do, said on the drop slot. */
function dropLabel(from: TaskStatus, to: TaskStatus): string | null {
  if (from === to) return null;
  return { todo: "Back to Todo", queued: "Schedule it", running: "Drop to start now", done: "Mark done" }[to];
}

function DropPlaceholder({ height, label }: { height: number; label: string | null }) {
  return (
    <div
      aria-hidden
      className="mb-2 flex items-center justify-center rounded-xl border-2 border-dashed border-sky-500/50 bg-sky-500/[0.06] text-[12px] font-medium text-sky-700 dark:text-sky-300"
      style={{ height: Math.max(48, Math.min(height, 160)) }}
    >
      {label}
    </div>
  );
}
