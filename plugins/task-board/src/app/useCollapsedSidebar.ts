import { useEffect } from "react";

/** Below this width bb shows the sidebar as an overlay, so there is nothing to win. */
const MIN_DESKTOP_WIDTH = 900;

/** bb's sidebar wrapper reports `data-state="expanded" | "collapsed"`. */
function sidebarOpen(): boolean | null {
  const sidebar = document.querySelector<HTMLElement>('[data-collapsible][data-side="left"][data-state]');
  if (!sidebar) return null;
  return sidebar.dataset.state === "expanded";
}

function toggleSidebar(): boolean {
  const button =
    document.querySelector<HTMLButtonElement>('button[aria-label^="Toggle sidebar"]') ??
    document.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]');
  if (!button) return false;
  button.click();
  return true;
}

/**
 * The thread sidebar adds nothing on the board, so the board folds it away
 * while it is open and unfolds it on the way out. It only undoes its own
 * fold: a sidebar the user reopens on the board, or one that was already
 * closed, is left as it is. bb has no SDK call for this, so it uses bb's own
 * Toggle sidebar button.
 */
export function useCollapsedSidebar(): void {
  useEffect(() => {
    if (window.innerWidth < MIN_DESKTOP_WIDTH) return;
    let collapsedByBoard = false;
    // Wait a frame so the page's chrome has rendered.
    const frame = window.requestAnimationFrame(() => {
      if (sidebarOpen() === true) collapsedByBoard = toggleSidebar();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (collapsedByBoard && sidebarOpen() !== true) toggleSidebar();
    };
  }, []);
}
