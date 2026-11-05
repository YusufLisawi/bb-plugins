import type { Database } from "better-sqlite3";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { Address, Folder, MessageDetail, MessageSummary } from "../shared/types.js";

/** A parsed message as the sync writes it into the cache. */
export interface StoredMessage {
  account: string;
  folder: Folder;
  uid: number;
  messageId: string;
  from: Address;
  to: Address[];
  cc: Address[];
  replyTo: Address[];
  references: string[];
  inReplyTo: string;
  /** Sent by a machine: a list, newsletter, notification or auto-reply. */
  automated: boolean;
  subject: string;
  snippet: string;
  date: number;
  seen: boolean;
  text: string;
  html: string | null;
  attachments: { filename: string; contentType: string; size: number }[];
  truncated: boolean;
}

interface Row {
  id: string;
  account: string;
  folder: Folder;
  uid: number;
  message_id: string;
  from_json: string;
  to_json: string;
  cc_json: string;
  reply_to_json: string;
  references_json: string;
  subject: string;
  snippet: string;
  date: number;
  seen: number;
  text: string;
  html: string | null;
  attachments_json: string;
  truncated: number;
  in_reply_to: string;
  automated: number;
}

/** The fields thread grouping needs, without bodies. */
export interface ThreadRow {
  id: string;
  account: string;
  folder: Folder;
  uid: number;
  messageId: string;
  inReplyTo: string;
  references: string[];
  from: Address;
  to: Address[];
  cc: Address[];
  subject: string;
  snippet: string;
  date: number;
  seen: boolean;
  automated: boolean;
  hasAttachments: boolean;
}

export interface ThreadState {
  anchor: string;
  laterUntil: number;
  doneKey: string;
  category: string | null;
  split: string | null;
  reason: string | null;
  classifiedKey: string;
  updatedAt: number;
}

/** Cache key for one message: `<account>.<folder>-<uid>`. */
export function messageKey(account: string, folder: Folder, uid: number): string {
  return `${account}.${folder}-${uid}`;
}

export function parseMessageKey(id: string): { account: string; folder: Folder; uid: number } | null {
  const match = /^([a-z0-9]+)\.(inbox|sent|archive)-(\d+)$/.exec(id);
  if (!match) return null;
  return { account: match[1]!, folder: match[2] as Folder, uid: Number(match[3]) };
}

