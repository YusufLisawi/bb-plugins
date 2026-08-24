import {
  defineRpcContract,
  type BbPluginApi,
  type JsonValue,
  type NewThreadRequest,
} from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  DEFAULT_DISPATCH_URL,
  type ConnectionStatus,
  type DispatchTask,
  type Member,
} from "./src/types.js";
import {
  DispatchApiError,
  DispatchClient,
  normalizeBaseUrl,
} from "./src/server/dispatch-client.js";
import {
  discoverProjectMap,
  findBbProjectForDispatchSlug,
  rememberProjectMapping,
} from "./src/server/project-map.js";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["admin", "member"]),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  agentContext: z.string(),
  color: z.string(),
});

const taskBaseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sharedProjectIds: z.array(z.string()),
  title: z.string(),
  description: z.string(),
  size: z.string().nullable(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  visibility: z.enum(["assigned", "public", "personal"]),
  assigneeIds: z.array(z.string()),
  parentTaskId: z.string().nullable(),
  createdBy: z.string(),
  claimedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  linkedThreadId: z.string().nullable().optional(),
});

// Dispatch currently supports one level of subtasks, so this stays finite and
// avoids recursive schemas at the RPC boundary.
const taskSchema = taskBaseSchema.extend({
  subtasks: z.array(taskBaseSchema).optional(),
});

const commentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  authorId: z.string(),
  authorKind: z.enum(["human", "agent"]),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

const memberSchema = userSchema.extend({
  membershipRole: z.enum(["owner", "member"]).optional(),
});

const taskPatchSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  visibility: z.enum(["assigned", "public", "personal"]).optional(),
  assignee: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  claim: z.boolean().optional(),
});

const createTaskSchema = z.object({
  project: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  visibility: z.enum(["assigned", "public", "personal"]).optional(),
  assignee: z.union([z.string(), z.array(z.string())]).optional(),
  parent: z.string().optional(),
});

const threadRequestSchema = z.object({
  projectId: z.string(),
  providerId: z.string(),
  model: z.string(),
  reasoningLevel: z.string(),
  permissionMode: z.string(),
  serviceTier: z.string().optional(),
  executionInputSources: z.record(z.string(), z.unknown()),
  environment: z.unknown(),
  input: z.array(z.unknown()),
});

