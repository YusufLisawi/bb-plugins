import { useEffect, useId, useLayoutEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../server.js";
import type { Contact } from "../shared/types.js";
import { cn } from "@/lib/utils";
import { usePortalScopeProps } from "@/lib/portal-scope";

type Rpc = ReturnType<typeof useRpc<typeof rpcContract>>;

// Everyone you correspond with, loaded once and filtered as you type: no
// round trip per keystroke, which matters when BB is reached remotely.
let directory: { at: number; contacts: Promise<Contact[]> } | null = null;
function loadDirectory(rpc: Rpc): Promise<Contact[]> {
  if (!directory || Date.now() - directory.at > 10 * 60_000) {
    const contacts = rpc.call("contacts", { query: "", limit: 1000 }).then((result) => result.contacts);
    directory = { at: Date.now(), contacts };
    contacts.catch(() => { directory = null; });
  }
  return directory.contacts;
}

function matches(contact: Contact, needle: string): boolean {
  if (!needle) return true;
  const haystack = `${contact.name} ${contact.address} ${contact.org}`.toLowerCase();
  const words = haystack.split(/[\s@.<>_,()-]+/);
  return words.some((word) => word.startsWith(needle)) || haystack.startsWith(needle) || (needle.length >= 3 && haystack.includes(needle));
}

export interface Recipient {
  name: string;
  address: string;
}

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

export function isValidAddress(address: string): boolean {
  return EMAIL.test(address);
}

/** "Ana García <ana@x.com>, bob@y.com" → recipients. Commas inside quotes are kept. */
export function parseRecipients(value: string): Recipient[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let angled = false;
  for (const char of value) {
    if (char === '"') quoted = !quoted;
    if (char === "<") angled = true;
    if (char === ">") angled = false;
    if ((char === "," || char === ";" || char === "\n") && !quoted && !angled) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = /^(.*?)\s*<([^>]+)>$/.exec(part);
    if (match) return { name: match[1]!.replace(/^["']|["']$/g, "").trim(), address: match[2]!.trim() };
    return { name: "", address: part.replace(/^mailto:/i, "") };
  });
}

export function formatRecipients(recipients: Recipient[]): string {
  return recipients
    .map((recipient) => (recipient.name ? `"${recipient.name.replace(/"/g, "")}" <${recipient.address}>` : recipient.address))
    .join(", ");
}

interface RecipientFieldProps {
  label: string;
  value: Recipient[];
  onChange: (value: Recipient[]) => void;
  autoFocus?: boolean;
  /** Shown at the end of the row (e.g. the Cc/Bcc toggles). */
  trailing?: React.ReactNode;
  placeholder?: string;
}

/**
 * Recipients as chips with autocomplete from everyone in the user's mail.
 * Enter, Tab, comma or space accept; Backspace on an empty field removes the
 * last chip; pasting a list splits it into chips.
 */
export function RecipientField({ label, value, onChange, autoFocus, trailing, placeholder }: RecipientFieldProps) {
  const rpc = useRpc<typeof rpcContract>();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [active, setActive] = useState(0);

  // Warm the directory as soon as the composer shows.
  useEffect(() => { void loadDirectory(rpc).catch(() => undefined); }, [rpc]);

  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const needle = text.trim().toLowerCase();
    loadDirectory(rpc).then((contacts) => {
      if (cancelled) return;
      const taken = new Set(value.map((recipient) => recipient.address.toLowerCase()));
      setSuggestions(contacts.filter((contact) => !taken.has(contact.address) && matches(contact, needle)).slice(0, 7));
      setActive(0);
    }, () => undefined);
    return () => { cancelled = true; };
  }, [rpc, text, focused, value]);

  function add(next: Recipient[]) {
    const known = new Set(value.map((recipient) => recipient.address.toLowerCase()));
    const fresh = next.filter((recipient) => recipient.address && !known.has(recipient.address.toLowerCase()));
    if (fresh.length) onChange([...value, ...fresh]);
    setText("");
  }

  function commitTyped(): boolean {
    const typed = text.trim().replace(/[,;]$/, "");
    if (!typed) return false;
    add(parseRecipients(typed));
    return true;
  }

  function choose(contact: Contact) {
    add([{ name: contact.name, address: contact.address }]);
    inputRef.current?.focus();
  }

  const open = focused && suggestions.length > 0 && (text.trim().length > 0 || value.length === 0);
  const rowRef = useRef<HTMLDivElement>(null);
  const scope = usePortalScopeProps();
  const [place, setPlace] = useState<CSSProperties | null>(null);

  // The list floats over everything (never cut off by the pane it's in) and
  // opens upward when there's no room below.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const box = rowRef.current?.getBoundingClientRect();
      if (!box) return;
      const left = box.left + 60;
      const width = Math.min(448, box.right - left);
      const below = window.innerHeight - box.bottom;
      setPlace(below < 220 && box.top > below
        ? { position: "fixed", left, width, bottom: window.innerHeight - box.top + 4 }
        : { position: "fixed", left, width, top: box.bottom + 4 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, value.length]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (open && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (open && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if ((event.key === "Enter" || event.key === "Tab") && open && text.trim()) {
      event.preventDefault();
      choose(suggestions[active]!);
    } else if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) {
      if (commitTyped()) event.preventDefault();
    } else if (event.key === "Tab") {
      commitTyped();
    } else if ((event.key === "," || event.key === ";" || event.key === " ") && text.includes("@")) {
      event.preventDefault();
      commitTyped();
    } else if (event.key === "Backspace" && !text && value.length) {
      event.preventDefault();
      const last = value[value.length - 1]!;
      onChange(value.slice(0, -1));
      setText(last.address);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setSuggestions([]);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!/[,;\n]/.test(pasted) && !/<.+>/.test(pasted)) return;
    event.preventDefault();
    add(parseRecipients(`${text}${pasted}`));
  }

  return (
    <div className="relative">
      <div
        ref={rowRef}
        className="flex min-h-10 cursor-text items-start gap-3 border-b border-border/60 py-1.5"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        <label htmlFor={id} className="w-12 shrink-0 pt-[5px] text-[13px] text-muted-foreground">{label}</label>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {value.map((recipient, index) => {
            const valid = isValidAddress(recipient.address);
            return (
              <span
                key={`${recipient.address}-${index}`}
                title={recipient.name ? `${recipient.name} <${recipient.address}>` : recipient.address}
                className={cn(
                  "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full pl-0.5 pr-1 text-xs",
                  valid ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive",
                )}
              >
                <Initials recipient={recipient} invalid={!valid} />
                <span className="max-w-[16rem] truncate">{recipient.name.replace(/\(.*?\)/g, "").trim() || recipient.address}</span>
                <button
                  type="button"
                  aria-label={`Remove ${recipient.address}`}
                  onClick={() => onChange(value.filter((_, position) => position !== index))}
                  className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </span>
            );
          })}
          <input
            id={id}
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commitTyped();
            }}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-activedescendant={open ? `${id}-option-${active}` : undefined}
            placeholder={value.length ? "" : placeholder}
            className="h-7 min-w-32 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-0.5 pt-0.5">{trailing}</div> : null}
      </div>

      {open && place ? createPortal(
        <ul
          {...scope}
          id={`${id}-list`}
          role="listbox"
          style={place}
          className="z-[60] overflow-hidden rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {suggestions.map((contact, index) => (
            <li
              key={contact.address}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(contact);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5", index === active && "bg-state-hover")}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium uppercase text-muted-foreground" aria-hidden="true">
                {(contact.name || contact.address).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">
                  {contact.name || contact.address}
                  {contact.org ? <span className="text-muted-foreground"> · {contact.org}</span> : null}
                </span>
                {contact.name ? <span className="block truncate text-[11px] text-muted-foreground">{contact.address}</span> : null}
              </span>
            </li>
          ))}
        </ul>,
        document.body,
      ) : null}
    </div>
  );
}

/** A stable hue per address, so the same person always gets the same color. */
function hue(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function Initials({ recipient, invalid }: { recipient: Recipient; invalid: boolean }) {
  const name = recipient.name.replace(/\(.*?\)/g, "").trim();
  const words = (name.includes(",") ? name.split(",").reverse().join(" ") : name || recipient.address.split("@")[0]!)
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[words.length - 1]![0] : "")).toUpperCase();
  const h = hue(recipient.address.toLowerCase());
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold"
      style={invalid ? undefined : { background: `hsl(${h} 70% 50% / 0.16)`, color: `hsl(${h} 60% 52%)` }}
    >
      {letters}
    </span>
  );
}
