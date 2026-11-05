import type { Address, CustomSplit, Folder, ThreadSummary } from "../shared/types.js";
import type { ThreadRow, ThreadState } from "./store.js";

const DAY = 24 * 60 * 60 * 1000;
/** How long a sent message with no answer stays in Waiting. */
const WAITING_DAYS = 30;
/** Replies with the same subject are joined to a thread this recent. */
const SUBJECT_MERGE_DAYS = 60;

const REPLY_PREFIX = /^\s*((re|fwd?|fw|rv|tr|aw|wg|sv|antw|odp|r|res|enc)\s*(\[\d+\])?\s*:\s*|\[(ext|external|externo)\]\s*)+/i;
const IS_REPLY = /^\s*(\[(ext|external|externo)\]\s*)?(re|rv|aw|sv|antw|r|res)\s*(\[\d+\])?\s*:/i;

export function cleanSubject(subject: string): string {
  return subject.replace(REPLY_PREFIX, "").replace(/\s+/g, " ").trim();
}

function subjectKey(subject: string): string {
  return cleanSubject(subject).toLowerCase();
}

/** "Carro Bernardo, Maria Nuria (Allianz…)" → "Maria"; "marcos@x.com" → "Marcos". */
export function firstName(address: Address): string {
  let name = address.name.replace(/\(.*?\)/g, "").replace(/["']/g, "").trim();
  if (name.includes(",")) name = name.split(",")[1]!.trim();
  const first = name.split(/\s+/)[0];
  if (first && !first.includes("@")) return first;
  const local = address.address.split("@")[0] ?? address.address;
  const word = local.split(/[._+-]/)[0] ?? local;
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : "Unknown";
}

/** Drop a leading classification label ("Internal", "Interno") and collapse whitespace. */
export function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/^\s*(internal|interno|uso interno|public|público|general|confidential|confidencial|c2 general|restricted)\b[\s:.-]*/i, "")
    .replace(/<(?:https?|tel|mailto|sip):[^>\s]+>/gi, "")
    .replace(/\[(?:cid|image):[^\]]*\]/gi, "")
    .replace(/[_=\-*~]{5,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Thread {
  anchor: string;
  /** The mailbox this conversation belongs to (its newest Inbox copy, else newest). */
  account: string;
  rows: ThreadRow[];
  latest: ThreadRow;
  state: ThreadState | null;
  folders: Set<Folder>;
  lastFromMe: boolean;
  /** The latest message's id: a new message means the thread needs a fresh look. */
  latestKey: string;
  /** Custom splits whose rules match. */
  matches: string[];
  /**
   * Needs you is a smart view, not a bucket: urgent mail for the user shows
   * there even when it also belongs to one of their splits.
   */
  needsYou: boolean;
  /** The custom split the AI filed it in, if any. */
  aiSplit: string | null;
  customMatch: string | null;
  split: string | null;
  summary: ThreadSummary;
}

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }
  find(index: number): number {
    while (this.parent[index] !== index) {
      this.parent[index] = this.parent[this.parent[index]!]!;
      index = this.parent[index]!;
    }
    return index;
  }
  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootB] = rootA;
  }
}

function addressMatches(address: string, rule: string): boolean {
  const value = rule.replace(/^@/, "");
  if (!value) return false;
  if (value.includes("@")) return address === value;
  return address.endsWith(`@${value}`) || address.endsWith(`.${value}`);
}

function matchCustom(rows: ThreadRow[], splits: CustomSplit[], accountEmail: (account: string) => string): string[] {
  const hits: string[] = [];
  for (const split of splits) {
    if (split.accounts.length > 0 && !rows.some((row) => split.accounts.includes(accountEmail(row.account)))) continue;
    if (split.hasAttachment && !rows.some((row) => row.hasAttachments)) continue;
    const senders = split.senders.filter(Boolean);
    if (senders.length > 0) {
      const hit = rows.some((row) =>
        [row.from, ...row.to, ...row.cc].some((address) =>
          senders.some((rule) => addressMatches(address.address.toLowerCase(), rule)),
        ),
      );
      if (hit) {
        hits.push(split.id);
        continue;
      }
    }
    const keywords = split.keywords.map((keyword) => keyword.toLowerCase()).filter(Boolean);
    if (keywords.length > 0) {
      const hit = rows.some((row) => {
        const haystack = `${row.subject} ${row.snippet}`.toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword));
      });
      if (hit) hits.push(split.id);
    }
  }
  return hits;
}

export interface BuildOptions {
  /** Every connected address. */
  me: string[];
  /** Account id → its address. */
  accounts: Map<string, string>;
  states: Map<string, ThreadState>;
  splits: CustomSplit[];
  now: number;
}