export const rpcContract = defineRpcContract({
  status: {
    input: z.null(),
    output: z.object({
      connected: z.boolean(),
      baseUrl: z.string(),
      user: userSchema.nullable(),
      error: z.string().nullable(),
    }),
  },
  saveConnection: {
    input: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
    }),
    output: z.object({
      connected: z.boolean(),
      baseUrl: z.string(),
      user: userSchema.nullable(),
      error: z.string().nullable(),
    }),
  },
  loginWithPassword: {
    input: z.object({ email: z.string().email(), password: z.string().min(1) }),
    output: z.object({
      connected: z.boolean(),
      baseUrl: z.string(),
      user: userSchema.nullable(),
      error: z.string().nullable(),
    }),
  },
  importCliKey: {
    input: z.null(),
    output: z.object({
      connected: z.boolean(),
      baseUrl: z.string(),
      user: userSchema.nullable(),
      error: z.string().nullable(),
    }),
  },
  listMine: {
    input: z.null(),
    output: z.object({
      projects: z.record(z.string(), projectSchema),
      mine: z.array(taskSchema),
      open: z.array(taskSchema),
    }),
  },
  listProject: {
    input: z.object({
      slug: z.string().min(1),
      status: z.string().optional(),
      mine: z.boolean().optional(),
      unclaimed: z.boolean().optional(),
    }),
    output: z.object({
      tasks: z.array(taskSchema),
      nextCursor: z.string().nullable(),
    }),
  },
  getTask: {
    input: z.object({ id: z.string().min(1) }),
    output: z.object({
      task: taskSchema,
      project: projectSchema.nullable(),
      subtasks: z.array(taskSchema),
      linkedThreadId: z.string().nullable(),
    }),
  },
  listProjects: {
    input: z.null(),
    output: z.object({
      projects: z.array(projectSchema),
      mapped: z.record(z.string(), z.string()),
    }),
  },
  resolveBbProject: {
    input: z.object({ dispatchSlug: z.string().min(1) }),
    output: z.object({ bbProjectId: z.string().nullable() }),
  },
  rememberProjectMap: {
    input: z.object({ bbProjectId: z.string().min(1), dispatchSlug: z.string().min(1) }),
    output: z.object({ ok: z.boolean() }),
  },
  createTask: {
    input: createTaskSchema,
    output: taskSchema,
  },
  patchTask: {
    input: z.object({ id: z.string().min(1), patch: taskPatchSchema }),
    output: taskSchema,
  },
  deleteTask: {
    input: z.object({ id: z.string().min(1) }),
    output: z.object({ ok: z.boolean() }),
  },
  listComments: {
    input: z.object({ taskId: z.string().min(1) }),
    output: z.object({ comments: z.array(commentSchema) }),
  },
  addComment: {
    input: z.object({
      taskId: z.string().min(1),
      body: z.string().min(1),
      as: z.enum(["agent", "human"]).optional(),
    }),
    output: commentSchema,
  },
  listMembers: {
    input: z.object({ slug: z.string().min(1) }),
    output: z.object({ members: z.array(memberSchema) }),
  },
  createThread: {
    input: z.object({ taskId: z.string().min(1), request: threadRequestSchema }),
    output: z.object({ threadId: z.string(), task: taskSchema }),
  },
  openCount: {
    input: z.null(),
    output: z.object({ count: z.number().int().nonnegative() }),
  },
});

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    apiKey: {
      type: "string",
      label: "Dispatch API key",
      description: "A personal API key from Dispatch. Stored as a secret.",
      secret: true,
    },
    baseUrl: {
      type: "string",
      label: "Dispatch URL",
      description: "The Dispatch server used by this plugin.",
      default: DEFAULT_DISPATCH_URL,
    },
  });

  const clientForSettings = async () => {
    const current = await settings.get();
    return new DispatchClient({ baseUrl: current.baseUrl, apiKey: current.apiKey });
  };

  const saveSettings = async (values: { apiKey?: string; baseUrl?: string }) => {
    const next: Record<string, JsonValue> = {};
    if (values.apiKey !== undefined) next.apiKey = values.apiKey.trim();
    if (values.baseUrl !== undefined) next.baseUrl = normalizeBaseUrl(values.baseUrl);
    if (Object.keys(next).length > 0) {
      await bb.sdk.plugins.updateSettings({ pluginId: bb.pluginId, values: next });
    }
  };

  const connectionStatus = async (): Promise<ConnectionStatus> => {
    const client = await clientForSettings();
    return client.connectionStatus();
  };

  bb.rpc.register(rpcContract, {
    status: () => connectionStatus(),

    async saveConnection(input) {
      await saveSettings(input);
      return connectionStatus();
    },

    async loginWithPassword(input) {
      const current = await settings.get();
      const client = new DispatchClient({ baseUrl: current.baseUrl });
      const result = await client.loginWithPassword(input.email, input.password);
      await saveSettings({ apiKey: result.token });
      return connectionStatus();
    },

    async importCliKey() {
      const imported = await importCliCredentials(bb);
      await saveSettings(imported);
      return connectionStatus();
    },

    async listMine() {
      const client = await requireClient(clientForSettings);
      const response = await client.listMine();
      return {
        projects: response.projects,
        mine: await decorateTasks(bb, response.mine),
        open: await decorateTasks(bb, response.open),
      };
    },

    async listProject(input) {
      const client = await requireClient(clientForSettings);
      const response = await client.listTasks(input.slug, input);
      return {
        nextCursor: response.nextCursor,
        tasks: await decorateTasks(bb, response.tasks),
      };
    },

    async getTask(input) {
      const client = await requireClient(clientForSettings);
      const task = await client.getTask(input.id);
      const projects = await client.listProjects();
      const project = projects.find((candidate) => candidate.id === task.projectId) ?? null;
      const board = project ? await client.listTasks(project.slug) : { tasks: [], nextCursor: null };
      const subtasks = await decorateTasks(
        bb,
        board.tasks.filter((candidate) => candidate.parentTaskId === task.id),
      );
      const linkedThreadId = await getLinkedThreadId(bb, task.id);
      return {
        task: await decorateTask(bb, task, linkedThreadId),
        project,
        subtasks,
        linkedThreadId,
      };
    },

    async listProjects() {
      const client = await requireClient(clientForSettings);
      return { projects: await client.listProjects(), mapped: await discoverProjectMap(bb) };
    },

    async resolveBbProject(input) {
      return { bbProjectId: await findBbProjectForDispatchSlug(bb, input.dispatchSlug) };
    },

    async rememberProjectMap(input) {
      await rememberProjectMapping(bb, input.bbProjectId, input.dispatchSlug);
      return { ok: true };
    },

    async createTask(input) {
      const client = await requireClient(clientForSettings);
      return decorateTask(bb, await client.createTask(input));
    },

    async patchTask(input) {
      const client = await requireClient(clientForSettings);
      return decorateTask(bb, await client.patchTask(input.id, input.patch));
    },

    async deleteTask(input) {
      const client = await requireClient(clientForSettings);
      await client.deleteTask(input.id);
      await bb.storage.kv.delete(`task:${input.id}`);
      return { ok: true };
    },

    async listComments(input) {
      const client = await requireClient(clientForSettings);
      return { comments: await client.listComments(input.taskId) };
    },

    async addComment(input) {
      const client = await requireClient(clientForSettings);
      return client.addComment(input.taskId, { body: input.body, as: input.as });
    },

    async listMembers(input) {
      const client = await requireClient(clientForSettings);
      try {
        return { members: await client.listMembers(input.slug) };
      } catch (error) {
        // Membership enumeration is currently admin-only in the Dispatch API.
        // Members can still use the rest of the plugin and see their existing
        // assignee id in the detail view.
        if (error instanceof DispatchApiError && error.status === 403) return { members: [] as Member[] };
        throw error;
      }
    },

    async createThread(input) {
      const client = await requireClient(clientForSettings);
      const task = await client.getTask(input.taskId);
      const user = await client.me();
      if (task.assigneeIds.length > 0 && !task.assigneeIds.includes(user.id)) {
        throw new Error("This task is assigned to another Dispatch user.");
      }

      const request = input.request as unknown as NewThreadRequest;
      const thread = await bb.sdk.threads.spawn({
        ...request,
        title: task.title,
      });

      let updated = task;
      if (!task.assigneeIds.includes(user.id)) {
        updated = await client.patchTask(task.id, { claim: true });
      }
      updated = await client.patchTask(task.id, { status: "in_progress" });
      await client.addComment(task.id, {
        body: `🧵 bb thread started: bb://thread/${thread.id}`,
        as: "agent",
      });
      await bb.storage.kv.set(`task:${task.id}`, {
        threadId: thread.id,
        createdAt: new Date().toISOString(),
      });
      if (request.projectId) {
        const projects = await client.listProjects();
        const project = projects.find((candidate) => candidate.id === task.projectId);
        if (project) await rememberProjectMapping(bb, request.projectId, project.slug);
      }

      return { threadId: thread.id, task: await decorateTask(bb, updated, thread.id) };
    },

    async openCount() {
      const client = await requireClient(clientForSettings);
      const response = await client.listMine();
      return { count: response.mine.filter((task) => task.status !== "done").length };
    },
  });

  bb.log.info("loaded");
}

