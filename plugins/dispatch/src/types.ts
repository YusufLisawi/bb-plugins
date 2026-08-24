export const DEFAULT_DISPATCH_URL = "https://dispatch-kappa-lac.vercel.app";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskVisibility = "assigned" | "public" | "personal";
export type UserRole = "admin" | "member";

export interface DispatchUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface DispatchProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  agentContext: string;
  color: string;
}

export interface DispatchTask {
  id: string;
  projectId: string;
  sharedProjectIds: string[];
  title: string;
  description: string;
  size: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  visibility: TaskVisibility;
  assigneeIds: string[];
  parentTaskId: string | null;
  createdBy: string;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: DispatchTask[];
  linkedThreadId?: string | null;
}

export interface DispatchComment {
  id: string;
  taskId: string;
  authorId: string;
  authorKind: "human" | "agent";
  authorName: string;
  body: string;
  createdAt: string;
}

export interface MineTasksResponse {
  projects: Record<string, DispatchProject>;
  mine: DispatchTask[];
  open: DispatchTask[];
}

export interface ProjectTasksResponse {
  tasks: DispatchTask[];
  nextCursor: string | null;
}

export interface TaskDetailResponse {
  task: DispatchTask;
  project: DispatchProject | null;
  subtasks: DispatchTask[];
  linkedThreadId: string | null;
}

export interface ConnectionStatus {
  connected: boolean;
  baseUrl: string;
  user: DispatchUser | null;
  error: string | null;
}

export interface CreateTaskInput {
  project: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  visibility?: TaskVisibility;
  assignee?: string | string[];
  parent?: string;
}

export interface PatchTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  visibility?: TaskVisibility;
  assignee?: string | string[] | null;
  claim?: boolean;
}

export interface NewCommentInput {
  body: string;
  as?: "agent" | "human";
}

export interface Member extends DispatchUser {
  membershipRole?: "owner" | "member";
}

export interface CreateThreadResult {
  threadId: string;
  task: DispatchTask;
}
