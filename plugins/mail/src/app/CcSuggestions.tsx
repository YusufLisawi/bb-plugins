import { useEffect, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../server.js";
import { SplitIcons } from "./icons.js";

type Rpc = ReturnType<typeof useRpc<typeof rpcContract>>;

/** "Sanchez Artigas, Enrique (K-Tuin)" → "Enrique Sanchez": enough to recognise, short enough for one line. */
function shortName(name: string, address: string): string {
  const clean = name.replace(/\(.*?\)/g, "").replace(/["']/g, "").trim();
  if (!clean) return address;
  const words = (clean.includes(",") ? clean.split(",").reverse().join(" ") : clean).split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(" ");
}

/** People usually on emails with the current recipients, one click from Cc. */
export function CcSuggestions({ rpc, addresses, onAdd }: { rpc: Rpc; addresses: string[]; onAdd: (name: string, address: string) => void }) {
  const [suggestions, setSuggestions] = useState<{ name: string; address: string; reason: string }[]>([]);
  const key = addresses.join(",");
  useEffect(() => {
    if (addresses.length === 0) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      rpc.call("suggestCc", { addresses }).then((result) => { if (!cancelled) setSuggestions(result.suggestions); }, () => undefined);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, key]);
  if (suggestions.length === 0) return null;
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-1.5">
      <span className="w-12 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0.5 gap-y-1 text-xs">
        <span className="mr-1 text-muted-foreground">Often cc'd</span>
        {suggestions.map((entry) => (
          <button
            key={entry.address}
            type="button"
            title={`Add ${entry.address} to Cc. ${entry.reason}`}
            onClick={() => { onAdd(entry.name, entry.address); setSuggestions((current) => current.filter((item) => item.address !== entry.address)); }}
            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-foreground/80 transition-colors hover:bg-state-hover hover:text-foreground"
          >
            <SplitIcons.plus className="size-3 text-muted-foreground" />
            {shortName(entry.name, entry.address)}
          </button>
        ))}
      </div>
    </div>
  );
}