async function requireClient(factory: () => Promise<DispatchClient>): Promise<DispatchClient> {
  const client = await factory();
  if (!client.isConfigured) {
    throw new Error("Connect Dispatch in the plugin settings before using this action.");
  }
  return client;
}

async function decorateTasks(bb: BbPluginApi, tasks: DispatchTask[]): Promise<DispatchTask[]> {
  return Promise.all(tasks.map((task) => decorateTask(bb, task)));
}

async function decorateTask(
  bb: BbPluginApi,
  task: DispatchTask,
  linkedThreadId?: string | null,
): Promise<DispatchTask> {
  const linked = linkedThreadId === undefined ? await getLinkedThreadId(bb, task.id) : linkedThreadId;
  const subtasks = task.subtasks
    ? await decorateTasks(bb, task.subtasks)
    : task.subtasks;
  return {
    ...task,
    ...(subtasks ? { subtasks } : {}),
    linkedThreadId: linked,
  };
}

async function getLinkedThreadId(bb: BbPluginApi, taskId: string): Promise<string | null> {
  const link = await bb.storage.kv.get<{ threadId?: string }>(`task:${taskId}`);
  return link?.threadId ?? null;
}

async function importCliCredentials(
  bb: BbPluginApi,
): Promise<{ apiKey: string; baseUrl?: string }> {
  const hosts = await bb.sdk.hosts.list();
  const host = hosts.find((candidate) => candidate.status === "connected") ?? hosts[0];
  if (!host) throw new Error("No BB host is connected to import the Dispatch CLI key from.");

  const home = (await bb.sdk.hosts.directory({ hostId: host.id })).directory;
  const path = `${home.replace(/[\\/]$/, "")}/.dispatch/config.json`;
  let file;
  try {
    file = await bb.sdk.files.read({ hostId: host.id, path, rootPath: home });
  } catch {
    throw new Error("No ~/.dispatch/config.json was found on the connected BB host.");
  }
  if (file.contentEncoding !== "utf8") {
    throw new Error("The Dispatch CLI config could not be read as text.");
  }

  let config: unknown;
  try {
    config = JSON.parse(file.content);
  } catch {
    throw new Error("The Dispatch CLI config is not valid JSON.");
  }
  if (!isRecord(config) || typeof config.apiKey !== "string" || !config.apiKey.trim()) {
    throw new Error("The Dispatch CLI config does not contain an API key.");
  }
  return {
    apiKey: config.apiKey.trim(),
    baseUrl: typeof config.baseUrl === "string" ? normalizeBaseUrl(config.baseUrl) : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
