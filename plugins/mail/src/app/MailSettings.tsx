import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  experimental_ProviderModelPicker as ProviderModelPicker,
  useBbNavigate,
  useRealtime,
  useRpc,
  type ExperimentalProviderModelPickerValue,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { MAIL_CHANGED, type AiConfig, type AiProvider, type AiStatus, type MailStatus } from "../shared/types.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Toggle, useAlertState } from "./AlertSettings.js";
import { playChime, requestNotificationPermission, setPrefs } from "./alerts.js";
import { errorMessage, PANEL_ID } from "./lib.js";
import { requestPage } from "./mailStore.js";

type Tab = "ai" | "alerts" | "mailboxes";
type PickerValue = ExperimentalProviderModelPickerValue;
type PhoneState = { mode: "off" | "important" | "all"; providerId: string; model: string; reasoningLevel: string; threadId: string | null };

/** AI sorting runs through these CLIs; the BB provider ids that match them. */
const SORT_PROVIDERS: Record<string, Exclude<AiProvider, "off">> = { "claude-code": "claude", codex: "codex" };
const PROVIDER_ID: Record<Exclude<AiProvider, "off">, string> = { claude: "claude-code", codex: "codex" };

const TABS: { id: Tab; label: string }[] = [
  { id: "ai", label: "AI" },
  { id: "alerts", label: "Notifications" },
  { id: "mailboxes", label: "Mailboxes" },
];

