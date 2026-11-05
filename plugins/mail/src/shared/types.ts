import { z } from "zod";

export const folderSchema = z.enum(["inbox", "sent", "archive", "junk"]);
export type Folder = z.infer<typeof folderSchema>;

export const addressSchema = z.object({
  name: z.string(),
  address: z.string(),
});
export type Address = z.infer<typeof addressSchema>;

export const messageSummarySchema = z.object({
  id: z.string(),
  /** Which connected mailbox it belongs to. */
  account: z.string(),
  folder: folderSchema,
  from: addressSchema,
  to: z.array(addressSchema),
  subject: z.string(),
  snippet: z.string(),
  date: z.number(),
  seen: z.boolean(),
  hasAttachments: z.boolean(),
});
export type MessageSummary = z.infer<typeof messageSummarySchema>;

export const attachmentSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  /** Position among all the message's MIME attachments (absent in mail cached before it was recorded). */
  part: z.number().optional(),
  /** Content-ID, for images placed inside the HTML body. */
  cid: z.string().optional(),
  /** Shown inside the HTML body (referenced by cid:). */
  embedded: z.boolean().optional(),
});

export const messageDetailSchema = messageSummarySchema.extend({
  cc: z.array(addressSchema),
  replyTo: z.array(addressSchema),
  messageId: z.string(),
  references: z.array(z.string()),
  text: z.string(),
  html: z.string().nullable(),
  attachments: z.array(attachmentSchema),
  /** Only a preview is cached; the full message loads when it is opened. */
  partial: z.boolean().default(false),
});
export type MessageDetail = z.infer<typeof messageDetailSchema>;

export const accountStatusSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  live: z.boolean(),
  syncing: z.boolean(),
  lastSyncAt: z.number().nullable(),
  error: z.string().nullable(),
});
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const statusSchema = z.object({
  /** Every connected mailbox. */
  accounts: z.array(accountStatusSchema),
  connected: z.boolean(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  syncing: z.boolean(),
  /** The Inbox connection is open and receiving pushes. */
  live: z.boolean(),
  lastSyncAt: z.number().nullable(),
  error: z.string().nullable(),
});
export type MailStatus = z.infer<typeof statusSchema>;

export const connectInputSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120),
  username: z.string().trim().max(320),
  password: z.string().min(1).max(512),
  imapHost: z.string().trim().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535),
  smtpHost: z.string().trim().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535),
});
export type ConnectInput = z.infer<typeof connectInputSchema>;

export const sendInputSchema = z.object({
  to: z.string().trim().min(1).max(4000),
  cc: z.string().trim().max(4000).default(""),
  bcc: z.string().trim().max(4000).default(""),
  subject: z.string().max(998),
  text: z.string().max(500_000),
  replyToId: z.string().optional(),
  /** Account id to send from; replies default to the account that received the mail. */
  from: z.string().optional(),
  /** Files uploaded through the `/upload` route, by id. */
  attachments: z.array(z.string().regex(/^[a-f0-9]{24}$/)).max(30).default([]),
});
export type SendInput = z.input<typeof sendInputSchema>;

// ---- splits and threads -----------------------------------------------------

export const BUILTIN_SPLITS = ["needs_you", "waiting", "other", "updates", "later", "archive", "junk", "sent"] as const;
export type BuiltinSplit = (typeof BUILTIN_SPLITS)[number];
/** A built-in split, or `c:<id>` for one the user made. */
export const splitIdSchema = z.string().regex(/^(needs_you|waiting|other|updates|later|archive|junk|sent|c:[a-z0-9-]{1,40})$/);
export type SplitId = BuiltinSplit | `c:${string}`;

/** Line icons a split can wear in the sidebar (the AI picks one that fits). */
export const SPLIT_ICON_NAMES = [
  "briefcase", "building", "users", "user", "handshake", "heart", "health", "shield", "receipt", "file", "clipboard",
  "coins", "bank", "chart", "cart", "package", "truck", "car", "plane", "home", "calendar", "megaphone", "news",
  "code", "wrench", "rocket", "target", "flag", "star", "bell", "tag", "globe", "lock", "phone", "graduation",
  "scale", "leaf", "coffee", "mail", "sparkle",
] as const;
export type SplitIconName = (typeof SPLIT_ICON_NAMES)[number];

export const customSplitSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(60),
  /** A line icon from SPLIT_ICON_NAMES (older splits may hold an emoji); empty uses the default. */
  icon: z.string().max(24).default(""),
  /** Addresses or domains; a thread matches when anyone on it matches. */
  senders: z.array(z.string().trim().toLowerCase().min(1).max(200)).max(100).default([]),
  /** Words or phrases found in the subject or text. */
  keywords: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  /** Plain-language description the AI uses to file matching mail here. */
  ai: z.string().trim().max(1000).default(""),
  /** true: matching Inbox mail leaves Needs you / Other for this split. false: a view that only collects. */
  exclusive: z.boolean().default(true),
  /** "inbox": only conversations still in the Inbox. "all": Archive and Sent too. */
  scope: z.enum(["inbox", "all"]).default("inbox"),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  groupBy: z.enum(["none", "sender", "day"]).default("none"),
  unreadOnly: z.boolean().default(false),
  hasAttachment: z.boolean().default(false),
  /** Limit to these connected addresses; empty means every mailbox. */
  accounts: z.array(z.string().trim().toLowerCase()).max(20).default([]),
  /** What the user asked for, kept so an agent can refine the split later. */
  notes: z.string().max(4000).default(""),
});
export type CustomSplit = z.infer<typeof customSplitSchema>;

