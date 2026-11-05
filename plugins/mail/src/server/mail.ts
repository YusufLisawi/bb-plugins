import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import addressparser from "nodemailer/lib/addressparser";
import type { Address, Folder } from "../shared/types.js";
import { messageKey, type MailStore, type StoredMessage } from "./store.js";

export interface AccountConfig {
  /** Stable short id; namespaces this mailbox's cache keys. */
  id: string;
  email: string;
  name: string;
  username: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

/** Newest messages pulled on the first sync of a folder. */
const INITIAL_WINDOW = 150;
/** Bytes fetched per message during sync; larger messages load fully on open. */
const SYNC_SOURCE_BYTES = 256 * 1024;
/** Older mail is backfilled in batches with just enough of each message for the list. */
const BACKFILL_CHUNK = 200;
const BACKFILL_BYTES = 12 * 1024;
const BACKFILL_BUDGET_MS = 20_000;
/** Upper bound per folder, so a huge archive cannot exhaust the cache. */
const MAX_CACHED = 25_000;
const FULL_SOURCE_LIMIT = 25 * 1024 * 1024;
const STORED_HTML_LIMIT = 2 * 1024 * 1024;

export function createImap(config: AccountConfig): ImapFlow {
  return new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapPort === 993,
    auth: { user: config.username || config.email, pass: config.password },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
  });
}

function createSmtp(config: AccountConfig) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.username || config.email, pass: config.password },
    connectionTimeout: 20_000,
  });
}