function ago(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

export function MailSettings({ open, onClose, status, onDisconnected, initialTab = "ai" }: {
  open: boolean;
  onClose: () => void;
  status: MailStatus;
  onDisconnected: (status: MailStatus) => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="space-y-0 px-5 pt-5">
          <DialogTitle className="text-base">Settings</DialogTitle>
          <DialogDescription className="sr-only">AI sorting, notifications and mailboxes.</DialogDescription>
          <div className="mt-3 flex gap-5 border-b border-border/70" role="tablist" aria-label="Settings sections">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                onClick={() => setTab(entry.id)}
                className={cn(
                  "-mb-px h-9 border-b-2 text-[13px] transition-colors focus-visible:outline-none",
                  tab === entry.id ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-[22rem] overflow-y-auto px-5 py-5">
          {tab === "ai" ? <AiTab /> : null}
          {tab === "alerts" ? <AlertsTab live={status.live} /> : null}
          {tab === "mailboxes" ? <MailboxesTab status={status} onDisconnected={onDisconnected} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- building blocks -----------------------------------------------------------

function Group({ title, children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="grid gap-2">
      {title ? <h3 className="px-1 text-xs font-medium text-muted-foreground">{title}</h3> : null}
      <div className="divide-y divide-border/60 overflow-visible rounded-lg border border-border/70">{children}</div>
      {footer ? <p className="px-1 text-[11px] leading-4 text-muted-foreground">{footer}</p> : null}
    </section>
  );
}

function Row({ title, description, children, tone }: { title: ReactNode; description?: ReactNode; children?: ReactNode; tone?: "danger" }) {
  return (
    <div className="flex min-h-12 items-center gap-4 px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <div className={cn("text-[13px] font-medium", tone === "danger" ? "text-destructive" : "text-foreground")}>{title}</div>
        {description ? <div className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-1.5">{children}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="flex rounded-md bg-muted/60 p-0.5" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "h-6 rounded px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            value === option.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---- AI --------------------------------------------------------------------------

const REASONING_OPTIONS = [
  { id: "none", label: "None" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

/**
 * BB's model picker doesn't offer "none" for every model and rewrites it to
 * its lowest level when it loads. Reasoning is set with its own switch, so a
 * picker change that only turns "none" into "low" is that rewrite, not a choice.
 */
function pickerReasoning(stored: string): PickerValue["reasoningLevel"] {
  return (stored === "none" ? "low" : stored || "low") as PickerValue["reasoningLevel"];
}

function keptReasoning(stored: string, picked: string, sameModel: boolean): string {
  return stored === "none" && picked === "low" && sameModel ? "none" : picked;
}

function ReasoningSwitch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const known = REASONING_OPTIONS.some((option) => option.id === value);
  return (
    <Segmented
      label={label}
      value={known ? value : "high"}
      options={REASONING_OPTIONS}
      onChange={onChange}
    />
  );
}

function AiTab() {
  const rpc = useRpc<typeof rpcContract>();
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [lastProvider, setLastProvider] = useState<Exclude<AiProvider, "off">>("codex");

  const load = useCallback(() => {
    rpc.call("aiStatus").then((next) => {
      setAi(next);
      if (next.provider !== "off") setLastProvider(next.provider);
    }, () => undefined);
  }, [rpc]);

  useEffect(load, [load]);
  useRealtime(MAIL_CHANGED, load);

  async function save(provider: AiProvider, model: string, reasoning: string) {
    setAi((current) => (current ? { ...current, provider, model, reasoning } : current));
    try {
      setAi(await rpc.call("aiConfig", { provider, model, reasoning }));
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save AI sorting."));
      load();
    }
  }

  function onPick(value: PickerValue) {
    const provider = SORT_PROVIDERS[value.providerId];
    if (!provider) {
      toast.error("Sorting runs on Codex or Claude", { description: "Pick one of those two; other agents can be used for phone alerts." });
      return;
    }
    setLastProvider(provider);
    const same = ai !== null && provider === ai.provider && value.model === ai.model;
    void save(provider, value.model, keptReasoning(ai?.reasoning ?? "", value.reasoningLevel, same));
  }

  async function resort() {
    try {
      setAi(await rpc.call("aiRun"));
      toast.success("Re-sorting your recent mail");
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not start sorting."));
    }
  }

  if (!ai) return <Loading />;
  const on = ai.provider !== "off";
  const pickerValue: PickerValue = {
    providerId: PROVIDER_ID[on ? ai.provider as Exclude<AiProvider, "off"> : lastProvider],
    model: ai.model,
    reasoningLevel: pickerReasoning(ai.reasoning),
  };

  return (
    <div className="grid gap-6">
      <Group
        footer={on ? `Runs through your ${ai.provider === "claude" ? "claude" : "codex"} CLI login. Senders, subjects and the first lines of new mail are sent to ${ai.provider === "claude" ? "Anthropic" : "OpenAI"}.` : undefined}
      >
        <Row title="Sort mail with AI" description="Decides what needs you, what's a promo or update, and which of your splits mail belongs in. Your rules always win.">
          <Toggle on={on} label="Sort mail with AI" onChange={(next) => void save(next ? lastProvider : "off", ai.model, ai.reasoning)} />
        </Row>
        {on ? (
          <>
            <Row title="Model" description="A small, fast model is plenty for sorting.">
              <ProviderModelPicker value={pickerValue} onChange={onPick} align="end" />
            </Row>
            <Row title="Reasoning" description="None is fastest and sorts well.">
              <ReasoningSwitch label="Sorting reasoning" value={ai.reasoning} onChange={(reasoning) => void save(ai.provider, ai.model, reasoning)} />
            </Row>
            <Row
              title={ai.error ? "Last run failed" : ai.running ? "Sorting…" : "Status"}
              tone={ai.error ? "danger" : undefined}
              description={ai.error
                ?? (ai.running
                  ? `${ai.pending ? `${ai.pending} conversations to go` : "Working"}`
                  : ai.lastRunAt
                    ? `${ai.sorted.toLocaleString()} conversations sorted · last run ${ago(ai.lastRunAt)}`
                    : "Waiting for new mail")}
            >
              <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => void resort()} disabled={ai.running}>Re-sort</Button>
            </Row>
          </>
        ) : null}
      </Group>
      <AiJobs />
    </div>
  );
}

// ---- per-job models, learning and attachment reading ------------------------------

const SENT_LIMITS = [
  { id: "200", label: "200" },
  { id: "500", label: "500" },
  { id: "1000", label: "1,000" },
  { id: "100000", label: "All" },
];
const PEOPLE_LIMITS = [
  { id: "40", label: "40" },
  { id: "80", label: "80" },
  { id: "150", label: "150" },
  { id: "300", label: "300" },
];
const TYPE_LABELS: { id: AiConfig["reading"]["types"][number]; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "office", label: "Word, Excel, PowerPoint" },
  { id: "images", label: "Images" },
  { id: "text", label: "Text, CSV, invites" },
];

function AiJobs() {
  const rpc = useRpc<typeof rpcContract>();
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [exclude, setExclude] = useState("");

  useEffect(() => {
    rpc.call("aiSettings").then((next) => {
      setConfig(next);
      setExclude(next.learning.exclude.join(", "));
    }, () => undefined);
  }, [rpc]);

  async function save(next: AiConfig) {
    setConfig(next);
    try {
      setConfig(await rpc.call("aiSettingsSave", next));
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save AI settings."));
    }
  }

  if (!config) return null;
  const task = (key: "write" | "learn" | "read"): PickerValue => ({
    providerId: config[key].providerId,
    model: config[key].model,
    reasoningLevel: (config[key].reasoning || "low") as PickerValue["reasoningLevel"],
  });
  const pick = (key: "write" | "learn" | "read") => (value: PickerValue) => {
    if (!SORT_PROVIDERS[value.providerId]) {
      toast.error("Mail's AI jobs run on Codex or Claude", { description: "Pick one of those two here." });
      return;
    }
    void save({ ...config, [key]: { providerId: value.providerId, model: value.model, reasoning: value.reasoningLevel } });
  };
  const learning = (patch: Partial<AiConfig["learning"]>) => void save({ ...config, learning: { ...config.learning, ...patch } });
  const reading = (patch: Partial<AiConfig["reading"]>) => void save({ ...config, reading: { ...config.reading, ...patch } });

  return (
    <>
      <Group title="Writing" footer="Drafts are never sent on their own. Whatever language you type in, the email is written in the language of the conversation or the person.">
        <Row title="Draft replies ahead" description="When an email to you asks you something, a reply is waiting in the conversation when you open it.">
          <Toggle on={config.drafting.ahead} label="Draft replies ahead" onChange={(ahead) => void save({ ...config, drafting: { ahead } })} />
        </Row>
      </Group>

      <Group title="Models for each job" footer="Writing and learning matter most; reading files is simple extraction, so a small model with low effort is enough.">
        <Row title="Writing" description="Drafts, Space prompts and ⌘J rewrites.">
          <ProviderModelPicker value={task("write")} onChange={pick("write")} align="end" />
        </Row>
        <Row title="Learning" description="Builds your style, people and projects. Runs in the background.">
          <ProviderModelPicker value={task("learn")} onChange={pick("learn")} align="end" />
        </Row>
        <Row title="Reading attachments" description="Summarizes PDFs, documents, sheets and images.">
          <ProviderModelPicker value={task("read")} onChange={pick("read")} align="end" />
        </Row>
      </Group>

      <Group title="Learning" footer="Everything learned is stored on this BB server and can be edited or forgotten on the Knowledge page.">
        <Row title="Learn from" description="Your most recent sent emails.">
          <Segmented label="Learn from" value={String(config.learning.sentLimit)} options={SENT_LIMITS} onChange={(value) => learning({ sentLimit: Number(value) })} />
        </Row>
        <Row title="Include replies you received" description="Better profiles of people, from what they write to you.">
          <Toggle on={config.learning.includeReceived} label="Include replies you received" onChange={(includeReceived) => learning({ includeReceived })} />
        </Row>
        <Row title="People to profile" description="The ones you write to most.">
          <Segmented label="People to profile" value={String(config.learning.peopleLimit)} options={PEOPLE_LIMITS} onChange={(value) => learning({ peopleLimit: Number(value) })} />
        </Row>
        <Row title="Learn again" description="Keeps knowledge fresh with new mail. Your edits are kept.">
          <Segmented label="Learn again" value={config.learning.schedule} options={[{ id: "off", label: "Manually" }, { id: "daily", label: "Daily" }, { id: "weekly", label: "Weekly" }]} onChange={(schedule) => learning({ schedule })} />
        </Row>
        <Row title="Trim signatures and legal footers" description="Quotes, signature blocks, disclaimers and tracking links never reach the AI.">
          <Toggle on={config.learning.trim} label="Trim signatures" onChange={(trim) => learning({ trim })} />
        </Row>
        <Row title="Use knowledge when drafting" description="Your style, the people and the projects inform every AI draft.">
          <Toggle on={config.learning.useInDrafts} label="Use knowledge when drafting" onChange={(useInDrafts) => learning({ useInDrafts })} />
        </Row>
        <div className="grid gap-1.5 px-3.5 py-3">
          <label htmlFor="ai-exclude" className="text-[13px] font-medium">Never learn from</label>
          <p className="text-xs leading-4 text-muted-foreground">Addresses or domains, comma separated, e.g. a lawyer, a bank or family.</p>
          <textarea
            id="ai-exclude"
            value={exclude}
            onChange={(event) => setExclude(event.target.value)}
            onBlur={() => learning({ exclude: exclude.split(/[,\n]/).map((entry) => entry.trim().toLowerCase()).filter(Boolean) })}
            rows={2}
            placeholder="lawyer@firm.com, mybank.es"
            className="w-full resize-y rounded-md border border-border/70 bg-muted/25 px-2.5 py-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </Group>

      <Group title="Attachments">
        <Row title="Read automatically" description="Summaries of new attachments, ready when you open the email and when the AI drafts.">
          <Segmented label="Read automatically" value={config.reading.auto} options={[{ id: "off", label: "Off" }, { id: "important", label: "Important" }, { id: "all", label: "All" }]} onChange={(auto) => reading({ auto })} />
        </Row>
        <Row title="Up to" description="Larger files are skipped.">
          <Segmented label="Largest file" value={String(config.reading.maxMb)} options={[{ id: "5", label: "5 MB" }, { id: "10", label: "10 MB" }, { id: "25", label: "25 MB" }]} onChange={(value) => reading({ maxMb: Number(value) })} />
        </Row>
        <div className="grid gap-2 px-3.5 py-3">
          <span className="text-[13px] font-medium">File types</span>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_LABELS.map((entry) => {
              const on = config.reading.types.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => reading({ types: on ? config.reading.types.filter((type) => type !== entry.id) : [...config.reading.types, entry.id] })}
                  className={cn(
                    "h-7 rounded-full border px-3 text-xs transition-colors",
                    on ? "border-foreground/30 bg-foreground/5 font-medium text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {on ? "✓ " : ""}{entry.label}
                </button>
              );
            })}
          </div>
        </div>
      </Group>
    </>
  );
}

// ---- notifications ---------------------------------------------------------------

function AlertsTab({ live }: { live: boolean }) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const { prefs, permission, desktopOn } = useAlertState();
  const [phone, setPhone] = useState<PhoneState | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    rpc.call("phone").then(setPhone, () => undefined);
  }, [rpc]);

  async function savePhone(next: Omit<PhoneState, "threadId">) {
    setPhone((current) => (current ? { ...current, ...next } : current));
    try {
      await rpc.call("phoneConfig", next);
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not save phone alerts."));
    }
  }

  async function test() {
    setTesting(true);
    try {
      const { threadId } = await rpc.call("phoneTest");
      setPhone((current) => (current ? { ...current, threadId } : current));
      toast.success("Test sent", { description: "It reaches your phone when the Mail thread finishes its reply.", action: { label: "Open thread", onClick: () => navigate.toThread(threadId) } });
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not send a test."));
    } finally {
      setTesting(false);
    }
  }

  const desktopDescription = permission === "unsupported"
    ? "Needs the BB app, or a browser over https."
    : permission === "denied"
      ? "Blocked for this site. Allow it in the browser's site settings, then reload."
      : desktopOn
        ? "When BB is in the background."
        : "A system notification for each new email.";

  return (
    <div className="grid gap-6">
      <Group title="On this device">
        <Row title="Desktop notifications" description={desktopDescription}>
          {permission === "default" ? (
            <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void requestNotificationPermission()}>Turn on</Button>
          ) : permission === "granted" ? (
            <Toggle on={prefs.desktop} label="Desktop notifications" onChange={(desktop) => setPrefs({ desktop })} />
          ) : null}
        </Row>
        <Row title="Sound" description="A short chime when mail arrives.">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={playChime}>Play</Button>
          <Toggle on={prefs.sound} label="Sound" onChange={(sound) => setPrefs({ sound })} />
        </Row>
      </Group>

      {phone ? (
        <Group
          title="Phone"
          footer="BB only pushes to phones when a thread finishes a turn, so each alert is one short reply in a quiet “Mail” thread. Tap it to read, or ask the agent to reply there."
        >
          <Row title="Send to my phone" description="Through the BB mobile app.">
            <Segmented
              label="Phone alerts"
              value={phone.mode}
              onChange={(mode) => void savePhone({ ...phone, mode })}
              options={[{ id: "off", label: "Off" }, { id: "important", label: "Important" }, { id: "all", label: "All" }]}
            />
          </Row>
          {phone.mode !== "off" ? (
            <>
              <Row title="Agent" description="Writes the one-line summary, and answers when you reply in the thread.">
                <ProviderModelPicker
                  align="end"
                  value={{ providerId: phone.providerId, model: phone.model, reasoningLevel: pickerReasoning(phone.reasoningLevel) }}
                  onChange={(value) => void savePhone({
                    mode: phone.mode,
                    providerId: value.providerId,
                    model: value.model,
                    reasoningLevel: keptReasoning(phone.reasoningLevel, value.reasoningLevel, value.providerId === phone.providerId && value.model === phone.model),
                  })}
                />
              </Row>
              <Row title="Reasoning" description="A one-line summary needs none.">
                <ReasoningSwitch label="Phone alert reasoning" value={phone.reasoningLevel} onChange={(reasoningLevel) => void savePhone({ mode: phone.mode, providerId: phone.providerId, model: phone.model, reasoningLevel })} />
              </Row>
              <Row title="Try it" description="Sends one test notification to your phone.">
                {phone.threadId ? (
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => navigate.toThread(phone.threadId!)}>Open thread</Button>
                ) : null}
                <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => void test()} disabled={testing}>{testing ? "Sending…" : "Send test"}</Button>
              </Row>
            </>
          ) : null}
        </Group>
      ) : null}

      <p className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", live ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />
        {live ? "Live: new mail arrives within seconds." : "Reconnecting to the mail server…"}
      </p>
    </div>
  );
}

// ---- mailboxes ---------------------------------------------------------------------

function MailboxesTab({ status, onDisconnected }: { status: MailStatus; onDisconnected: (status: MailStatus) => void }) {
  const navigate = useBbNavigate();
  const rpc = useRpc<typeof rpcContract>();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    setBusy(true);
    try {
      onDisconnected(await rpc.call("removeAccount", { id }));
      setConfirming(null);
      toast.success("Mailbox removed from BB");
    } catch (cause) {
      toast.error(errorMessage(cause, "Could not remove the mailbox."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Group footer="Removing a mailbox only disconnects BB. Nothing is deleted on the mail server.">
        {status.accounts.map((account) => (
          <Row
            key={account.id}
            title={
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", account.error ? "bg-destructive" : account.live ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />
                <span className="truncate">{account.email}</span>
              </span>
            }
            description={account.error ?? (account.live ? "Connected" : "Connecting…")}
          >
            {confirming === account.id ? (
              <>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirming(null)} disabled={busy}>Keep</Button>
                <Button type="button" size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => void remove(account.id)} disabled={busy}>Remove</Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setConfirming(account.id)}>Remove</Button>
            )}
          </Row>
        ))}
        <button
          type="button"
          onClick={() => {
            // From BB's settings page this also opens Mail, which shows the form.
            requestPage({ kind: "add-account" });
            navigate.toPluginPanel(PANEL_ID);
          }}
          className="flex min-h-11 w-full items-center gap-2 px-3.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="size-4" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Add mailbox
        </button>
      </Group>
    </div>
  );
}