export function openStore(bb: BbPluginApi) {
  const db: Database = bb.storage.database();
  bb.storage.migrate(db, [
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      folder TEXT NOT NULL,
      uid INTEGER NOT NULL,
      message_id TEXT NOT NULL,
      from_json TEXT NOT NULL,
      to_json TEXT NOT NULL,
      cc_json TEXT NOT NULL,
      reply_to_json TEXT NOT NULL,
      references_json TEXT NOT NULL,
      subject TEXT NOT NULL,
      snippet TEXT NOT NULL,
      date INTEGER NOT NULL,
      seen INTEGER NOT NULL,
      text TEXT NOT NULL,
      html TEXT,
      attachments_json TEXT NOT NULL,
      truncated INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS messages_folder_date ON messages (folder, date DESC)`,
    `CREATE TABLE IF NOT EXISTS folder_state (
      folder TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      uid_validity TEXT NOT NULL,
      last_uid INTEGER NOT NULL
    )`,
    // Messages that arrived after the first sync get an increasing number, so
    // every open client can catch up on alerts it missed.
    `ALTER TABLE messages ADD COLUMN notify_seq INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE messages ADD COLUMN in_reply_to TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE messages ADD COLUMN automated INTEGER NOT NULL DEFAULT 0`,
    `CREATE INDEX IF NOT EXISTS messages_message_id ON messages (message_id)`,
    // Per-conversation triage state, keyed by one message id of the thread.
    `CREATE TABLE IF NOT EXISTS thread_state (
      anchor TEXT PRIMARY KEY,
      later_until INTEGER NOT NULL DEFAULT 0,
      done_key TEXT NOT NULL DEFAULT '',
      category TEXT,
      split TEXT,
      reason TEXT,
      classified_key TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT 0
    )`,
    // Several mailboxes: every message and folder cursor belongs to one account.
    `ALTER TABLE messages ADD COLUMN account TEXT NOT NULL DEFAULT 'main'`,
    `CREATE TABLE IF NOT EXISTS folder_cursor (
      account TEXT NOT NULL,
      folder TEXT NOT NULL,
      path TEXT NOT NULL,
      uid_validity TEXT NOT NULL,
      last_uid INTEGER NOT NULL,
      PRIMARY KEY (account, folder)
    )`,
    // How many messages the server folder holds, to show download progress.
    `ALTER TABLE folder_cursor ADD COLUMN total INTEGER NOT NULL DEFAULT 0`,
    // What Mail has learned: people, projects, writing styles, notes and
    // attachment readings, one JSON document per item.
    `CREATE TABLE IF NOT EXISTS knowledge (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (kind, id)
    )`,
  ]);

  const upsert = db.prepare(`INSERT INTO messages (id, folder, uid, message_id, from_json, to_json, cc_json, reply_to_json, references_json, subject, snippet, date, seen, text, html, attachments_json, truncated, notify_seq, in_reply_to, automated, account)
    VALUES (@id, @folder, @uid, @message_id, @from_json, @to_json, @cc_json, @reply_to_json, @references_json, @subject, @snippet, @date, @seen, @text, @html, @attachments_json, @truncated, @notify_seq, @in_reply_to, @automated, @account)
    ON CONFLICT(id) DO UPDATE SET seen = excluded.seen, text = excluded.text, html = excluded.html, snippet = excluded.snippet, attachments_json = excluded.attachments_json, truncated = excluded.truncated`);

  // Bumped by every write to cached mail or triage state (not knowledge), so
  // the thread index is rebuilt only when what it reads has changed.
  let version = 0;
  const bump = () => { version += 1; };

  /** Logos and tracking pixels placed in the body don't count as attachments. */
  function realAttachments(json: string): boolean {
    if (json === "[]") return false;
    try {
      return (JSON.parse(json) as { cid?: string; size: number }[]).some((entry) => !entry.cid || entry.size >= 12_000);
    } catch {
      return true;
    }
  }

  function toSummary(row: Row): MessageSummary {
    return {
      id: row.id,
      account: row.account,
      folder: row.folder,
      from: JSON.parse(row.from_json),
      to: JSON.parse(row.to_json),
      subject: row.subject,
      snippet: row.snippet,
      date: row.date,
      seen: row.seen === 1,
      hasAttachments: realAttachments(row.attachments_json),
    };
  }

  function latestSeq(): number {
    return (db.prepare(`SELECT COALESCE(MAX(notify_seq), 0) AS n FROM messages`).get() as { n: number }).n;
  }

  return {
    /** `notify` marks a message that just arrived (not part of the first sync). */
    put(message: StoredMessage, notify = false) {
      bump();
      const id = messageKey(message.account, message.folder, message.uid);
      const exists = db.prepare(`SELECT 1 FROM messages WHERE id = ?`).get(id) !== undefined;
      upsert.run({
        notify_seq: notify && !exists ? latestSeq() + 1 : 0,
        id,
        folder: message.folder,
        uid: message.uid,
        message_id: message.messageId,
        from_json: JSON.stringify(message.from),
        to_json: JSON.stringify(message.to),
        cc_json: JSON.stringify(message.cc),
        reply_to_json: JSON.stringify(message.replyTo),
        references_json: JSON.stringify(message.references),
        subject: message.subject,
        snippet: message.snippet,
        date: message.date,
        seen: message.seen ? 1 : 0,
        text: message.text,
        html: message.html,
        attachments_json: JSON.stringify(message.attachments),
        truncated: message.truncated ? 1 : 0,
        in_reply_to: message.inReplyTo,
        automated: message.automated ? 1 : 0,
        account: message.account,
      });
    },

    list(folder: Folder, query: string, limit: number): MessageSummary[] {
      const like = `%${query.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
      const rows = (query
        ? db.prepare(`SELECT * FROM messages WHERE folder = ? AND (subject LIKE ? ESCAPE '\\' OR from_json LIKE ? ESCAPE '\\' OR to_json LIKE ? ESCAPE '\\' OR text LIKE ? ESCAPE '\\') ORDER BY date DESC LIMIT ?`)
            .all(folder, like, like, like, like, limit)
        : db.prepare(`SELECT * FROM messages WHERE folder = ? ORDER BY date DESC LIMIT ?`).all(folder, limit)) as Row[];
      return rows.map(toSummary);
    },

    get(id: string): (MessageDetail & { uid: number; truncated: boolean }) | null {
      const row = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as Row | undefined;
      if (!row) return null;
      return {
        ...toSummary(row),
        uid: row.uid,
        truncated: row.truncated === 1,
        cc: JSON.parse(row.cc_json),
        replyTo: JSON.parse(row.reply_to_json),
        messageId: row.message_id,
        references: JSON.parse(row.references_json),
        text: row.text,
        html: row.html,
        attachments: JSON.parse(row.attachments_json),
        partial: row.truncated === 1,
      };
    },

    latestSeq,

    /** Changes whenever cached mail or triage state does. */
    revision(): number {
      return version;
    },

    /** The oldest uid among the newest `window` cached messages of one folder. */
    oldestCachedUid(account: string, folder: Folder, window: number): number | null {
      const row = db.prepare(`SELECT MIN(uid) AS n FROM (SELECT uid FROM messages WHERE account = ? AND folder = ? ORDER BY uid DESC LIMIT ?)`)
        .get(account, folder, window) as { n: number | null };
      return row.n;
    },

    /** Unread Inbox messages that arrived after `after`, newest first. */
    arrivals(after: number, limit: number): MessageSummary[] {
      const rows = db.prepare(`SELECT * FROM messages WHERE folder = 'inbox' AND seen = 0 AND notify_seq > ? ORDER BY notify_seq DESC LIMIT ?`)
        .all(after, limit) as Row[];
      return rows.map(toSummary);
    },

    /** Inbox messages that arrived after `after` (read or not), oldest first. */
    arrivedSince(after: number, limit: number): { id: string; seq: number }[] {
      return db.prepare(`SELECT id, notify_seq AS seq FROM messages WHERE folder = 'inbox' AND notify_seq > ? ORDER BY notify_seq ASC LIMIT ?`)
        .all(after, limit) as { id: string; seq: number }[];
    },

    unreadCount(account?: string): number {
      const row = (account
        ? db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE folder = 'inbox' AND seen = 0 AND account = ?`).get(account)
        : db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE folder = 'inbox' AND seen = 0`).get()) as { n: number };
      return row.n;
    },

    setSeen(id: string, seen: boolean) {
      bump();
      db.prepare(`UPDATE messages SET seen = ? WHERE id = ?`).run(seen ? 1 : 0, id);
    },

    setSeenMany(ids: string[], seen: boolean) {
      bump();
      const update = db.prepare(`UPDATE messages SET seen = ? WHERE id = ?`);
      db.transaction(() => { for (const id of ids) update.run(seen ? 1 : 0, id); })();
    },

    /** Mirror server flags for already-cached messages; returns whether anything changed. */
    syncSeen(account: string, folder: Folder, flags: Map<number, boolean>): boolean {
      const update = db.prepare(`UPDATE messages SET seen = ? WHERE account = ? AND folder = ? AND uid = ? AND seen != ?`);
      let changed = false;
      db.transaction(() => {
        for (const [uid, seen] of flags) {
          if (update.run(seen ? 1 : 0, account, folder, uid, seen ? 1 : 0).changes > 0) changed = true;
        }
      })();
      if (changed) bump();
      return changed;
    },

    /** Drop cached messages that were deleted or moved on the server. */
    prune(account: string, folder: Folder, keep: Set<number>, sinceUid: number): boolean {
      const rows = db.prepare(`SELECT uid FROM messages WHERE account = ? AND folder = ? AND uid >= ?`).all(account, folder, sinceUid) as { uid: number }[];
      const remove = db.prepare(`DELETE FROM messages WHERE account = ? AND folder = ? AND uid = ?`);
      let changed = false;
      for (const { uid } of rows) {
        if (!keep.has(uid)) {
          remove.run(account, folder, uid);
          changed = true;
          bump();
        }
      }
      return changed;
    },

    folderState(account: string, folder: Folder): { path: string; uidValidity: string; lastUid: number } | null {
      const row = db.prepare(`SELECT path, uid_validity, last_uid FROM folder_cursor WHERE account = ? AND folder = ?`).get(account, folder) as
        | { path: string; uid_validity: string; last_uid: number }
        | undefined;
      return row ? { path: row.path, uidValidity: row.uid_validity, lastUid: row.last_uid } : null;
    },

    setFolderState(account: string, folder: Folder, path: string, uidValidity: string, lastUid: number, total = 0) {
      db.prepare(`INSERT INTO folder_cursor (account, folder, path, uid_validity, last_uid, total) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account, folder) DO UPDATE SET path = excluded.path, uid_validity = excluded.uid_validity, last_uid = excluded.last_uid, total = excluded.total`)
        .run(account, folder, path, uidValidity, lastUid, total);
    },

    threadRows(): ThreadRow[] {
      const rows = db.prepare(`SELECT id, account, folder, uid, message_id, in_reply_to, references_json, from_json, to_json, cc_json, subject, snippet, date, seen, automated, attachments_json FROM messages`).all() as Row[];
      return rows.map((row) => ({
        id: row.id,
        account: row.account,
        folder: row.folder,
        uid: row.uid,
        messageId: row.message_id,
        inReplyTo: row.in_reply_to,
        references: JSON.parse(row.references_json),
        from: JSON.parse(row.from_json),
        to: JSON.parse(row.to_json),
        cc: JSON.parse(row.cc_json),
        subject: row.subject,
        snippet: row.snippet,
        date: row.date,
        seen: row.seen === 1,
        automated: row.automated === 1,
        hasAttachments: realAttachments(row.attachments_json),
      }));
    },

    threadStates(): Map<string, ThreadState> {
      const rows = db.prepare(`SELECT * FROM thread_state`).all() as {
        anchor: string; later_until: number; done_key: string; category: string | null; split: string | null;
        reason: string | null; classified_key: string; updated_at: number;
      }[];
      return new Map(rows.map((row) => [row.anchor, {
        anchor: row.anchor,
        laterUntil: row.later_until,
        doneKey: row.done_key,
        category: row.category,
        split: row.split,
        reason: row.reason,
        classifiedKey: row.classified_key,
        updatedAt: row.updated_at,
      }]));
    },

    setThreadState(anchor: string, patch: Partial<Omit<ThreadState, "anchor" | "updatedAt">>) {
      bump();
      const current = db.prepare(`SELECT * FROM thread_state WHERE anchor = ?`).get(anchor) as Record<string, unknown> | undefined;
      const next = {
        anchor,
        later_until: patch.laterUntil ?? (current?.later_until as number | undefined) ?? 0,
        done_key: patch.doneKey ?? (current?.done_key as string | undefined) ?? "",
        category: patch.category !== undefined ? patch.category : ((current?.category as string | null | undefined) ?? null),
        split: patch.split !== undefined ? patch.split : ((current?.split as string | null | undefined) ?? null),
        reason: patch.reason !== undefined ? patch.reason : ((current?.reason as string | null | undefined) ?? null),
        classified_key: patch.classifiedKey ?? (current?.classified_key as string | undefined) ?? "",
        updated_at: Date.now(),
      };
      db.prepare(`INSERT INTO thread_state (anchor, later_until, done_key, category, split, reason, classified_key, updated_at)
        VALUES (@anchor, @later_until, @done_key, @category, @split, @reason, @classified_key, @updated_at)
        ON CONFLICT(anchor) DO UPDATE SET later_until = excluded.later_until, done_key = excluded.done_key, category = excluded.category,
          split = excluded.split, reason = excluded.reason, classified_key = excluded.classified_key, updated_at = excluded.updated_at`).run(next);
    },

    /** Re-key a cached message after it moved to another folder on the server. */
    moveRow(id: string, folder: Folder, uid: number) {
      const account = parseMessageKey(id)?.account ?? "main";
      const nextId = messageKey(account, folder, uid);
      bump();
      db.transaction(() => {
        db.prepare(`DELETE FROM messages WHERE id = ?`).run(nextId);
        db.prepare(`UPDATE messages SET id = ?, folder = ?, uid = ?, notify_seq = 0 WHERE id = ?`).run(nextId, folder, uid, id);
      })();
    },

    deleteRow(id: string) {
      bump();
      db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
    },

    clearFolder(account: string, folder: Folder) {
      bump();
      db.prepare(`DELETE FROM messages WHERE account = ? AND folder = ?`).run(account, folder);
      db.prepare(`DELETE FROM folder_cursor WHERE account = ? AND folder = ?`).run(account, folder);
    },

    /** Forget one mailbox's cached mail (it was removed from BB). */
    clearAccount(account: string) {
      bump();
      db.prepare(`DELETE FROM messages WHERE account = ?`).run(account);
      db.prepare(`DELETE FROM folder_cursor WHERE account = ?`).run(account);
    },

    folderCount(folder: Folder, account?: string): number {
      const row = (account
        ? db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE folder = ? AND account = ?`).get(folder, account)
        : db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE folder = ?`).get(folder)) as { n: number };
      return row.n;
    },

    cachedUids(account: string, folder: Folder): Set<number> {
      const rows = db.prepare(`SELECT uid FROM messages WHERE account = ? AND folder = ?`).all(account, folder) as { uid: number }[];
      return new Set(rows.map((row) => row.uid));
    },

    /** Server totals vs what is downloaded, per mailbox and folder. */
    syncProgress(): { account: string; folder: Folder; total: number; cached: number }[] {
      return db.prepare(`SELECT c.account AS account, c.folder AS folder, c.total AS total,
          (SELECT COUNT(*) FROM messages m WHERE m.account = c.account AND m.folder = c.folder) AS cached
        FROM folder_cursor c`).all() as { account: string; folder: Folder; total: number; cached: number }[];
    },

    /** Cached message count per server folder path for one mailbox. */
    cachedCounts(account: string): Map<string, number> {
      const rows = db.prepare(`SELECT c.path AS path, COUNT(m.id) AS n FROM folder_cursor c LEFT JOIN messages m ON m.account = c.account AND m.folder = c.folder WHERE c.account = ? GROUP BY c.path`).all(account) as { path: string; n: number }[];
      return new Map(rows.map((row) => [row.path, row.n]));
    },

    /** Everyone in the cached mail, for recipient autocomplete. */
    contactRows(): { folder: Folder; from: Address; to: Address[]; cc: Address[]; date: number; automated: boolean }[] {
      const rows = db.prepare(`SELECT folder, from_json, to_json, cc_json, date, automated FROM messages`).all() as Row[];
      return rows.map((row) => ({
        folder: row.folder,
        from: JSON.parse(row.from_json),
        to: JSON.parse(row.to_json),
        cc: JSON.parse(row.cc_json),
        date: row.date,
        automated: row.automated === 1,
      }));
    },

    knowledgeAll<T>(kind: string): T[] {
      const rows = db.prepare(`SELECT data FROM knowledge WHERE kind = ? ORDER BY updated_at DESC`).all(kind) as { data: string }[];
      return rows.map((row) => JSON.parse(row.data) as T);
    },

    knowledgeGet<T>(kind: string, id: string): T | null {
      const row = db.prepare(`SELECT data FROM knowledge WHERE kind = ? AND id = ?`).get(kind, id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as T) : null;
    },

    knowledgePut(kind: string, id: string, data: unknown) {
      db.prepare(`INSERT INTO knowledge (kind, id, data, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
        .run(kind, id, JSON.stringify(data), Date.now());
    },

    knowledgeDelete(kind: string, id?: string) {
      if (id === undefined) db.prepare(`DELETE FROM knowledge WHERE kind = ?`).run(kind);
      else db.prepare(`DELETE FROM knowledge WHERE kind = ? AND id = ?`).run(kind, id);
    },

    knowledgeCount(kind: string): number {
      return (db.prepare(`SELECT COUNT(*) AS n FROM knowledge WHERE kind = ?`).get(kind) as { n: number }).n;
    },

    classifiedCount(): number {
      return (db.prepare(`SELECT COUNT(*) AS n FROM thread_state WHERE classified_key != ''`).get() as { n: number }).n;
    },

    /** Drop cached mail but keep triage state, so a rebuild keeps the sorting. */
    clearMessages() {
      bump();
      db.exec(`DELETE FROM messages; DELETE FROM folder_state; DELETE FROM folder_cursor;`);
    },

    clearAll() {
      bump();
      db.exec(`DELETE FROM messages; DELETE FROM folder_state; DELETE FROM folder_cursor; DELETE FROM thread_state;`);
    },
  };
}

export type MailStore = ReturnType<typeof openStore>;
