import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract, SyncRun } from "./server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SyncControl() {
  const rpc = useRpc<typeof rpcContract>();
  const [result, setResult] = useState<SyncRun | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(method: "status" | "syncNow") {
    setBusy(true);
    try {
      setResult(await rpc.call(method, null));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void run("status"); }, []);

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>Plugin updates</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          This machine pulls your private GitHub plugin repository and reloads updated plugins. No peer URL, token, or Tailscale setup is needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("status")}>Status</Button>
          <Button size="sm" disabled={busy || !result?.configured} onClick={() => void run("syncNow")}>Pull updates now</Button>
        </div>
        {result && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p>{result.message}</p>
            <p className="text-muted-foreground">Repository: <code>{result.repoPath}</code>{result.lastRunAt ? ` · Last check: ${new Date(result.lastRunAt).toLocaleString()}.` : ""}</p>
            {result.reloadedPluginIds.length > 0 && <p>Reloaded: {result.reloadedPluginIds.join(", ")}.</p>}
            {result.failures.length > 0 && <ul className="list-disc space-y-1 pl-5 text-destructive">{result.failures.map((failure) => <li key={failure}>{failure}</li>)}</ul>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: "sync-control",
    title: "Plugin updates",
    description: "Pull and apply private GitHub plugin updates on this machine.",
    component: SyncControl,
  });
});
