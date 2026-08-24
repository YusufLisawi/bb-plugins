import { useEffect, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../../server.js";

export function OpenCount() {
  const rpc = useRpc<typeof rpcContract>();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await rpc.call("openCount");
        if (!cancelled) setCount(result.count);
      } catch {
        if (!cancelled) setCount(null);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [rpc]);

  return count === null ? null : <span className="tabular-nums text-xs text-muted-foreground">{count}</span>;
}
