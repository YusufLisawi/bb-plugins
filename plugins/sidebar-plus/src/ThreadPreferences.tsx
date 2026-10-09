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

export type PinMode = "global" | "project" | "none";
interface Preferences {
  projectPinnedThreadIds: string[];
  exemptThreadIds: string[];
  autoArchiveAvailable: boolean;
}
interface Value {
  projectPinnedIds: ReadonlySet<string>;
  exemptIds: ReadonlySet<string>;
  ready: boolean;
  autoArchiveAvailable: boolean;
  pendingIds: ReadonlySet<string>;
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
      setPendingIds((current) => new Set([...current, threadId]));
      queue.current = queue.current
        .catch(() => undefined)
        .then(async () => {
          ++revision.current;
          try {
            const result = await work();
            ++revision.current;
            if (mounted.current) setPreferences(result);
          } catch (error) {
            if (mounted.current)
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not update thread settings",
              );
            void refresh();
          } finally {
            if (mounted.current)
              setPendingIds((current) => {
                const next = new Set(current);
                next.delete(threadId);
                return next;
              });
          }
        });
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
