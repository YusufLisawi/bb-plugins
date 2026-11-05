import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  permissionStore,
  playChime,
  prefsStore,
  requestNotificationPermission,
  setPrefs,
} from "./alerts.js";
import { BellIcon, BellOffIcon, VolumeIcon, VolumeOffIcon } from "./icons.js";

export function useAlertState() {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.get);
  const permission = useSyncExternalStore(permissionStore.subscribe, permissionStore.get);
  const desktopOn = prefs.desktop && permission === "granted";
  return { prefs, permission, desktopOn };
}

/** Header button: shows whether this device will alert, opens the settings. */
export function AlertsButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { prefs, desktopOn } = useAlertState();
  const quiet = !desktopOn && !prefs.sound;
  const Glyph = quiet ? BellOffIcon : BellIcon;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 px-2"
      aria-expanded={open}
      aria-controls="mail-alerts"
      aria-label="New mail alerts"
      onClick={onToggle}
    >
      <Glyph className={cn("size-4", quiet && "text-muted-foreground")} />
    </Button>
  );
}

/** Prompt shown until this device has decided on desktop notifications. */
export function EnableAlertsBanner() {
  const { permission } = useAlertState();
  const [dismissed, setDismissed] = useState(false);
  if (permission !== "default" || dismissed) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-muted/40 px-3 py-2">
      <BellIcon className="size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-xs leading-5"><span className="sm:hidden">Get alerts for new mail.</span><span className="hidden sm:inline">Get a notification and a sound the moment new mail arrives, even when BB is in the background.</span></p>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setDismissed(true)}>Not now</Button>
        <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void requestNotificationPermission()}>Turn on</Button>
      </div>
    </div>
  );
}

export function AlertSettings({ live }: { live: boolean }) {
  const { prefs, permission, desktopOn } = useAlertState();

  const desktopDetail = permission === "unsupported"
    ? "Not available here. Desktop notifications need the BB app or a browser over https."
    : permission === "denied"
      ? "Blocked for this site. Allow notifications in the browser's site settings, then reload."
      : permission === "default"
        ? "Ask this browser for permission."
        : desktopOn
          ? "Shown when BB is in the background or another tab is open."
          : "Off on this device.";

  return (
    <div id="mail-alerts" className="grid gap-3 rounded-md bg-muted/25 p-3 text-xs">
      <Row
        icon={desktopOn ? <BellIcon className="size-4" /> : <BellOffIcon className="size-4 text-muted-foreground" />}
        title="Desktop notifications"
        detail={desktopDetail}
      >
        {permission === "default" ? (
          <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void requestNotificationPermission()}>Turn on</Button>
        ) : permission === "granted" ? (
          <Toggle on={prefs.desktop} label="Desktop notifications" onChange={(desktop) => setPrefs({ desktop })} />
        ) : null}
      </Row>
      <Row
        icon={prefs.sound ? <VolumeIcon className="size-4" /> : <VolumeOffIcon className="size-4 text-muted-foreground" />}
        title="Sound"
        detail="A short chime for each new email."
      >
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={playChime}>Play</Button>
        <Toggle on={prefs.sound} label="Sound" onChange={(sound) => setPrefs({ sound })} />
      </Row>
      <p className="flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", live ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />
        {live
          ? "Live: the mail server pushes new mail to BB as it arrives, with a check every minute as a backup."
          : "Reconnecting to the mail server. New mail is fetched as soon as it's back."}
      </p>
    </div>
  );
}

function Row({ icon, title, detail, children }: { icon: React.ReactNode; title: string; detail: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 leading-4 text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

export function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-[18px] w-8 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        on ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn("absolute top-[3px] size-3 rounded-full bg-background shadow-sm transition-[left]", on ? "left-[17px]" : "left-[3px]")} />
    </button>
  );
}