function Loading() {
  return <div className="h-24 animate-pulse rounded-lg bg-muted/40" role="status" aria-label="Loading" />;
}

// ---- BB's plugin settings page ---------------------------------------------------
//
// The same controls as the in-app dialog, so Settings → Plugins → Mail reads
// like the rest of BB instead of a list of raw fields.

function useMailStatus() {
  const rpc = useRpc<typeof rpcContract>();
  const [status, setStatus] = useState<MailStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    rpc.call("status").then((next) => { if (!cancelled) setStatus(next); }, () => undefined);
    return () => { cancelled = true; };
  }, [rpc]);
  return [status, setStatus] as const;
}

function SettingsSection({ children }: { children: ReactNode }) {
  return <div data-bb-plugin="mail" className="grid gap-5 text-foreground">{children}</div>;
}

export function AiSettingsSection() {
  return <SettingsSection><AiTab /></SettingsSection>;
}

export function AlertsSettingsSection() {
  const [status] = useMailStatus();
  return <SettingsSection><AlertsTab live={status?.live ?? false} /></SettingsSection>;
}

export function MailboxesSettingsSection() {
  const [status, setStatus] = useMailStatus();
  if (!status) return <SettingsSection><Loading /></SettingsSection>;
  if (!status.connected) {
    return (
      <SettingsSection>
        <p className="text-xs text-muted-foreground">No mailbox yet. Open Mail in the sidebar to connect one.</p>
      </SettingsSection>
    );
  }
  return <SettingsSection><MailboxesTab status={status} onDisconnected={setStatus} /></SettingsSection>;
}
