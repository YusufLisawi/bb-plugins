// bb-plugin-sync — a BB plugin frontend entry.
//
// Compiled by `bb plugin build` into dist/app.js + dist/app.css. React and
// @get-bb/plugin-sdk/app are provided by the BB app at load time (never bundled),
// so this file must be loaded by BB, not imported directly.
//
// The components under components/ui/ are YOURS: vendored source (shadcn
// model), edit freely. Add more from the BB registry with
// `npx shadcn add @bb/<name>` (see components.json) — dialogs, dropdowns,
// tables, the full shadcn set, version-matched to this BB install. Run
// `npm install` once before `bb plugin build`.
import { useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract, SyncRun } from "./server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SyncControl() {
  const rpc = useRpc<typeof rpcContract>();
  const [result, setResult] = useState<SyncRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  async function run(method: "status" | "plan" | "syncNow") {
    setBusy(true);
    try {
      setResult(await rpc.call(method, null));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run("status");
  }, []);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Plugin synchronization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Configure the peer URL and token above. Use <code>bb sync token</code> on the other server to obtain its token.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("status")}>Status</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("plan")}>Preview changes</Button>
          <Button size="sm" disabled={busy || !result?.configured} onClick={() => void run("syncNow")}>Sync now</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void rpc.call("pairingToken", null).then(({ token: value }) => setToken(value))}>Reveal local token</Button>
        </div>
        {token && <code className="block break-all rounded border border-border bg-muted p-2 text-xs">{token}</code>}
        {result && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p>{result.message}</p>
            <p className="text-muted-foreground">
              {result.configured ? `Paired with ${result.peerUrl}` : "No peer is configured."}
              {result.lastRunAt ? ` Last sync: ${new Date(result.lastRunAt).toLocaleString()}.` : ""}
            </p>
            {result.failures.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-destructive">
                {result.failures.map((failure) => <li key={failure}>{failure}</li>)}
              </ul>
            )}
            {result.actions.length > 0 && (
              <ul className="space-y-2">
                {result.actions.map((action) => (
                  <li key={action.id} className="rounded border border-border p-2">
                    <span className="font-medium">{action.pluginId}</span>{" · "}{action.kind}{" · "}{action.direction}
                    <p className="text-muted-foreground">{action.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// The default export must be definePluginApp(...); BB interprets it after
// loading the bundle. Register general UI under app.slots and composer actions,
// plus-menu rows, banners, or rich-text rules with app.composer.customize(...)
// (see the bb guide's plugins chapter).
export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: "sync-control",
    title: "Synchronization",
    description: "Preview and apply safe plugin synchronization with a paired BB server.",
    component: SyncControl,
  });
});