export const threadSummarySchema = z.object({
  id: z.string(),
  account: z.string(),
  split: z.string().nullable(),
  subject: z.string(),
  /** Other people on the thread, most recent first. */
  people: z.array(z.string()),
  snippet: z.string(),
  date: z.number(),
  count: z.number(),
  unread: z.boolean(),
  lastFromMe: z.boolean(),
  hasAttachments: z.boolean(),
  inInbox: z.boolean(),
  laterUntil: z.number().nullable(),
  /** Why the AI filed it here, when the AI did. */
  reason: z.string().nullable(),
});
export type ThreadSummary = z.infer<typeof threadSummarySchema>;

export const threadDetailSchema = z.object({
  id: z.string(),
  split: z.string().nullable(),
  subject: z.string(),
  inInbox: z.boolean(),
  laterUntil: z.number().nullable(),
  reason: z.string().nullable(),
  /** The address this conversation belongs to, and its account id. */
  me: z.string(),
  accountId: z.string(),
  messages: z.array(messageDetailSchema),
});
export type ThreadDetail = z.infer<typeof threadDetailSchema>;

export const aiProviderSchema = z.enum(["off", "claude", "codex"]);
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const aiStatusSchema = z.object({
  provider: aiProviderSchema,
  model: z.string(),
  /** Reasoning effort passed to the CLI (low, medium, high, xhigh, max). */
  reasoning: z.string(),
  running: z.boolean(),
  lastRunAt: z.number().nullable(),
  sorted: z.number(),
  pending: z.number(),
  error: z.string().nullable(),
});
export type AiStatus = z.infer<typeof aiStatusSchema>;

export const contactSchema = z.object({
  name: z.string(),
  address: z.string(),
  /** Messages exchanged; mail the user sent counts more. */
  score: z.number(),
  lastAt: z.number(),
  /** From Knowledge, when known. */
  org: z.string().default(""),
});
export type Contact = z.infer<typeof contactSchema>;

// ---- AI tasks and knowledge -------------------------------------------------

/** One AI job's agent: a BB provider id (codex or claude-code), model and reasoning effort. */
export const aiTaskSchema = z.object({
  providerId: z.string().regex(/^[a-z0-9-]{1,60}$/),
  model: z.string().max(120),
  reasoning: z.string().max(20),
});
export type AiTask = z.infer<typeof aiTaskSchema>;

export const aiConfigSchema = z.object({
  /** Drafting and rewriting in the composer. */
  write: aiTaskSchema,
  /** The knowledge pipeline: style, people, projects. */
  learn: aiTaskSchema,
  /** Reading attachments: a small model is plenty for extracting facts. */
  read: aiTaskSchema,
  learning: z.object({
    sentLimit: z.number().int().min(50).max(100_000),
    includeReceived: z.boolean(),
    peopleLimit: z.number().int().min(10).max(500),
    schedule: z.enum(["off", "daily", "weekly"]),
    trim: z.boolean(),
    /** Addresses or domains never learned from. */
    exclude: z.array(z.string().trim().toLowerCase().max(200)).max(200),
    useInDrafts: z.boolean(),
  }),
  reading: z.object({
    auto: z.enum(["off", "important", "all"]),
    maxMb: z.number().int().min(1).max(25),
    types: z.array(z.enum(["pdf", "office", "images", "text"])),
  }),
  drafting: z.object({
    /** Draft a reply ahead for mail that asks the user something. */
    ahead: z.boolean(),
  }),
});
export type AiConfig = z.infer<typeof aiConfigSchema>;

/** A reply drafted ahead for the newest message of a conversation. */
export const replyDraftSchema = z.object({
  status: z.enum(["none", "drafting", "ready"]),
  text: z.string(),
  /** Why a reply is (or isn't) needed, in a few words. */
  why: z.string(),
  /** The Message-ID it answers; a newer message makes it stale. */
  messageId: z.string(),
});
export type ReplyDraft = z.infer<typeof replyDraftSchema>;

/** Realtime channel: a drafted reply is ready (payload: the conversation anchor). */
export const DRAFTS_CHANGED = "drafts-changed";

export const personSchema = z.object({
  address: z.string(),
  name: z.string(),
  org: z.string(),
  role: z.string(),
  /** Who they are to the user, in one or two sentences. */
  relationship: z.string(),
  /** Register the user uses with them: tú / usted / first-name / formal… */
  register: z.string(),
  greeting: z.string(),
  signoff: z.string(),
  language: z.string(),
  topics: z.array(z.string()),
  projects: z.array(z.string()),
  summary: z.string(),
  /** The user's own notes; never overwritten by learning. */
  notes: z.string(),
  sent: z.number(),
  received: z.number(),
  lastAt: z.number().nullable(),
  ccWith: z.array(z.object({ address: z.string(), name: z.string(), count: z.number() })),
  /** Edited by the user: learning refreshes the numbers but keeps the text. */
  locked: z.boolean(),
  learnedAt: z.number().nullable(),
});
export type Person = z.infer<typeof personSchema>;

