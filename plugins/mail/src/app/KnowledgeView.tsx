import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import {
  KNOWLEDGE_CHANGED,
  type Insight,
  type LearnRun,
  type Note,
  type Person,
  type Project,
  type Style,
} from "../shared/types.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Toggle } from "./AlertSettings.js";
import { errorMessage, FORM_CONTROL_CLASS, FORM_TEXTAREA_CLASS } from "./lib.js";
import { requestPage } from "./mailStore.js";

type Tab = "people" | "projects" | "style" | "files" | "notes";
type Lists = { people: Person[]; projects: Project[]; styles: Style[]; notes: Note[]; insights: Insight[] };
type Status = { run: LearnRun; counts: { people: number; contacts: number; projects: number; styles: number; notes: number; attachments: number } };

const ATTACHMENT_URL = "/api/v1/plugins/mail/http/attachment";

function ago(ms: number | null): string {
  if (!ms) return "never";
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function hue(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function Avatar({ name, address, size = "md" }: { name: string; address: string; size?: "sm" | "md" }) {
  const clean = name.replace(/\(.*?\)/g, "").trim();
  const words = (clean.includes(",") ? clean.split(",").reverse().join(" ") : clean || address.split("@")[0]!).split(/[\s._-]+/).filter(Boolean);
  const letters = ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[words.length - 1]![0] : "")).toUpperCase();
  const h = hue(address.toLowerCase());
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", size === "sm" ? "size-6 text-[9.5px]" : "size-8 text-[11px]")}
      style={{ background: `hsl(${h} 70% 50% / 0.16)`, color: `hsl(${h} 60% 52%)` }}
    >
      {letters}
    </span>
  );
}

const list = (value: string) => value.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);

/**
 * Everything Mail has learned, editable: people, projects, the user's writing
 * style per language, files it has read, and the user's own notes. Edits are
 * locked so the next learning run keeps them.
 */
export function KnowledgeView() {
  const rpc = useRpc<typeof rpcContract>();
  const [tab, setTab] = useState<Tab>("people");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [lists, setLists] = useState<Lists | null>(null);
  const [confirmForget, setConfirmForget] = useState(false);

  const load = useCallback(() => {
    rpc.call("knowledgeStatus").then(setStatus, () => undefined);
    rpc.call("knowledgeList").then(setLists, () => undefined);
  }, [rpc]);

  useEffect(load, [load]);
  useRealtime(KNOWLEDGE_CHANGED, load);

  async function learn(stop = false) {
    try {
      await rpc.call("knowledgeLearn", { stop });
      if (!stop) toast.success("Learning started", { description: "It runs in the background; you can keep working." });
      load();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not start learning."));
    }
  }

  async function forgetAll() {
    await rpc.call("knowledgeDelete", { kind: "all", id: "" });
    setConfirmForget(false);
    toast.success("Forgot everything learned", { description: "Your notes are kept." });
    load();
  }

  const run = status?.run;
  const never = !run?.startedAt && (status?.counts.contacts ?? 0) === 0;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "people", label: "People", count: lists?.people.length },
    { id: "projects", label: "Projects", count: lists?.projects.length },
    { id: "style", label: "Your style", count: lists?.styles.length },
    { id: "files", label: "Files", count: lists?.insights.filter((insight) => insight.status === "done").length },
    { id: "notes", label: "Notes", count: lists?.notes.length },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            What Mail has learned from your email: how you write, who people are to you, and what your projects are about. The AI uses it every time it drafts for you.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => requestPage({ kind: "settings", tab: "ai" })}>Settings</Button>
          {run?.running ? (
            <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => void learn(true)}>Stop</Button>
          ) : (
            <Button type="button" size="sm" className="h-8 px-3" onClick={() => void learn()}>{never ? "Learn from my email" : "Learn again"}</Button>
          )}
        </div>
      </header>

      {run && (run.running || run.startedAt) ? <RunPanel run={run} counts={status?.counts} /> : null}
      {never ? <FirstRun onStart={() => void learn()} /> : null}

      {!never ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap gap-0.5 rounded-lg bg-muted/60 p-0.5" role="tablist" aria-label="Knowledge">
              {tabs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.id}
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    tab === entry.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry.label}
                  {entry.count ? <span className="tabular-nums text-muted-foreground">{entry.count}</span> : null}
                </button>
              ))}
            </div>
            {tab === "people" || tab === "projects" || tab === "files" ? (
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search knowledge"
                className={cn(FORM_CONTROL_CLASS, "h-8 w-full border sm:w-52")}
              />
            ) : null}
          </div>

          <section className="mt-4">
            {!lists ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
            {lists && tab === "people" ? <PeopleTab people={lists.people} projects={lists.projects} query={query} onChanged={load} /> : null}
            {lists && tab === "projects" ? <ProjectsTab projects={lists.projects} people={lists.people} query={query} onChanged={load} /> : null}
            {lists && tab === "style" ? <StyleTab styles={lists.styles} onChanged={load} /> : null}
            {lists && tab === "files" ? <FilesTab insights={lists.insights} query={query} onChanged={load} /> : null}
            {lists && tab === "notes" ? <NotesTab notes={lists.notes} onChanged={load} /> : null}
          </section>

          <footer className="mt-10 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
            <span className="mr-auto">Stored only on this BB server. Learning reads your mail with the model chosen in Settings → AI.</span>
            {confirmForget ? (
              <>
                <span>Forget all people, projects, styles and files? Notes stay.</span>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmForget(false)}>Keep</Button>
                <Button type="button" size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => void forgetAll()}>Forget everything</Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setConfirmForget(true)}>Forget everything learned…</Button>
            )}
          </footer>
        </>
      ) : null}
    </div>
  );
}

