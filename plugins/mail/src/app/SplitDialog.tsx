import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePortalScopeProps } from "@/lib/portal-scope";
import { customSplitSchema, SPLIT_ICON_NAMES, type CustomSplit, type ThreadSummary } from "../shared/types.js";
import { useAiName } from "./Composer.js";
import { SplitGlyph, SplitIcons } from "./icons.js";
import { defined, errorMessage, FORM_CONTROL_CLASS, FORM_TEXTAREA_CLASS, formatListDate } from "./lib.js";
import { selectSplit } from "./mailStore.js";

interface SplitDialogProps {
  /** null closes; an id edits that split; "new" creates one. */
  editing: string | "new" | null;
  splits: CustomSplit[];
  onClose: () => void;
  onSave: (splits: CustomSplit[]) => Promise<void>;
}

interface Suggestion {
  split: CustomSplit;
  preview: { threads: ThreadSummary[]; total: number };
}

const list = (value: string) => value.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);

const IDEAS = [
  "Everything from the K-Tuin team and their clients, grouped by person",
  "Invoices, receipts and payments, including archived ones",
  "Contracts and anything waiting for a signature",
];

/** "From k-tuin.com, ana@x.com · mentions “leads” · grouped by person". */
function describeRules(split: CustomSplit): string {
  const bits: string[] = [];
  const more = (items: string[], shown: number) => (items.length > shown ? ` +${items.length - shown}` : "");
  if (split.senders.length) bits.push(`From ${split.senders.slice(0, 3).join(", ")}${more(split.senders, 3)}`);
  if (split.keywords.length) bits.push(`mentions ${split.keywords.slice(0, 3).map((word) => `“${word}”`).join(", ")}${more(split.keywords, 3)}`);
  if (!split.senders.length && !split.keywords.length) bits.push("Filed by AI");
  bits.push(split.scope === "all" ? "includes archived and sent" : "Inbox only");
  if (split.groupBy !== "none") bits.push(`grouped by ${split.groupBy === "sender" ? "person" : "day"}`);
  if (split.sort === "oldest") bits.push("oldest first");
  if (split.unreadOnly) bits.push("unread only");
  if (split.hasAttachment) bits.push("with attachments");
  if (!split.exclusive) bits.push("also stays in Needs you");
  return bits.join(" · ");
}

/**
 * A split starts as a sentence: the user's AI turns it into a name, an icon
 * and rules, shows what it would catch, and the user keeps it, changes it in
 * words, or fine-tunes the rules by hand.
 */
