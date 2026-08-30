import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract, SyncRun } from "./server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SyncControl() {
  const rpc = useRpc<typeof rpcContract>();
  const [result, setResult] = useState<SyncRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(method: "status" | "syncNow") {
    setBusy(true);
    setError(null);
    try {
      setResult(await rpc.call(method, null));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void run("status"); }, []);

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>BB updates</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          This machine pulls your private GitHub repository, reconciles its owned plugins, and installs its managed skills into this BB server. No peer URL, token, or Tailscale setup is needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("status")}>Status</Button>
          <Button size="sm" disabled={busy || !result?.configured} onClick={() => void run("syncNow")}>Pull updates now</Button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}
        {result && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p>{result.message}</p>
            <p className="text-muted-foreground">Repository: <code>{result.repoPath}</code>{result.lastRunAt ? ` · Last check: ${new Date(result.lastRunAt).toLocaleString()}.` : ""}</p>
            <p className="text-muted-foreground">BB skill directory: <code>{result.skillRoot}</code></p>
            {result.installedPluginIds.length > 0 && <p>Installed: {result.installedPluginIds.join(", ")}.</p>}
            {result.updatedPluginIds.length > 0 && <p>Updated: {result.updatedPluginIds.join(", ")}.</p>}
            {result.reloadedPluginIds.length > 0 && <p>Reloaded: {result.reloadedPluginIds.join(", ")}.</p>}
            {result.skippedPluginIds.length > 0 && <p className="text-muted-foreground">Skipped existing plugins from another source: {result.skippedPluginIds.join(", ")}.</p>}
            {result.installedSkillIds.length > 0 && <p>Installed skills: {result.installedSkillIds.join(", ")}.</p>}
            {result.updatedSkillIds.length > 0 && <p>Updated skills: {result.updatedSkillIds.join(", ")}.</p>}
            {result.removedSkillIds.length > 0 && <p>Removed skills: {result.removedSkillIds.join(", ")}.</p>}
            {result.skippedSkillIds.length > 0 && <p className="text-muted-foreground">Kept locally edited skills: {result.skippedSkillIds.join(", ")}.</p>}
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
    title: "BB updates",
    description: "Pull and apply private GitHub plugin and skill updates on this machine.",
    component: SyncControl,
  });
});