/** Group cached messages into conversations and decide each one's split. */
export function buildThreads(allRows: ThreadRow[], options: BuildOptions): Thread[] {
  const mine = new Set(options.me.map((address) => address.toLowerCase()));
  const isMe = (address: Address) => mine.has(address.address.toLowerCase());
  const accountEmail = (account: string) => options.accounts.get(account) ?? "";
  const rows = allRows;
  const uf = new UnionFind(rows.length);
  const byMessageId = new Map<string, number>();
  rows.forEach((row, index) => {
    if (!row.messageId) return;
    const existing = byMessageId.get(row.messageId);
    if (existing === undefined) byMessageId.set(row.messageId, index);
    else uf.union(existing, index);
  });

  // Join replies to what they reference.
  rows.forEach((row, index) => {
    for (const ref of [...row.references, row.inReplyTo]) {
      const target = ref ? byMessageId.get(ref) : undefined;
      if (target !== undefined) uf.union(target, index);
    }
  });

  // Join replies whose headers were lost, by subject and shared people.
  const bySubject = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const key = subjectKey(row.subject);
    if (key.length < 4) return;
    const list = bySubject.get(key) ?? [];
    list.push(index);
    bySubject.set(key, list);
  });
  for (const indexes of bySubject.values()) {
    if (indexes.length < 2) continue;
    indexes.sort((a, b) => rows[a]!.date - rows[b]!.date);
    for (let i = 1; i < indexes.length; i += 1) {
      const row = rows[indexes[i]!]!;
      if (!IS_REPLY.test(row.subject)) continue;
      const people = new Set([row.from, ...row.to, ...row.cc].filter((address) => !isMe(address)).map((address) => address.address.toLowerCase()));
      for (let j = i - 1; j >= 0; j -= 1) {
        const earlier = rows[indexes[j]!]!;
        if (row.date - earlier.date > SUBJECT_MERGE_DAYS * DAY) break;
        const shared = [earlier.from, ...earlier.to, ...earlier.cc].some((address) => people.has(address.address.toLowerCase()));
        if (shared) {
          uf.union(indexes[j]!, indexes[i]!);
          break;
        }
      }
    }
  }

  const groups = new Map<number, ThreadRow[]>();
  rows.forEach((row, index) => {
    const root = uf.find(index);
    const list = groups.get(root) ?? [];
    list.push(row);
    groups.set(root, list);
  });

  const folderRank: Record<Folder, number> = { inbox: 0, junk: 1, archive: 2, sent: 3 };
  const threads: Thread[] = [];
  for (const group of groups.values()) {
    // One entry per message, preferring the Inbox copy (it carries read state).
    const unique = new Map<string, ThreadRow>();
    const folders = new Set<Folder>();
    for (const row of group) {
      folders.add(row.folder);
      const key = row.messageId || row.id;
      const existing = unique.get(key);
      if (!existing || folderRank[row.folder] < folderRank[existing.folder]) unique.set(key, row);
    }
    const ordered = [...unique.values()].sort((a, b) => a.date - b.date);
    const latest = ordered[ordered.length - 1]!;
    const anchor = ordered[0]!.messageId || ordered[0]!.id;

    let state: ThreadState | null = null;
    for (const row of ordered) {
      const candidate = options.states.get(row.messageId || row.id);
      if (candidate && (!state || candidate.updatedAt > state.updatedAt)) state = candidate;
    }

    const lastFromMe = isMe(latest.from);
    const latestKey = latest.messageId || latest.id;
    const inInbox = group.some((row) => row.folder === "inbox");
    const laterUntil = state && state.laterUntil > options.now ? state.laterUntil : null;
    const doneHidden = state?.doneKey === latestKey;
    const matches = matchCustom(ordered, options.splits, accountEmail);
    const exclusiveIds = new Set(options.splits.filter((split) => split.exclusive).map((split) => split.id));
    const customMatch = matches.find((id) => exclusiveIds.has(id)) ?? null;
    const aiSplit = state?.split && options.splits.some((split) => split.id === state.split) ? state.split : null;
    const exclusiveAi = aiSplit && exclusiveIds.has(aiSplit) ? aiSplit : null;
    const inboxRows = group.filter((row) => row.folder === "inbox").sort((a, b) => b.date - a.date);
    const account = (inboxRows[0] ?? latest).account;

    const lastOther = ordered.filter((row) => !isMe(row.from)).slice(-1)[0];
    const verdict = state?.category ?? (lastOther?.automated ? "updates" : "needs_you");
    // Junk-only conversations count only when the AI judged them real ("needs_you"), never by default.
    const junkOnly = !inInbox && group.some((row) => row.folder === "junk");
    const needsYou = !laterUntil && !lastFromMe && (inInbox ? verdict === "needs_you" : junkOnly && state?.category === "needs_you");

    let split: string | null = null;
    if (laterUntil) split = "later";
    else if (inInbox) {
      if (lastFromMe) split = "waiting";
      else if (customMatch ?? exclusiveAi) split = `c:${customMatch ?? exclusiveAi}`;
      else {
        // Bulk-mail headers (List-Unsubscribe and the like) mean promotions or notifications until the AI says otherwise.
        const automated = ordered.filter((row) => !isMe(row.from)).slice(-1)[0]?.automated ?? false;
        const category = state?.category ?? (automated ? "updates" : "needs_you");
        split = category === "other" || category === "updates" ? category : "needs_you";
      }
    } else {
      const externalRecipient = [...latest.to, ...latest.cc].some((address) => !isMe(address));
      if (lastFromMe && !doneHidden && externalRecipient && options.now - latest.date < WAITING_DAYS * DAY) split = "waiting";
      else if (junkOnly) split = "junk";
      else if (folders.has("archive")) split = "archive";
    }

    // People: who wrote, newest first; for my own messages, who I wrote to.
    const people: string[] = [];
    const pushPerson = (address: Address) => {
      if (isMe(address)) return;
      const name = firstName(address);
      if (!people.includes(name)) people.push(name);
    };
    for (const row of [...ordered].reverse()) pushPerson(row.from);
    if (people.length === 0) [...latest.to, ...latest.cc].forEach(pushPerson);

    threads.push({
      anchor,
      account,
      matches,
      aiSplit,
      rows: ordered,
      latest,
      state,
      folders,
      lastFromMe,
      latestKey,
      customMatch,
      split,
      needsYou,
      summary: {
        id: anchor,
        account: accountEmail(account),
        split,
        subject: cleanSubject(latest.subject) || cleanSubject(ordered[0]!.subject) || "(no subject)",
        people: people.slice(0, 3),
        snippet: cleanSnippet(latest.snippet),
        date: latest.date,
        count: ordered.length,
        unread: group.some((row) => row.folder === "inbox" && !row.seen),
        lastFromMe,
        hasAttachments: ordered.some((row) => row.hasAttachments),
        inInbox,
        laterUntil,
        reason: state?.reason ?? null,
      },
    });
  }
  return threads.sort((a, b) => b.latest.date - a.latest.date);
}