export const projectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: z.string().min(1).max(120),
  status: z.string().max(40),
  summary: z.string().max(4000),
  people: z.array(z.string()),
  keywords: z.array(z.string()),
  domains: z.array(z.string()),
  facts: z.array(z.string()),
  timeline: z.array(z.object({ date: z.string(), event: z.string() })),
  notes: z.string(),
  lastAt: z.number().nullable(),
  locked: z.boolean(),
  learnedAt: z.number().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

export const styleSchema = z.object({
  language: z.string(),
  /** How the user writes, as guidance for drafting. Editable. */
  guide: z.string(),
  greetings: z.array(z.string()),
  signoffs: z.array(z.string()),
  /** Real excerpts of the user's emails that show the style. */
  examples: z.array(z.string()),
  samples: z.number(),
  locked: z.boolean(),
  learnedAt: z.number().nullable(),
});
export type Style = z.infer<typeof styleSchema>;

export const noteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  title: z.string().max(120),
  body: z.string().max(8000),
  /** Added to every AI draft. */
  always: z.boolean(),
  updatedAt: z.number(),
});
export type Note = z.infer<typeof noteSchema>;

export const insightSchema = z.object({
  key: z.string(),
  /** Cache id of the message that carries it. */
  messageId: z.string(),
  index: z.number(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  kind: z.string(),
  status: z.enum(["done", "failed", "unsupported"]),
  summary: z.string(),
  facts: z.array(z.string()),
  error: z.string().nullable(),
  from: z.string(),
  subject: z.string(),
  date: z.number(),
  readAt: z.number(),
});
export type Insight = z.infer<typeof insightSchema>;

export const learnStageSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["pending", "running", "done", "skipped", "failed"]),
  done: z.number(),
  total: z.number(),
  detail: z.string(),
});
export const learnRunSchema = z.object({
  running: z.boolean(),
  startedAt: z.number().nullable(),
  finishedAt: z.number().nullable(),
  stages: z.array(learnStageSchema),
  error: z.string().nullable(),
});
export type LearnRun = z.infer<typeof learnRunSchema>;

export const draftSourceSchema = z.object({
  id: z.string(),
  kind: z.enum(["style", "person", "project", "note", "attachment"]),
  label: z.string(),
  /** What the AI is told about it. */
  detail: z.string(),
  /** Picked automatically for this email (vs. added by the user). */
  auto: z.boolean(),
});
export type DraftSource = z.infer<typeof draftSourceSchema>;

/** Realtime channel: knowledge or a learning run changed. */
export const KNOWLEDGE_CHANGED = "knowledge-changed";

/** Realtime channel: the cached mailbox changed, refetch. */
export const MAIL_CHANGED = "mail-changed";

// ---- automations ----------------------------------------------------------------

/**
 * An agent that acts on incoming mail: when a message matches, a BB thread in
 * the chosen project investigates (read-only) and reports back with a summary
 * and a reply. "draft" leaves the reply for the user; "send" sends it when the
 * agent is sure.
 */
export const automationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(true),
  /** Addresses or whole domains the mail comes from. */
  senders: z.array(z.string().trim().toLowerCase().min(1).max(200)).max(100).default([]),
  /** Words that must appear in the subject or text (any of them). */
  keywords: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  /** Plain-language condition checked by a small model, e.g. "asks to check a client's reward". */
  when: z.string().trim().max(1000).default(""),
  /** BB project the agent works in (its repo, skills and tools). */
  projectId: z.string().max(80).default(""),
  providerId: z.string().max(60).default("codex"),
  model: z.string().max(120).default("gpt-6.1-terra"),
  reasoningLevel: z.string().max(20).default("xhigh"),
  /** What to do, in the user's words. */
  instructions: z.string().trim().min(1).max(8000),
  mode: z.enum(["draft", "send"]).default("draft"),
  /** Reply to everyone on the email, not just the sender. */
  replyAll: z.boolean().default(false),
});
export type Automation = z.infer<typeof automationSchema>;

export const automationRunSchema = z.object({
  id: z.string(),
  automationId: z.string(),
  automationName: z.string(),
  /** The email it ran on (store id) and its conversation. */
  messageId: z.string(),
  anchor: z.string(),
  subject: z.string(),
  from: z.string(),
  threadId: z.string().nullable(),
  status: z.enum(["running", "done", "needs_you", "failed"]),
  summary: z.string(),
  reply: z.string(),
  sent: z.boolean(),
  startedAt: z.number(),
  finishedAt: z.number().nullable(),
});
export type AutomationRun = z.infer<typeof automationRunSchema>;

/** Realtime channel: an automation run started or reported. */
export const AUTOMATIONS_CHANGED = "automations-changed";
