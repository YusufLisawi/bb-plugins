import { useCallback, useEffect, useRef } from "react";
import {
  useBbNavigate,
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import type { rpcContract } from "../../server.js";
import { MAIL_CHANGED, type MessageSummary } from "../shared/types.js";
import {
  keepFaviconBadge,
  keepTitleBadge,
  notificationPermission,
  permissionStore,
  playChime,
  prefsStore,
  readCursor,
  setAppBadge,
  unlockAudioOnGesture,
  unreadStore,
  writeCursor,
} from "./alerts.js";
import { displayName, PANEL_ID, threadRoute } from "./lib.js";

/** Catch-up check interval; realtime signals normally arrive first. */
const CHECK_INTERVAL_MS = 30_000;

/**
 * App-wide and invisible: mounted on every BB screen so new mail plays a
 * sound, raises a notification and updates the badges wherever the user is.
 */
export function MailAlerts() {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const connection = useRealtimeConnectionState();
  const checking = useRef(false);
  const recheck = useRef(false);

  const openMessage = useCallback((id: string) => {
    window.focus();
    navigate.toPluginPanel(PANEL_ID, { subPath: threadRoute(id) });
  }, [navigate]);

  const alert = useCallback((messages: MessageSummary[]) => {
    if (messages.length === 0) return;
    const prefs = prefsStore.get();
    if (prefs.sound) playChime();

    const newest = messages[0]!;
    const title = messages.length === 1 ? displayName(newest.from) : `${messages.length} new emails`;
    const body = messages.length === 1
      ? [newest.subject || "(no subject)", newest.snippet].filter(Boolean).join("\n")
      : messages.slice(0, 3).map((message) => `${displayName(message.from)}: ${message.subject || "(no subject)"}`).join("\n");

    const looking = document.visibilityState === "visible" && document.hasFocus();
    const canNotify = prefs.desktop && notificationPermission() === "granted";
    if (!looking && canNotify) {
      try {
        const notification = new Notification(title, {
          body,
          tag: `bb-mail-${newest.id}`,
          icon: new URL("/icon-192.png", window.location.origin).href,
        });
        notification.onclick = () => {
          notification.close();
          openMessage(newest.id);
        };
        return;
      } catch {
        // Some platforms only allow notifications from a service worker;
        // fall through to the in-app toast.
      }
    }
    toast(title, {
      description: messages.length === 1 ? newest.subject || "(no subject)" : body,
      duration: 8_000,
      action: { label: messages.length === 1 ? "Open" : "Inbox", onClick: () => openMessage(newest.id) },
    });
  }, [openMessage]);

  const check = useCallback(async () => {
    // A signal during a check queues one more, so no arrival waits for the timer.
    if (checking.current) {
      recheck.current = true;
      return;
    }
    checking.current = true;
    recheck.current = false;
    try {
      const cursor = readCursor();
      const result = await rpc.call("arrivals", { after: cursor ?? Number.MAX_SAFE_INTEGER });
      unreadStore.set(result.unread);
      // First run on this device, or the cache was reset: start from now.
      if (cursor === null || cursor > result.latest) {
        writeCursor(result.latest);
        return;
      }
      if (result.latest <= cursor) return;
      // Another tab on this device may have alerted while we were waiting.
      const current = readCursor();
      if (current !== null && current >= result.latest) return;
      writeCursor(result.latest);
      alert(result.messages);
    } catch {
      // Not connected or the server is restarting; the next check retries.
    } finally {
      checking.current = false;
      if (recheck.current) window.setTimeout(() => void check(), 0);
    }
  }, [rpc, alert]);

  useRealtime(MAIL_CHANGED, (payload) => {
    const unread = (payload as { unread?: unknown } | null)?.unread;
    if (typeof unread === "number") unreadStore.set(unread);
    void check();
  });

  // Signals sent while the connection was down are lost: reconcile on reconnect.
  useEffect(() => {
    if (connection === "connected") void check();
  }, [connection, check]);

  useEffect(() => {
    const controller = new AbortController();
    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      permissionStore.set(notificationPermission());
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible, { signal: controller.signal });
    window.addEventListener("focus", onVisible, { signal: controller.signal });
    window.addEventListener("online", () => void check(), { signal: controller.signal });
    unlockAudioOnGesture(controller.signal);
    keepTitleBadge(controller.signal);
    keepFaviconBadge(controller.signal);
    const unsubscribe = unreadStore.subscribe(() => setAppBadge(unreadStore.get()));
    return () => {
      controller.abort();
      window.clearInterval(interval);
      unsubscribe();
      setAppBadge(0);
    };
  }, [check]);

  return null;
}
