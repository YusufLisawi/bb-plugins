/**
 * Add Usage above the rail's host-owned Settings button. BB currently exposes
 * footer actions but no rail accessory slot; keep the registered footer action
 * as the fallback whenever the rail is absent. Never reparent React-owned nodes.
 */
const RAIL_SETTINGS_SELECTOR =
  '.col-start-1.row-start-2 > button:has([data-icon="Settings"])';
const FOOTER_USAGE_SELECTOR =
  '[data-testid="plugin-sidebar-footer-action-usage-usage"]';

export interface UsageRailPlacement {
  host: HTMLElement;
  buttonClassName: string;
}

export function mountUsageRail(
  doc: Document,
  onChange: (placement: UsageRailPlacement | null) => void,
): () => void {
  let placement: UsageRailPlacement | null = null;
  let rail: HTMLElement | null = null;
  let originalDirection = "";
  let originalDirectionPriority = "";
  let disposed = false;
  const hiddenFooters = new Map<HTMLElement, { display: string; priority: string }>();

  const restoreFooters = () => {
    for (const [element, previous] of hiddenFooters) {
      if (element.style.getPropertyValue("display") === "none" &&
          element.style.getPropertyPriority("display") === "important") {
        if (previous.display)
          element.style.setProperty("display", previous.display, previous.priority);
        else element.style.removeProperty("display");
      }
    }
    hiddenFooters.clear();
  };

  const releaseRail = () => {
    placement?.host.remove();
    if (rail?.style.flexDirection === "column") {
      if (originalDirection)
        rail.style.setProperty("flex-direction", originalDirection, originalDirectionPriority);
      else rail.style.removeProperty("flex-direction");
    }
    placement = null;
    rail = null;
    restoreFooters();
  };

  const reconcile = () => {
    if (disposed) return;
    const settings = doc.querySelector<HTMLButtonElement>(RAIL_SETTINGS_SELECTOR);
    const nextRail = settings?.parentElement ?? null;
    if (!nextRail || !settings) {
      if (placement) {
        releaseRail();
        onChange(null);
      }
      return;
    }
    if (!placement || nextRail !== rail || placement.host.parentElement !== nextRail) {
      releaseRail();
      rail = nextRail;
      originalDirection = rail.style.getPropertyValue("flex-direction");
      originalDirectionPriority = rail.style.getPropertyPriority("flex-direction");
      rail.style.flexDirection = "column";
      const host = doc.createElement("div");
      host.dataset.usageRailAction = "";
      host.setAttribute("data-bb-plugin", "usage");
      host.setAttribute("data-bb-plugin-root", "");
      host.className = "flex items-center justify-center";
      rail.insertBefore(host, settings);
      placement = { host, buttonClassName: settings.className };
      onChange(placement);
    } else if (placement.buttonClassName !== settings.className) {
      placement = { ...placement, buttonClassName: settings.className };
      onChange(placement);
    }
    // Footer overflow menus can mount a second host-rendered copy. Hide every
    // copy while the rail control is available, and restore them on cleanup.
    for (const button of Array.from(doc.querySelectorAll<HTMLElement>(FOOTER_USAGE_SELECTOR))) {
      const item = button.closest("li") ?? button;
      if (!hiddenFooters.has(item)) hiddenFooters.set(item, {
        display: item.style.getPropertyValue("display"),
        priority: item.style.getPropertyPriority("display"),
      });
      if (item.style.getPropertyValue("display") !== "none" ||
          item.style.getPropertyPriority("display") !== "important")
        item.style.setProperty("display", "none", "important");
    }
  };

  const observer = new MutationObserver(reconcile);
  observer.observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  reconcile();
  return () => {
    disposed = true;
    observer.disconnect();
    releaseRail();
  };
}
