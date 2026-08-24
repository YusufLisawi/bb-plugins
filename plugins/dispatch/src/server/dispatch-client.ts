import {
  DEFAULT_DISPATCH_URL,
  type ConnectionStatus,
  type CreateTaskInput,
  type DispatchComment,
  type DispatchProject,
  type DispatchTask,
  type DispatchUser,
  type Member,
  type MineTasksResponse,
  type NewCommentInput,
  type PatchTaskInput,
  type ProjectTasksResponse,
} from "../types.js";

export class DispatchApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 0, code = "dispatch_error") {
    super(message);
    this.name = "DispatchApiError";
    this.status = status;
    this.code = code;
  }
}

interface LoginResponse {
  token: string;
  user: DispatchUser;
}

export class DispatchClient {
  readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_DISPATCH_URL);
    this.apiKey = options.apiKey?.trim() ?? "";
  }

  get isConfigured() {
    return Boolean(this.apiKey && this.baseUrl);
  }

  async me(): Promise<DispatchUser> {
    return this.request<DispatchUser>("/me");
  }

  async listMine(): Promise<MineTasksResponse> {
    return this.request<MineTasksResponse>("/me/tasks");
  }

  async listProjects(): Promise<DispatchProject[]> {
    const response = await this.request<{ projects: DispatchProject[] }>("/projects");
    return response.projects;
  }

  async listTasks(
    slug: string,
    options: { status?: string; mine?: boolean; unclaimed?: boolean } = {},
  ): Promise<ProjectTasksResponse> {
    const params = new URLSearchParams({ project: slug, subtasks: "1" });
    if (options.status) params.set("status", options.status);
    if (options.mine) params.set("mine", "1");
    if (options.unclaimed) params.set("unclaimed", "1");
    return this.request<ProjectTasksResponse>(`/tasks?${params.toString()}`);
  }

  async getTask(id: string): Promise<DispatchTask> {
    const response = await this.request<{ task: DispatchTask }>(`/tasks/${encodeURIComponent(id)}`);
    return response.task;
  }

  async createTask(input: CreateTaskInput): Promise<DispatchTask> {
    const response = await this.request<{ task: DispatchTask }>("/tasks", {
      method: "POST",
      body: input,
    });
    return response.task;
  }

  async patchTask(id: string, input: PatchTaskInput): Promise<DispatchTask> {
    const response = await this.request<{ task: DispatchTask }>(
      `/tasks/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input },
    );
    return response.task;
  }

  async deleteTask(id: string): Promise<void> {
    await this.request<{ ok: true }>(`/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async listComments(taskId: string): Promise<DispatchComment[]> {
    const response = await this.request<{ comments: DispatchComment[] }>(
      `/tasks/${encodeURIComponent(taskId)}/comments`,
    );
    return response.comments;
  }

  async addComment(taskId: string, input: NewCommentInput): Promise<DispatchComment> {
    const response = await this.request<{ comment: DispatchComment }>(
      `/tasks/${encodeURIComponent(taskId)}/comments`,
      { method: "POST", body: input },
    );
    return response.comment;
  }

  async listMembers(slug: string): Promise<Member[]> {
    const response = await this.request<{ members: Member[] }>(
      `/projects/${encodeURIComponent(slug)}/members`,
    );
    return response.members;
  }

  async loginWithPassword(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password, device: "bb Dispatch plugin" },
      skipAuth: true,
    });
    return response;
  }

  async connectionStatus(): Promise<ConnectionStatus> {
    if (!this.isConfigured) {
      return {
        connected: false,
        baseUrl: this.baseUrl,
        user: null,
        error: "Connect a Dispatch API key to load tasks.",
      };
    }

    try {
      const user = await this.me();
      return { connected: true, baseUrl: this.baseUrl, user, error: null };
    } catch (error) {
      return {
        connected: false,
        baseUrl: this.baseUrl,
        user: null,
        error: formatDispatchError(error),
      };
    }
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: unknown;
      skipAuth?: boolean;
    } = {},
  ): Promise<T> {
    if (!options.skipAuth && !this.apiKey) {
      throw new DispatchApiError(
        "Dispatch is not connected. Add an API key in the plugin settings.",
        401,
        "not_configured",
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1${path}`, {
        method: options.method ?? "GET",
        headers: {
          ...(options.skipAuth ? {} : { Authorization: `Bearer ${this.apiKey}` }),
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (error) {
      throw new DispatchApiError(
        `Could not reach Dispatch at ${this.baseUrl}: ${error instanceof Error ? error.message : "network error"}`,
        0,
        "network_error",
      );
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : `${options.method ?? "GET"} ${path} failed with ${response.status}`;
      throw new DispatchApiError(message, response.status, response.status === 401 ? "unauthorized" : "api_error");
    }

    if (payload === null || typeof payload !== "object") {
      throw new DispatchApiError("Dispatch returned an invalid response.", response.status, "invalid_response");
    }
    return payload as T;
  }
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  return (trimmed || DEFAULT_DISPATCH_URL).replace(/\/+$/, "");
}

export function formatDispatchError(error: unknown): string {
  if (error instanceof DispatchApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Dispatch request failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