// ---- run progress ------------------------------------------------------------------

function RunPanel({ run, counts }: { run: LearnRun; counts?: Status["counts"] }) {
  if (!run.running) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/70 px-3.5 py-2.5 text-xs text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", run.error && run.error !== "Stopped" ? "bg-destructive" : "bg-emerald-500")} aria-hidden="true" />
        <span>{run.error === "Stopped" ? "Stopped" : run.error ? `Last run failed: ${run.error}` : `Learned ${ago(run.finishedAt)}`}</span>
        {counts ? (
          <span className="tabular-nums">
            · {counts.people} people · {counts.projects} projects · {counts.styles} {counts.styles === 1 ? "style" : "styles"} · {counts.attachments} files
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mt-4 grid gap-2.5 rounded-lg border border-border/70 p-3.5" role="status" aria-label="Learning progress">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" aria-hidden="true" />
        Learning from your email…
      </p>
      <ol className="grid gap-2">
        {run.stages.map((stage) => {
          const percent = stage.total ? Math.round((stage.done / stage.total) * 100) : stage.status === "done" ? 100 : 0;
          return (
            <li key={stage.key} className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 text-xs">
              <span className="mt-0.5 flex size-4 items-center justify-center" aria-hidden="true">
                {stage.status === "done" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3.5 text-emerald-500"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                ) : stage.status === "running" ? (
                  <span className="size-2 animate-pulse rounded-full bg-foreground" />
                ) : stage.status === "failed" ? (
                  <span className="size-2 rounded-full bg-destructive" />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/30" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={stage.status === "pending" ? "text-muted-foreground" : "text-foreground"}>{stage.label}</span>
                  {stage.total ? <span className="tabular-nums text-muted-foreground">{stage.done}/{stage.total}</span> : null}
                </div>
                {stage.detail ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{stage.detail}</p> : null}
                {stage.status === "running" && stage.total ? (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground/60 transition-[width]" style={{ width: `${percent}%` }} />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FirstRun({ onStart }: { onStart: () => void }) {
  const steps = [
    ["Your writing style", "Greetings, sign-offs, tone and length per language, from the emails you sent."],
    ["People", "Who each person is to you, their company and role, tú or usted, and what you work on together."],
    ["Projects", "Your ongoing deals and matters, with key facts, numbers and a timeline."],
    ["Files", "PDFs, documents, sheets and images from recent important mail, summarized."],
  ];
  return (
    <div className="mt-6 grid gap-4 rounded-xl border border-border/70 p-5">
      <div>
        <h2 className="text-sm font-semibold">Teach Mail how you work</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">One pass over your sent and received mail. It runs in the background with the models you pick in Settings → AI, and everything it learns can be edited or forgotten here.</p>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {steps.map(([title, detail]) => (
          <li key={title} className="rounded-lg bg-muted/30 p-3">
            <p className="text-[13px] font-medium">{title}</p>
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{detail}</p>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" className="h-8 justify-self-start px-3" onClick={onStart}>Learn from my email</Button>
    </div>
  );
}

// ---- shared editing bits -------------------------------------------------------------

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={cn("grid gap-1", wide && "sm:col-span-2")}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-4 text-muted-foreground/80">{hint}</span> : null}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cn(FORM_CONTROL_CLASS, "w-full border")} />;
}

function TextArea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className={cn(FORM_TEXTAREA_CLASS, "w-full resize-y border")} />;
}

function EditorActions({ onSave, onCancel, onDelete, deleteLabel, saving, locked, onLock }: {
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  saving: boolean;
  locked?: boolean;
  onLock?: (locked: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 sm:col-span-2">
      {onLock ? (
        <label className="mr-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <Toggle on={Boolean(locked)} label="Keep my edits" onChange={onLock} />
          Keep my edits when learning again
        </label>
      ) : <span className="mr-auto" />}
      {onDelete ? (
        confirming ? (
          <Button type="button" size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={onDelete}>{deleteLabel ?? "Delete"}?</Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setConfirming(true)}>{deleteLabel ?? "Delete"}</Button>
        )
      ) : null}
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button type="button" size="sm" className="h-7 px-3 text-xs" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}

function Chips({ items, tone = "muted" }: { items: string[]; tone?: "muted" | "outline" }) {
  if (!items.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={cn("rounded px-1.5 py-0.5 text-[11px]", tone === "muted" ? "bg-muted/70 text-muted-foreground" : "border border-border/70 text-muted-foreground")}>{item}</span>
      ))}
    </span>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

// ---- people --------------------------------------------------------------------------

function PeopleTab({ people, projects, query, onChanged }: { people: Person[]; projects: Project[]; query: string; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const shown = useMemo(() => people.filter((entry) => !needle || `${entry.name} ${entry.address} ${entry.org} ${entry.role} ${entry.topics.join(" ")} ${entry.projects.join(" ")}`.toLowerCase().includes(needle)), [people, needle]);
  if (people.length === 0) return <Empty title="No people yet" detail="Learn from your email to profile the people you write to most." />;
  if (shown.length === 0) return <Empty title="No matches" detail="Search covers names, addresses, companies and topics." />;
  return (
    <ul className="-mx-2 grid">
      {shown.map((entry) => (
        <li key={entry.address}>
          {open === entry.address ? (
            <PersonEditor person={entry} projects={projects} onClose={() => setOpen(null)} onChanged={onChanged} />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(entry.address)}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-state-hover"
            >
              <Avatar name={entry.name} address={entry.address} />
              <span className="min-w-0">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-[13px] font-medium">{entry.name || entry.address}</span>
                  {entry.org || entry.role ? <span className="truncate text-xs text-muted-foreground">{[entry.role, entry.org].filter(Boolean).join(" · ")}</span> : null}
                  {entry.locked ? <span className="shrink-0 text-[10px] text-muted-foreground" title="Your edits are kept">✎</span> : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.relationship || entry.summary || entry.notes || entry.address}</span>
              </span>
              <span className="hidden shrink-0 flex-col items-end gap-0.5 text-[11px] text-muted-foreground sm:flex">
                {entry.register ? <span className="max-w-40 truncate">{entry.register}</span> : null}
                <span className="tabular-nums">{entry.sent + entry.received} emails · {ago(entry.lastAt)}</span>
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function PersonEditor({ person, projects, onClose, onChanged }: { person: Person; projects: Project[]; onClose: () => void; onChanged: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const [draft, setDraft] = useState(person);
  const [topics, setTopics] = useState(person.topics.join(", "));
  const [projectNames, setProjectNames] = useState(person.projects.join(", "));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Person>(key: K, value: Person[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const shared = projects.filter((project) => project.people.includes(person.address));

  async function save(lock = true) {
    setSaving(true);
    try {
      await rpc.call("knowledgeSave", { kind: "person", item: { ...draft, topics: list(topics), projects: list(projectNames), locked: lock ? true : draft.locked } });
      toast.success("Saved");
      onChanged();
      onClose();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  async function forget() {
    await rpc.call("knowledgeDelete", { kind: "person", id: person.address });
    toast.success(`Forgot ${person.name || person.address}`);
    onChanged();
    onClose();
  }

  return (
    <div className="my-1 grid gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:grid-cols-2">
      <div className="flex items-center gap-3 sm:col-span-2">
        <Avatar name={draft.name} address={draft.address} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{draft.name || draft.address}</p>
          <p className="truncate text-xs text-muted-foreground">{draft.address}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-state-hover hover:text-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground sm:col-span-2">
        You wrote {draft.sent} · they wrote {draft.received} · last contact {ago(draft.lastAt)}
        {draft.ccWith.length ? ` · usually with ${draft.ccWith.slice(0, 3).map((entry) => entry.name || entry.address).join(", ")}` : ""}
        {shared.length ? ` · projects: ${shared.map((project) => project.name).join(", ")}` : ""}
      </p>
      <Field label="Name"><TextInput value={draft.name} onChange={(value) => set("name", value)} /></Field>
      <Field label="Organization"><TextInput value={draft.org} onChange={(value) => set("org", value)} /></Field>
      <Field label="Role"><TextInput value={draft.role} onChange={(value) => set("role", value)} /></Field>
      <Field label="Language"><TextInput value={draft.language} onChange={(value) => set("language", value)} /></Field>
      <Field label="Who they are to you" wide><TextArea value={draft.relationship} onChange={(value) => set("relationship", value)} rows={2} /></Field>
      <Field label="How you address them" hint="e.g. tú, first name, warm"><TextInput value={draft.register} onChange={(value) => set("register", value)} /></Field>
      <Field label="Greeting · sign-off" hint="What you usually write">
        <span className="grid grid-cols-2 gap-2">
          <TextInput value={draft.greeting} onChange={(value) => set("greeting", value)} placeholder="Hola Javier," />
          <TextInput value={draft.signoff} onChange={(value) => set("signoff", value)} placeholder="Un saludo," />
        </span>
      </Field>
      <Field label="Lately" wide><TextArea value={draft.summary} onChange={(value) => set("summary", value)} rows={2} /></Field>
      <Field label="Topics" hint="Comma separated"><TextInput value={topics} onChange={setTopics} /></Field>
      <Field label="Projects" hint="Comma separated"><TextInput value={projectNames} onChange={setProjectNames} /></Field>
      <Field label="Your notes" hint="Always kept and given to the AI when you write to them, e.g. “prefers calls”, “decision maker”, “never cc legal”." wide>
        <TextArea value={draft.notes} onChange={(value) => set("notes", value)} rows={2} />
      </Field>
      <EditorActions
        onSave={() => void save()}
        onCancel={onClose}
        onDelete={() => void forget()}
        deleteLabel="Forget person"
        saving={saving}
        locked={draft.locked}
        onLock={(locked) => set("locked", locked)}
      />
    </div>
  );
}

// ---- projects --------------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  waiting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  done: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

function ProjectsTab({ projects, people, query, onChanged }: { projects: Project[]; people: Person[]; query: string; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const shown = projects.filter((project) => !needle || `${project.name} ${project.summary} ${project.keywords.join(" ")} ${project.facts.join(" ")}`.toLowerCase().includes(needle));
  const nameOf = (address: string) => people.find((entry) => entry.address === address)?.name || address;
  const blank: Project = { id: `project-${Date.now().toString(36)}`, name: "", status: "active", summary: "", people: [], keywords: [], domains: [], facts: [], timeline: [], notes: "", lastAt: null, locked: true, learnedAt: null };

  return (
    <div className="grid gap-2.5">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={() => setOpen("new")}>+ New project</Button>
      </div>
      {open === "new" ? <ProjectEditor project={blank} people={people} isNew onClose={() => setOpen(null)} onChanged={onChanged} /> : null}
      {projects.length === 0 && open !== "new" ? <Empty title="No projects yet" detail="Learning groups your conversations into projects with facts and a timeline." /> : null}
      {shown.map((project) => (
        open === project.id ? (
          <ProjectEditor key={project.id} project={project} people={people} onClose={() => setOpen(null)} onChanged={onChanged} />
        ) : (
          <button
            key={project.id}
            type="button"
            onClick={() => setOpen(project.id)}
            className="grid gap-2 rounded-xl border border-border/70 p-3.5 text-left transition-colors hover:border-border hover:bg-state-hover"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold">{project.name}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium capitalize", STATUS_TONE[project.status] ?? STATUS_TONE.unknown)}>{project.status}</span>
              {project.locked ? <span className="text-[10px] text-muted-foreground" title="Your edits are kept">✎</span> : null}
              <span className="ml-auto text-[11px] text-muted-foreground">{ago(project.lastAt)}</span>
            </span>
            {project.summary ? <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{project.summary}</span> : null}
            <span className="flex flex-wrap items-center gap-1.5">
              {project.people.slice(0, 5).map((address) => (
                <span key={address} title={nameOf(address)}><Avatar name={nameOf(address)} address={address} size="sm" /></span>
              ))}
              {project.facts.length ? <span className="text-[11px] text-muted-foreground">· {project.facts.length} facts</span> : null}
              {project.timeline.length ? <span className="text-[11px] text-muted-foreground">· {project.timeline.length} events</span> : null}
            </span>
          </button>
        )
      ))}
    </div>
  );
}

function ProjectEditor({ project, people, isNew = false, onClose, onChanged }: { project: Project; people: Person[]; isNew?: boolean; onClose: () => void; onChanged: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const [draft, setDraft] = useState(project);
  const [facts, setFacts] = useState(project.facts.join("\n"));
  const [timeline, setTimeline] = useState(project.timeline.map((entry) => `${entry.date} — ${entry.event}`).join("\n"));
  const [keywords, setKeywords] = useState(project.keywords.join(", "));
  const [members, setMembers] = useState(project.people.join(", "));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Project>(key: K, value: Project[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Give the project a name.");
      return;
    }
    setSaving(true);
    try {
      const item: Project = {
        ...draft,
        id: isNew ? draft.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || draft.id : draft.id,
        facts: facts.split("\n").map((line) => line.trim()).filter(Boolean),
        timeline: timeline.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
          const match = /^(\d{4}-\d{2}-\d{2})\s*[—–:-]\s*(.+)$/.exec(line);
          return match ? { date: match[1]!, event: match[2]!.trim() } : { date: "", event: line };
        }),
        keywords: list(keywords),
        people: list(members).map((entry) => entry.toLowerCase()),
        locked: isNew ? true : draft.locked,
      };
      await rpc.call("knowledgeSave", { kind: "project", item });
      toast.success("Saved");
      onChanged();
      onClose();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await rpc.call("knowledgeDelete", { kind: "project", id: project.id });
    onChanged();
    onClose();
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:grid-cols-2">
      <Field label="Name"><TextInput value={draft.name} onChange={(value) => set("name", value)} placeholder="K-Tuin leads" /></Field>
      <Field label="Status">
        <span className="flex rounded-md bg-muted/60 p-0.5">
          {["active", "waiting", "done"].map((status) => (
            <button key={status} type="button" onClick={() => set("status", status)} className={cn("h-6 flex-1 rounded text-xs capitalize", draft.status === status ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{status}</button>
          ))}
        </span>
      </Field>
      <Field label="Summary" wide><TextArea value={draft.summary} onChange={(value) => set("summary", value)} rows={3} /></Field>
      <Field label="Facts" hint="One per line: numbers, decisions, commitments" wide><TextArea value={facts} onChange={setFacts} rows={4} /></Field>
      <Field label="Timeline" hint="One per line: 2026-10-27 — event" wide><TextArea value={timeline} onChange={setTimeline} rows={3} /></Field>
      <Field label="People" hint={`Addresses, comma separated${draft.people.length ? ` (${draft.people.map((address) => people.find((entry) => entry.address === address)?.name.split(" ")[0] || address).join(", ")})` : ""}`}><TextInput value={members} onChange={setMembers} /></Field>
      <Field label="Keywords" hint="Words that identify its emails"><TextInput value={keywords} onChange={setKeywords} /></Field>
      <Field label="Your notes" hint="Always kept and given to the AI." wide><TextArea value={draft.notes} onChange={(value) => set("notes", value)} rows={2} /></Field>
      <EditorActions
        onSave={() => void save()}
        onCancel={onClose}
        onDelete={isNew ? undefined : () => void remove()}
        deleteLabel="Delete project"
        saving={saving}
        locked={isNew ? true : draft.locked}
        onLock={isNew ? undefined : (locked) => set("locked", locked)}
      />
    </div>
  );
}

// ---- style -----------------------------------------------------------------------------------

const LANGUAGE_NAMES: Record<string, string> = { es: "Spanish", en: "English", fr: "French", de: "German", pt: "Portuguese" };

function StyleTab({ styles, onChanged }: { styles: Style[]; onChanged: () => void }) {
  if (styles.length === 0) return <Empty title="No style learned yet" detail="Learning reads the emails you sent to describe how you write in each language." />;
  return (
    <div className="grid gap-4">
      {styles.map((style) => <StyleCard key={style.language} style={style} onChanged={onChanged} />)}
    </div>
  );
}

function StyleCard({ style, onChanged }: { style: Style; onChanged: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const [editing, setEditing] = useState(false);
  const [guide, setGuide] = useState(style.guide);
  const [greetings, setGreetings] = useState(style.greetings.join(" | "));
  const [signoffs, setSignoffs] = useState(style.signoffs.join(" | "));
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(style.locked);

  async function save() {
    setSaving(true);
    try {
      const split = (value: string) => value.split("|").map((entry) => entry.trim()).filter(Boolean);
      await rpc.call("knowledgeSave", { kind: "style", item: { ...style, guide, greetings: split(greetings), signoffs: split(signoffs), locked: true } });
      toast.success("Style saved", { description: "Drafts follow it from now on." });
      setEditing(false);
      onChanged();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-xl border border-border/70 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-[13px] font-semibold">{LANGUAGE_NAMES[style.language] ?? style.language.toUpperCase()}</h3>
        <span className="text-[11px] text-muted-foreground">from {style.samples} of your emails{style.locked ? " · your edits kept" : ""}</span>
        {!editing ? <Button type="button" size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={() => setEditing(true)}>Edit</Button> : null}
      </div>
      {editing ? (
        <div className="grid gap-3">
          <Field label="How you write" hint="One point per line. The AI follows this exactly."><TextArea value={guide} onChange={setGuide} rows={12} /></Field>
          <Field label="Greetings" hint="Separated by |"><TextInput value={greetings} onChange={setGreetings} /></Field>
          <Field label="Sign-offs" hint="Separated by |"><TextInput value={signoffs} onChange={setSignoffs} /></Field>
          <EditorActions onSave={() => void save()} onCancel={() => setEditing(false)} saving={saving} locked={locked} onLock={setLocked} />
        </div>
      ) : (
        <>
          <ul className="grid gap-1.5">
            {style.guide.split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).map((line, index) => (
              <li key={index} className="flex gap-2 text-[13px] leading-5"><span className="text-muted-foreground" aria-hidden="true">·</span><span>{line}</span></li>
            ))}
          </ul>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div><p className="mb-1 text-[11px] font-medium text-muted-foreground">Greetings</p><Chips items={style.greetings} tone="outline" /></div>
            <div><p className="mb-1 text-[11px] font-medium text-muted-foreground">Sign-offs</p><Chips items={style.signoffs} tone="outline" /></div>
          </div>
          {style.examples.length ? (
            <details className="group">
              <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground hover:text-foreground">Examples from your email ›</summary>
              <div className="mt-2 grid gap-2">
                {style.examples.map((example, index) => <blockquote key={index} className="whitespace-pre-wrap border-l-2 border-border pl-3 text-xs leading-5 text-muted-foreground">{example}</blockquote>)}
              </div>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

// ---- files -------------------------------------------------------------------------------------

function FilesTab({ insights, query, onChanged }: { insights: Insight[]; query: string; onChanged: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const needle = query.trim().toLowerCase();
  const shown = insights.filter((insight) => !needle || `${insight.filename} ${insight.subject} ${insight.from} ${insight.summary} ${insight.facts.join(" ")}`.toLowerCase().includes(needle));
  if (insights.length === 0) return <Empty title="No files read yet" detail="Learning reads attachments of recent important mail; you can also read any attachment from a conversation." />;

  async function reread(insight: Insight) {
    toast("Reading again…");
    await rpc.call("attachmentRead", { messageId: insight.messageId, index: insight.index, force: true });
    onChanged();
  }

  return (
    <ul className="grid gap-2.5">
      {shown.map((insight) => (
        <li key={insight.key} className="grid gap-2 rounded-xl border border-border/70 p-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileGlyph kind={insight.kind} filename={insight.filename} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={insight.filename}>{insight.filename}</span>
            <span className="hidden shrink-0 rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">{insight.kind}</span>
            <span className="flex shrink-0 items-center gap-1">
              <a className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-state-hover hover:text-foreground" href={`${ATTACHMENT_URL}?id=${encodeURIComponent(insight.messageId)}&index=${insight.index}&inline=1`} target="_blank" rel="noreferrer">Open</a>
              <button type="button" className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-state-hover hover:text-foreground" onClick={() => void reread(insight)}>Read again</button>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{insight.from} · {insight.subject} · {new Date(insight.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
          {insight.status === "done" ? (
            <>
              <p className="text-xs leading-5">{insight.summary}</p>
              {insight.facts.length ? (
                <ul className="grid gap-0.5">
                  {insight.facts.map((fact, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-muted-foreground"><span aria-hidden="true">·</span>{fact}</li>)}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{insight.error ?? insight.summary}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function FileGlyph({ kind, filename = "" }: { kind: string; filename?: string }) {
  const hint = `${filename.split(".").pop() ?? ""} ${kind}`;
  const label = /\bpdf\b|pdf/i.test(hint) ? "PDF" : /xlsx?|ods|csv|sheet/i.test(hint) ? "XLS" : /pptx?|odp|slide|presentation/i.test(hint) ? "PPT" : /png|jpe?g|gif|webp|image|photo|screenshot/i.test(hint) ? "IMG" : /docx?|odt|word/i.test(hint) ? "DOC" : /ics|calendar/i.test(hint) ? "CAL" : /txt|md|html?|json|text/i.test(hint) ? "TXT" : "FILE";
  const color = { PDF: "#e5484d", XLS: "#30a46c", PPT: "#f76b15", IMG: "#8e4ec6", DOC: "#0090ff", CAL: "#12a594", TXT: "#8b8d98", FILE: "#8b8d98" }[label];
  return <span className="flex h-5 shrink-0 items-center rounded px-1 text-[9px] font-bold tracking-wide text-white" style={{ background: color }} aria-hidden="true">{label}</span>;
}

// ---- notes ---------------------------------------------------------------------------------------

const ABOUT_ME = "Who I am (name, role, company), what we do, how I like emails to sound, and standing rules, e.g. “always Cc Antonio on EVA matters”, “never promise dates without checking with IT”.";

function NotesTab({ notes, onChanged }: { notes: Note[]; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(notes.length === 0 ? "new" : null);
  const blank: Note = { id: `note-${Date.now().toString(36)}`, title: notes.length === 0 ? "About me" : "", body: "", always: true, updatedAt: Date.now() };
  return (
    <div className="grid gap-2.5">
      <p className="text-xs leading-5 text-muted-foreground">Notes are your own words for the AI. Notes marked “every draft” go into every email it writes; the others can be added from the composer.</p>
      <div className="flex justify-end">
        {open !== "new" ? <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={() => setOpen("new")}>+ New note</Button> : null}
      </div>
      {open === "new" ? <NoteEditor note={blank} isNew onClose={() => setOpen(null)} onChanged={onChanged} /> : null}
      {notes.map((note) => (
        open === note.id ? (
          <NoteEditor key={note.id} note={note} onClose={() => setOpen(null)} onChanged={onChanged} />
        ) : (
          <button key={note.id} type="button" onClick={() => setOpen(note.id)} className="grid gap-1 rounded-xl border border-border/70 p-3.5 text-left transition-colors hover:border-border hover:bg-state-hover">
            <span className="flex items-center gap-2">
              <span className="text-[13px] font-semibold">{note.title || "Note"}</span>
              {note.always ? <span className="rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">every draft</span> : null}
            </span>
            <span className="line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{note.body}</span>
          </button>
        )
      ))}
    </div>
  );
}

function NoteEditor({ note, isNew = false, onClose, onChanged }: { note: Note; isNew?: boolean; onClose: () => void; onChanged: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const [draft, setDraft] = useState(note);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.body.trim()) {
      toast.error("Write something first.");
      return;
    }
    setSaving(true);
    try {
      await rpc.call("knowledgeSave", { kind: "note", item: { ...draft, title: draft.title.trim() || "Note", updatedAt: Date.now() } });
      onChanged();
      onClose();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await rpc.call("knowledgeDelete", { kind: "note", id: note.id });
    onChanged();
    onClose();
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:grid-cols-2">
      <Field label="Title" wide><TextInput value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="About me" /></Field>
      <Field label="Note" wide><TextArea value={draft.body} onChange={(body) => setDraft({ ...draft, body })} rows={6} placeholder={ABOUT_ME} /></Field>
      <label className="flex items-center gap-2 text-xs sm:col-span-2">
        <Toggle on={draft.always} label="Use in every draft" onChange={(always) => setDraft({ ...draft, always })} />
        Use in every draft
      </label>
      <EditorActions onSave={() => void save()} onCancel={onClose} onDelete={isNew ? undefined : () => void remove()} deleteLabel="Delete note" saving={saving} />
    </div>
  );
}