/** Run `work` on a short-lived IMAP connection. */
/** Run `work` on a short-lived connection (only for checking a new sign-in). */
async function withFreshImap<T>(config: AccountConfig, work: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = createImap(config);
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

// One long-lived command connection per mailbox. Mail servers ban addresses
// that open many short connections, so syncs, flag changes, moves and message
// downloads all share this one (the Inbox watcher keeps its own IDLE link).
const pool = new Map<string, { client: ImapFlow; key: string; ready: Promise<void>; idle: ReturnType<typeof setTimeout> | null }>();
const POOL_IDLE_MS = 10 * 60_000;

function dropPooled(id: string, client?: ImapFlow) {
  const entry = pool.get(id);
  if (!entry || (client && entry.client !== client)) return;
  pool.delete(id);
  if (entry.idle) clearTimeout(entry.idle);
  entry.client.logout().catch(() => entry.client.close());
}

/** Close every pooled connection (plugin reload or mailbox removed). */
export function closeImapPool(id?: string) {
  for (const key of [...pool.keys()]) if (!id || key === id) dropPooled(key);
}

export async function withImap<T>(config: AccountConfig, work: (client: ImapFlow) => Promise<T>, retried = false): Promise<T> {
  const key = JSON.stringify([config.imapHost, config.imapPort, config.username, config.email, config.password]);
  let entry = pool.get(config.id);
  if (entry && entry.key !== key) {
    dropPooled(config.id);
    entry = undefined;
  }
  if (!entry) {
    const client = createImap(config);
    client.on("error", () => dropPooled(config.id, client));
    client.on("close", () => dropPooled(config.id, client));
    entry = { client, key, ready: client.connect(), idle: null };
    pool.set(config.id, entry);
    entry.ready.catch(() => dropPooled(config.id, client));
  }
  const current = entry;
  await current.ready;
  if (!current.client.usable) {
    dropPooled(config.id, current.client);
    if (retried) throw new Error("The mail server closed the connection.");
    return withImap(config, work, true);
  }
  if (current.idle) clearTimeout(current.idle);
  try {
    return await work(current.client);
  } finally {
    current.idle = setTimeout(() => dropPooled(config.id, current.client), POOL_IDLE_MS);
  }
}

/** Log in to both servers without saving anything. Throws a readable error. */
export async function verifyAccount(config: AccountConfig): Promise<void> {
  try {
    await withFreshImap(config, async () => undefined);
  } catch (cause) {
    throw new Error(`Could not sign in to ${config.imapHost}: ${describe(cause)}`);
  }
  const smtp = createSmtp(config);
  try {
    await smtp.verify();
  } catch (cause) {
    throw new Error(`Could not sign in to ${config.smtpHost}: ${describe(cause)}`);
  } finally {
    smtp.close();
  }
}

export function describe(cause: unknown): string {
  // Node tries IPv6 and IPv4 at once; when both fail it throws an AggregateError with no message.
  if (cause instanceof AggregateError || (cause as { name?: string } | null)?.name === "AggregateError") {
    const codes = [...new Set(((cause as AggregateError).errors ?? []).map((error: { code?: string }) => error?.code).filter(Boolean))];
    return `Could not reach the mail server${codes.length ? ` (${codes.join(", ")})` : ""}. Retrying automatically.`;
  }
  if (cause && typeof cause === "object") {
    const error = cause as { responseText?: string; response?: string; message?: string; authenticationFailed?: boolean };
    if (error.authenticationFailed) return "the email or password was rejected. Gmail, iCloud and Outlook need an app password.";
    return error.responseText || error.response || error.message || String(cause);
  }
  return String(cause);
}

async function resolveSentPath(client: ImapFlow): Promise<string | null> {
  const boxes = await client.list();
  const special = boxes.find((box) => box.specialUse === "\\Sent");
  if (special) return special.path;
  const named = boxes.find((box) => /^(sent|sent items|sent mail|sent messages|\[gmail\]\/sent mail)$/i.test(box.path));
  return named?.path ?? null;
}

async function resolveArchivePath(client: ImapFlow, create: boolean): Promise<string | null> {
  const boxes = await client.list();
  const special = boxes.find((box) => box.specialUse === "\\Archive");
  if (special) return special.path;
  const named = boxes.find((box) => /^(archive|archives|archivo|archived|archiv|inbox[./]archive)$/i.test(box.path));
  if (named) return named.path;
  // Gmail has no Archive folder: archiving means leaving only "All Mail".
  const all = boxes.find((box) => box.specialUse === "\\All");
  if (all) return all.path;
  if (!create) return null;
  await client.mailboxCreate("Archive");
  return "Archive";
}

function addresses(value: AddressObject | AddressObject[] | undefined): Address[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.flatMap((group) => group.value).flatMap((entry) =>
    entry.group
      ? entry.group.map((member) => ({ name: member.name ?? "", address: member.address ?? "" }))
      : [{ name: entry.name ?? "", address: entry.address ?? "" }],
  );
}

/** Lists, newsletters, notifications and auto-replies identify themselves in headers. */
function isAutomated(parsed: ParsedMail, from: Address | undefined): boolean {
  const headers = parsed.headers;
  // mailparser folds List-Unsubscribe, List-Id and friends into one "list" header.
  if (headers.has("list") || headers.has("list-unsubscribe") || headers.has("list-id")) return true;
  if (headers.has("feedback-id") || headers.has("x-campaign") || headers.has("x-mailchimp-campaign-id")) return true;
  const precedence = String(headers.get("precedence") ?? "").toLowerCase();
  if (["bulk", "list", "junk", "auto_reply"].includes(precedence)) return true;
  const auto = String(headers.get("auto-submitted") ?? "").toLowerCase();
  if (auto && auto !== "no") return true;
  if (headers.has("x-autoreply") || headers.has("x-autorespond")) return true;
  const address = from?.address.toLowerCase() ?? "";
  return /^(no-?reply|do-?not-?reply|notifications?|notify|mailer-daemon|postmaster|bounce|newsletter|news|marketing|alerts?|updates?)([+.@-]|$)/.test(address);
}

function snippetOf(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

function toStored(account: string, folder: Folder, uid: number, seen: boolean, parsed: ParsedMail, fallbackDate: Date | undefined, truncated: boolean): StoredMessage {
  const text = parsed.text ?? "";
  const html = typeof parsed.html === "string" && parsed.html.length <= STORED_HTML_LIMIT ? parsed.html : null;
  const references = Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [];
  const from = addresses(parsed.from)[0];
  return {
    account,
    folder,
    uid,
    messageId: parsed.messageId ?? "",
    from: from ?? { name: "", address: "" },
    to: addresses(parsed.to),
    cc: addresses(parsed.cc),
    replyTo: addresses(parsed.replyTo),
    references,
    inReplyTo: typeof parsed.inReplyTo === "string" ? parsed.inReplyTo.trim() : "",
    automated: isAutomated(parsed, from),
    subject: parsed.subject ?? "",
    snippet: snippetOf(text),
    date: (parsed.date ?? fallbackDate ?? new Date()).getTime(),
    seen,
    text,
    html,
    // Every attachment, including images placed inside the body; the UI
    // decides what to show where (and hides tiny signature logos).
    attachments: parsed.attachments.map((attachment, part) => {
      const cid = attachment.cid?.replace(/^<|>$/g, "");
      return {
        filename: attachment.filename ?? (cid ? `image-${part + 1}.${(attachment.contentType.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "")}` : "attachment"),
        contentType: attachment.contentType,
        size: attachment.size,
        part,
        ...(cid ? { cid, embedded: Boolean(html && html.includes(`cid:${cid}`)) } : {}),
      };
    }),
    truncated,
  };
}

async function storeFetched(store: MailStore, account: string, folder: Folder, fetched: FetchMessageObject[], notify: boolean, maxBytes = SYNC_SOURCE_BYTES): Promise<number> {
  let lastUid = 0;
  for (const message of fetched) {
    lastUid = Math.max(lastUid, message.uid);
    if (!message.source) continue;
    let parsed: ParsedMail;
    try {
      parsed = await simpleParser(message.source, { skipImageLinks: true });
    } catch {
      // A broken message must never stop the sync of everything after it:
      // keep what can be read from the raw headers.
      const head = message.source.subarray(0, 16_384).toString("latin1");
      const header = (name: string) => new RegExp(`^${name}:\\s*(.+)$`, "im").exec(head)?.[1]?.trim() ?? "";
      parsed = {
        attachments: [],
        headers: new Map(),
        headerLines: [],
        subject: header("Subject") || "(couldn't read this message)",
        messageId: header("Message-ID"),
        text: "Mail couldn't read this message. Open it in your webmail to see it.",
        from: { value: [{ address: (/<([^>]+)>/.exec(header("From"))?.[1] ?? header("From")), name: header("From").replace(/<[^>]+>/, "").replace(/"/g, "").trim() }], html: "", text: header("From") },
      } as unknown as ParsedMail;
    }
    const truncated = (message.size ?? 0) > maxBytes;
    const internalDate = message.internalDate ? new Date(message.internalDate) : undefined;
    store.put(toStored(account, folder, message.uid, message.flags?.has("\\Seen") ?? false, parsed, internalDate, truncated), notify);
  }
  return lastUid;
}

export interface SyncResult {
  changed: boolean;
  /** Older mail is still being downloaded; sync again soon. */
  more: boolean;
}

/**
 * Bring one folder's cache up to date: new mail first (in full), then read
 * state and deletions, then older mail in batches (headers and the first
 * part of the text; the rest loads when a message is opened).
 */
async function syncFolder(client: ImapFlow, store: MailStore, account: string, folder: Folder, path: string, full = true): Promise<SyncResult> {
  const lock = await client.getMailboxLock(path, { readOnly: true });
  try {
    const mailbox = client.mailbox;
    if (!mailbox) return { changed: false, more: false };
    const uidValidity = String(mailbox.uidValidity);
    let state = store.folderState(account, folder);
    let changed = false;
    if (state && (state.uidValidity !== uidValidity || state.path !== path)) {
      store.clearFolder(account, folder);
      state = null;
      changed = true;
    }

    const query = { uid: true, flags: true, internalDate: true, size: true, source: { maxLength: SYNC_SOURCE_BYTES } } as const;
    let lastUid = state?.lastUid ?? 0;
    if (!state) {
      if (mailbox.exists > 0) {
        const first = Math.max(1, mailbox.exists - INITIAL_WINDOW + 1);
        const fetched = await client.fetchAll(`${first}:*`, query);
        lastUid = Math.max(lastUid, await storeFetched(store, account, folder, fetched, false));
        changed ||= fetched.length > 0;
      }
    } else {
      // `N:*` always returns the newest message, so keep only genuinely new uids.
      const fetched = (await client.fetchAll(`${lastUid + 1}:*`, query, { uid: true })).filter((message) => message.uid > state.lastUid);
      if (fetched.length > 0) {
        lastUid = Math.max(lastUid, await storeFetched(store, account, folder, fetched, folder === "inbox"));
        changed = true;
      }
    }
    store.setFolderState(account, folder, path, uidValidity, lastUid, mailbox.exists);

    // Read state and deletions for everything cached, and which uids are missing.
    // A quick sync (new mail only) skips this; it runs on the full sync every few minutes.
    let more = false;
    if (!full) return { changed, more };
    if (mailbox.exists > 0) {
      const flags = await client.fetchAll("1:*", { uid: true, flags: true });
      const seen = new Map(flags.map((message) => [message.uid, message.flags?.has("\\Seen") ?? false]));
      changed = store.syncSeen(account, folder, seen) || changed;
      changed = store.prune(account, folder, new Set(seen.keys()), 0) || changed;

      const cached = store.cachedUids(account, folder);
      const missing = [...seen.keys()].filter((uid) => !cached.has(uid)).sort((a, b) => b - a).slice(0, Math.max(0, MAX_CACHED - cached.size));
      const started = Date.now();
      for (let index = 0; index < missing.length; index += BACKFILL_CHUNK) {
        if (Date.now() - started > BACKFILL_BUDGET_MS) {
          more = true;
          break;
        }
        const batch = missing.slice(index, index + BACKFILL_CHUNK);
        const fetched = await client.fetchAll(batch.join(","), { ...query, source: { maxLength: BACKFILL_BYTES } }, { uid: true });
        await storeFetched(store, account, folder, fetched, false, BACKFILL_BYTES);
        changed ||= fetched.length > 0;
      }
    } else {
      changed = store.prune(account, folder, new Set(), 0) || changed;
    }
    return { changed, more };
  } finally {
    lock.release();
  }
}

export interface FolderInfo {
  path: string;
  specialUse: string | null;
  messages: number;
  unseen: number;
}

/** Every folder on the server with its message counts. */
export async function listFolders(config: AccountConfig): Promise<FolderInfo[]> {
  return withImap(config, async (client) => {
    const boxes = await client.list({ statusQuery: { messages: true, unseen: true } });
    return boxes
      .filter((box) => !box.flags?.has("\\Noselect"))
      .map((box) => ({
        path: box.path,
        specialUse: box.specialUse ?? null,
        messages: box.status?.messages ?? 0,
        unseen: box.status?.unseen ?? 0,
      }));
  });
}

/**
 * `full` also reconciles read state and deletions, syncs Sent and Archive and
 * continues the older-mail download; without it only new Inbox mail is fetched.
 */
async function resolveJunkPath(client: ImapFlow): Promise<string | null> {
  const boxes = await client.list();
  const special = boxes.find((box) => box.specialUse === "\\Junk");
  if (special) return special.path;
  const named = boxes.find((box) => /^(junk|junk e-?mail|junk mail|spam|bulk|correo no deseado|no deseado|\[gmail\]\/spam|inbox[./](junk|spam))$/i.test(box.path));
  return named?.path ?? null;
}

// Found once per connection; Junk is checked on every quick sync so mail the
// server filed there is never missed.
const junkPaths = new Map<string, string | null>();

export async function syncAll(config: AccountConfig, store: MailStore, full = true): Promise<SyncResult> {
  return withImap(config, async (client) => {
    const results: SyncResult[] = [await syncFolder(client, store, config.id, "inbox", "INBOX", full)];
    if (full || !junkPaths.has(config.id)) junkPaths.set(config.id, await resolveJunkPath(client));
    const junkPath = junkPaths.get(config.id);
    if (junkPath) results.push(await syncFolder(client, store, config.id, "junk", junkPath, full));
    if (!full) return { changed: results.some((result) => result.changed), more: results.some((result) => result.more) };
    const sentPath = await resolveSentPath(client);
    if (sentPath) results.push(await syncFolder(client, store, config.id, "sent", sentPath));
    const archivePath = await resolveArchivePath(client, false);
    if (archivePath) results.push(await syncFolder(client, store, config.id, "archive", archivePath));
    return { changed: results.some((result) => result.changed), more: results.some((result) => result.more) };
  });
}

function folderPath(store: MailStore, account: string, folder: Folder): string {
  if (folder === "inbox") return "INBOX";
  const path = store.folderState(account, folder)?.path;
  if (!path) throw new Error(`The ${folder} folder has not been synced yet.`);
  return path;
}

/** Download a whole message that sync only fetched partially. */
export async function loadFullMessage(config: AccountConfig, store: MailStore, folder: Folder, uid: number, seen: boolean) {
  await withImap(config, async (client) => {
    const lock = await client.getMailboxLock(folderPath(store, config.id, folder), { readOnly: true });
    try {
      const message = await client.fetchOne(String(uid), { uid: true, size: true, internalDate: true, source: true }, { uid: true });
      if (!message || !message.source || (message.size ?? 0) > FULL_SOURCE_LIMIT) return;
      const parsed = await simpleParser(message.source, { skipImageLinks: true });
      const internalDate = message.internalDate ? new Date(message.internalDate) : undefined;
      store.put(toStored(config.id, folder, uid, seen, parsed, internalDate, false));
    } finally {
      lock.release();
    }
  });
}

/** [1,2,3,7,9,10] → ["1:3,7,9:10"], split so no single IMAP command grows too long. */
export function uidSets(uids: number[], perSet = 500): string[] {
  const sorted = [...new Set(uids)].sort((a, b) => a - b);
  const sets: string[] = [];
  for (let start = 0; start < sorted.length; start += perSet) {
    const chunk = sorted.slice(start, start + perSet);
    const parts: string[] = [];
    let from = chunk[0]!;
    let previous = from;
    for (const uid of [...chunk.slice(1), Number.NaN]) {
      if (uid === previous + 1) {
        previous = uid;
        continue;
      }
      parts.push(from === previous ? String(from) : `${from}:${previous}`);
      from = uid;
      previous = uid;
    }
    sets.push(parts.join(","));
  }
  return sets;
}

export interface DownloadedAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

/**
 * Download one attachment of a cached message. `index` counts the same
 * attachments the cache lists (inline images with a content id are skipped).
 */
export async function downloadAttachment(config: AccountConfig, store: MailStore, folder: Folder, uid: number, index: number, part?: number): Promise<DownloadedAttachment> {
  return withImap(config, async (client) => {
    const lock = await client.getMailboxLock(folderPath(store, config.id, folder), { readOnly: true });
    try {
      const message = await client.fetchOne(String(uid), { uid: true, size: true, source: true }, { uid: true });
      if (!message || !message.source) throw new Error("This message is no longer on the server.");
      if ((message.size ?? 0) > FULL_SOURCE_LIMIT) throw new Error("This message is too large to download here.");
      const parsed = await simpleParser(message.source, { skipImageLinks: true });
      // `part` indexes all attachments; older cached lists skipped body images.
      const attachment = part !== undefined
        ? parsed.attachments[part]
        : parsed.attachments.filter((entry) => entry.contentDisposition !== "inline" || !entry.cid)[index];
      if (!attachment) throw new Error("That attachment was not found.");
      return { filename: attachment.filename ?? "attachment", contentType: attachment.contentType, content: attachment.content };
    } finally {
      lock.release();
    }
  });
}

export async function setSeenOnServer(config: AccountConfig, store: MailStore, folder: Folder, uids: number | number[], seen: boolean) {
  const sets = uidSets(Array.isArray(uids) ? uids : [uids]);
  if (sets.length === 0) return;
  await withImap(config, async (client) => {
    const lock = await client.getMailboxLock(folderPath(store, config.id, folder));
    try {
      for (const range of sets) {
        if (seen) await client.messageFlagsAdd(range, ["\\Seen"], { uid: true });
        else await client.messageFlagsRemove(range, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  });
}

/**
 * Move messages between Inbox and Archive on the server and re-key the cache
 * so the UI updates at once instead of waiting for the next sync.
 */
export async function moveMessages(config: AccountConfig, store: MailStore, from: Folder, uids: number[], to: Folder) {
  if (uids.length === 0) return;
  await withImap(config, async (client) => {
    const target = to === "inbox" ? "INBOX" : to === "archive" ? await resolveArchivePath(client, true) : to === "junk" ? await resolveJunkPath(client) : await resolveSentPath(client);
    if (!target) throw new Error("The mail server has no folder to move this to.");
    const lock = await client.getMailboxLock(folderPath(store, config.id, from));
    try {
      const uidMap = new Map<number, number>();
      for (const range of uidSets(uids)) {
        const result = await client.messageMove(range, target, { uid: true });
        if (result && typeof result === "object") for (const [from, toUid] of result.uidMap ?? []) uidMap.set(from, toUid);
      }
      for (const uid of uids) {
        const moved = uidMap?.get(uid);
        const id = messageKey(config.id, from, uid);
        if (moved) store.moveRow(id, to, moved);
        else store.deleteRow(id);
      }
    } finally {
      lock.release();
    }
  });
}

export interface OutgoingMessage {
  to: string;
  cc: string;
  /** Blind copies: in the SMTP envelope only, never in the headers. */
  bcc?: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string[];
  /** Files to attach, as ordinary attachments. */
  attachments?: { filename: string; contentType: string; content: Buffer }[];
}

function recipients(list: string): string[] {
  return addressparser(list, { flatten: true })
    .map((entry) => ("address" in entry ? entry.address : ""))
    .filter((address): address is string => Boolean(address));
}

/** Gmail and Microsoft 365 file SMTP mail in Sent themselves. */
function serverSavesSent(config: AccountConfig): boolean {
  return /(gmail|googlemail|outlook|office365|hotmail|live)\./i.test(config.smtpHost);
}

export async function sendMessage(config: AccountConfig, message: OutgoingMessage, store?: MailStore): Promise<void> {
  const to = recipients(message.to);
  const cc = recipients(message.cc);
  const bcc = recipients(message.bcc ?? "");
  if (to.length === 0) throw new Error("Add at least one valid recipient.");

  const raw = await new MailComposer({
    from: { name: config.name, address: config.email },
    to: message.to,
    cc: message.cc || undefined,
    subject: message.subject,
    text: message.text,
    // Your text is the body; every file, images included, is a plain attachment.
    attachments: message.attachments?.length ? message.attachments.map((file) => ({ filename: file.filename, contentType: file.contentType, content: file.content, contentDisposition: "attachment" as const })) : undefined,
    inReplyTo: message.inReplyTo || undefined,
    references: message.references?.length ? message.references : undefined,
    date: new Date(),
  }).compile().build();

  const smtp = createSmtp(config);
  try {
    await smtp.sendMail({ envelope: { from: config.email, to: [...to, ...cc, ...bcc] }, raw });
  } finally {
    smtp.close();
  }

  let sentUid: number | null = null;
  if (!serverSavesSent(config)) {
    await withImap(config, async (client) => {
      const sentPath = await resolveSentPath(client);
      if (!sentPath) return;
      const appended = await client.append(sentPath, raw, ["\\Seen"]);
      if (appended && typeof appended === "object" && typeof appended.uid === "number") sentUid = appended.uid;
    }).catch(() => undefined);
  }

  // Show it in the conversation at once, before the next sync. Without the
  // server's uid it gets a temporary one that the next full sync replaces.
  if (store) {
    const parsed = await simpleParser(raw, { skipImageLinks: true });
    store.put(toStored(config.id, "sent", sentUid ?? 2_000_000_000 + Math.floor(Date.now() / 1000) % 100_000_000, true, parsed, new Date(), false));
  }
}
