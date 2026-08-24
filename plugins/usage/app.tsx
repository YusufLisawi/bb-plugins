// bb-plugin-usage — hover popover and click-to-open modal on the sidebar
// footer icon showing provider usage & limits.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import type { UsageResponse } from "./server";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function MiniWindowRow({ window: w }: { window: OkUsage["windows"][number] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px] leading-none">
        <span className="text-muted-foreground">{w.label}</span>
        <span
          className={
            w.usedPercent >= 90
              ? "font-medium text-destructive"
              : "font-medium text-foreground"
          }
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

function UsagePopoverContent({ data }: { data: UsageData | null }) {
  if (!data) {
    return <p className="text-xs text-muted-foreground">Loading usage…</p>;
  }
  const visible = PROVIDERS.filter(
    (p) => data[p.key].status !== "not_installed",
  );
  if (visible.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No providers installed on this machine.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {visible.map(({ key, name }) => (
        <MiniProviderSection key={key} name={name} usage={data[key]} />
      ))}
    </div>
  );
}

function useHoverAnchor(selector: string) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const hoverCount = useRef(0);
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
      closeTimer.current = setTimeout(() => {
        if (hoverCount.current <= 0) setOpen(false);
      }, CLOSE_DELAY_MS);
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

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      cancelClose();
    };
  }, [selector]);

  return {
    open,
    rect,
    panelHandlers: {
      onPointerEnter: () => hoverApi.current.enter(null),
      onPointerLeave: () => hoverApi.current.leave(),
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
        <UsagePopoverContent data={data} />
      </DialogContent>
    </Dialog>
  );
}

function UsageOverlays() {
  const { open, rect, panelHandlers } = useHoverAnchor(FOOTER_BUTTON_SELECTOR);
  const [data, setData] = useState<UsageData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const openModal = () => setModalOpen(true);
    window.addEventListener(OPEN_MODAL_EVENT, openModal);
    return () => window.removeEventListener(OPEN_MODAL_EVENT, openModal);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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
          className="fixed z-50 w-64 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{
            left: rect.right + 8,
            bottom: Math.max(8, window.innerHeight - rect.bottom),
          }}
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
