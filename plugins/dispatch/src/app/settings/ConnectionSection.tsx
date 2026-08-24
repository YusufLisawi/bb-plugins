import { useEffect, useState } from "react";
import { useRpc, useSettings } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import type { ConnectionStatus } from "../../types.js";

const inputClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-ring";

export function ConnectionSection() {
  const rpc = useRpc<typeof rpcContract>();
  const { values, isLoading: settingsLoading } = useSettings();
  const [baseUrl, setBaseUrl] = useState("https://dispatch-kappa-lac.vercel.app");
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"key" | "cli" | "login" | null>(null);

  useEffect(() => {
    const configuredUrl = values?.baseUrl;
    if (typeof configuredUrl === "string" && configuredUrl) setBaseUrl(configuredUrl);
  }, [values?.baseUrl]);

  useEffect(() => {
    void rpc.call("status").then(setStatus, () => undefined);
  }, [rpc]);

  async function saveKey() {
    if (!apiKey.trim()) {
      setError("Paste a Dispatch API key first.");
      return;
    }
    setBusy("key");
    setError(null);
    try {
      const next = await rpc.call("saveConnection", { apiKey, baseUrl });
      setStatus(next);
      setApiKey("");
      toast.success("Dispatch connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the key.");
    } finally {
      setBusy(null);
    }
  }

  async function importCliKey() {
    setBusy("cli");
    setError(null);
    try {
      const next = await rpc.call("importCliKey");
      setStatus(next);
      toast.success("Imported the CLI connection");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import the CLI key.");
    } finally {
      setBusy(null);
    }
  }

  async function signIn() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy("login");
    setError(null);
    try {
      const next = await rpc.call("loginWithPassword", { email, password });
      setStatus(next);
      setPassword("");
      toast.success("Dispatch connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch connection</CardTitle>
        <CardDescription>Choose how this BB host should access your Dispatch tasks. Secrets are stored server-side.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium" htmlFor="dispatch-base-url">Dispatch URL</label>
          <input id="dispatch-base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className={inputClass} disabled={settingsLoading || busy !== null} />
        </div>

        <div className="space-y-3 rounded-md border border-border p-3">
          <div><h3 className="text-sm font-medium">Use an API key</h3><p className="mt-1 text-xs text-muted-foreground">Paste a personal key from Dispatch. It is never sent to the browser page after saving.</p></div>
          <div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="dispatch-api-key">Dispatch API key</label><input id="dispatch-api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} className={`${inputClass} min-w-56 flex-1`} placeholder="dsp_…" autoComplete="off" /><Button type="button" size="sm" onClick={() => void saveKey()} disabled={busy !== null}>{busy === "key" ? "Saving…" : "Save key"}</Button></div>
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <div><h3 className="text-sm font-medium">Use the CLI key</h3><p className="mt-1 text-xs text-muted-foreground">Read <code className="rounded bg-muted px-1">~/.dispatch/config.json</code> from the connected BB host.</p></div>
          <Button type="button" size="sm" variant="outline" onClick={() => void importCliKey()} disabled={busy !== null}>{busy === "cli" ? "Importing…" : "Use CLI key"}</Button>
        </div>

        <div className="space-y-3 rounded-md border border-border p-3">
          <div><h3 className="text-sm font-medium">Sign in with Dispatch</h3><p className="mt-1 text-xs text-muted-foreground">This issues a separate API key labelled for the BB plugin.</p></div>
          <div className="grid gap-2 sm:grid-cols-2"><div><label className="sr-only" htmlFor="dispatch-email">Email</label><input id="dispatch-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" autoComplete="email" /></div><div><label className="sr-only" htmlFor="dispatch-password">Password</label><input id="dispatch-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Password" autoComplete="current-password" /></div></div>
          <Button type="button" size="sm" variant="outline" onClick={() => void signIn()} disabled={busy !== null}>{busy === "login" ? "Signing in…" : "Sign in"}</Button>
        </div>

        {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
        {status?.connected ? <p className="text-xs text-muted-foreground">Connected as <span className="font-medium text-foreground">{status.user?.name}</span> · {status.baseUrl}</p> : status?.error ? <p className="text-xs text-muted-foreground">Not connected: {status.error}</p> : null}
      </CardContent>
    </Card>
  );
}
