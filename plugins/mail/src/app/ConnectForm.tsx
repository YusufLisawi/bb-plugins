import { useState, type FormEvent } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import type { MailStatus } from "../shared/types.js";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { errorMessage, FORM_CONTROL_CLASS } from "./lib.js";

interface Provider {
  id: string;
  label: string;
  domains: string[];
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  passwordHint?: string;
}

const PROVIDERS: Provider[] = [
  { id: "gmail", label: "Gmail", domains: ["gmail.com", "googlemail.com"], imapHost: "imap.gmail.com", imapPort: 993, smtpHost: "smtp.gmail.com", smtpPort: 465, passwordHint: "Use an app password from myaccount.google.com/apppasswords (needs 2-step verification)." },
  { id: "icloud", label: "iCloud", domains: ["icloud.com", "me.com", "mac.com"], imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587, passwordHint: "Use an app-specific password from account.apple.com." },
  { id: "fastmail", label: "Fastmail", domains: ["fastmail.com", "fastmail.fm"], imapHost: "imap.fastmail.com", imapPort: 993, smtpHost: "smtp.fastmail.com", smtpPort: 465, passwordHint: "Use an app password from Fastmail settings." },
  { id: "yahoo", label: "Yahoo", domains: ["yahoo.com", "ymail.com"], imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 465, passwordHint: "Use an app password from Yahoo account security." },
  { id: "other", label: "Other", domains: [], imapHost: "", imapPort: 993, smtpHost: "", smtpPort: 465 },
];

function providerForEmail(email: string): Provider | null {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;
  return PROVIDERS.find((provider) => provider.domains.includes(domain)) ?? null;
}

export function ConnectForm({ onConnected, embedded = false }: { onConnected: (status: MailStatus) => void; embedded?: boolean }) {
  const rpc = useRpc<typeof rpcContract>();
  const [providerId, setProviderId] = useState("gmail");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = PROVIDERS.find((entry) => entry.id === providerId) ?? PROVIDERS[0]!;
  const custom = provider.id === "other";

  function onEmailChange(value: string) {
    setEmail(value);
    const detected = providerForEmail(value);
    if (detected) setProviderId(detected.id);
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }
    if (custom && (!imapHost.trim() || !smtpHost.trim())) {
      setError("Enter the IMAP and SMTP servers.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const status = await rpc.call("connect", {
        email: email.trim(),
        name: name.trim(),
        password,
        username: custom ? username.trim() : "",
        imapHost: custom ? imapHost.trim() : provider.imapHost,
        imapPort: custom ? Number(imapPort) || 993 : provider.imapPort,
        smtpHost: custom ? smtpHost.trim() : provider.smtpHost,
        smtpPort: custom ? Number(smtpPort) || 465 : provider.smtpPort,
      });
      setPassword("");
      toast.success(`Connected ${status.email}`);
      onConnected(status);
    } catch (cause) {
      setError(errorMessage(cause, "Could not connect."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={embedded ? "text-foreground" : "h-full min-h-0 overflow-y-auto bg-background text-foreground"}>
      <form onSubmit={connect} className={embedded ? "grid gap-4" : "mx-auto grid w-full max-w-md gap-4 px-5 pb-10 pt-12"} aria-label="Connect an email account">
        <div className={embedded ? "hidden" : "grid gap-3"}>
          <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon name="Mail" className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Connect your email</h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Mail signs in over IMAP and SMTP. Your password stays on the BB server.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Email provider">
          {PROVIDERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={entry.id === providerId}
              onClick={() => setProviderId(entry.id)}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                entry.id === providerId ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-state-hover hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <Field id="connect-email" label="Email address">
            <Input id="connect-email" type="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="you@example.com" className={FORM_CONTROL_CLASS} />
          </Field>
          <Field id="connect-name" label="Your name" hint="Shown to the people you write to.">
            <Input id="connect-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={FORM_CONTROL_CLASS} />
          </Field>
          <Field id="connect-password" label={custom ? "Password" : "App password"} hint={provider.passwordHint}>
            <Input id="connect-password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} className={FORM_CONTROL_CLASS} />
          </Field>

          {custom ? (
            <div className="grid gap-3 border-t border-border/70 pt-3">
              <Field id="connect-username" label="Username" hint="Leave empty to use the email address.">
                <Input id="connect-username" autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} className={FORM_CONTROL_CLASS} />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
                <Field id="connect-imap" label="IMAP server">
                  <Input id="connect-imap" value={imapHost} onChange={(event) => setImapHost(event.target.value)} placeholder="imap.example.com" className={FORM_CONTROL_CLASS} />
                </Field>
                <Field id="connect-imap-port" label="Port">
                  <Input id="connect-imap-port" inputMode="numeric" value={imapPort} onChange={(event) => setImapPort(event.target.value)} className={FORM_CONTROL_CLASS} />
                </Field>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
                <Field id="connect-smtp" label="SMTP server">
                  <Input id="connect-smtp" value={smtpHost} onChange={(event) => setSmtpHost(event.target.value)} placeholder="smtp.example.com" className={FORM_CONTROL_CLASS} />
                </Field>
                <Field id="connect-smtp-port" label="Port">
                  <Input id="connect-smtp-port" inputMode="numeric" value={smtpPort} onChange={(event) => setSmtpPort(event.target.value)} className={FORM_CONTROL_CLASS} />
                </Field>
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive" role="alert">{error}</p> : null}

        <Button type="submit" size="sm" className="h-8 justify-self-start" disabled={busy}>
          {busy ? "Checking sign-in…" : "Connect"}
        </Button>
      </form>
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
