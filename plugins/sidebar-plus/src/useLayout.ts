import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../server";
import { DEFAULT_LAYOUT, normalizeLayout, type SidebarLayout } from "./layout";

const LAYOUT_CHANNEL = "layout-changed";

// One in-memory copy per window so the sidebar and the settings editor agree
// instantly, before the server round-trip lands.
let cached: SidebarLayout | null = null;
const listeners = new Set<(layout: SidebarLayout) => void>();
function broadcast(layout: SidebarLayout) {
  cached = layout;
  for (const listener of listeners) listener(layout);
}

export function useLayout() {
  const rpc = useRpc<typeof rpcContract>();
  const [layout, setLayoutState] = useState<SidebarLayout>(
    () => cached ?? DEFAULT_LAYOUT,
  );
  const [isLoaded, setIsLoaded] = useState(cached !== null);
  const pending = useRef<Promise<unknown> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const result = await rpc.call("getLayout");
      broadcast(normalizeLayout(result.layout));
      setIsLoaded(true);
    } catch {
      // Keep whatever we had; the defaults are always a valid sidebar.
    }
  }, [rpc]);

  useEffect(() => {
    listeners.add(setLayoutState);
    if (cached === null) void refetch();
    return () => {
      listeners.delete(setLayoutState);
    };
  }, [refetch]);

  useRealtime(LAYOUT_CHANNEL, () => {
    void refetch();
  });

  const update = useCallback(
    (patch: Partial<SidebarLayout> | ((current: SidebarLayout) => SidebarLayout)) => {
      const base = cached ?? layout;
      const next = normalizeLayout(
        typeof patch === "function" ? patch(base) : { ...base, ...patch },
      );
      broadcast(next); // optimistic
      const request = rpc
        .call("setLayout", { layout: next as unknown as Record<string, unknown> })
        .then((result) => broadcast(normalizeLayout(result.layout)))
        .catch(() => void refetch());
      pending.current = request;
    },
    [layout, refetch, rpc],
  );

  const reset = useCallback(() => {
    broadcast(DEFAULT_LAYOUT);
    void rpc
      .call("resetLayout")
      .then((result) => broadcast(normalizeLayout(result.layout)))
      .catch(() => void refetch());
  }, [refetch, rpc]);

  return { layout, isLoaded, update, reset };
}
