import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Markdown,
  experimental_NewThreadComposer as NewThreadComposer,
  experimental_useAppPanel,
  experimental_useFixedTabTarget,
  useBbNavigate,
  useRpc,
  type NewThreadRequest,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Icon } from "../../../components/ui/icon.js";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { SelectItem } from "../../components/ui/select.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import { Textarea } from "../../components/ui/textarea.js";
import type { DispatchComment, DispatchTask, Member, TaskPriority, TaskStatus, TaskVisibility, TaskDetailResponse } from "../../types.js";
import { buildTaskPrompt } from "../../thread-prompt.js";
import { FORM_CONTROL_CLASS, FORM_TEXTAREA_CLASS, INLINE_TITLE_CLASS } from "../components/controlStyles.js";
import { SelectField } from "../components/SelectField.js";
import { StatusPill } from "../components/StatusPill.js";
import { formatRelativeDate, PRIORITY_LABELS, PRIORITY_OPTIONS, STATUS_LABELS, STATUS_OPTIONS, parseTaskId } from "../lib/helpers.js";
import { TASK_DETAIL_TAB, type TaskDetailTabTarget } from "./task-detail-tab.js";

const UNASSIGNED_VALUE = "__dispatch_unassigned__";

/**
 * A host-owned Dispatch task tab. BB supplies the panel chrome and tab strip;
 * this component only renders the selected task content inside that surface.
 */
export function TaskDetailPanel({ subPath }: PluginNavPanelProps) {
  const navigate = useBbNavigate();
  const targetState = experimental_useFixedTabTarget<TaskDetailTabTarget>(TASK_DETAIL_TAB);
  const routeTaskId = parseTaskId(subPath);

  if (!routeTaskId) return <NoTaskSelected />;
  if (!targetState || targetState.target.taskId !== routeTaskId) return <DetailLoading />;

  return (
    <TaskDetailContent
      key={`${targetState.sequence}-${routeTaskId}`}
      taskId={routeTaskId}
      onTaskDeleted={() => {
        targetState.clear();
        navigate.toPluginPanel("tasks", { subPath: "", replace: true });
      }}
    />
  );
}

