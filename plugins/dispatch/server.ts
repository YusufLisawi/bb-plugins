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
  type DispatchComment,
  type DispatchProject,
  type DispatchTask,
  type Member,
  type MineTasksResponse,
  type ProjectTasksResponse,
} from "./src/types.js";
import {
  DispatchApiError,
  DispatchClient,
  normalizeBaseUrl,
} from "./src/server/dispatch-client.js";
import {
  findDispatchSlugForBbProject,
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

const connectionStatusSchema = z.object({
  connected: z.boolean(),
  baseUrl: z.string(),
  user: userSchema.nullable(),
  error: z.string().nullable(),
});

const mineTasksSchema = z.object({
  projects: z.record(z.string(), projectSchema),
  mine: z.array(taskSchema),
  open: z.array(taskSchema),
});

const taskDetailSchema = z.object({
  task: taskSchema,
  project: projectSchema.nullable(),
  subtasks: z.array(taskSchema),
  linkedThreadId: z.string().nullable(),
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
    output: connectionStatusSchema,
  },
  saveConnection: {
    input: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
    }),
    output: connectionStatusSchema,
  },
  loginWithPassword: {
    input: z.object({ email: z.string().email(), password: z.string().min(1) }),
    output: connectionStatusSchema,
  },
  importCliKey: {
    input: z.null(),
    output: connectionStatusSchema,
  },
  loadDashboard: {
    input: z.null(),
    output: z.object({
      status: connectionStatusSchema,
      data: mineTasksSchema.nullable(),
    }),
  },
  listMine: {
    input: z.null(),
    output: mineTasksSchema,
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
    output: taskDetailSchema,
  },
  loadTaskDetail: {
    input: z.object({ id: z.string().min(1) }),
    output: z.object({
      detail: taskDetailSchema,
      comments: z.array(commentSchema),
      members: z.array(memberSchema),
      baseUrl: z.string(),
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
  resolveDispatchProject: {
    input: z.object({ bbProjectId: z.string().min(1) }),
    output: z.object({ dispatchSlug: z.string().nullable() }),
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

const CONNECTION_STATUS_TTL_MS = 20_000;
const MINE_TASKS_TTL_MS = 30_000;
const PROJECTS_TTL_MS = 60_000;
const TASK_TTL_MS = 10_000;
const PROJECT_TASKS_TTL_MS = 10_000;
const COMMENTS_TTL_MS = 10_000;
const MEMBERS_TTL_MS = 5 * 60_000;

/**
 * Shares in-flight reads between the task page, sidebar count, and detail
 * panel, while keeping short-lived responses fresh after mutations.
 */
class ReadThroughCache {
  private readonly values = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private generation = 0;

  get<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.values.get(key);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value as T);

    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const generation = this.generation;
    const request = loader().then((value) => {
      if (generation === this.generation) {
        this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    });
    this.inFlight.set(key, request);
    request.then(
      () => this.clearInFlight(key, request),
      () => this.clearInFlight(key, request),
    );
    return request;
  }

  peek<T>(key: string): T | null {
    const cached = this.values.get(key);
    return cached && cached.expiresAt > Date.now() ? cached.value as T : null;
  }

  clear(): void {
    this.generation += 1;
    this.values.clear();
    this.inFlight.clear();
  }

  private clearInFlight(key: string, request: Promise<unknown>): void {
    if (this.inFlight.get(key) === request) this.inFlight.delete(key);
  }
}

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

  const reads = new ReadThroughCache();
  let cachedClient: DispatchClient | null = null;
  let clientIdentity: string | null = null;

  const resetConnection = () => {
    cachedClient = null;
    clientIdentity = null;
    reads.clear();
  };
  const invalidateReads = () => reads.clear();

  settings.onChange(resetConnection);

  const clientForSettings = async (): Promise<DispatchClient> => {
    const current = await settings.get();
    const baseUrl = normalizeBaseUrl(current.baseUrl);
    const apiKey = current.apiKey?.trim() ?? "";
    const identity = `${baseUrl}\u0000${apiKey}`;
    if (!cachedClient || clientIdentity !== identity) {
      cachedClient = new DispatchClient({ baseUrl, apiKey });
      clientIdentity = identity;
      reads.clear();
    }
    return cachedClient;
  };

  const saveSettings = async (values: { apiKey?: string; baseUrl?: string }) => {
    const next: Record<string, JsonValue> = {};
    if (values.apiKey !== undefined) next.apiKey = values.apiKey.trim();
    if (values.baseUrl !== undefined) next.baseUrl = normalizeBaseUrl(values.baseUrl);
    if (Object.keys(next).length > 0) {
      await bb.sdk.plugins.updateSettings({ pluginId: bb.pluginId, values: next });
      resetConnection();
    }
  };

  const getConnectionStatus = (client: DispatchClient): Promise<ConnectionStatus> => {
    return reads.get("connection-status", CONNECTION_STATUS_TTL_MS, () => client.connectionStatus());
  };

  const getMine = (client: DispatchClient): Promise<MineTasksResponse> => {
    return reads.get("mine", MINE_TASKS_TTL_MS, () => client.listMine());
  };

  const getProjects = (client: DispatchClient): Promise<DispatchProject[]> => {
    return reads.get("projects", PROJECTS_TTL_MS, () => client.listProjects());
  };

  const getTask = (client: DispatchClient, taskId: string): Promise<DispatchTask> => {
    return reads.get(`task:${taskId}`, TASK_TTL_MS, () => client.getTask(taskId));
  };

  const getProjectTasks = (
    client: DispatchClient,
    slug: string,
    options: { status?: string; mine?: boolean; unclaimed?: boolean } = {},
  ): Promise<ProjectTasksResponse> => {
    const key = [
      "project-tasks",
      slug,
      options.status ?? "",
      options.mine ? "mine" : "",
      options.unclaimed ? "unclaimed" : "",
    ].join(":");
    return reads.get(key, PROJECT_TASKS_TTL_MS, () => client.listTasks(slug, options));
  };

  const getComments = (client: DispatchClient, taskId: string): Promise<DispatchComment[]> => {
    return reads.get(`comments:${taskId}`, COMMENTS_TTL_MS, () => client.listComments(taskId));
  };

  const getMembers = (client: DispatchClient, slug: string): Promise<Member[]> => {
    return reads.get(`members:${slug}`, MEMBERS_TTL_MS, async () => {
      try {
        return await client.listMembers(slug);
      } catch (error) {
        // Membership enumeration is currently admin-only in the Dispatch API.
        // Members can still use the rest of the plugin and see their existing
        // assignee id in the detail view.
        if (error instanceof DispatchApiError && error.status === 403) return [] as Member[];
        throw error;
      }
    });
  };

  const loadTaskOverview = async (
    client: DispatchClient,
    taskId: string,
    includeMembers: boolean,
  ) => {
    // A dashboard load already includes the relevant project records. Reuse
    // that warm data when possible; otherwise start the catalog request in
    // parallel with the task request.
    const mineProjects = reads.peek<MineTasksResponse>("mine")?.projects ?? null;
    const projectsPromise = mineProjects ? null : getProjects(client);
    const task = await getTask(client, taskId);
    const projects = projectsPromise ? await projectsPromise : null;
    const project = mineProjects?.[task.projectId]
      ?? projects?.find((candidate) => candidate.id === task.projectId)
      ?? (mineProjects ? (await getProjects(client)).find((candidate) => candidate.id === task.projectId) : null)
      ?? null;
    const boardPromise = project && task.subtasks === undefined
      ? getProjectTasks(client, project.slug)
      : Promise.resolve<ProjectTasksResponse | null>(null);
    const membersPromise = project && includeMembers
      ? getMembers(client, project.slug)
      : Promise.resolve<Member[]>([]);
    const [board, members, linkedThreadId] = await Promise.all([
      boardPromise,
      membersPromise,
      getLinkedThreadId(bb, task.id),
    ]);
    const rawSubtasks = task.subtasks ?? board?.tasks.filter((candidate) => candidate.parentTaskId === task.id) ?? [];
    const [decoratedTask, subtasks] = await Promise.all([
      decorateTask(bb, task, linkedThreadId),
      decorateTasks(bb, rawSubtasks),
    ]);

    return {
      detail: {
        task: decoratedTask,
        project,
        subtasks,
        linkedThreadId,
      },
      members,
    };
  };

  bb.rpc.register(rpcContract, {
    async status() {
      return getConnectionStatus(await clientForSettings());
    },

    async saveConnection(input) {
      await saveSettings(input);
      return getConnectionStatus(await clientForSettings());
    },

    async loginWithPassword(input) {
      const current = await settings.get();
      const client = new DispatchClient({ baseUrl: current.baseUrl });
      const result = await client.loginWithPassword(input.email, input.password);
      await saveSettings({ apiKey: result.token });
      return getConnectionStatus(await clientForSettings());
    },

    async importCliKey() {
      const imported = await importCliCredentials(bb);
      await saveSettings(imported);
      return getConnectionStatus(await clientForSettings());
    },

    async loadDashboard() {
      const client = await clientForSettings();
      if (!client.isConfigured) {
        return { status: await getConnectionStatus(client), data: null };
      }

      // /me/tasks itself proves the current connection and is the only read
      // needed to render the task list. Keep the profile check warm without
      // putting it on this visual critical path.
      const statusPromise = getConnectionStatus(client);
      const minePromise = getMine(client);
      let response: MineTasksResponse;
      try {
        response = await minePromise;
      } catch (error) {
        const status = await statusPromise;
        if (!status.connected) return { status, data: null };
        throw error;
      }
      const [mine, open] = await Promise.all([
        decorateTasks(bb, response.mine),
        decorateTasks(bb, response.open),
      ]);
      return {
        status: { connected: true, baseUrl: client.baseUrl, user: null, error: null },
        data: { projects: response.projects, mine, open },
      };
    },

    async listMine() {
      const client = await requireClient(clientForSettings);
      const response = await getMine(client);
      const [mine, open] = await Promise.all([
        decorateTasks(bb, response.mine),
        decorateTasks(bb, response.open),
      ]);
      return {
        projects: response.projects,
        mine,
        open,
      };
    },

    async listProject(input) {
      const client = await requireClient(clientForSettings);
      const response = await getProjectTasks(client, input.slug, input);
      return {
        nextCursor: response.nextCursor,
        tasks: await decorateTasks(bb, response.tasks),
      };
    },

    async getTask(input) {
      const client = await requireClient(clientForSettings);
      return (await loadTaskOverview(client, input.id, false)).detail;
    },

    async loadTaskDetail(input) {
      const client = await requireClient(clientForSettings);
      const [overview, comments] = await Promise.all([
        loadTaskOverview(client, input.id, true),
        getComments(client, input.id),
      ]);
      return {
        ...overview,
        comments,
        baseUrl: client.baseUrl,
      };
    },

    async listProjects() {
      const client = await requireClient(clientForSettings);
      return { projects: await getProjects(client), mapped: {} };
    },

    async resolveBbProject(input) {
      return { bbProjectId: await findBbProjectForDispatchSlug(bb, input.dispatchSlug) };
    },

    async resolveDispatchProject(input) {
      return { dispatchSlug: await findDispatchSlugForBbProject(bb, input.bbProjectId) };
    },

    async rememberProjectMap(input) {
      await rememberProjectMapping(bb, input.bbProjectId, input.dispatchSlug);
      return { ok: true };
    },

    async createTask(input) {
      const client = await requireClient(clientForSettings);
      const task = await client.createTask(input);
      invalidateReads();
      return decorateTask(bb, task);
    },

    async patchTask(input) {
      const client = await requireClient(clientForSettings);
      const task = await client.patchTask(input.id, input.patch);
      invalidateReads();
      return decorateTask(bb, task);
    },

    async deleteTask(input) {
      const client = await requireClient(clientForSettings);
      await client.deleteTask(input.id);
      await bb.storage.kv.delete(`task:${input.id}`);
      invalidateReads();
      return { ok: true };
    },

    async listComments(input) {
      const client = await requireClient(clientForSettings);
      return { comments: await getComments(client, input.taskId) };
    },

    async addComment(input) {
      const client = await requireClient(clientForSettings);
      const comment = await client.addComment(input.taskId, { body: input.body, as: input.as });
      invalidateReads();
      return comment;
    },

    async listMembers(input) {
      const client = await requireClient(clientForSettings);
      return { members: await getMembers(client, input.slug) };
    },

    async createThread(input) {
      const client = await requireClient(clientForSettings);
      const [task, user] = await Promise.all([client.getTask(input.taskId), client.me()]);
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
        const projects = await getProjects(client);
        const project = projects.find((candidate) => candidate.id === task.projectId);
        if (project) await rememberProjectMapping(bb, request.projectId, project.slug);
      }

      invalidateReads();
      return { threadId: thread.id, task: await decorateTask(bb, updated, thread.id) };
    },

    async openCount() {
      const client = await requireClient(clientForSettings);
      const response = await getMine(client);
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
