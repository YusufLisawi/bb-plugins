import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  experimental_useAppPanel,
  useBbContext,
  useBbNavigate,
  useRpc,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Icon } from "../../../components/ui/icon.js";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label.js";
import { SelectItem } from "../../components/ui/select.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import type {
  ConnectionStatus,
  CreateTaskInput,
  DispatchProject,
  DispatchTask,
  MineTasksResponse,
  TaskStatus,
} from "../../types.js";
import { NewTaskDialog } from "../components/NewTaskDialog.js";
import { FORM_CONTROL_CLASS } from "../components/controlStyles.js";
import { SelectField } from "../components/SelectField.js";
import { TaskRow } from "../components/TaskRow.js";
import { parseTaskId, STATUS_OPTIONS, taskMatchesProject } from "../lib/helpers.js";
import { TASK_DETAIL_TAB } from "../panels/task-detail-tab.js";

type Tab = "mine" | "unclaimed";
type StatusFilter = "open" | "all" | TaskStatus;

export function DispatchPage({ subPath }: { subPath: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const appPanel = experimental_useAppPanel();
  const { projectId: currentBbProjectId } = useBbContext();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [data, setData] = useState<MineTasksResponse | null>(null);
  const [remoteProjects, setRemoteProjects] = useState<DispatchProject[]>([]);
  const [mappedProjects, setMappedProjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [projectFilter, setProjectFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickProject, setQuickProject] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const openedTaskId = useRef<string | null>(null);
  const taskId = parseTaskId(subPath);

  const refresh = useCallback(async (showActivity = false) => {
    if (showActivity) setRefreshing(true);
    setError(null);
    try {
      const connection = await rpc.call("status");
      setStatus(connection);
      if (!connection.connected) {
        setData(null);
        return;
      }
      const [mine, projects] = await Promise.all([
        rpc.call("listMine"),
        rpc.call("listProjects"),
      ]);
      setData(mine);
      setRemoteProjects(projects.projects);
      setMappedProjects(projects.mapped);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Dispatch tasks.");
    } finally {
      setLoading(false);
      if (showActivity) setRefreshing(false);
    }
  }, [rpc]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (quickProject) return;
    const mapped = currentBbProjectId ? mappedProjects[currentBbProjectId] : undefined;
    setQuickProject(mapped ?? remoteProjects[0]?.slug ?? "");
  }, [currentBbProjectId, mappedProjects, quickProject, remoteProjects]);

  // Preserve direct task URLs while delegating the actual detail surface to
  // BB's host-owned right panel. The target itself remains session-scoped.
  useEffect(() => {
    if (!taskId) {
      openedTaskId.current = null;
      return;
    }
    if (openedTaskId.current === taskId) return;
    if (appPanel.openFixedTab({
      surface: { kind: "current" },
      tab: TASK_DETAIL_TAB,
      target: { taskId },
    })) {
      openedTaskId.current = taskId;
    }
  }, [appPanel, taskId]);

  const projectOptions = remoteProjects.length > 0
    ? remoteProjects
    : data
      ? Object.values(data.projects)
      : [];

  const projectById = data?.projects ?? {};
  const filteredTasks = useMemo(() => {
    const sourceTasks = data ? (tab === "mine" ? data.mine : data.open) : [];
    return sourceTasks.filter((task) => {
      if (statusFilter === "open" && task.status === "done") return false;
      if (statusFilter !== "open" && statusFilter !== "all" && task.status !== statusFilter) return false;
      if (projectFilter !== "all" && !taskMatchesProject(task, projectFilter)) return false;
      return true;
    });
  }, [data, projectFilter, statusFilter, tab]);

  const activeFilterCount = Number(statusFilter !== "open") + Number(projectFilter !== "all");

  const grouped = useMemo(() => {
    const groups = new Map<string, DispatchTask[]>();
    for (const task of filteredTasks) {
      const list = groups.get(task.projectId) ?? [];
      list.push(task);
      groups.set(task.projectId, list);
    }
    return [...groups.entries()].sort((a, b) => {
      const aName = projectById[a[0]]?.name ?? "Unknown";
      const bName = projectById[b[0]]?.name ?? "Unknown";
      return aName.localeCompare(bName);
    });
  }, [filteredTasks, projectById]);

  async function createQuickTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title || !quickProject) return;
    setQuickSaving(true);
    try {
      await rpc.call("createTask", { project: quickProject, title });
      setQuickTitle("");
      toast.success("Task created");
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not create the task.");
    } finally {
      setQuickSaving(false);
    }
  }

  async function createTask(input: CreateTaskInput) {
    await rpc.call("createTask", input);
    toast.success("Task created");
    await refresh();
  }

  function openTask(task: DispatchTask) {
    setFiltersOpen(false);
    if (!appPanel.openFixedTab({
      surface: { kind: "current" },
      tab: TASK_DETAIL_TAB,
      target: { taskId: task.id },
    })) {
      toast.error("Could not open the BB task panel.");
      return;
    }
    openedTaskId.current = task.id;
    navigate.toPluginPanel("tasks", { subPath: `task/${encodeURIComponent(task.id)}` });
  }

  if (loading && !status) return <LoadingState />;
  if (!status?.connected) return <ConnectionCard error={status?.error ?? error} />;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background text-foreground">
      <main className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-4 sm:py-4">
        <header className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold tracking-tight">My work</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Assigned to {status.user?.name ?? "you"}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => void refresh(true)} disabled={refreshing}>
                <Icon name="RotateCcw" className={refreshing ? "animate-spin" : undefined} aria-hidden="true" />
                Refresh
              </Button>
              <Button type="button" size="sm" className="h-8 px-2.5" onClick={() => setNewTaskOpen(true)}>
                <Icon name="Plus" aria-hidden="true" />
                New task
              </Button>
            </div>
          </div>

          <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]" onSubmit={createQuickTask} aria-label="Quick add task">
            <div className="min-w-0 flex-1">
              <Label className="sr-only" htmlFor="quick-add-title">Quick add task</Label>
              <Input
                id="quick-add-title"
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Add a task…"
                className={FORM_CONTROL_CLASS}
              />
            </div>
            <SelectField
              id="quick-add-project"
              label="Project for quick add"
              labelClassName="sr-only"
              value={quickProject}
              onValueChange={setQuickProject}
              placeholder="Project"
              className="w-full"
            >
              {projectOptions.map((project) => <SelectItem key={project.id} value={project.slug}>{project.name}</SelectItem>)}
            </SelectField>
            <Button type="submit" size="sm" variant="outline" className="h-8" disabled={quickSaving || !quickTitle.trim() || !quickProject}>{quickSaving ? "Adding…" : "Add"}</Button>
          </form>

          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70">
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <TabsList aria-label="Task view" className="h-8 justify-start gap-4 rounded-none bg-transparent p-0">
                <TabsTrigger value="mine" className="h-8 rounded-none border-b-2 border-transparent px-0 py-0 text-xs data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">Mine</TabsTrigger>
                <TabsTrigger value="unclaimed" className="h-8 rounded-none border-b-2 border-transparent px-0 py-0 text-xs data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">Unclaimed</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mb-0.5 h-7 px-2 text-xs"
              aria-expanded={filtersOpen}
              aria-controls="task-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Icon name="SlidersHorizontal" className="size-3.5" aria-hidden="true" />
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </Button>
          </div>

          {filtersOpen ? (
            <div id="task-filters" className="grid gap-3 rounded-md bg-muted/20 p-3 sm:grid-cols-2">
              <SelectField
                id="task-status-filter"
                label="Status"
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectItem value="open">Open tasks</SelectItem>
                <SelectItem value="all">All tasks</SelectItem>
                {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectField>
              <SelectField id="task-project-filter" label="Project" value={projectFilter} onValueChange={setProjectFilter}>
                <SelectItem value="all">All projects</SelectItem>
                {projectOptions.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectField>
            </div>
          ) : null}
        </header>

        <section className="grid gap-3 py-3" aria-label="Dispatch tasks">
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}
          {grouped.length === 0 ? (
            <EmptyState tab={tab} onCreate={() => setNewTaskOpen(true)} />
          ) : (
            <div className="overflow-hidden rounded-md border border-border/70 bg-background">
              {grouped.map(([projectId, tasks]) => (
                <details key={projectId} open className="group border-t border-border/70 first:border-t-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-medium transition-colors hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon name="ChevronRight" className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                      <span className="truncate">{projectById[projectId]?.name ?? "Unknown project"}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-normal text-muted-foreground">{tasks.length}</span>
                  </summary>
                  <div className="border-t border-border/60">
                    {tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={() => openTask(task)} />)}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </main>

      <NewTaskDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        projects={projectOptions}
        defaultProjectSlug={quickProject}
        parentOptions={data?.mine.filter((task) => !task.parentTaskId) ?? []}
        onCreate={createTask}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4" role="status" aria-label="Loading Dispatch tasks">
      <div className="mx-auto grid w-full max-w-4xl gap-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-3 w-36" /></div>
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-full" />
        <div className="overflow-hidden rounded-md border border-border/70">
          {[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-12 rounded-none border-b border-border/60 last:border-b-0" />)}
        </div>
      </div>
    </div>
  );
}

function ConnectionCard({ error }: { error: string | null | undefined }) {
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mx-auto grid w-full max-w-md gap-3 pt-10">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon name="Lock" className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-base font-semibold">Connect Dispatch</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Add a connection in Settings → Extensions → Dispatch to see your work here.</p>
        </div>
        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}
        <p className="text-xs leading-5 text-muted-foreground">Your API key stays on the BB server and is never exposed to this panel.</p>
      </div>
    </div>
  );
}

function EmptyState({ tab, onCreate }: { tab: Tab; onCreate: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border-y border-border/70 px-4 py-10 text-center">
      <h2 className="text-sm font-medium">{tab === "mine" ? "No open tasks" : "No unclaimed tasks"}</h2>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{tab === "mine" ? "Create a task or change the filters to see completed work." : "Everything visible to you is already claimed."}</p>
      {tab === "mine" ? <Button type="button" size="sm" variant="outline" className="mt-3 h-8" onClick={onCreate}>Create a task</Button> : null}
    </div>
  );
}
