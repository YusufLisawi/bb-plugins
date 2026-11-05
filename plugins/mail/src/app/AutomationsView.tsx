import { useCallback, useEffect, useState } from "react";
import {
  experimental_ProviderModelPicker as ProviderModelPicker,
  experimental_useProviders as useProviders,
  useBbNavigate,
  useRealtime,
  useRpc,
  type ExperimentalProviderModelPickerValue,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { AUTOMATIONS_CHANGED, type Automation, type AutomationRun } from "../shared/types.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Toggle } from "./AlertSettings.js";
import { SplitIcons } from "./icons.js";
import { errorMessage, FORM_CONTROL_CLASS, FORM_TEXTAREA_CLASS, formatListDate, PANEL_ID, threadRoute } from "./lib.js";
import { Segmented } from "./MailSettings.js";
import { viewStore } from "./mailStore.js";

type Agent = { providerId: string; model: string; reasoningLevel: string };
type Data = { defaults: Agent; automations: Automation[]; runs: AutomationRun[]; projects: { id: string; name: string }[] };

// The last copy, so the page paints at once (BB is often reached remotely) and refreshes behind it.
const CACHE_KEY = "bb-mail:automations:v1";
let memory: Data | null = (() => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Data) : null;
  } catch {
    return null;
  }
})();
function remember(data: Data) {
  memory = data;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, runs: data.runs.slice(0, 30) }));
  } catch {
    // The in-memory copy still helps.
  }
}

/** Load ahead (from the Mail page) so opening Automations is instant. */
export function prefetchAutomations(rpc: { call: (method: "automations") => Promise<Data> }) {
  rpc.call("automations").then(remember, () => undefined);
}

/** Provider + model + reasoning, with the provider as its own clear choice. */
function AgentPicker({ value, onChange }: { value: Agent; onChange: (agent: Agent) => void }) {
  const { providers, status } = useProviders();
  const choices = providers.filter((provider) => provider.available || provider.id === value.providerId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="agent-provider">Provider</label>
      <select
        id="agent-provider"
        value={value.providerId}
        onChange={(event) => onChange({ providerId: event.target.value, model: "", reasoningLevel: value.reasoningLevel })}
        className={cn(FORM_CONTROL_CLASS, "border")}
      >
        {status !== "ready" && !choices.length ? <option value={value.providerId}>{value.providerId}</option> : null}
        {choices.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}
      </select>
      <ProviderModelPicker
        allowProviderChange={false}
        value={{ providerId: value.providerId, model: value.model, reasoningLevel: value.reasoningLevel as ExperimentalProviderModelPickerValue["reasoningLevel"] }}
        onChange={(next) => onChange({ providerId: next.providerId, model: next.model, reasoningLevel: next.reasoningLevel })}
      />
    </div>
  );
}

const list = (value: string) => value.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);

const STATUS: Record<AutomationRun["status"], { label: string; dot: string }> = {
  running: { label: "Working", dot: "bg-amber-500 animate-pulse" },
  done: { label: "Done", dot: "bg-emerald-500" },
  needs_you: { label: "Needs you", dot: "bg-sky-500" },
  failed: { label: "Failed", dot: "bg-destructive" },
};