export function SplitDialog({ editing, splits, onClose, onSave }: SplitDialogProps) {
  const rpc = useRpc<typeof rpcContract>();
  const aiName = useAiName(rpc);
  const current = editing && editing !== "new" ? splits.find((split) => split.id === editing) ?? null : null;
  const [mode, setMode] = useState<"ask" | "rules">("ask");
  const [prompt, setPrompt] = useState("");
  const [change, setChange] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Suggestion | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!editing) return;
    requestId.current += 1;
    setMode("ask");
    setPrompt("");
    setChange("");
    setError(null);
    setResult(null);
    setBusy(false);
  }, [editing]);

  async function suggest(text: string, base?: CustomSplit) {
    if (!text.trim() || busy) return;
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const next = await rpc.call("splitSuggest", defined({ prompt: text.trim(), id: current?.id, current: base }));
      if (id !== requestId.current) return;
      setResult(next);
      setChange("");
    } catch (cause) {
      if (id === requestId.current) setError(errorMessage(cause, `${aiName} couldn't set up the split.`));
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  /** Name and icon edits change the suggestion in place, without asking the AI again. */
  function patch(next: Partial<CustomSplit>) {
    setResult((before) => (before ? { ...before, split: { ...before.split, ...next } } : before));
  }

  async function keep() {
    if (!result) return;
    const split = { ...result.split, name: result.split.name.trim() || "Split" };
    setSaving(true);
    try {
      await onSave(current ? splits.map((entry) => (entry.id === current.id ? split : entry)) : [...splits.filter((entry) => entry.id !== split.id), split]);
      selectSplit(`c:${split.id}`);
      toast.success(current ? `Updated “${split.name}”` : `Created “${split.name}”`);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, "Could not save the split."));
    } finally {
      setSaving(false);
    }
  }

  function onPromptKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void suggest(prompt, current ?? undefined);
    }
  }

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle className="text-base">{current ? `Edit “${current.name}”` : "New split"}</DialogTitle>
          <DialogDescription className="text-xs leading-5">
            {mode === "rules"
              ? "Set the rules yourself."
              : current
                ? `Say what should change. ${aiName} updates the rules and shows the result.`
                : `Describe what it should collect. ${aiName} names it, picks an icon and sets the filters.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "rules" ? (
          <RulesForm
            base={result?.split ?? current}
            isNew={!current}
            splits={splits}
            onBack={() => setMode("ask")}
            onClose={onClose}
            onSave={onSave}
          />
        ) : result ? (
          <>
            <div className="grid gap-3 px-5 pb-4">
              <div className="overflow-hidden rounded-lg border border-border/70">
                <div className="flex items-start gap-3 px-3.5 py-3">
                  <IconPicker value={result.split.icon} onChange={(icon) => patch({ icon })} />
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center gap-2">
                      <label htmlFor="split-result-name" className="sr-only">Name</label>
                      <input
                        id="split-result-name"
                        value={result.split.name}
                        onChange={(event) => patch({ name: event.target.value.slice(0, 60) })}
                        className="min-w-0 flex-1 rounded bg-transparent text-[15px] font-semibold outline-none focus-visible:bg-muted/40"
                      />
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {result.preview.total.toLocaleString()} {result.preview.total === 1 ? "conversation" : "conversations"}
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{describeRules(result.split)}</p>
                  </div>
                </div>
                {result.preview.threads.length ? (
                  <ul className="border-t border-border/60 py-1" aria-label="What it catches">
                    {result.preview.threads.map((thread) => (
                      <li key={thread.id} className="grid grid-cols-[minmax(4rem,8rem)_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-1.5 text-xs">
                        <span className="truncate text-foreground/75">{thread.people.join(", ") || "Me"}</span>
                        <span className="truncate text-foreground/90">{thread.subject}</span>
                        <span className="tabular-nums text-muted-foreground">{formatListDate(thread.date)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border/60 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
                    Nothing in your mail matches the rules yet. New mail that fits is filed here by {aiName}.
                  </p>
                )}
              </div>

              <form
                className="flex items-center gap-2"
                onSubmit={(event) => { event.preventDefault(); void suggest(change, result.split); }}
              >
                <label htmlFor="split-change" className="sr-only">Change something</label>
                <Input
                  id="split-change"
                  value={change}
                  disabled={busy}
                  onChange={(event) => setChange(event.target.value)}
                  placeholder="Change something: also include…, only unread…, call it…"
                  className={cn(FORM_CONTROL_CLASS, "h-8 flex-1")}
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={busy || !change.trim()}>
                  {busy ? "Updating…" : "Update"}
                </Button>
              </form>
              {busy ? <Working aiName={aiName} /> : null}
              {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}
            </div>
            <div className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
              <Button type="button" size="sm" variant="ghost" className="mr-auto h-8 px-2 text-xs text-muted-foreground" onClick={() => setMode("rules")} disabled={busy || saving}>Edit rules</Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setResult(null); setError(null); }} disabled={busy || saving}>Start over</Button>
              <Button type="button" size="sm" className="h-8" onClick={() => void keep()} disabled={busy || saving || !result.split.name.trim()}>
                {saving ? "Saving…" : current ? "Save changes" : "Create split"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 px-5 pb-4">
              <label htmlFor="split-prompt" className="sr-only">{current ? "What should change" : "Describe the split"}</label>
              <Textarea
                id="split-prompt"
                autoFocus
                rows={3}
                value={prompt}
                disabled={busy}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onPromptKey}
                placeholder={current ? "e.g. “Also include mail from finance@…, and group it by person”" : "e.g. “Everything about the K-Tuin project, grouped by person”"}
                className={cn(FORM_TEXTAREA_CLASS, "min-h-20 resize-none text-[14px] leading-6")}
              />
              {!current && !busy ? (
                <div className="flex flex-wrap gap-1.5">
                  {IDEAS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setPrompt(idea)}
                      className="rounded-md bg-muted/50 px-2 py-1 text-left text-[11px] leading-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              ) : null}
              {busy ? <Working aiName={aiName} /> : null}
              {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}
            </div>
            <div className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
              <Button type="button" size="sm" variant="ghost" className="mr-auto h-8 px-2 text-xs text-muted-foreground" onClick={() => setMode("rules")} disabled={busy}>
                {current ? "Edit rules" : "Set rules myself"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
              <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => void suggest(prompt, current ?? undefined)} disabled={busy || !prompt.trim()}>
                <SplitIcons.sparkle className="size-3.5" />
                {busy ? "Setting it up…" : current ? "Update" : "Set it up"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Working({ aiName }: { aiName: string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
      <span className="size-3 animate-spin rounded-full border-[1.5px] border-muted-foreground/25 border-t-foreground" aria-hidden="true" />
      {aiName} is looking at your mail and setting it up…
    </p>
  );
}

/** The split's icon as a button that opens the icon grid. */
function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const scope = usePortalScopeProps();
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Change icon"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 text-foreground/80 transition-colors hover:bg-state-hover hover:text-foreground data-[state=open]:bg-state-hover"
        >
          <SplitGlyph icon={value} className="size-[18px]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          {...scope}
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onEscapeKeyDown={(event) => event.stopPropagation()}
          className="z-50 grid w-[17.5rem] grid-cols-8 gap-0.5 rounded-lg border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-lg outline-none"
        >
          {SPLIT_ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={value === name}
              onClick={() => { onChange(name); setOpen(false); }}
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-state-hover",
                value === name ? "bg-state-hover text-foreground" : "text-muted-foreground",
              )}
            >
              <SplitGlyph icon={name} className="size-4" />
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function RulesForm({ base, isNew, splits, onBack, onClose, onSave }: {
  base: CustomSplit | null;
  isNew: boolean;
  splits: CustomSplit[];
  onBack: () => void;
  onClose: () => void;
  onSave: (splits: CustomSplit[]) => Promise<void>;
}) {
  const [name, setName] = useState(base?.name ?? "");
  const [icon, setIcon] = useState(base?.icon ?? "");
  const [senders, setSenders] = useState(base?.senders.join(", ") ?? "");
  const [keywords, setKeywords] = useState(base?.keywords.join(", ") ?? "");
  const [ai, setAi] = useState(base?.ai ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give the split a name.");
      return;
    }
    const taken = new Set(splits.map((split) => split.id));
    const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "split";
    let id = base?.id ?? slug;
    for (let n = 2; !base && taken.has(id); n += 1) id = `${slug}-${n}`;
    const parsed = customSplitSchema.safeParse({
      ...(base ?? {}),
      id,
      name: name.trim(),
      icon,
      senders: list(senders).map((entry) => entry.toLowerCase()),
      keywords: list(keywords),
      ai: ai.trim(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      return;
    }
    setSaving(true);
    try {
      const exists = splits.some((split) => split.id === parsed.data.id);
      await onSave(exists ? splits.map((split) => (split.id === parsed.data.id ? parsed.data : split)) : [...splits, parsed.data]);
      selectSplit(`c:${parsed.data.id}`);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, "Could not save the split."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!base || isNew) return;
    setSaving(true);
    try {
      await onSave(splits.filter((split) => split.id !== base.id));
      selectSplit("needs_you");
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, "Could not delete the split."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="grid gap-3 px-5 pb-4">
        <div className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium">Icon</span>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="min-w-0 flex-1">
            <Field id="split-name" label="Name">
              <Input id="split-name" value={name} onChange={(event) => setName(event.target.value)} className={cn(FORM_CONTROL_CLASS, "h-9")} />
            </Field>
          </div>
        </div>
        <Field id="split-senders" label="People or domains" hint="Comma separated: k-tuin.com, ana@example.com">
          <Input id="split-senders" value={senders} onChange={(event) => setSenders(event.target.value)} className={FORM_CONTROL_CLASS} />
        </Field>
        <Field id="split-keywords" label="Keywords" hint="Found in the subject or text.">
          <Input id="split-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} className={FORM_CONTROL_CLASS} />
        </Field>
        <Field id="split-ai" label="Describe it for the sorter" hint="The AI files new mail that fits here.">
          <Textarea id="split-ai" value={ai} onChange={(event) => setAi(event.target.value)} className={`min-h-16 resize-y ${FORM_TEXTAREA_CLASS}`} />
        </Field>
        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}
      </div>
      <div className="flex items-center gap-2 border-t border-border/70 px-5 py-3">
        {!isNew && base ? (
          <Button type="button" size="sm" variant="ghost" className="mr-auto h-8 text-xs text-destructive hover:text-destructive" onClick={() => void remove()} disabled={saving}>Delete split</Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="mr-auto h-8 px-2 text-xs text-muted-foreground" onClick={onBack} disabled={saving}>Describe it instead</Button>
        )}
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8" disabled={saving}>{saving ? "Saving…" : isNew ? "Create split" : "Save"}</Button>
      </div>
    </form>
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
