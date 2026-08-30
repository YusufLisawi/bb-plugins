import type {
  ExperimentalPluginFixedTabReference,
  JsonValue,
} from "@get-bb/plugin-sdk/app";

export type TaskDetailTabTarget = {
  taskId: string;
} & Record<string, JsonValue>;

function isTaskDetailTabTarget(value: JsonValue): value is TaskDetailTabTarget {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && typeof value.taskId === "string"
    && value.taskId.trim().length > 0
  );
}

/**
 * The stable tab identity shared by the Dispatch list and the host panel.
 * BB validates the memory-only target before it is delivered to the detail
 * component, so malformed navigation state cannot reach the task RPC calls.
 */
export const TASK_DETAIL_TAB = {
  panelId: "tasks",
  id: "task-detail",
  experimental_target: {
    validate: isTaskDetailTabTarget,
  },
} as const satisfies ExperimentalPluginFixedTabReference<TaskDetailTabTarget>;
