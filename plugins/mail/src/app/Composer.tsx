import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { defined, errorMessage, formatSize } from "./lib.js";
import { FileGlyph } from "./KnowledgeView.js";
import { sidebarDataStore } from "./mailStore.js";
import { CcSuggestions } from "./CcSuggestions.js";
import { SplitIcons } from "./icons.js";
import { Menu } from "./Menu.js";
import { formatRecipients, isValidAddress, parseRecipients, RecipientField, type Recipient } from "./RecipientField.js";

export interface ComposeDraft {
  /** Account id to send from. */
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  /** What the user writes. */
  text: string;
  /** History sent below the text (a reply's quote or a forwarded message), folded away while writing. */
  quoted?: string;
  quotedLabel?: string;
  replyToId?: string;
  /** The text is a reply the AI drafted ahead. */
  drafted?: boolean;
  /** Everyone else on the conversation, for switching a reply to Reply all. */
  replyAllCc?: string;
}

interface Saved {
  from: string;
  to: Recipient[];
  cc: Recipient[];
  bcc: Recipient[];
  subject: string;
  text: string;
}

const DRAFT_PREFIX = "bb-mail:draft:";

const UPLOAD_URL = "/api/v1/plugins/mail/http/upload";
const CHUNK = 3 * 1024 * 1024;
const MAX_TOTAL = 25 * 1024 * 1024;

interface Attachment {
  key: string;
  name: string;
  size: number;
  type: string;
  /** Upload id once on the server. */
  id?: string;
  error?: string;
  /** Object URL for image thumbnails. */
  preview?: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

/** Send a file to Mail's server in chunks; resolves to its upload id. */
async function uploadFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let id: string | undefined;
  for (let start = 0; start < bytes.length || start === 0; start += CHUNK) {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name: file.name || "file", type: file.type || "application/octet-stream", data: toBase64(bytes.subarray(start, start + CHUNK)) }),
    });
    const result = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!response.ok || !result.id) throw new Error(result.error || "Upload failed.");
    id = result.id;
    if (bytes.length === 0) break;
  }
  return id!;
}

function readSaved(key: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(key: string, saved: Saved | null) {
  try {
    if (saved) window.localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(saved));
    else window.localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    // Drafts are a convenience; ignore unavailable storage.
  }
}

interface ComposerProps {
  draft: ComposeDraft;
  /** Autosave slot: one per reply target, or "new". */
  draftKey: string;
  variant: "dialog" | "inline";
  /** Put the cursor in the composer on open; off for a draft that opened by itself. */
  autoFocus?: boolean;
  onSent: () => void;
  /** Leave without sending; the draft is kept. */
  onClose: () => void;
  /** Throw the draft away. */
  onDiscard: () => void;
}

// The AI that writes is the one chosen for sorting; its name labels the prompt.
let aiNamePromise: Promise<string> | null = null;
export function useAiName(rpc: ReturnType<typeof useRpc<typeof rpcContract>>): string {
  const [name, setName] = useState("AI");
  useEffect(() => {
    aiNamePromise ??= rpc.call("aiStatus").then((status) => (status.provider === "claude" ? "Claude" : "Codex"), () => "AI");
    void aiNamePromise.then(setName);
  }, [rpc]);
  return name;
}

type Ask = { prompt: string };

/**
 * The one composer: borderless fields, recipient chips with autocomplete, an
 * auto-growing body, quoted history folded away, drafts kept locally.
 * Space on an empty body asks the AI to write; ⌘J rewrites the draft better.
 * The AI picks what it knows and the email's language by itself.
 */