export function threadsInSplit(threads: Thread[], split: string, splits: CustomSplit[] = []): Thread[] {
  if (split === "sent") return threads.filter((thread) => thread.folders.has("sent"));
  if (split === "needs_you") return threads.filter((thread) => thread.needsYou);
  if (!split.startsWith("c:")) return threads.filter((thread) => thread.split === split);
  const id = split.slice(2);
  const definition = splits.find((entry) => entry.id === id);
  if (!definition) return [];
  let members = threads.filter((thread) => {
    const member = thread.split === split || thread.matches.includes(id) || thread.aiSplit === id;
    if (!member) return false;
    if (thread.summary.laterUntil) return false;
    if (definition.scope === "inbox") return thread.folders.has("inbox") && (!definition.exclusive || thread.split === split);
    return true;
  });
  if (definition.unreadOnly) members = members.filter((thread) => thread.summary.unread);
  if (definition.sort === "oldest") members = [...members].reverse();
  return members;
}

export function inAccount(thread: Thread, account: string | undefined): boolean {
  return !account || thread.rows.some((row) => row.account === account);
}

export function splitCounts(threads: Thread[], splits: CustomSplit[]): Record<string, number> {
  const counts: Record<string, number> = { needs_you: 0, waiting: 0, other: 0, updates: 0, later: 0, archive: 0, junk: 0, sent: 0 };
  for (const thread of threads) {
    if (thread.split && !thread.split.startsWith("c:") && thread.split !== "needs_you" && thread.split in counts) counts[thread.split] = (counts[thread.split] ?? 0) + 1;
    if (thread.needsYou) counts.needs_you = (counts.needs_you ?? 0) + 1;
    if (thread.folders.has("sent")) counts.sent = (counts.sent ?? 0) + 1;
  }
  for (const split of splits) counts[`c:${split.id}`] = threadsInSplit(threads, `c:${split.id}`, splits).length;
  return counts;
}

export function matchesQuery(thread: Thread, query: string): boolean {
  const needle = query.toLowerCase();
  return thread.rows.some((row) =>
    `${row.subject} ${row.snippet} ${row.from.name} ${row.from.address} ${row.to.map((address) => `${address.name} ${address.address}`).join(" ")}`
      .toLowerCase()
      .includes(needle),
  );
}
