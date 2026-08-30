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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../components/ui/label.js";
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
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [projectFilter, setProjectFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickProject, setQuickProject] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const openedTaskId = useRef<string | null>(null);
  const taskId = parseTaskId(subPath);

  const refresh = useCallback(async () => {
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
    try {
      await rpc.call("createTask", { project: quickProject, title });
      setQuickTitle("");
      toast.success("Task created");
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not create the task.");
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
      <main className="mx-auto w-full max-w-4xl px-4 py-4 md:px-5">
        <header className="space-y-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-balance text-lg font-semibold">My work</h1>
              <p className="mt-1 text-pretty text-xs text-muted-foreground">Assigned to {status.user?.name ?? "you"}.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading}>Refresh</Button>
              <Button type="button" size="sm" onClick={() => setNewTaskOpen(true)}>New task</Button>
            </div>
          </div>

          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={createQuickTask} aria-label="Quick add task">
            <div className="min-w-0 flex-1">
              <Label className="sr-only" htmlFor="quick-add-title">Quick add task</Label>
              <Input
                id="quick-add-title"
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Add a task…"
              />
            </div>
            <SelectField
              id="quick-add-project"
              label="Project for quick add"
              labelClassName="sr-only"
              value={quickProject}
              onValueChange={setQuickProject}
              placeholder="Project"
              className="w-full sm:w-52"
            >
              {projectOptions.map((project) => <SelectItem key={project.id} value={project.slug}>{project.name}</SelectItem>)}
            </SelectField>
            <Button type="submit" size="sm" variant="outline" disabled={!quickTitle.trim() || !quickProject}>Add</Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <TabsList aria-label="Task view" className="h-8 rounded-md">
                <TabsTrigger value="mine" className="px-2.5 text-xs">Mine</TabsTrigger>
                <TabsTrigger value="unclaimed" className="px-2.5 text-xs">Unclaimed</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-expanded={filtersOpen}
              aria-controls="task-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </Button>
          </div>

          {filtersOpen ? (
            <div id="task-filters" className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
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

        <section className="space-y-3 py-4" aria-label="Dispatch tasks">
          {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          {grouped.length === 0 ? (
            <EmptyState tab={tab} onCreate={() => setNewTaskOpen(true)} />
          ) : grouped.map(([projectId, tasks]) => (
            <Card key={projectId} className="overflow-hidden">
              <details open>
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <span className="flex min-w-0 items-center gap-2"><span className="size-2 rounded-full bg-primary" aria-hidden="true" />{projectById[projectId]?.name ?? "Unknown project"}</span>
                  <span className="text-xs font-normal text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
                </summary>
                <div className="border-t border-border">
                  {tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={() => openTask(task)} />)}
                </div>
              </details>
            </Card>
          ))}
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
    <div className="h-full overflow-y-auto p-4 md:p-5" role="status" aria-label="Loading Dispatch tasks">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-3 w-36" /></div>
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-14 rounded-none border-b border-border/70 last:border-b-0" />)}
        </div>
      </div>
    </div>
  );
}

function ConnectionCard({ error }: { error: string | null | undefined }) {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-xl pt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Connect Dispatch</CardTitle>
            <CardDescription className="text-pretty">Add a Dispatch API key in the plugin settings to see your tasks here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive" role="alert">{error}</p> : null}
            <p>Open Settings → Extensions → Dispatch. You can paste a key, import the key used by the CLI, or sign in with your email and password.</p>
            <p className="text-xs">The API key stays on BB’s server and is never exposed to this page.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ tab, onCreate }: { tab: Tab; onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-10">
        <div>
          <h2 className="text-balance font-medium">{tab === "mine" ? "No open tasks" : "No unclaimed tasks"}</h2>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">{tab === "mine" ? "Create a task or open Filters to see completed work." : "Everything visible to you is already claimed."}</p>
        </div>
        <Button type="button" size="sm" onClick={onCreate}>Create a task</Button>
      </CardContent>
    </Card>
  );
}