function TaskDetailContent({ taskId, onTaskDeleted }: { taskId: string; onTaskDeleted: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const appPanel = experimental_useAppPanel();
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [comments, setComments] = useState<DispatchComment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [claimSaving, setClaimSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [subtaskSaving, setSubtaskSaving] = useState(false);
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bbProjectId, setBbProjectId] = useState<string | null>(null);
  const [dispatchBaseUrl, setDispatchBaseUrl] = useState("https://dispatch-kappa-lac.vercel.app");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextDetail, commentResult, status] = await Promise.all([
        rpc.call("getTask", { id: taskId }),
        rpc.call("listComments", { taskId }),
        rpc.call("status"),
      ]);
      setDetail(nextDetail);
      setComments(commentResult.comments);
      setTitle(nextDetail.task.title);
      setDescription(nextDetail.task.description);
      setDescriptionEditing(false);
      setDispatchBaseUrl(status.baseUrl);
      if (nextDetail.project) {
        const [memberResult, mapped] = await Promise.all([
          rpc.call("listMembers", { slug: nextDetail.project.slug }),
          rpc.call("resolveBbProject", { dispatchSlug: nextDetail.project.slug }),
        ]);
        setMembers(memberResult.members);
        setBbProjectId(mapped.bbProjectId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this task.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [taskId, rpc]);

  const task = detail?.task;
  const currentAssignee = task?.assigneeIds[0] ?? "";
  const assigneeOptions = useMemo(() => {
    const known = new Map(members.map((member) => [member.id, member]));
    for (const id of task?.assigneeIds ?? []) {
      if (!known.has(id)) known.set(id, { id, name: `User ${id.slice(-4)}`, email: "", role: "member" });
    }
    return [...known.values()];
  }, [members, task?.assigneeIds]);

  async function patch(patch: { title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority; visibility?: TaskVisibility; assignee?: string | null; claim?: boolean }) {
    if (!task) return;
    setSaving(true);
    try {
      const updated = await rpc.call("patchTask", { id: task.id, patch });
      setDetail((current) => current ? { ...current, task: { ...updated, subtasks: current.task.subtasks } } : current);
      if (patch.title !== undefined) setTitle(patch.title);
      if (patch.description !== undefined) setDescription(patch.description);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not update the task.");
      throw cause;
    } finally {
      setSaving(false);
    }
  }

  async function claimTask() {
    if (!task) return;
    setClaimSaving(true);
    try {
      await patch({ claim: true });
      toast.success("Task claimed");
    } catch {
      // patch already reports the error and restores the current view.
    } finally {
      setClaimSaving(false);
    }
  }

  async function saveDescription() {
    if (!task) return;
    try {
      if (description !== task.description) await patch({ description });
      setDescriptionEditing(false);
    } catch {
      // patch already reports the error and keeps the editor open.
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    setCommentSaving(true);
    try {
      const created = await rpc.call("addComment", { taskId, body: comment.trim(), as: "human" });
      setComments((current) => [...current, created]);
      setComment("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not add the comment.");
    } finally {
      setCommentSaving(false);
    }
  }

  async function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subtaskTitle.trim() || !detail?.project) return;
    setSubtaskSaving(true);
    try {
      await rpc.call("createTask", { project: detail.project.slug, title: subtaskTitle.trim(), parent: taskId });
      setSubtaskTitle("");
      toast.success("Subtask created");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not create the subtask.");
    } finally {
      setSubtaskSaving(false);
    }
  }

  async function deleteTask() {
    try {
      await rpc.call("deleteTask", { id: taskId });
      toast.success("Task deleted");
      setDeleteOpen(false);
      onTaskDeleted();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not delete the task.");
    }
  }

  async function startThread(request: NewThreadRequest) {
    if (!task) return;
    const result = await rpc.call("createThread", { taskId: task.id, request });
    setDetail((current) => current ? { ...current, task: result.task, linkedThreadId: result.threadId } : current);
    setBbProjectId(request.projectId);
    setShowComposer(false);
    toast.success("BB thread started");
  }

  function openTaskInPanel(nextTaskId: string) {
    if (!appPanel.openFixedTab({
      surface: { kind: "current" },
      tab: TASK_DETAIL_TAB,
      target: { taskId: nextTaskId },
    })) {
      toast.error("Could not open the BB task panel.");
      return;
    }
    navigate.toPluginPanel("tasks", { subPath: `task/${encodeURIComponent(nextTaskId)}` });
  }

  if (loading && !detail) return <DetailLoading />;
  if (error && !detail) return <DetailError message={error} onRetry={() => void load()} />;
  if (!task || !detail) return <NoTaskSelected />;

  const prompt = buildTaskPrompt(task, dispatchBaseUrl);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border/70 px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-muted-foreground">{detail.project?.name ?? "Dispatch task"} <span aria-hidden="true">·</span> {task.id}</p>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                const nextTitle = title.trim();
                if (!nextTitle) {
                  setTitle(task.title);
                } else if (nextTitle !== task.title) {
                  void patch({ title: nextTitle }).catch(() => undefined);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setTitle(task.title);
                  event.currentTarget.blur();
                }
              }}
              className={`mt-0.5 ${INLINE_TITLE_CLASS}`}
              aria-label="Task title"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {task.assigneeIds.length === 0 ? <Button type="button" size="sm" variant="outline" className="h-8 px-2.5" onClick={() => void claimTask()} disabled={claimSaving}>{claimSaving ? "Claiming…" : "Claim"}</Button> : null}
            <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => setDeleteOpen(true)} aria-label="Delete task">
              <Icon name="Trash2" className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 px-4 py-4">
        <div className="mx-auto grid w-full max-w-3xl gap-5">
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}

          <section className="grid gap-2" aria-labelledby="description-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="description-heading" className="text-xs font-semibold text-foreground">Description</h2>
              {!descriptionEditing ? (
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDescriptionEditing(true)}>
                  <Icon name="Edit" className="size-3.5" aria-hidden="true" />
                  {task.description ? "Edit" : "Add"}
                </Button>
              ) : null}
            </div>
            {descriptionEditing ? (
              <div className="overflow-hidden rounded-md border border-border/70 bg-muted/15">
                <Label className="sr-only" htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setDescription(task.description);
                      setDescriptionEditing(false);
                    }
                  }}
                  className={`${FORM_TEXTAREA_CLASS} min-h-32 resize-y rounded-none border-0 bg-transparent focus-visible:ring-0`}
                  placeholder="Add context or acceptance criteria…"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-2">
                  <span className="text-[11px] text-muted-foreground">Markdown supported</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setDescription(task.description); setDescriptionEditing(false); }} disabled={saving}>Cancel</Button>
                    <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void saveDescription()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                  </div>
                </div>
              </div>
            ) : task.description ? (
              <Markdown content={task.description} className="text-sm leading-6 text-foreground" />
            ) : (
              <button type="button" onClick={() => setDescriptionEditing(true)} className="border-y border-border/60 py-3 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                Add context, links, or acceptance criteria.
              </button>
            )}
          </section>

          <section className="grid gap-3 border-t border-border/70 pt-4" aria-labelledby="properties-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="properties-heading" className="text-xs font-semibold text-foreground">Properties</h2>
              <span className="text-[11px] text-muted-foreground" aria-live="polite">{saving ? "Saving…" : ""}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField variant="property" id="task-status" label="Status" value={task.status} onValueChange={(value) => void patch({ status: value as TaskStatus }).catch(() => undefined)}>
                {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectField>
              <SelectField variant="property" id="task-priority" label="Priority" value={task.priority} onValueChange={(value) => void patch({ priority: value as TaskPriority }).catch(() => undefined)}>
                {PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectField>
              <SelectField variant="property" id="task-visibility" label="Visibility" value={task.visibility} onValueChange={(value) => void patch({ visibility: value as TaskVisibility }).catch(() => undefined)}>
                <SelectItem value="public">Public to project</SelectItem>
                <SelectItem value="assigned">Private</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectField>
              <SelectField
                variant="property"
                id="task-assignee"
                label="Assignee"
                value={currentAssignee || UNASSIGNED_VALUE}
                onValueChange={(value) => void patch({ assignee: value === UNASSIGNED_VALUE ? null : value }).catch(() => undefined)}
              >
                <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                {assigneeOptions.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
              </SelectField>
            </div>
          </section>

          <section className="grid gap-2 border-t border-border/70 pt-4" aria-labelledby="subtasks-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="subtasks-heading" className="text-xs font-semibold">Subtasks</h2>
              <span className="text-[11px] tabular-nums text-muted-foreground">{detail.subtasks.length}</span>
            </div>
            {detail.subtasks.length === 0 ? (
              <p className="border-y border-border/60 py-3 text-xs text-muted-foreground">No subtasks yet.</p>
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {detail.subtasks.map((subtask) => <SubtaskRow key={subtask.id} task={subtask} onOpen={() => openTaskInPanel(subtask.id)} />)}
              </div>
            )}
            {detail.project ? (
              <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={addSubtask}>
                <Label className="sr-only" htmlFor="new-subtask-title">New subtask</Label>
                <Input id="new-subtask-title" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} className={`min-w-0 ${FORM_CONTROL_CLASS}`} placeholder="Add a subtask…" />
                <Button type="submit" size="sm" variant="outline" className="h-8" disabled={subtaskSaving || !subtaskTitle.trim()}>{subtaskSaving ? "Adding…" : "Add"}</Button>
              </form>
            ) : null}
          </section>

          <section className="grid gap-2 border-t border-border/70 pt-4" aria-labelledby="comments-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="comments-heading" className="text-xs font-semibold">Activity</h2>
              <span className="text-[11px] tabular-nums text-muted-foreground">{comments.length}</span>
            </div>
            {comments.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">No comments yet. Add the first progress note below.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {comments.map((item) => <CommentRow key={item.id} comment={item} />)}
              </div>
            )}
            <form className="mt-1 overflow-hidden rounded-md border border-border/70 bg-muted/15 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring" onSubmit={addComment}>
              <Label className="sr-only" htmlFor="task-comment">Add a comment</Label>
              <Textarea
                id="task-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-20 resize-y rounded-none border-0 bg-transparent px-3 py-2.5 text-[13px] leading-5 shadow-none focus-visible:ring-0"
                placeholder="Write a progress note…"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-2">
                <span className="text-[11px] text-muted-foreground">Shared with this task</span>
                <Button type="submit" size="sm" className="h-7 px-2.5 text-xs" disabled={commentSaving || !comment.trim()}>
                  <Icon name="Sent" className="size-3.5" aria-hidden="true" />
                  {commentSaving ? "Sending…" : "Comment"}
                </Button>
              </div>
            </form>
          </section>

          <section className="grid gap-2 border-t border-border/70 pt-4" aria-labelledby="thread-heading">
            <h2 id="thread-heading" className="text-xs font-semibold">Work in BB</h2>
            {task.linkedThreadId ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium">Linked to a BB thread</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Continue the task with its Dispatch context attached.</p>
                </div>
                <Button type="button" size="sm" className="h-8" onClick={() => navigate.toThread(task.linkedThreadId!)}>Open thread</Button>
              </div>
            ) : showComposer ? (
              <div className="overflow-hidden rounded-md border border-border/70 bg-background p-2">
                <NewThreadComposer defaultProjectId={bbProjectId ?? undefined} initialPrompt={prompt} layout="document" draftKey={`dispatch-task-${task.id}`} onSubmit={startThread} />
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium">Hand this task to an agent</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Review the project, model, and prompt before starting.</p>
                </div>
                <Button type="button" size="sm" className="h-8" onClick={() => setShowComposer(true)}>Start thread</Button>
              </div>
            )}
          </section>
        </div>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This removes “{task.title}” from Dispatch. Any subtasks will be removed with it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void deleteTask(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubtaskRow({ task, onOpen }: { task: DispatchTask; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left text-xs transition-colors hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"><StatusPill status={task.status} /><span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span><span className="text-[11px] text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span><Icon name="ChevronRight" className="size-3.5 text-muted-foreground" aria-hidden="true" /></button>;
}

function CommentRow({ comment }: { comment: DispatchComment }) {
  const initials = comment.authorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  return (
    <article className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2.5 py-3">
      <div className="flex size-7 items-center justify-center rounded-full border border-border/70 bg-muted/25 text-[10px] font-medium text-muted-foreground" aria-hidden="true">{initials}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px]">
          <p className="min-w-0 truncate font-medium text-foreground">{comment.authorName}{comment.authorKind === "agent" ? <span className="ml-1.5 font-normal text-muted-foreground">Agent</span> : null}</p>
          <time className="shrink-0 text-muted-foreground" dateTime={comment.createdAt}>{formatRelativeDate(comment.createdAt)}</time>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-foreground">{comment.body}</p>
      </div>
    </article>
  );
}

function NoTaskSelected() {
  return <div className="flex h-full items-center justify-center p-6 text-center"><div className="grid max-w-56 justify-items-center gap-2"><div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon name="ListTodo" className="size-4" aria-hidden="true" /></div><div><p className="text-sm font-medium text-foreground">Select a task</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a Dispatch task to view details and start work in BB.</p></div></div></div>;
}

function DetailLoading() {
  return <div className="grid gap-5 p-4" role="status" aria-label="Loading task"><Skeleton className="h-6 w-48" /><div className="grid gap-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-20" /></div><div className="grid grid-cols-2 gap-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div></div>;
}

function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="grid max-w-sm gap-3 p-5"><div><h2 className="text-sm font-medium">Could not open task</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{message}</p></div><Button type="button" size="sm" variant="outline" className="h-8 w-fit" onClick={onRetry}>Try again</Button></div>;
}
