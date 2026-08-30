import { useEffect, useState, type FormEvent } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../../components/ui/field.js";
import { Icon } from "../../../components/ui/icon.js";
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
import { SelectItem } from "../../components/ui/select.js";
import { Textarea } from "../../components/ui/textarea.js";
import type { CreateTaskInput, DispatchProject, DispatchTask, Member, TaskPriority, TaskVisibility } from "../../types.js";
import { PRIORITY_OPTIONS } from "../lib/helpers.js";
import { FORM_CONTROL_CLASS, FORM_TEXTAREA_CLASS } from "./controlStyles.js";
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
  const [titleError, setTitleError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    setTitleError(null);
    setProjectError(null);
    setSubmitError(null);
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
    const nextTitleError = title.trim() ? null : "Give the task a title.";
    const nextProjectError = projectSlug ? null : "Choose a project.";
    setTitleError(nextTitleError);
    setProjectError(nextProjectError);
    if (nextTitleError || nextProjectError) return;
    setSaving(true);
    setSubmitError(null);
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
      setSubmitError(cause instanceof Error ? cause.message : "Could not create the task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pb-4 pt-5">
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Capture the work now; add the rest only when it matters.</DialogDescription>
        </DialogHeader>
        <form className="grid" onSubmit={submit}>
          <FieldGroup className="px-5 pb-5">
            <Field invalid={Boolean(titleError)}>
              <FieldLabel htmlFor="new-task-title">Title</FieldLabel>
              <Input
                id="new-task-title"
                autoFocus
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (titleError) setTitleError(null);
                }}
                onBlur={() => setTitleError(title.trim() ? null : "Give the task a title.")}
                placeholder="What needs doing?"
                className={FORM_CONTROL_CLASS}
                aria-invalid={Boolean(titleError) || undefined}
                aria-describedby={titleError ? "new-task-title-error" : undefined}
              />
              {titleError ? <FieldError id="new-task-title-error">{titleError}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="new-task-description">Description <span className="font-normal text-muted-foreground">Optional</span></FieldLabel>
              <Textarea
                id="new-task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`min-h-24 resize-y ${FORM_TEXTAREA_CLASS}`}
                placeholder="Context, acceptance criteria, links…"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                id="new-task-project"
                label="Project"
                value={projectSlug}
                onValueChange={(value) => {
                  setProjectSlug(value);
                  setProjectError(null);
                }}
                error={projectError ?? undefined}
              >
              {projects.map((project) => <SelectItem key={project.id} value={project.slug}>{project.name}</SelectItem>)}
              </SelectField>
              <SelectField
                id="new-task-priority"
                label="Priority"
                value={priority}
                onValueChange={(value) => setPriority(value as TaskPriority)}
              >
                {PRIORITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectField>
            </div>

            <details open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)} className="group border-t border-border/70">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                More options
                <Icon name="ChevronRight" className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <div className="grid gap-3 pb-1 sm:grid-cols-2">
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
                  label="Parent task"
                  value={parent || TOP_LEVEL_VALUE}
                  onValueChange={(value) => setParent(value === TOP_LEVEL_VALUE ? "" : value)}
                  className="sm:col-span-2"
                >
                  <SelectItem value={TOP_LEVEL_VALUE}>No parent</SelectItem>
                  {parentOptions.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}
                </SelectField>
              </div>
            </details>

            {submitError ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{submitError}</p> : null}
          </FieldGroup>
          <DialogFooter className="border-t border-border/70 bg-muted/15 px-5 py-3">
            <DialogClose asChild><Button type="button" size="sm" variant="ghost" className="h-8" disabled={saving}>Cancel</Button></DialogClose>
            <Button type="submit" size="sm" className="h-8" disabled={saving}>{saving ? "Creating…" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
