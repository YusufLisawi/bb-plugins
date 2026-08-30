import { useEffect, useState, type FormEvent } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../components/ui/label.js";
import { SelectItem } from "../../components/ui/select.js";
import { Textarea } from "../../components/ui/textarea.js";
import type { CreateTaskInput, DispatchProject, DispatchTask, Member, TaskPriority, TaskVisibility } from "../../types.js";
import { PRIORITY_OPTIONS } from "../lib/helpers.js";
import { SelectField } from "./SelectField.js";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: DispatchProject[];
  defaultProjectSlug: string;
  parentOptions: DispatchTask[];
  onCreate: (input: CreateTaskInput) => Promise<void>;
}

const UNASSIGNED_VALUE = "__dispatch_unassigned__";
const TOP_LEVEL_VALUE = "__dispatch_top_level__";

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
            <Label className="text-xs" htmlFor="new-task-title">Title</Label>
            <Input id="new-task-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing?" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="new-task-description">Description</Label>
            <Textarea id="new-task-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24" placeholder="Context, acceptance criteria, links…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField id="new-task-project" label="Project" value={projectSlug} onValueChange={setProjectSlug}>
              {projects.map((project) => <SelectItem key={project.id} value={project.slug}>{project.name}</SelectItem>)}
            </SelectField>
            <SelectField id="new-task-priority" label="Priority" value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
              {PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectField>
          </div>
          <details open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)} className="rounded-md border border-border px-3">
            <summary className="cursor-pointer py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">More options</summary>
            <div className="grid gap-3 border-t border-border py-3 sm:grid-cols-2">
              <SelectField id="new-task-visibility" label="Visibility" value={visibility} onValueChange={(value) => setVisibility(value as TaskVisibility)}>
                <SelectItem value="public">Public to project</SelectItem>
                <SelectItem value="assigned">Private</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectField>
              <SelectField
                id="new-task-assignee"
                label="Assignee"
                value={assigneeId || UNASSIGNED_VALUE}
                onValueChange={(value) => setAssigneeId(value === UNASSIGNED_VALUE ? "" : value)}
              >
                <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
              </SelectField>
              <SelectField
                id="new-task-parent"
                label="Parent task (optional)"
                value={parent || TOP_LEVEL_VALUE}
                onValueChange={(value) => setParent(value === TOP_LEVEL_VALUE ? "" : value)}
                className="sm:col-span-2"
              >
                <SelectItem value={TOP_LEVEL_VALUE}>Top-level task</SelectItem>
                {parentOptions.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}
              </SelectField>
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
