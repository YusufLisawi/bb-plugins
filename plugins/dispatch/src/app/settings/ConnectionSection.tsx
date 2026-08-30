import { useEffect, useState } from "react";
import { useRpc, useSettings } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../../server.js";
import { Button } from "../../../components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "../../../components/ui/field.js";
import { Icon } from "../../../components/ui/icon.js";
import { Input } from "../../../components/ui/input";
import type { ConnectionStatus } from "../../types.js";
import { FORM_CONTROL_CLASS } from "../components/controlStyles.js";

export function ConnectionSection() {
  const rpc = useRpc<typeof rpcContract>();
  const { values, isLoading: settingsLoading } = useSettings();
  const [baseUrl, setBaseUrl] = useState("https://dispatch-kappa-lac.vercel.app");
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorArea, setErrorArea] = useState<"key" | "cli" | "login" | null>(null);
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
      setErrorArea("key");
      return;
    }
    setBusy("key");
    setError(null);
    setErrorArea(null);
    try {
      const next = await rpc.call("saveConnection", { apiKey, baseUrl });
      setStatus(next);
      setApiKey("");
      toast.success("Dispatch connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the key.");
      setErrorArea("key");
    } finally {
      setBusy(null);
    }
  }

  async function importCliKey() {
    setBusy("cli");
    setError(null);
    setErrorArea(null);
    try {
      const next = await rpc.call("importCliKey");
      setStatus(next);
      toast.success("Imported the CLI connection");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import the CLI key.");
      setErrorArea("cli");
    } finally {
      setBusy(null);
    }
  }

  async function signIn() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      setErrorArea("login");
      return;
    }
    setBusy("login");
    setError(null);
    setErrorArea(null);
    try {
      const next = await rpc.call("loginWithPassword", { email, password });
      setStatus(next);
      setPassword("");
      toast.success("Dispatch connected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
      setErrorArea("login");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid max-w-2xl gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Dispatch access</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">Choose one way for this BB host to access Dispatch. Secrets stay on the server.</p>
        </div>
        {status?.connected ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Connected as <span className="font-medium text-foreground">{status.user?.name}</span>
          </div>
        ) : null}
      </div>

      <Field>
        <FieldLabel htmlFor="dispatch-base-url">Dispatch URL</FieldLabel>
        <Input id="dispatch-base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className={FORM_CONTROL_CLASS} disabled={settingsLoading || busy !== null} />
        <FieldDescription>Used by every connection method below.</FieldDescription>
      </Field>

      <div className="divide-y divide-border/70 border-y border-border/70">
        <section className="grid gap-3 py-4" aria-labelledby="api-key-heading">
          <div>
            <h3 id="api-key-heading" className="text-sm font-medium">Personal API key</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Paste a key created in Dispatch. The browser never receives it after saving.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field invalid={errorArea === "key"}>
              <FieldLabel htmlFor="dispatch-api-key">API key</FieldLabel>
              <Input
                id="dispatch-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  if (errorArea === "key") { setError(null); setErrorArea(null); }
                }}
                placeholder="dsp_…"
                autoComplete="off"
                className={FORM_CONTROL_CLASS}
                aria-invalid={errorArea === "key" || undefined}
                aria-describedby={errorArea === "key" ? "dispatch-key-error" : undefined}
              />
            </Field>
            <Button type="button" size="sm" className="h-8" onClick={() => void saveKey()} disabled={busy !== null}>{busy === "key" ? "Saving…" : "Save key"}</Button>
          </div>
          {errorArea === "key" && error ? <p id="dispatch-key-error" className="text-xs text-destructive" role="alert">{error}</p> : null}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 py-4" aria-labelledby="cli-key-heading">
          <div>
            <h3 id="cli-key-heading" className="text-sm font-medium">Dispatch CLI</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Use <code className="rounded bg-muted px-1 py-0.5">~/.dispatch/config.json</code> from this host.</p>
            {errorArea === "cli" && error ? <p className="mt-1 text-xs text-destructive" role="alert">{error}</p> : null}
          </div>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void importCliKey()} disabled={busy !== null}>
            <Icon name="ComputerTerminal01" className="size-3.5" aria-hidden="true" />
            {busy === "cli" ? "Importing…" : "Use CLI key"}
          </Button>
        </section>

        <section className="grid gap-3 py-4" aria-labelledby="sign-in-heading">
          <div>
            <h3 id="sign-in-heading" className="text-sm font-medium">Email and password</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Sign in once to issue a separate key for this BB plugin.</p>
          </div>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field invalid={errorArea === "login" && !email.trim()}>
              <FieldLabel htmlFor="dispatch-email">Email</FieldLabel>
              <Input id="dispatch-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (errorArea === "login") { setError(null); setErrorArea(null); } }} placeholder="you@example.com" autoComplete="email" className={FORM_CONTROL_CLASS} />
            </Field>
            <Field invalid={errorArea === "login" && !password}>
              <FieldLabel htmlFor="dispatch-password">Password</FieldLabel>
              <Input id="dispatch-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); if (errorArea === "login") { setError(null); setErrorArea(null); } }} placeholder="Password" autoComplete="current-password" className={FORM_CONTROL_CLASS} />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{errorArea === "login" && error ? <span className="text-xs text-destructive" role="alert">{error}</span> : null}</span>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void signIn()} disabled={busy !== null}>{busy === "login" ? "Signing in…" : "Sign in"}</Button>
          </div>
        </section>
      </div>

      {!status?.connected && status?.error ? <p className="text-xs text-muted-foreground">Not connected: {status.error}</p> : null}
    </div>
  );
}
