import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import type { CreateTaskInput, DispatchProject, DispatchTask, Member, TaskPriority, TaskVisibility } from "../../types.js";
import { PRIORITY_OPTIONS } from "../lib/helpers.js";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: DispatchProject[];
  defaultProjectSlug: string;
  parentOptions: DispatchTask[];
  onCreate: (input: CreateTaskInput) => Promise<void>;
}

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

export function NewTaskDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectSlug,
  parentOptions,
  onCreate,
}: NewTaskDialogProps) {
  const rpc = useRpc<typeof rpcContract>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectSlug, setProjectSlug] = useState(defaultProjectSlug);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [visibility, setVisibility] = useState<TaskVisibility>("public");
  const [assigneeId, setAssigneeId] = useState("");
  const [parent, setParent] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setProjectSlug(defaultProjectSlug || projects[0]?.slug || "");
    setPriority("medium");
    setVisibility("public");
    setAssigneeId("");
    setParent("");
    setAdvancedOpen(false);
    setError(null);
  }, [defaultProjectSlug, open, projects]);

  useEffect(() => {
    if (!open || !advancedOpen || !projectSlug) return;
    let cancelled = false;
    void rpc.call("listMembers", { slug: projectSlug }).then(
      (result) => {
        if (!cancelled) setMembers(result.members);
      },
      () => {
        if (!cancelled) setMembers([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [advancedOpen, open, projectSlug, rpc]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give the task a title.");
      return;
    }
    if (!projectSlug) {
      setError("Choose a project.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        project: projectSlug,
        title: title.trim(),
        description: description.trim(),
        priority,
        visibility,
        ...(assigneeId ? { assignee: assigneeId } : {}),
        ...(parent ? { parent } : {}),
      });
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create a task without leaving BB.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="new-task-title">Title</label>
            <input id="new-task-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={selectClass} placeholder="What needs doing?" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium" htmlFor="new-task-description">Description</label>
            <textarea id="new-task-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Context, acceptance criteria, links…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSelect label="Project" id="new-task-project" value={projectSlug} onChange={setProjectSlug}>
              {projects.map((project) => <option key={project.id} value={project.slug}>{project.name}</option>)}
            </FieldSelect>
            <FieldSelect label="Priority" id="new-task-priority" value={priority} onChange={(value) => setPriority(value as TaskPriority)}>
              {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </FieldSelect>
          </div>
          <details open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)} className="rounded-md border border-border px-3">
            <summary className="cursor-pointer py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">More options</summary>
            <div className="grid gap-3 border-t border-border py-3 sm:grid-cols-2">
              <FieldSelect label="Visibility" id="new-task-visibility" value={visibility} onChange={(value) => setVisibility(value as TaskVisibility)}>
                <option value="public">Public to project</option>
                <option value="assigned">Private</option>
                <option value="personal">Personal</option>
              </FieldSelect>
              <FieldSelect label="Assignee" id="new-task-assignee" value={assigneeId} onChange={setAssigneeId}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </FieldSelect>
              <FieldSelect label="Parent task (optional)" id="new-task-parent" value={parent} onChange={setParent}>
                <option value="">Top-level task</option>
                {parentOptions.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </FieldSelect>
            </div>
          </details>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost" disabled={saving}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldSelect({
  label,
  id,
  value,
  onChange,
  children,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium" htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>{children}</select>
    </div>
  );
}
