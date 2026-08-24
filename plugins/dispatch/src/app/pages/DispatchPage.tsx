import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useBbContext, useBbNavigate, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import type {
  ConnectionStatus,
  CreateTaskInput,
  DispatchProject,
  DispatchTask,
  MineTasksResponse,
  TaskStatus,
} from "../../types.js";
import { NewTaskDialog } from "../components/NewTaskDialog.js";
import { TaskRow } from "../components/TaskRow.js";
import { parseTaskId, STATUS_OPTIONS, taskMatchesProject } from "../lib/helpers.js";
import { TaskDetail } from "../panels/TaskDetail.js";

type Tab = "mine" | "unclaimed";
type StatusFilter = "open" | "all" | TaskStatus;

export function DispatchPage({ subPath }: { subPath: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
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

  const projectOptions = remoteProjects.length > 0
    ? remoteProjects
    : data
      ? Object.values(data.projects)
      : [];

  const projectById = data?.projects ?? {};
  const sourceTasks = data ? (tab === "mine" ? data.mine : data.open) : [];
  const filteredTasks = sourceTasks.filter((task) => {
    if (statusFilter === "open" && task.status === "done") return false;
    if (statusFilter !== "open" && statusFilter !== "all" && task.status !== statusFilter) return false;
    if (projectFilter !== "all" && !taskMatchesProject(task, projectFilter)) return false;
    return true;
  });

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
    navigate.toPluginPanel("tasks", { subPath: `task/${encodeURIComponent(task.id)}` });
  }

  if (loading && !status) return <LoadingState />;
  if (!status?.connected) return <ConnectionCard error={status?.error ?? error} />;

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <div className={`flex min-w-0 flex-1 flex-col ${taskId ? "hidden md:flex" : ""}`}>
        <div className="border-b border-border px-4 py-4 md:px-5">
          <div className="mx-auto w-full max-w-4xl space-y-3">
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

            <form className="flex flex-wrap gap-2" onSubmit={createQuickTask} aria-label="Quick add task">
              <label className="sr-only" htmlFor="quick-add-title">Quick add task</label>
              <input id="quick-add-title" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="Add a task…" className="h-9 min-w-48 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
              <label className="sr-only" htmlFor="quick-add-project">Project for quick add</label>
              <select id="quick-add-project" value={quickProject} onChange={(event) => setQuickProject(event.target.value)} className="h-9 max-w-52 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring">
                {projectOptions.map((project) => <option key={project.id} value={project.slug}>{project.name}</option>)}
              </select>
              <Button type="submit" size="sm" variant="outline" disabled={!quickTitle.trim() || !quickProject}>Add</Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="Task view">
                <Button type="button" size="sm" variant="ghost" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")} className={tab === "mine" ? "bg-state-active text-foreground" : "text-muted-foreground"}>Mine</Button>
                <Button type="button" size="sm" variant="ghost" role="tab" aria-selected={tab === "unclaimed"} onClick={() => setTab("unclaimed")} className={tab === "unclaimed" ? "bg-state-active text-foreground" : "text-muted-foreground"}>Unclaimed</Button>
              </div>
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
              <div id="task-filters" className="grid gap-3 rounded-md border border-border bg-card p-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium" htmlFor="task-status-filter">Status</label>
                  <select id="task-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring">
                    <option value="open">Open tasks</option>
                    <option value="all">All tasks</option>
                    {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium" htmlFor="task-project-filter">Project</label>
                  <select id="task-project-filter" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring">
                    <option value="all">All projects</option>
                    {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
        <div className="mx-auto w-full max-w-4xl space-y-3">
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
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onOpen={() => openTask(task)}
                    />
                  ))}
                </div>
              </details>
            </Card>
          ))}
        </div>
        </div>

        <NewTaskDialog
          open={newTaskOpen}
          onOpenChange={setNewTaskOpen}
          projects={projectOptions}
          defaultProjectSlug={quickProject}
          parentOptions={data?.mine.filter((task) => !task.parentTaskId) ?? []}
          onCreate={createTask}
        />
      </div>

      {taskId ? (
        <aside className="min-w-0 flex-1 shrink-0 border-l border-border bg-background md:flex-none md:w-[30rem] lg:w-[34rem]" aria-label="Task details">
          <TaskDetail subPath={subPath} onClose={() => navigate.toPluginPanel("tasks", { subPath: "" })} />
        </aside>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-5 w-28 rounded bg-muted" /><div className="h-3 w-36 rounded bg-muted" /></div>
          <div className="h-8 w-24 rounded bg-muted" />
        </div>
        <div className="h-9 w-full rounded-md bg-muted" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {[1, 2, 3, 4].map((row) => <div key={row} className="h-14 border-b border-border/70 last:border-b-0" />)}
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
