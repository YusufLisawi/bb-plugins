import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../server";

const FOLLOW_UPS_CHANNEL = "follow-ups-changed";

// One in-memory copy per window keeps every visible row in sync immediately.
let cached: ReadonlySet<string> | null = null;
const listeners = new Set<(threadIds: ReadonlySet<string>) => void>();

function broadcast(threadIds: Iterable<string>) {
  const next = new Set(threadIds);
  cached = next;
  for (const listener of listeners) listener(next);
}

export function useFollowUps() {
  const rpc = useRpc<typeof rpcContract>();
  const [threadIds, setThreadIds] = useState<ReadonlySet<string>>(
    () => cached ?? new Set(),
  );
  const pending = useRef<Promise<unknown>>(Promise.resolve());

  const refetch = useCallback(async () => {
    try {
      const result = await rpc.call("getFollowUps");
      broadcast(result.threadIds);
    } catch {
      // Leave the last known marks visible if the server is temporarily unavailable.
    }
  }, [rpc]);

  useEffect(() => {
    listeners.add(setThreadIds);
    if (cached === null) void refetch();
    return () => {
      listeners.delete(setThreadIds);
    };
  }, [refetch]);

  useRealtime(FOLLOW_UPS_CHANNEL, () => {
    void refetch();
  });

  const setMarked = useCallback(
    (threadId: string, marked: boolean) => {
      const request = pending.current.catch(() => undefined).then(async () => {
        let base = cached;
        if (base === null) {
          try {
            const result = await rpc.call("getFollowUps");
            base = new Set(result.threadIds);
            broadcast(base);
          } catch {
            return;
          }
        }

        const next = new Set(base);
        if (marked) next.add(threadId);
        else next.delete(threadId);
        broadcast(next);

        try {
          const result = await rpc.call("setFollowUp", { threadId, marked });
          broadcast(result.threadIds);
        } catch {
          void refetch();
        }
      });
      pending.current = request.then(() => undefined, () => undefined);
      return request;
    },
    [refetch, rpc],
  );

  return { threadIds, setMarked };
}