/** Automations: agents that act on incoming mail, and what they did. */
export function AutomationsView() {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const [data, setData] = useState<Data | null>(memory);
  const [editing, setEditing] = useState<Automation | "new" | null>(null);

  const load = useCallback(() => {
    rpc.call("automations").then((next) => { remember(next); setData(next); }, (cause) => toast.error(errorMessage(cause, "Could not load automations.")));
  }, [rpc]);
  useEffect(load, [load]);
  useRealtime(AUTOMATIONS_CHANGED, load);

  async function save(next: Automation[]) {
    const result = await rpc.call("automationsSave", { automations: next });
    setData((current) => {
      if (!current) return current;
      const next = { ...current, automations: result.automations };
      remember(next);
      return next;
    });
  }

  async function saveDefaults(agent: Agent, applyAll: boolean) {
    setData((current) => (current ? { ...current, defaults: agent, automations: applyAll ? current.automations.map((entry) => ({ ...entry, ...agent })) : current.automations } : current));
    try {
      await rpc.call("automationDefaultsSave", { ...agent, applyAll });
      if (applyAll) toast.success("All automations now use this agent");
      load();
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save the agent."));
    }
  }

  function openEmail(run: AutomationRun) {
    viewStore.set("mail");
    navigate.toPluginPanel(PANEL_ID, { subPath: threadRoute(run.anchor) });
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Automations</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-muted-foreground">
            When an email matches, an agent works on it in your project with its skills (read-only), then leaves a summary and a reply for you, or sends it when it's sure.
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setEditing("new")}>
          <SplitIcons.plus className="size-3.5" />
          New automation
        </Button>
      </header>

      {!data ? (
        <p className="mt-8 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/70 px-3.5 py-3" aria-label="Default agent">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">Agent</p>
              <p className="text-xs text-muted-foreground">Provider, model and reasoning for new automations.</p>
            </div>
            <AgentPicker value={data.defaults} onChange={(agent) => void saveDefaults(agent, false)} />
            {data.automations.some((entry) => entry.providerId !== data.defaults.providerId || entry.model !== data.defaults.model || entry.reasoningLevel !== data.defaults.reasoningLevel) ? (
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => void saveDefaults(data.defaults, true)}>Use for all</Button>
            ) : null}
          </section>

          <section className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Automations">
            {data.automations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-center">
                <p className="text-[13px] font-medium">No automations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">For example: when K-Tuin asks whether a client got the 50 € reward, check the ERP and draft the answer.</p>
              </div>
            ) : null}
            {data.automations.map((automation) => {
              const project = data.projects.find((entry) => entry.id === automation.projectId)?.name;
              const last = data.runs.filter((run) => run.automationId === automation.id);
              return (
                <div key={automation.id} className="flex items-center gap-3 rounded-lg border border-border/70 px-3.5 py-3">
                  <SplitIcons.bolt className={cn("size-4 shrink-0", automation.enabled ? "text-foreground" : "text-muted-foreground")} />
                  <button type="button" onClick={() => setEditing(automation)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px] font-medium">{automation.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        automation.senders.length ? `From ${automation.senders.join(", ")}` : "Any sender",
                        automation.when ? `when ${automation.when}` : "",
                        project ? `in ${project}` : "no project",
                        automation.mode === "send" ? "sends when sure" : "drafts for review",
                        last.length ? `${last.length} run${last.length === 1 ? "" : "s"}` : "",
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                  <Toggle
                    on={automation.enabled}
                    label={`${automation.name} on`}
                    onChange={(enabled) => void save(data.automations.map((entry) => (entry.id === automation.id ? { ...entry, enabled } : entry)))}
                  />
                </div>
              );
            })}
          </section>

          <section className="mt-8" aria-label="Recent runs">
            <h2 className="px-1 text-xs font-medium text-muted-foreground">Recent runs</h2>
            {data.runs.length === 0 ? (
              <p className="mt-2 px-1 text-xs text-muted-foreground">Nothing yet. Runs start on new mail, or from a conversation's "Run automation".</p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60 rounded-lg border border-border/70">
                {data.runs.slice(0, 40).map((run) => (
                  <li key={run.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3.5 py-2.5">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STATUS[run.status].dot)} aria-hidden="true" />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-[13px]">
                        <span className="font-medium">{run.subject || "(no subject)"}</span>
                        <span className="text-muted-foreground"> · {run.from} · {run.automationName}</span>
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {STATUS[run.status].label}
                        {run.sent ? " · reply sent" : run.reply ? " · reply drafted" : ""}
                        {run.summary ? ` · ${run.summary}` : run.status === "running" ? " · the agent is checking…" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground">{formatListDate(run.startedAt)}</span>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEmail(run)}>Email</Button>
                      {run.threadId ? (
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate.toThread(run.threadId!)}>Agent</Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {data ? (
        <AutomationDialog
          editing={editing}
          projects={data.projects}
          defaults={data.defaults}
          onClose={() => setEditing(null)}
          onSave={async (automation) => {
            const exists = data.automations.some((entry) => entry.id === automation.id);
            await save(exists ? data.automations.map((entry) => (entry.id === automation.id ? automation : entry)) : [...data.automations, automation]);
            setEditing(null);
          }}
          onDelete={async (id) => {
            await save(data.automations.filter((entry) => entry.id !== id));
            setEditing(null);
          }}
        />
      ) : null}
    </main>
  );
}

function slug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "automation";
}

function AutomationDialog({ editing, projects, defaults, onClose, onSave, onDelete }: {
  editing: Automation | "new" | null;
  projects: { id: string; name: string }[];
  defaults: Agent;
  onClose: () => void;
  onSave: (automation: Automation) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const current = editing && editing !== "new" ? editing : null;
  const [name, setName] = useState("");
  const [senders, setSenders] = useState("");
  const [keywords, setKeywords] = useState("");
  const [when, setWhen] = useState("");
  const [projectId, setProjectId] = useState("");
  const [agent, setAgent] = useState<Agent>(defaults);
  const [instructions, setInstructions] = useState("");
  const [mode, setMode] = useState<Automation["mode"]>("draft");
  const [replyAll, setReplyAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const base = editing === "new" ? null : editing;
    setName(base?.name ?? "");
    setSenders(base?.senders.join(", ") ?? "");
    setKeywords(base?.keywords.join(", ") ?? "");
    setWhen(base?.when ?? "");
    setProjectId(base?.projectId ?? projects[0]?.id ?? "");
    setAgent(base ? { providerId: base.providerId, model: base.model, reasoningLevel: base.reasoningLevel } : defaults);
    setInstructions(base?.instructions ?? "");
    setMode(base?.mode ?? "draft");
    setReplyAll(base?.replyAll ?? false);
  }, [editing, projects, defaults]);

  async function submit() {
    if (!name.trim() || !instructions.trim() || !projectId) {
      toast.error("Give it a name, a project and instructions.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: current?.id ?? `${slug(name)}-${Date.now().toString(36).slice(-4)}`,
        name: name.trim(),
        enabled: current?.enabled ?? true,
        senders: list(senders).map((entry) => entry.toLowerCase()),
        keywords: list(keywords),
        when: when.trim(),
        projectId,
        providerId: agent.providerId,
        model: agent.model,
        reasoningLevel: agent.reasoningLevel,
        instructions: instructions.trim(),
        mode,
        replyAll,
      });
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save the automation."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle className="text-base">{current ? `Edit “${current.name}”` : "New automation"}</DialogTitle>
          <DialogDescription className="text-xs leading-5">The agent only looks things up; it never changes data. It learns your tone from how you answered these senders before.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-5 pb-4">
          <Field id="auto-name" label="Name">
            <Input id="auto-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="K-Tuin reward check" className={FORM_CONTROL_CLASS} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="auto-senders" label="From" hint="Addresses or domains, comma separated. Empty: anyone.">
              <Input id="auto-senders" value={senders} onChange={(event) => setSenders(event.target.value)} placeholder="k-tuin.com" className={FORM_CONTROL_CLASS} />
            </Field>
            <Field id="auto-keywords" label="Mentions" hint="Any of these words. Optional.">
              <Input id="auto-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="50€, dinero K-Tuin, app" className={FORM_CONTROL_CLASS} />
            </Field>
          </div>
          <Field id="auto-when" label="Only when" hint="Checked by a small, fast model on each email. Optional.">
            <Input id="auto-when" value={when} onChange={(event) => setWhen(event.target.value)} placeholder="they ask to check whether a client registered in the app or got the reward" className={FORM_CONTROL_CLASS} />
          </Field>
          <Field id="auto-instructions" label="What the agent does">
            <Textarea
              id="auto-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={7}
              placeholder="Use the erp-db skill (reads only, PROD). Find the client by phone, then email, then DNI…"
              className={cn(FORM_TEXTAREA_CLASS, "min-h-36 resize-y")}
            />
          </Field>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="auto-project" className="text-xs font-medium">Project</Label>
              <select id="auto-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className={cn(FORM_CONTROL_CLASS, "border")}>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <p className="text-[11px] leading-4 text-muted-foreground">Its repo, skills and tools are what the agent can use.</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs font-medium">Agent</span>
            <AgentPicker value={agent} onChange={setAgent} />
          </div>
          <div className="grid gap-3 rounded-lg border border-border/70 px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium">The reply</p>
                <p className="text-xs text-muted-foreground">{mode === "send" ? "Sent automatically when the agent is sure; otherwise it waits for you." : "Waits in the conversation for you to review and send."}</p>
              </div>
              <Segmented label="Reply mode" value={mode} onChange={setMode} options={[{ id: "draft", label: "Draft for me" }, { id: "send", label: "Send when sure" }]} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Reply to everyone on the email (otherwise only the sender)</p>
              <Toggle on={replyAll} label="Reply all" onChange={setReplyAll} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
          {current ? (
            <Button type="button" size="sm" variant="ghost" className="mr-auto h-8 text-xs text-destructive hover:text-destructive" onClick={() => void onDelete(current.id)} disabled={saving}>Delete</Button>
          ) : <span className="mr-auto" />}
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" size="sm" className="h-8" onClick={() => void submit()} disabled={saving}>{saving ? "Saving…" : current ? "Save" : "Create"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
