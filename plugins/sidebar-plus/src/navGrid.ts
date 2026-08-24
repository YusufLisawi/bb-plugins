import { useEffect } from "react";
import type { SidebarLayout } from "./layout";

const NAV_SELECTOR = '[data-testid="plugin-nav-sidebar-items"]';
const PRIMARY_SELECTOR = '[data-testid="app-sidebar-primary-actions"]';

/**
 * Applies the icon-grid treatment to the HOST's nav rows. The rows stay
 * host-rendered (reorder, hide, context menus, split-drag all keep working);
 * app.css restyles them into tiles while `html[data-sbp-nav-grid]` is set.
 * Because the tiles hide their labels, we copy each label into a `title`
 * attribute so hovering still names the page.
 */
export function useNavGrid(layout: SidebarLayout) {
  const { navGrid, navGridColumns, primaryStyle } = layout;
  useEffect(() => {
    const root = document.documentElement;
    if (navGrid) {
      root.dataset.sbpNavGrid = "1";
      root.style.setProperty("--sbp-nav-cols", String(navGridColumns));
    } else {
      delete root.dataset.sbpNavGrid;
      root.style.removeProperty("--sbp-nav-cols");
    }
    if (primaryStyle === "default") delete root.dataset.sbpPrimary;
    else root.dataset.sbpPrimary = primaryStyle;
    if (!navGrid && primaryStyle === "default") return;

    const labelButtons = () => {
      const containers = document.querySelectorAll(
        `${NAV_SELECTOR}, ${PRIMARY_SELECTOR}`,
      );
      for (const container of Array.from(containers)) {
        for (const button of Array.from(container.querySelectorAll("button"))) {
          const text =
            button.getAttribute("aria-label") ??
            button.textContent?.trim() ??
            "";
          if (text && button.title !== text) button.title = text;
        }
      }
    };
    labelButtons();
    const observer = new MutationObserver(labelButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      delete root.dataset.sbpNavGrid;
      delete root.dataset.sbpPrimary;
      root.style.removeProperty("--sbp-nav-cols");
    };
  }, [navGrid, navGridColumns, primaryStyle]);
}
