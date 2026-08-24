import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Markdown,
  experimental_NewThreadComposer as NewThreadComposer,
  useBbNavigate,
  useRpc,
  type NewThreadRequest,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import type { DispatchComment, DispatchTask, Member, TaskPriority, TaskStatus, TaskVisibility, TaskDetailResponse } from "../../types.js";
import { buildTaskPrompt } from "../../thread-prompt.js";
import { formatRelativeDate, PRIORITY_LABELS, PRIORITY_OPTIONS, STATUS_LABELS, STATUS_OPTIONS, parseTaskId } from "../lib/helpers.js";
import { StatusPill } from "../components/StatusPill.js";

interface TaskDetailProps {
  subPath: string;
  onClose?: () => void;
}

export function TaskDetail({ subPath, onClose }: TaskDetailProps) {
  const taskId = parseTaskId(subPath);
  if (!taskId) return <NoTaskSelected />;
  return <TaskDetailContent key={taskId} taskId={taskId} onClose={onClose} />;
}

function TaskDetailContent({ taskId, onClose }: { taskId: string; onClose?: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
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
      navigate.toPluginPanel("tasks", { subPath: "", replace: true });
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

  if (loading && !detail) return <DetailLoading />;
  if (error && !detail) return <DetailError message={error} onRetry={() => void load()} />;
  if (!task || !detail) return <NoTaskSelected />;

  const prompt = buildTaskPrompt(task, dispatchBaseUrl);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{detail.project?.name ?? "Dispatch task"} · {task.id}</p>
            <input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => { if (title.trim() && title.trim() !== task.title) void patch({ title: title.trim() }); }} className="mt-1 w-full min-w-0 border-0 bg-transparent p-0 text-balance text-base font-semibold outline-none focus:ring-0" aria-label="Task title" />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {task.assigneeIds.length === 0 ? <Button type="button" size="sm" variant="outline" onClick={() => void claimTask()} disabled={claimSaving}>{claimSaving ? "Claiming…" : "Claim task"}</Button> : null}
            {onClose ? <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button> : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteOpen(true)} aria-label="Delete task">Delete</Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium" htmlFor="task-description">Description</label>
                <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => { if (description !== task.description) void patch({ description }); }} className="min-h-28 resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus:ring-1 focus:ring-ring" placeholder="Add context or acceptance criteria…" />
                {task.description ? <details className="rounded-md border border-border px-3">
                  <summary className="cursor-pointer py-2 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">Preview</summary>
                  <Markdown content={task.description} className="border-t border-border py-3 text-sm" />
                </details> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldSelect label="Status" id="task-status" value={task.status} onChange={(value) => void patch({ status: value as TaskStatus })}>
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </FieldSelect>
                <FieldSelect label="Priority" id="task-priority" value={task.priority} onChange={(value) => void patch({ priority: value as TaskPriority })}>
                  {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </FieldSelect>
                <FieldSelect label="Visibility" id="task-visibility" value={task.visibility} onChange={(value) => void patch({ visibility: value as TaskVisibility })}>
                  <option value="public">Public to project</option>
                  <option value="assigned">Private</option>
                  <option value="personal">Personal</option>
                </FieldSelect>
                <FieldSelect label="Assignee" id="task-assignee" value={currentAssignee} onChange={(value) => void patch({ assignee: value || null })}>
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </FieldSelect>
              </div>
              {saving ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
            </CardContent>
          </Card>

          <section className="space-y-2" aria-labelledby="subtasks-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="subtasks-heading" className="text-sm font-semibold">Subtasks <span className="font-normal text-muted-foreground">({detail.subtasks.length})</span></h2>
            </div>
            <Card>
              <CardContent className="p-0">
                {detail.subtasks.length === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">No subtasks yet.</p> : detail.subtasks.map((subtask) => <SubtaskRow key={subtask.id} task={subtask} onOpen={() => navigate.toPluginPanel("tasks", { subPath: `task/${encodeURIComponent(subtask.id)}` })} />)}
                {detail.project ? <form className="flex gap-2 border-t border-border p-3" onSubmit={addSubtask}><label className="sr-only" htmlFor="new-subtask-title">New subtask</label><input id="new-subtask-title" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Add a subtask…" /><Button type="submit" size="sm" variant="outline" disabled={subtaskSaving || !subtaskTitle.trim()}>{subtaskSaving ? "Adding…" : "Add"}</Button></form> : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2" aria-labelledby="comments-heading">
            <h2 id="comments-heading" className="text-sm font-semibold">Comments</h2>
            <Card>
              <CardContent className="space-y-3 p-3">
                {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : comments.map((item) => <CommentRow key={item.id} comment={item} />)}
                <form className="flex items-end gap-2 border-t border-border pt-3" onSubmit={addComment}>
                  <label className="sr-only" htmlFor="task-comment">Add a comment</label>
                  <textarea id="task-comment" value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-9 flex-1 resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Write a progress note…" />
                  <Button type="submit" size="sm" disabled={commentSaving || !comment.trim()}>{commentSaving ? "Sending…" : "Comment"}</Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2" aria-labelledby="thread-heading">
            <h2 id="thread-heading" className="text-sm font-semibold">Work in BB</h2>
            {task.linkedThreadId ? <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium">This task is linked to a BB thread.</p><p className="text-xs text-muted-foreground">The agent receives the task context and the Dispatch workflow.</p></div><Button type="button" size="sm" onClick={() => navigate.toThread(task.linkedThreadId!)}>Open thread</Button></CardContent></Card> : showComposer ? <Card><CardContent className="p-3"><NewThreadComposer defaultProjectId={bbProjectId ?? undefined} initialPrompt={prompt} layout="document" draftKey={`dispatch-task-${task.id}`} onSubmit={startThread} /></CardContent></Card> : <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium">Ready to hand this task to an agent?</p><p className="text-xs text-muted-foreground">You can adjust the project, model, environment, and permissions before sending.</p></div><Button type="button" onClick={() => setShowComposer(true)}>Start thread</Button></CardContent></Card>}
          </section>
        </div>
      </div>

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

function FieldSelect({ label, id, value, onChange, children }: { label: string; id: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="grid gap-1.5"><label className="text-xs font-medium" htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring">{children}</select></div>;
}

function SubtaskRow({ task, onOpen }: { task: DispatchTask; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 border-b border-border/70 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-state-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><StatusPill status={task.status} /><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="text-[11px] text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span></button>;
}

function CommentRow({ comment }: { comment: DispatchComment }) {
  return <article className="space-y-1 rounded-md bg-muted/35 px-3 py-2"><div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{comment.authorName} <span className="font-normal">· {comment.authorKind}</span></span><time dateTime={comment.createdAt}>{formatRelativeDate(comment.createdAt)}</time></div><p className="whitespace-pre-wrap text-sm leading-5 text-foreground">{comment.body}</p></article>;
}

function NoTaskSelected() {
  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Select a task to open its details.</div>;
}

function DetailLoading() {
  return <div className="space-y-4 p-4"><div className="h-6 w-40 rounded bg-muted" /><div className="h-48 rounded-lg border border-border bg-card" /><div className="h-32 rounded-lg border border-border bg-card" /></div>;
}

function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="p-4"><Card><CardHeader><CardTitle>Could not open task</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><Button type="button" size="sm" onClick={onRetry}>Try again</Button></CardContent></Card></div>;
}
