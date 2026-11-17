import { useEffect, useState } from "react";
import {
  experimental_PermissionModePicker as PermissionModePicker,
  experimental_ProviderModelPicker as ProviderModelPicker,
  useSdk,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import type { TaskExecution } from "../contract.js";
import { Button } from "@/components/ui/button";

export const DEFAULT_EXECUTION: TaskExecution = {
  providerId: null,
  model: null,
  reasoningLevel: null,
  serviceTier: null,
  permissionMode: null,
};

interface Defaults {
  providerId: string;
  model: string;
  reasoningLevel: string;
  serviceTier: string;
  permissionMode: NonNullable<TaskExecution["permissionMode"]>;
}

/** What a launch uses when a task leaves its execution to defaults. */
function useExecutionDefaults(projectId: string | null, thread: PluginSidebarThread | undefined, threadId: string | null): Defaults | null {
  const sdk = useSdk();
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const providerId = thread?.providerId ?? null;
  useEffect(() => {
    let cancelled = false;
    setDefaults(null);
    const load = async (): Promise<Defaults | null> => {
      if (threadId) {
        const options = await sdk.threads.defaultExecutionOptions({ threadId });
        return options && providerId ? { providerId, ...options } : null;
      }
      return projectId ? sdk.projects.defaultExecutionOptions({ projectId }) : null;
    };
    load().then(
      (value) => {
        if (!cancelled) setDefaults(value);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [sdk, threadId, providerId, projectId]);
  return defaults;
}

interface ExecutionPickerProps {
  projectId: string | null;
  threadId: string | null;
  thread: PluginSidebarThread | undefined;
  value: TaskExecution;
  disabled?: boolean;
  onChange(next: TaskExecution): void;
}

/**
 * bb's own model and permission pickers. Untouched fields stay null so the
 * task follows the thread's or project's defaults at launch.
 */
export function ExecutionPicker({ projectId, threadId, thread, value, disabled, onChange }: ExecutionPickerProps) {
  const defaults = useExecutionDefaults(projectId, thread, threadId);
  const custom = value.model !== null || value.permissionMode !== null || value.providerId !== null;
  const environmentId = thread?.environment?.id ?? null;
  const routing = environmentId ? { routing: { kind: "environment" as const, environmentId } } : {};

  if (!defaults) {
    return <div className="h-8 w-56 animate-pulse rounded-md bg-muted/60" aria-label="Loading models" />;
  }

  const providerId = threadId ? defaults.providerId : (value.providerId ?? defaults.providerId);
  const permissionMode = value.permissionMode ?? defaults.permissionMode;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ProviderModelPicker
        value={{
          providerId,
          model: value.model ?? defaults.model,
          reasoningLevel: value.reasoningLevel ?? defaults.reasoningLevel,
          serviceTier: value.serviceTier ?? defaults.serviceTier,
        }}
        disabled={disabled}
        allowProviderChange={threadId === null}
        {...routing}
        onChange={(next) =>
          onChange({
            ...value,
            providerId: threadId ? null : next.providerId,
            model: next.model,
            reasoningLevel: next.reasoningLevel,
            serviceTier: next.serviceTier ?? null,
          })
        }
      />
      <PermissionModePicker
        providerId={providerId}
        value={permissionMode}
        disabled={disabled}
        {...routing}
        onChange={(mode) => {
          if (mode !== permissionMode) onChange({ ...value, permissionMode: mode });
        }}
      />
      {custom && !disabled ? (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onChange(DEFAULT_EXECUTION)}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}