export function Composer({ draft, draftKey, variant, autoFocus = true, onSent, onClose, onDiscard }: ComposerProps) {
  const rpc = useRpc<typeof rpcContract>();
  const aiName = useAiName(rpc);
  const sidebar = useSyncExternalStore(sidebarDataStore.subscribe, sidebarDataStore.get);
  const saved = useRef(readSaved(draftKey)).current;
  const [from, setFrom] = useState(saved?.from ?? draft.from ?? sidebar.accounts[0]?.id ?? "");
  const [to, setTo] = useState<Recipient[]>(saved?.to ?? parseRecipients(draft.to));
  const [cc, setCc] = useState<Recipient[]>(saved?.cc ?? parseRecipients(draft.cc ?? ""));
  const [bcc, setBcc] = useState<Recipient[]>(saved?.bcc ?? parseRecipients(draft.bcc ?? ""));
  const [showCc, setShowCc] = useState(cc.length > 0);
  const [showBcc, setShowBcc] = useState(bcc.length > 0);
  const [subject, setSubject] = useState(saved?.subject ?? draft.subject);
  const [editSubject, setEditSubject] = useState(variant === "dialog");
  const [text, setText] = useState(saved?.text ?? draft.text);
  const [showQuoted, setShowQuoted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noSubjectOk, setNoSubjectOk] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(saved ? Date.now() : null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  /** The AI is writing: from a Space prompt, or rewriting the draft. */
  const [writing, setWriting] = useState<"write" | "rewrite" | null>(null);
  /** The text before the AI changed it, so the change can be undone. */
  const [beforeAi, setBeforeAi] = useState<string | null>(draft.drafted && (!saved || saved.text === draft.text) ? "" : null);
  const [aiDid, setAiDid] = useState<"Drafted" | "Written" | "Rewritten">(draft.drafted ? "Drafted" : "Written");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);
  const requestId = useRef(0);
  /** The AI's last text, so it is only kept as a draft once the user edits it. */
  const aiText = useRef<string | null>(draft.drafted && !saved ? draft.text : null);
  const isReply = Boolean(draft.replyToId);

  // Grow the body with its content.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.style.height = "auto";
    body.style.height = `${Math.max(body.scrollHeight, variant === "dialog" ? 200 : 110)}px`;
  }, [text, variant, ask]);

  useLayoutEffect(() => {
    const input = askRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [ask?.prompt]);

  // Replies start in the body; new mail starts in To.
  useEffect(() => {
    if (autoFocus && to.length > 0) bodyRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ask) askRef.current?.focus();
  }, [Boolean(ask)]);

  // Esc while asking only leaves the prompt; it must not close a surrounding dialog.
  useEffect(() => {
    if (!ask) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      event.preventDefault();
      cancelAsk();
    };
    window.addEventListener("keydown", onEscape, true);
    return () => window.removeEventListener("keydown", onEscape, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(ask)]);

  // Keep the draft until it's sent or discarded. Text the AI wrote and the
  // user never touched is not a draft: it must not come back anywhere else.
  useEffect(() => {
    const untouchedAi = aiText.current !== null && text === aiText.current;
    const body = untouchedAi ? "" : text;
    const empty = !body.trim() && (isReply || (to.length === 0 && !subject.trim()));
    const timer = window.setTimeout(() => {
      writeSaved(draftKey, empty ? null : { from, to, cc, bcc, subject, text: body });
      setSavedAt(empty ? null : Date.now());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draftKey, from, to, cc, bcc, subject, text, isReply]);

  function attach(list: FileList | File[]) {
    const incoming = Array.from(list as ArrayLike<File>);
    if (!incoming.length) return;
    const total = [...files, ...incoming].reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL) {
      setError("Attachments can add up to 25 MB; most mail servers refuse more.");
      return;
    }
    setError(null);
    for (const file of incoming) {
      const key = `${Date.now()}-${Math.random()}`;
      const preview = /^image\//.test(file.type) ? URL.createObjectURL(file) : undefined;
      setFiles((current) => [...current, { key, name: file.name || "Pasted image", size: file.size, type: file.type, preview }]);
      uploadFile(file).then(
        (id) => setFiles((current) => current.map((entry) => (entry.key === key ? { ...entry, id } : entry))),
        (cause) => setFiles((current) => current.map((entry) => (entry.key === key ? { ...entry, error: errorMessage(cause, "Upload failed.") } : entry))),
      );
    }
  }

  function removeFile(key: string) {
    setFiles((current) => {
      const gone = current.find((entry) => entry.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return current.filter((entry) => entry.key !== key);
    });
  }

  useEffect(() => () => { for (const file of files) if (file.preview) URL.revokeObjectURL(file.preview); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const uploading = files.some((file) => !file.id && !file.error);
  const recipients = [...to, ...cc, ...bcc];
  const invalid = recipients.find((recipient) => !isValidAddress(recipient.address));
  const canSend = to.length > 0 && !invalid && !sending && !writing && !ask && !uploading;

  async function send() {
    if (ask || writing) return;
    if (to.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    if (invalid) {
      setError(`“${invalid.address}” is not a valid address.`);
      return;
    }
    if (uploading) return;
    if (files.some((file) => file.error)) {
      setError("Remove the attachment that failed to upload, or attach it again.");
      return;
    }
    if (!subject.trim() && !isReply && !noSubjectOk) {
      setNoSubjectOk(true);
      setError("No subject. Press Send again to send it anyway.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const body = draft.quoted ? `${text.trimEnd()}\n\n${draft.quoted}` : text;
      await rpc.call("send", defined({
        to: formatRecipients(to),
        cc: formatRecipients(cc),
        bcc: formatRecipients(bcc),
        subject,
        text: body,
        replyToId: draft.replyToId,
        from: from || undefined,
        attachments: files.map((file) => file.id!).filter(Boolean),
      }));
      writeSaved(draftKey, null);
      toast.success("Sent");
      onSent();
    } catch (cause) {
      setError(errorMessage(cause, "Could not send the message."));
    } finally {
      setSending(false);
    }
  }

  function discard() {
    writeSaved(draftKey, null);
    onDiscard();
  }

  function startAsk() {
    setError(null);
    setAsk({ prompt: "" });
  }

  function cancelAsk() {
    requestId.current += 1;
    setWriting(null);
    setAsk(null);
    requestAnimationFrame(() => bodyRef.current?.focus());
  }

  /** Ask the AI, then put its text in the body (undoable). */
  async function runAi(mode: "write" | "rewrite", instruction: string) {
    const id = ++requestId.current;
    setWriting(mode);
    setError(null);
    try {
      const result = await rpc.call("aiWrite", defined({
        instruction,
        mode,
        text,
        subject,
        to: formatRecipients(to),
        cc: formatRecipients(cc),
        replyToId: draft.replyToId,
        from: from || undefined,
      }));
      if (id !== requestId.current) return;
      setBeforeAi(text);
      aiText.current = result.text;
      setText(result.text);
      setAiDid(mode === "rewrite" ? "Rewritten" : "Written");
      setAsk(null);
      requestAnimationFrame(() => {
        bodyRef.current?.focus();
        bodyRef.current?.setSelectionRange(0, 0);
      });
    } catch (cause) {
      if (id === requestId.current) setError(errorMessage(cause, `${aiName} could not write this.`));
    } finally {
      if (id === requestId.current) setWriting(null);
    }
  }

  function runAsk() {
    if (!ask || !ask.prompt.trim() || writing) return;
    void runAi("write", ask.prompt.trim());
  }

  /** One tap: the same email, written better (and in the conversation's language). */
  function rewrite() {
    if (!text.trim() || writing || ask) return;
    void runAi("rewrite", "");
  }

  function onKeyDown(event: KeyboardEvent) {
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === "Enter" && mod) {
      event.preventDefault();
      void send();
    } else if (mod && event.key.toLowerCase() === "j" && !ask) {
      event.preventDefault();
      rewrite();
    } else if (event.key === "Escape" && !ask && variant === "inline") {
      event.preventDefault();
      onClose();
    }
  }

  function onBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Space on an empty body hands the pen to the AI.
    if (event.key === " " && !text && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      startAsk();
    }
  }

  function onAskKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !(event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runAsk();
    } else if (event.key === "Backspace" && !ask?.prompt) {
      event.preventDefault();
      cancelAsk();
    }
  }

  const fromAccount = sidebar.accounts.find((account) => account.id === from);
  const pad = variant === "dialog" ? "px-5" : "px-4";
  const others = parseRecipients(draft.replyAllCc ?? "").filter((person) =>
    ![...to, ...cc, ...bcc].some((recipient) => recipient.address.toLowerCase() === person.address.toLowerCase()));
  const toggles = (
    <>
      {others.length ? (
        <TextButton onClick={() => { setCc((current) => [...current, ...others]); setShowCc(true); }}>
          Reply all
        </TextButton>
      ) : null}
      {!showCc ? <TextButton onClick={() => setShowCc(true)}>Cc</TextButton> : null}
      {!showBcc ? <TextButton onClick={() => setShowBcc(true)}>Bcc</TextButton> : null}
    </>
  );

  return (
    <div
      className="relative flex min-h-0 flex-col"
      onKeyDown={onKeyDown}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropping(true);
      }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false); }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setDropping(false);
        attach(event.dataTransfer.files);
      }}
    >
      {dropping ? (
        <div className="pointer-events-none absolute inset-1 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-foreground/30 bg-background/85 text-[13px] font-medium text-foreground/80">
          Drop to attach
        </div>
      ) : null}
      <input ref={fileInput} type="file" multiple hidden onChange={(event) => { if (event.target.files) attach(event.target.files); event.target.value = ""; }} />
      <div className={cn("grid", pad)}>
        <RecipientField label="To" value={to} onChange={setTo} autoFocus={autoFocus && to.length === 0} placeholder="Name or email" trailing={toggles} />
        {showCc ? <RecipientField label="Cc" value={cc} onChange={setCc} autoFocus={cc.length === 0} trailing={<CloseRow label="Remove Cc" onClick={() => { setCc([]); setShowCc(false); }} />} /> : null}
        {showBcc ? <RecipientField label="Bcc" value={bcc} onChange={setBcc} autoFocus={bcc.length === 0} trailing={<CloseRow label="Remove Bcc" onClick={() => { setBcc([]); setShowBcc(false); }} />} /> : null}
        <CcSuggestions
          rpc={rpc}
          addresses={[...to, ...cc].map((recipient) => recipient.address.toLowerCase()).filter((address) => isValidAddress(address))}
          onAdd={(name, address) => {
            setShowCc(true);
            setCc((current) => (current.some((entry) => entry.address.toLowerCase() === address) ? current : [...current, { name, address }]));
          }}
        />
        {editSubject ? (
          <div className="flex items-center gap-3 border-b border-border/60">
            <label htmlFor={`${draftKey}-subject`} className="sr-only">Subject</label>
            <input
              id={`${draftKey}-subject`}
              value={subject}
              onChange={(event) => { setSubject(event.target.value); setNoSubjectOk(false); }}
              onKeyDown={(event) => { if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) { event.preventDefault(); bodyRef.current?.focus(); } }}
              placeholder="Subject"
              className="h-11 w-full bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditSubject(true)}
            className="truncate border-b border-border/60 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
            title="Edit subject"
          >
            {subject || "(no subject)"}
          </button>
        )}
      </div>

      <div className={cn("grid gap-2 py-3", pad)}>
        {ask ? (
          <div className="grid gap-1">
            <div className="flex items-start gap-2 text-[13px] leading-6">
              <SplitIcons.sparkle className={cn("mt-[6px] size-3 shrink-0", writing && "animate-pulse")} />
              <label htmlFor={`${draftKey}-ask`} className="shrink-0 font-medium">Ask {aiName}</label>
              <textarea
                id={`${draftKey}-ask`}
                ref={askRef}
                rows={1}
                value={ask.prompt}
                disabled={Boolean(writing)}
                onChange={(event) => setAsk({ prompt: event.target.value })}
                onKeyDown={onAskKeyDown}
                placeholder={isReply ? "what to answer, in any words or language" : "what to write, in any words or language"}
                className="min-w-0 flex-1 resize-none bg-transparent outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
              />
            </div>
            {writing ? <AiStatus>Writing…</AiStatus> : null}
          </div>
        ) : (
          <>
            <label htmlFor={`${draftKey}-body`} className="sr-only">Message</label>
            <textarea
              id={`${draftKey}-body`}
              ref={bodyRef}
              value={text}
              readOnly={writing === "rewrite"}
              onChange={(event) => { setText(event.target.value); if (beforeAi !== null && !event.target.value) setBeforeAi(null); }}
              onKeyDown={onBodyKeyDown}
              onPaste={(event) => {
                if (event.clipboardData.files.length) {
                  event.preventDefault();
                  attach(event.clipboardData.files);
                }
              }}
              placeholder={`Write, or Space to ask ${aiName}`}
              className={cn("w-full resize-none bg-transparent text-[14px] leading-6 outline-none transition-opacity placeholder:text-muted-foreground/70", writing === "rewrite" && "opacity-50")}
            />
            {writing === "rewrite" ? (
              <AiStatus>Rewriting…</AiStatus>
            ) : beforeAi !== null ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <SplitIcons.sparkle className="size-3" />
                {aiDid} by {aiName}
                <span aria-hidden="true">·</span>
                <button type="button" onClick={() => { setText(beforeAi); setBeforeAi(null); bodyRef.current?.focus(); }} className="underline-offset-2 hover:text-foreground hover:underline">Undo</button>
                {text.trim() ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <button type="button" onClick={rewrite} className="underline-offset-2 hover:text-foreground hover:underline">Rewrite</button>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        )}
        {files.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Attachments">
            {files.map((file) => (
              <li key={file.key} className={cn("flex h-11 max-w-60 items-center gap-2 overflow-hidden rounded-lg border bg-muted/30 py-1 pl-1 pr-1.5", file.error ? "border-destructive/40" : "border-border/70")} title={file.error ?? file.name}>
                {file.preview ? (
                  // Inline sizes: BB's own img styles would otherwise win over utility classes.
                  <span className="block shrink-0 overflow-hidden rounded-md" style={{ width: 36, height: 36 }}>
                    <img src={file.preview} alt="" style={{ width: 36, height: 36, maxWidth: "none", objectFit: "cover", display: "block" }} />
                  </span>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center"><FileGlyph kind={file.type} filename={file.name} /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{file.name}</span>
                  <span className={cn("block truncate text-[11px]", file.error ? "text-destructive" : "text-muted-foreground")}>
                    {file.error ?? (file.id ? formatSize(file.size) : "Uploading…")}
                  </span>
                </span>
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file.key)} className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-state-hover hover:text-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {draft.quoted ? (
          <div>
            <button
              type="button"
              onClick={() => setShowQuoted((value) => !value)}
              aria-expanded={showQuoted}
              title={showQuoted ? "Hide" : draft.quotedLabel ?? "Show quoted text"}
              className="rounded bg-muted/60 px-1.5 text-xs leading-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              •••
            </button>
            {showQuoted ? (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border-l-2 border-border pl-3 font-[inherit] text-xs leading-5 text-muted-foreground">{draft.quoted}</pre>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{error}</p> : null}
      </div>

      <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-border/60 py-2.5", pad)}>
        <span className="mr-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {sidebar.accounts.length > 1 ? (
            <Menu
              label="Send from"
              align="start"
              items={sidebar.accounts.map((account) => ({ label: account.email, hint: account.id === from ? "✓" : "", onSelect: () => setFrom(account.id) }))}
              trigger={({ toggle }) => (
                <button type="button" onClick={toggle} className="max-w-48 truncate rounded px-1.5 py-1 hover:bg-state-hover hover:text-foreground">
                  from {fromAccount?.email ?? "…"}
                </button>
              )}
            />
          ) : null}
          {savedAt ? <span className="truncate">Kept as a draft if you leave</span> : null}
        </span>
        {ask ? (
          <>
            <FooterButton onClick={cancelAsk} keys="esc">Cancel</FooterButton>
            <Button type="button" size="sm" className="h-8 gap-2 px-3" onClick={runAsk} disabled={Boolean(writing) || !ask.prompt.trim()}>
              {writing ? "Writing…" : "Write"}
              <Keys keys="↵" primary />
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={discard}
              aria-label="Discard draft"
              title="Discard draft"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label="Attach files"
              title="Attach files (or drop them here)"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground"
            >
              <SplitIcons.paperclip className="size-4" />
            </button>
            <FooterButton onClick={onClose} keys="esc">Close</FooterButton>
            {text.trim() ? (
              <FooterButton onClick={rewrite} keys="⌘J" disabled={Boolean(writing)}>
                <SplitIcons.sparkle className="size-3" />
                Rewrite
              </FooterButton>
            ) : null}
            <Button type="button" size="sm" className="h-8 gap-2 px-3" onClick={() => void send()} disabled={!canSend}>
              {sending ? "Sending…" : uploading ? "Uploading…" : "Send"}
              <Keys keys="⌘↵" primary />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** A quiet "the AI is working" line. */
function AiStatus({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-5 items-center gap-2 pl-5 text-xs text-muted-foreground" role="status">
      <span className="size-3 animate-spin rounded-full border-[1.5px] border-muted-foreground/25 border-t-foreground" aria-hidden="true" />
      {children}
    </p>
  );
}

function Keys({ keys, primary = false }: { keys: string; primary?: boolean }) {
  return (
    <kbd className={cn("hidden rounded px-1 font-sans text-[10px] leading-4 sm:inline", primary ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground")}>
      {keys}
    </kbd>
  );
}

function FooterButton({ onClick, keys, disabled = false, children }: { onClick: () => void; keys: string; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-foreground/80 transition-colors hover:bg-state-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-50">
      {children}
      <Keys keys={keys} />
    </button>
  );
}

function CloseRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" tabIndex={-1} aria-label={label} onClick={onClick} className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-state-hover hover:text-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" tabIndex={-1} onClick={onClick} className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground">
      {children}
    </button>
  );
}
