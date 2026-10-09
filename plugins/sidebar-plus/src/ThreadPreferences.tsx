import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../server";
import type { FolderPlacement } from "./threadFolders";

export type PinMode = "global" | "project" | "none";
interface Preferences {
  projectPinnedThreadIds: string[];
  exemptThreadIds: string[];
  autoArchiveAvailable: boolean;
  folderPlacements: FolderPlacement[];
}
interface Value {
  projectPinnedIds: ReadonlySet<string>;
  exemptIds: ReadonlySet<string>;
  ready: boolean;
  autoArchiveAvailable: boolean;
  pendingIds: ReadonlySet<string>;
  folderPlacements: ReadonlyMap<string, FolderPlacement>;
  setThreadFolder: (threadId: string, projectId: string) => Promise<boolean>;
  setPinMode: (threadId: string, mode: PinMode) => void;
  setAutoArchiveExempt: (threadId: string, exempt: boolean) => void;
}
const Context = createContext<Value | null>(null);

export function ThreadPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const rpc = useRpc<typeof rpcContract>();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  const revision = useRef(0);
  const pendingCounts = useRef(new Map<string, number>());
  const refresh = useCallback(async () => {
    const sequence = ++revision.current;
    try {
      const result = await rpc.call("getThreadPreferences");
      if (mounted.current && sequence === revision.current)
        setPreferences(result);
    } catch {
      // Keep known preferences through a disconnect. Mutations surface errors.
    }
  }, [rpc]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  useRealtime("thread-preferences-changed", () => {
    void refresh();
  });

  const mutate = useCallback(
    (threadId: string, work: () => Promise<Preferences>) => {
      pendingCounts.current.set(
        threadId,
        (pendingCounts.current.get(threadId) ?? 0) + 1,
      );
      setPendingIds((current) => new Set([...current, threadId]));
      const request = queue.current
        .catch(() => undefined)
        .then(async () => {
          ++revision.current;
          try {
            const result = await work();
            ++revision.current;
            if (mounted.current) setPreferences(result);
            return true;
          } catch (error) {
            if (mounted.current)
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not update thread settings",
              );
            void refresh();
            return false;
          } finally {
            const remaining = (pendingCounts.current.get(threadId) ?? 1) - 1;
            if (remaining > 0) pendingCounts.current.set(threadId, remaining);
            else pendingCounts.current.delete(threadId);
            if (mounted.current)
              setPendingIds((current) => {
                const next = new Set(current);
                if (remaining === 0) next.delete(threadId);
                return next;
              });
          }
        });
      queue.current = request;
      return request;
    },
    [refresh],
  );

  return (
    <Context.Provider
      value={{
        projectPinnedIds: new Set(preferences?.projectPinnedThreadIds ?? []),
        exemptIds: new Set(preferences?.exemptThreadIds ?? []),
        ready: preferences !== null,
        autoArchiveAvailable: preferences?.autoArchiveAvailable ?? false,
        pendingIds,
        folderPlacements: new Map(
          (preferences?.folderPlacements ?? []).map((placement) => [
            placement.threadId,
            placement,
          ]),
        ),
        setThreadFolder: (threadId, projectId) =>
          mutate(threadId, () =>
            rpc.call("setThreadFolder", { threadId, projectId }),
          ),
        setPinMode: (threadId, mode) =>
          mutate(threadId, () => rpc.call("setPinMode", { threadId, mode })),
        setAutoArchiveExempt: (threadId, exempt) =>
          mutate(threadId, () =>
            rpc.call("setAutoArchiveExempt", { threadId, exempt }),
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useThreadPreferences(): Value {
  const context = useContext(Context);
  if (!context) throw new Error("Thread preferences provider is missing");
  return context;
}
