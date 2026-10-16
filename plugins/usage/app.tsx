// bb-plugin-usage — hover popover and click-to-open modal on the sidebar
// footer icon showing provider usage & limits.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import type { ProviderMeta, UsageResponse } from "./server";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "./lib/utils";
import {
  PoolSection,
  PoolTotals,
  poolHasProvider,
  refreshPool,
  usePool,
  type PoolProvider,
} from "./pool";

const PLUGIN_ID = "usage";
const FOOTER_BUTTON_SELECTOR = '[aria-label="Usage & limits"]';
const OPEN_MODAL_EVENT = "bb-plugin-usage:open-modal";
const CLOSE_DELAY_MS = 150;
const POLL_INTERVAL_MS = 60_000;

// The popover lives in its own React root outside any host slot, so it calls
// the plugin RPC over fetch instead of the slot-bound useRpc hook.
async function fetchUsage(): Promise<UsageResponse> {
  const response = await fetch(`/api/v1/plugins/${PLUGIN_ID}/rpc/getUsage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "null",
    credentials: "same-origin",
  });
  const envelope = (await response.json()) as
    | { ok: true; result: UsageResponse }
    | { ok: false; error: { message?: string } };
  if (!envelope.ok) {
    throw new Error(envelope.error?.message ?? "Failed to load usage.");
  }
  return envelope.result;
}

type UsageData = UsageResponse;
type ProviderUsage = UsageData["claudeCode"];
type OkUsage = Extract<ProviderUsage, { status: "ok" }>;

const PROVIDERS: Array<{
  key: "claudeCode" | "codex" | "cursor";
  name: string;
}> = [
  { key: "claudeCode", name: "Claude Code" },
  { key: "codex", name: "Codex" },
  { key: "cursor", name: "Cursor" },
];

function barTone(percent: number) {
  if (percent >= 90) return "bg-destructive";
  if (percent >= 70) return "bg-primary/70";
  return "bg-primary";
}

function MiniBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${barTone(clamped)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function formatResetAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find(({ type }) => type === "weekday")?.value;
  const hour = parts.find(({ type }) => type === "hour")?.value;
  const minute = parts.find(({ type }) => type === "minute")?.value;

  return weekday && hour && minute ? `${weekday} ${hour}:${minute}` : null;
}

function formatTimeLeft(value: string | null) {
  if (!value) return null;
  const minutes = Math.ceil((new Date(value).getTime() - Date.now()) / 60_000);
  if (!Number.isFinite(minutes)) return null;
  if (minutes <= 0) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return hours % 24 === 0 ? `${days}d` : `${days}d ${hours % 24}h`;
}

function MiniWindowRow({ window: w }: { window: OkUsage["windows"][number] }) {
  const day = formatResetAt(w.resetsAt);
  const left = formatTimeLeft(w.resetsAt);
  const resetAt = day === null ? null : left === null ? day : `${day} · in ${left}`;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px] leading-none">
        <span className="min-w-0 truncate text-muted-foreground">
          {w.label}
          {resetAt ? (
            <span className="ml-1.5 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground/70">
              {resetAt}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "shrink-0 font-medium tabular-nums",
            w.usedPercent >= 90 ? "text-destructive" : "text-foreground",
          )}
        >
          {Math.round(w.usedPercent)}%
        </span>
      </div>
      <MiniBar percent={w.usedPercent} />
    </div>
  );
}

function MiniProviderSection({
  name,
  usage,
}: {
  name: string;
  usage: ProviderUsage;
}) {
  if (usage.status === "not_installed") return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{name}</p>
      {usage.status === "ok" ? (
        usage.windows.length > 0 ? (
          <div className="space-y-1.5">
            {usage.windows.map((w) => (
              <MiniWindowRow key={w.label} window={w} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No usage data.</p>
        )
      ) : usage.status === "error" ? (
        <p className="text-[11px] text-destructive">{usage.message}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {usage.status === "unauthenticated"
            ? "Not signed in."
            : "Session expired."}
        </p>
      )}
    </div>
  );
}

type TabKey = "claudeCode" | "codex" | "cursor";

const TAB_POOL: Record<TabKey, PoolProvider | null> = {
  claudeCode: "claude",
  codex: "codex",
  cursor: null,
};
const TAB_STORAGE_KEY = "bb-plugin-usage:tab";
let lastTab: TabKey | null = null;

function readTab(): TabKey | null {
  if (lastTab !== null) return lastTab;
  try {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (stored === "claudeCode" || stored === "codex" || stored === "cursor")
      return stored;
  } catch {}
  return null;
}

/** Provider logo drawn as a mask so it takes the tab's color. */
function ProviderLogo({
  meta,
  active,
  fallback,
}: {
  meta: ProviderMeta | null;
  active: boolean;
  fallback: string;
}) {
  if (meta?.logoUrl == null) {
    return <span className="text-[11px] font-medium">{fallback}</span>;
  }
  const dark = document.documentElement.classList.contains("dark");
  const tint = meta.strings.iconTint;
  return (
    <span
      aria-hidden="true"
      className="block size-4"
      style={{
        backgroundColor:
          active && tint !== null ? (dark ? tint.dark : tint.light) : "currentColor",
        maskImage: `url("${meta.logoUrl}")`,
        WebkitMaskImage: `url("${meta.logoUrl}")`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function UsagePopoverContent({
  data,
  full = false,
}: {
  data: UsageData | null;
  full?: boolean;
}) {
  const pool = usePool();
  const [requested, setRequested] = useState<TabKey | null>(readTab);
  if (!data) {
    return <p className="text-xs text-muted-foreground">Loading usage…</p>;
  }
  const tabs = PROVIDERS.filter(({ key }) => {
    const provider = TAB_POOL[key];
    return (
      data[key].status !== "not_installed" ||
      (provider !== null && poolHasProvider(pool, provider))
    );
  });
  if (tabs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No providers installed on this machine.
      </p>
    );
  }
  const active =
    tabs.find(({ key }) => key === requested) ?? tabs[0] ?? null;
  if (active === null) return null;
  const select = (key: TabKey) => {
    lastTab = key;
    setRequested(key);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, key);
    } catch {}
  };
  const pooled = TAB_POOL[active.key];
  const local = data[active.key];
  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Provider"
        className="flex items-center gap-1 border-b border-border pb-2"
      >
        {tabs.map(({ key, name }) => {
          const isActive = key === active.key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={name}
              title={name}
              onClick={() => select(key)}
              className={cn(
                "flex h-7 w-8 items-center justify-center rounded-md",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground opacity-70 hover:text-foreground hover:opacity-100",
              )}
            >
              <ProviderLogo
                meta={data.providers?.[key] ?? null}
                active={isActive}
                fallback={name.slice(0, 2)}
              />
            </button>
          );
        })}
        <span className="ml-auto truncate text-xs font-medium text-foreground">
          {active.name}
        </span>
      </div>
      {pooled !== null && poolHasProvider(pool, pooled) ? (
        <>
          {/* Threads use the pool, so its totals replace this machine's own login. */}
          <PoolTotals provider={pooled} />
          <div className="border-t border-border pt-3">
            <PoolSection provider={pooled} full={full} />
          </div>
        </>
      ) : local.status === "not_installed" ? null : (
        <MiniProviderSection name="This machine" usage={local} />
      )}
    </div>
  );
}

function useHoverAnchor(selector: string) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const hoverCount = useRef(0);
  // After a click inside the popover it stays open until a click outside.
  const pinned = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverApi = useRef<{
    enter: (el: Element | null) => void;
    leave: () => void;
  }>({ enter: () => {}, leave: () => {} });

  useEffect(() => {
    const cancelClose = () => {
      if (closeTimer.current !== undefined) {
        clearTimeout(closeTimer.current);
        closeTimer.current = undefined;
      }
    };
    const enter = (el: Element | null) => {
      hoverCount.current += 1;
      cancelClose();
      if (el) setRect(el.getBoundingClientRect());
      setOpen(true);
    };
    const leave = () => {
      hoverCount.current = Math.max(0, hoverCount.current - 1);
      cancelClose();
      if (pinned.current) return;
      closeTimer.current = setTimeout(() => {
        if (hoverCount.current <= 0 && !pinned.current) setOpen(false);
      }, CLOSE_DELAY_MS);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!pinned.current) return;
      const target = event.target as Element | null;
      if (target && panelRef.current?.contains(target)) return;
      if (target?.closest(selector)) return;
      pinned.current = false;
      hoverCount.current = 0;
      cancelClose();
      setOpen(false);
    };
    hoverApi.current = { enter, leave };

    const onPointerOver = (event: PointerEvent) => {
      // Touch devices synthesize mouse events after a tap. Only real mouse
      // pointers should open the hover affordance; taps use the modal below.
      if (event.pointerType !== "mouse") return;
      const target = event.target as Element | null;
      const button = target?.closest(selector);
      if (!button) return;
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && button.contains(relatedTarget)) return;
      enter(button);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target as Element | null;
      const button = target?.closest(selector);
      if (!button) return;
      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && button.contains(relatedTarget)) return;
      leave();
    };
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", onPointerDown, true);
      cancelClose();
    };
  }, [selector]);

  return {
    open,
    rect,
    panelRef,
    /** Close and forget a pin, e.g. when the full window opens instead. */
    unpin: () => {
      pinned.current = false;
    },
    panelHandlers: {
      onPointerEnter: () => hoverApi.current.enter(null),
      onPointerLeave: () => hoverApi.current.leave(),
      onPointerDown: () => {
        pinned.current = true;
      },
    },
  };
}

function UsageModal({
  open,
  data,
  onOpenChange,
}: {
  open: boolean;
  data: UsageData | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usage &amp; limits</DialogTitle>
          <DialogDescription>
            Current provider usage on this machine.
          </DialogDescription>
        </DialogHeader>
        <UsagePopoverContent data={data} full />
      </DialogContent>
    </Dialog>
  );
}

function UsageOverlays() {
  const { open, rect, panelRef, unpin, panelHandlers } = useHoverAnchor(
    FOOTER_BUTTON_SELECTOR,
  );
  const [data, setData] = useState<UsageData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (open || modalOpen) void refreshPool();
  }, [open, modalOpen]);

  useEffect(() => {
    const openModal = () => {
      unpin();
      setModalOpen(true);
    };
    window.addEventListener(OPEN_MODAL_EVENT, openModal);
    return () => window.removeEventListener(OPEN_MODAL_EVENT, openModal);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      void refreshPool();
      try {
        const result = await fetchUsage();
        if (!cancelled) setData(result);
      } catch {
        // Stay quiet in a hover popover; the icon itself still renders.
      }
    };
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      {open && rect && !modalOpen ? (
        <div
          className="fixed z-50 max-h-[min(80vh,640px)] w-96 overflow-y-auto rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{
            left: rect.right + 8,
            bottom: Math.max(8, window.innerHeight - rect.bottom),
          }}
          ref={panelRef}
          {...panelHandlers}
        >
          <UsagePopoverContent data={data} />
        </div>
      ) : null}
      <UsageModal
        open={modalOpen}
        data={data}
        onOpenChange={setModalOpen}
      />
    </>
  );
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "usage-hover-popover",
    mount() {
      const container = document.createElement("div");
      container.setAttribute("data-bb-plugin", PLUGIN_ID);
      container.setAttribute("data-bb-plugin-root", "");
      document.body.appendChild(container);
      const root = createRoot(container);
      root.render(<UsageOverlays />);
      return () => {
        root.unmount();
        container.remove();
      };
    },
  });

  app.slots.sidebarFooterAction({
    id: "usage",
    title: "Usage & limits",
    icon: "ChartColumn",
    run: () => {
      window.dispatchEvent(new Event(OPEN_MODAL_EVENT));
    },
  });
});
