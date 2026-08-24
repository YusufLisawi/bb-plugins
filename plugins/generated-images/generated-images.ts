import {
  GENERATED_IMAGES_OPEN_PANEL_EVENT,
  GENERATED_IMAGES_STORAGE_PREFIX,
  generatedImagesPendingIndexKey,
  type GeneratedImageSummary,
  type GeneratedImagesResponse,
} from "./shared.ts";

type TrayMode = "expanded" | "collapsed" | "dismissed";
type IconName =
  | "copy"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "download"
  | "ellipsis"
  | "folder"
  | "image"
  | "minus"
  | "plus"
  | "x";

const RAIL_ATTRIBUTE = "data-bb-generated-image-rail";
const PREVIEW_ATTRIBUTE = "data-bb-generated-image-preview";
const STYLE_ID = "bb-generated-images-style";
const STORAGE_PREFIX = GENERATED_IMAGES_STORAGE_PREFIX;
const REFRESH_INTERVAL_MS = 2500;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const ICON_PATHS: Record<IconName, readonly string[]> = {
  copy: [
    "M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z",
    "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2",
  ],
  image: [
    "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z",
    "m4 15 4.1-4.1a1 1 0 0 1 1.4 0l2.6 2.6 2-2a1 1 0 0 1 1.4 0L20 16",
    "M15.5 8.5h.01",
  ],
  "chevron-down": ["m7 10 5 5 5-5"],
  "chevron-left": ["m14 6-6 6 6 6"],
  "chevron-right": ["m10 6 6 6-6 6"],
  "chevron-up": ["m7 14 5-5 5 5"],
  download: [
    "M12 4v10",
    "m7 10 5 5 5-5",
    "M5 20h14",
  ],
  ellipsis: ["M5 12h.01M12 12h.01M19 12h.01"],
  folder: [
    "M3.5 7.5A1.5 1.5 0 0 1 5 6h5l2 2h7a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5z",
  ],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M7 7l10 10M17 7 7 17"],
};

function currentThreadId(): string | null {
  const match = window.location.pathname.match(/\/threads\/([^/?#]+)/);
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function requestGeneratedImagesPanel(index: number): boolean {
  const threadId = currentThreadId();
  if (!threadId) {
    return false;
  }

  const safeIndex = Math.max(0, Math.floor(index));
  try {
    window.sessionStorage.setItem(
      generatedImagesPendingIndexKey(threadId),
      String(safeIndex),
    );
  } catch {
    // The event still lets an already-mounted panel change selection when
    // sessionStorage is unavailable.
  }

  window.dispatchEvent(
    new window.CustomEvent(GENERATED_IMAGES_OPEN_PANEL_EVENT, {
      detail: { threadId, index: safeIndex },
    }),
  );
  return true;
}

function trayStorageKey(threadId: string): string {
  return `${STORAGE_PREFIX}${threadId}`;
}

function readTrayMode(threadId: string): TrayMode {
  try {
    const value = window.localStorage.getItem(trayStorageKey(threadId));
    if (value === "collapsed" || value === "dismissed") {
      return value;
    }
  } catch {
    // Browser privacy settings can deny localStorage. The tray still works for
    // this session when that happens.
  }
  return "expanded";
}

function saveTrayMode(threadId: string, mode: TrayMode): void {
  try {
    window.localStorage.setItem(trayStorageKey(threadId), mode);
  } catch {
    // Session-only behavior is a safe fallback when storage is unavailable.
  }
}

function copyTextFallback(value: string): boolean {
  if (typeof document.execCommand !== "function") {
    return false;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.insetInlineStart = "-9999px";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    input.remove();
  }
  return copied;
}

function appendIcon(parent: Element, name: IconName): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false");
  for (const pathData of ICON_PATHS[name]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.append(path);
  }
  parent.append(svg);
  return svg;
}

function createButton(
  action: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-bb-generated-images-action", action);
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function installStyles(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [${RAIL_ATTRIBUTE}] {
      box-sizing: border-box;
      inline-size: min(calc(100% - 1rem), 34rem);
      margin: 0.45rem 0.5rem 1rem;
      overflow: clip;
      color: var(--foreground);
      border: 1px solid var(--border-seam);
      border-radius: 0.75rem;
      background: var(--canvas);
      transition: opacity 180ms ease-out, transform 180ms ease-out;
    }
    [${RAIL_ATTRIBUTE}] *,
    [${RAIL_ATTRIBUTE}] *::before,
    [${RAIL_ATTRIBUTE}] *::after {
      box-sizing: border-box;
    }
    [${RAIL_ATTRIBUTE}][data-mode="dismissed"] {
      inline-size: fit-content;
      max-inline-size: calc(100% - 1rem);
      margin-block: 0.35rem 0.85rem;
      overflow: visible;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    [data-bb-generated-images-toolbar] {
      display: flex;
      align-items: center;
      min-block-size: 2.5rem;
      padding: 0.2rem 0.25rem 0.2rem 0.35rem;
      gap: 0.2rem;
    }
    [data-bb-generated-images-title],
    [data-bb-generated-images-icon-control],
    [data-bb-generated-images-chip],
    [data-bb-generated-images-thumbnail],
    [data-bb-generated-images-preview-close],
    [data-bb-generated-images-preview-nav],
    [data-bb-generated-images-preview-control],
    [data-bb-generated-images-preview-menu] button {
      appearance: none;
      border: 0;
      color: inherit;
      font: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }
    [data-bb-generated-images-title] {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      min-inline-size: 0;
      min-block-size: 2rem;
      padding: 0 0.35rem;
      gap: 0.45rem;
      overflow: hidden;
      border-radius: 0.45rem;
      background: transparent;
      text-align: start;
    }
    [data-bb-generated-images-title]:hover,
    [data-bb-generated-images-title]:focus-visible,
    [data-bb-generated-images-icon-control]:hover,
    [data-bb-generated-images-icon-control]:focus-visible,
    [data-bb-generated-images-chip]:hover,
    [data-bb-generated-images-chip]:focus-visible,
    [data-bb-generated-images-thumbnail]:hover,
    [data-bb-generated-images-thumbnail]:focus-visible,
    [data-bb-generated-images-preview-close]:hover,
    [data-bb-generated-images-preview-close]:focus-visible,
    [data-bb-generated-images-preview-nav]:hover,
    [data-bb-generated-images-preview-nav]:focus-visible,
    [data-bb-generated-images-preview-control]:hover,
    [data-bb-generated-images-preview-control]:focus-visible,
    [data-bb-generated-images-preview-menu] button:hover,
    [data-bb-generated-images-preview-menu] button:focus-visible {
      outline: none;
      background: color-mix(in oklab, var(--foreground) 8%, transparent);
    }
    [data-bb-generated-images-title]:focus-visible,
    [data-bb-generated-images-icon-control]:focus-visible,
    [data-bb-generated-images-chip]:focus-visible,
    [data-bb-generated-images-thumbnail]:focus-visible,
    [data-bb-generated-images-preview-close]:focus-visible,
    [data-bb-generated-images-preview-nav]:focus-visible,
    [data-bb-generated-images-preview-control]:focus-visible,
    [data-bb-generated-images-preview-menu] button:focus-visible {
      box-shadow: 0 0 0 2px color-mix(in oklab, var(--foreground) 45%, transparent);
    }
    [data-bb-generated-images-title] svg,
    [data-bb-generated-images-icon-control] svg,
    [data-bb-generated-images-chip] svg {
      flex: 0 0 auto;
      inline-size: 1rem;
      block-size: 1rem;
    }
    [data-bb-generated-images-label] {
      overflow: hidden;
      color: var(--foreground);
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    [data-bb-generated-images-count] {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      min-inline-size: 1.3rem;
      min-block-size: 1.25rem;
      padding-inline: 0.3rem;
      border-radius: 999px;
      background: var(--surface-recessed-solid);
      color: var(--muted-foreground);
      font-size: 0.7rem;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    [data-bb-generated-images-icon-control] {
      display: inline-grid;
      flex: 0 0 auto;
      inline-size: 2rem;
      block-size: 2rem;
      place-items: center;
      border-radius: 0.45rem;
      background: transparent;
      color: var(--muted-foreground);
    }
    [data-bb-generated-images-icon-control] svg {
      inline-size: 0.95rem;
      block-size: 0.95rem;
    }
    [data-bb-generated-images-thumbnails] {
      display: flex;
      gap: 0.5rem;
      max-inline-size: 100%;
      padding: 0 0.5rem 0.55rem;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scrollbar-width: thin;
      scroll-snap-type: inline proximity;
    }
    [data-bb-generated-images-thumbnail] {
      display: block;
      flex: 0 0 4.5rem;
      inline-size: 4.5rem;
      block-size: 4.5rem;
      padding: 0;
      overflow: hidden;
      border: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent);
      border-radius: 0.5rem;
      background: var(--surface-recessed-solid);
      scroll-snap-align: start;
    }
    [data-bb-generated-images-thumbnail] img {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      object-fit: contain;
    }
    [data-bb-generated-images-chip] {
      display: inline-flex;
      align-items: center;
      min-block-size: 2rem;
      padding: 0.35rem 0.55rem;
      gap: 0.4rem;
      border: 1px solid var(--border-seam);
      border-radius: 999px;
      background: var(--canvas);
      color: var(--muted-foreground);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
    }
    [data-bb-generated-images-chip] [data-bb-generated-images-count] {
      min-inline-size: auto;
      min-block-size: auto;
      padding: 0;
      background: transparent;
      color: inherit;
    }
    dialog[${PREVIEW_ATTRIBUTE}] {
      position: fixed;
      inset: 0;
      margin: auto;
      box-sizing: border-box;
      inline-size: min(82vw, 48rem);
      block-size: min(78vh, 36rem);
      max-inline-size: calc(100vw - 2rem);
      max-block-size: calc(100vh - 2rem);
      min-block-size: 0;
      padding: 0;
      overflow: hidden;
      color: var(--foreground);
      border: 1px solid var(--border-seam);
      border-radius: 0.85rem;
      background: var(--canvas);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
    }
    dialog[${PREVIEW_ATTRIBUTE}]::backdrop {
      background: color-mix(in oklab, var(--canvas) 72%, transparent);
    }
    [data-bb-generated-images-preview-toolbar] {
      position: relative;
      display: flex;
      align-items: center;
      min-block-size: 2.75rem;
      padding: 0.25rem 0.35rem 0.25rem 0.8rem;
      gap: 0.5rem;
      border-block-end: 1px solid var(--border-seam);
    }
    [data-bb-generated-images-preview-control] {
      display: inline-grid;
      flex: 0 0 auto;
      inline-size: 2.75rem;
      block-size: 2.75rem;
      place-items: center;
      border-radius: 0.5rem;
      background: transparent;
      color: var(--foreground);
    }
    [data-bb-generated-images-preview-control] svg {
      inline-size: 1rem;
      block-size: 1rem;
    }
    [data-bb-generated-images-preview-control]:disabled {
      cursor: default;
      opacity: 0.38;
    }
    [data-bb-generated-images-preview-zoom-group] {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.1rem;
      padding: 0.1rem;
      border: 1px solid var(--border-seam);
      border-radius: 0.6rem;
      background: var(--surface-recessed-solid);
    }
    [data-bb-generated-images-preview-zoom-reset] {
      min-inline-size: 3.75rem;
      padding-inline: 0.35rem;
      color: var(--muted-foreground);
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    [data-bb-generated-images-preview-status] {
      min-inline-size: 0;
      max-inline-size: 9rem;
      overflow: hidden;
      color: var(--muted-foreground);
      font-size: 0.7rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    [data-bb-generated-images-preview-menu] {
      position: absolute;
      inset-block-start: calc(100% + 0.25rem);
      inset-inline-end: 0.35rem;
      z-index: 2;
      min-inline-size: 14rem;
      padding: 0.3rem;
      border: 1px solid var(--border-seam);
      border-radius: 0.6rem;
      background: var(--canvas);
      color: var(--foreground);
    }
    [data-bb-generated-images-preview-menu][hidden] {
      display: none;
    }
    [data-bb-generated-images-preview-menu] button {
      display: flex;
      align-items: center;
      inline-size: 100%;
      min-block-size: 2.75rem;
      padding: 0.35rem 0.5rem;
      gap: 0.55rem;
      border-radius: 0.45rem;
      background: transparent;
      text-align: start;
    }
    [data-bb-generated-images-preview-menu] button svg {
      flex: 0 0 auto;
      inline-size: 1rem;
      block-size: 1rem;
    }
    [data-bb-generated-images-preview-title] {
      min-inline-size: 0;
      flex: 1 1 auto;
      color: var(--foreground);
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    [data-bb-generated-images-preview-counter] {
      flex: 0 0 auto;
      color: var(--muted-foreground);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    [data-bb-generated-images-preview-stage] {
      display: grid;
      place-items: center;
      min-block-size: 0;
      padding: 0.85rem 3.5rem;
      overflow: hidden;
      cursor: zoom-in;
      touch-action: none;
      user-select: none;
    }
    [data-bb-generated-images-preview-stage][data-zoomed="true"] {
      cursor: grab;
    }
    [data-bb-generated-images-preview-stage][data-panning="true"] {
      cursor: grabbing;
    }
    [data-bb-generated-images-preview-stage] img {
      display: block;
      inline-size: auto;
      block-size: auto;
      max-inline-size: 100%;
      max-block-size: calc(min(78vh, 36rem) - 9rem);
      border-radius: 0.55rem;
      object-fit: contain;
      transform: translate3d(
        var(--bb-generated-image-pan-x, 0px),
        var(--bb-generated-image-pan-y, 0px),
        0
      ) scale(var(--bb-generated-image-zoom, 1));
      transform-origin: center;
      user-select: none;
      -webkit-user-drag: none;
      will-change: transform;
      transition: transform 180ms ease-out;
    }
    [data-bb-generated-images-preview-footer] {
      display: flex;
      align-items: center;
      justify-content: center;
      min-block-size: 3.5rem;
      padding: 0.45rem 0.75rem 0.65rem;
      gap: 0.75rem;
      border-block-start: 1px solid var(--border-seam);
    }
    [data-bb-generated-images-preview-nav] {
      display: grid;
      inline-size: 2.75rem;
      block-size: 2.75rem;
      place-items: center;
      border-radius: 0.55rem;
      background: transparent;
      color: var(--foreground);
    }
    [data-bb-generated-images-preview-nav] svg {
      inline-size: 1.05rem;
      block-size: 1.05rem;
    }
    [data-bb-generated-images-preview-nav]:disabled {
      cursor: default;
      opacity: 0.38;
    }
    [data-bb-generated-images-preview-close] {
      display: grid;
      flex: 0 0 auto;
      inline-size: 2.75rem;
      block-size: 2.75rem;
      place-items: center;
      border-radius: 0.5rem;
      background: transparent;
      color: var(--muted-foreground);
    }
    [data-bb-generated-images-preview-close] svg {
      inline-size: 1rem;
      block-size: 1rem;
    }
    @media (max-width: 34rem) {
      [${RAIL_ATTRIBUTE}] {
        inline-size: calc(100% - 1rem);
      }
      [data-bb-generated-images-thumbnail] {
        flex-basis: 4rem;
        inline-size: 4rem;
        block-size: 4rem;
      }
      dialog[${PREVIEW_ATTRIBUTE}] {
        inline-size: calc(100vw - 1rem);
        block-size: min(76vh, 32rem);
      }
      [data-bb-generated-images-preview-stage] {
        padding-inline: 2.75rem;
      }
      [data-bb-generated-images-preview-stage] img {
        max-block-size: calc(min(76vh, 32rem) - 9rem);
      }
      [data-bb-generated-images-preview-toolbar] {
        padding-inline-start: 0.45rem;
        gap: 0.2rem;
      }
      [data-bb-generated-images-preview-title] {
        font-size: 0.75rem;
      }
      [data-bb-generated-images-preview-status] {
        display: none;
      }
      [data-bb-generated-images-preview-zoom-reset] {
        min-inline-size: 3.2rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      [${RAIL_ATTRIBUTE}],
      [data-bb-generated-images-preview-stage] img {
        transition: none;
      }
    }
  `;
  (document.head ?? document.documentElement).append(style);
  return style;
}

function messageElement(container: HTMLElement): HTMLElement | undefined {
  if (container.classList.contains("group/message")) {
    return container;
  }
  return Array.from(container.querySelectorAll<HTMLElement>("*")).find(
    (element) => element.classList.contains("group/message"),
  );
}

function messageColumns(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-message-column]"),
  );
}

function latestConversationAnchor(): HTMLElement | null {
  // Recent BB clients expose a stable timeline-row wrapper. Insert after that
  // wrapper, rather than the thread window, so the tray remains in timeline
  // flow above the sticky composer.
  const timelineRows = Array.from(
    document.querySelectorAll<HTMLElement>("[data-timeline-row-id]"),
  );
  const assistantRows = timelineRows.filter((row) => {
    const message = messageElement(row);
    return Boolean(message && !message.classList.contains("ml-auto"));
  });
  if (assistantRows.length > 0) {
    return assistantRows.at(-1) ?? null;
  }

  // BB versions before timeline-row ids retain the message-column marker.
  // Keeping this fallback makes the plugin compatible with both shapes.
  const columns = messageColumns();
  const assistantColumns = columns.filter((column) => {
    const message = messageElement(column);
    return Boolean(message && !message.classList.contains("ml-auto"));
  });
  return assistantColumns.at(-1) ?? columns.at(-1) ?? null;
}

function removeRail(): void {
  document.querySelector(`[${RAIL_ATTRIBUTE}]`)?.remove();
}

function removePreview(): void {
  const preview = document.querySelector<HTMLDialogElement>(
    `dialog[${PREVIEW_ATTRIBUTE}]`,
  );
  if (!preview) {
    return;
  }
  if (preview.open) {
    preview.close();
  }
  preview.remove();
}

function openPreview(
  images: readonly GeneratedImageSummary[],
  initialIndex: number,
  pluginId: string,
): void {
  if (images.length === 0) {
    return;
  }

  removePreview();

  const dialog = document.createElement("dialog");
  dialog.setAttribute(PREVIEW_ATTRIBUTE, "true");
  dialog.setAttribute("aria-label", "Generated image preview");
  dialog.dataset.previewIndex = String(
    Math.max(0, Math.min(initialIndex, images.length - 1)),
  );

  const toolbar = document.createElement("div");
  toolbar.setAttribute("data-bb-generated-images-preview-toolbar", "");
  const title = document.createElement("div");
  title.setAttribute("data-bb-generated-images-preview-title", "");
  title.textContent = "Generated image";
  const status = document.createElement("span");
  status.setAttribute("data-bb-generated-images-preview-status", "");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const counter = document.createElement("div");
  counter.setAttribute("data-bb-generated-images-preview-counter", "");
  counter.setAttribute("aria-live", "polite");

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let statusTimer: number | undefined;

  const stage = document.createElement("div");
  stage.setAttribute("data-bb-generated-images-preview-stage", "");
  stage.setAttribute("tabindex", "0");
  stage.setAttribute(
    "aria-label",
    "Image canvas. Use the mouse wheel to zoom and drag to pan.",
  );
  const element = document.createElement("img");
  stage.append(element);

  const applyZoom = (): void => {
    stage.dataset.zoomed = String(zoom > 1);
    stage.dataset.panning = "false";
    stage.dataset.zoom = String(zoom);
    stage.style.setProperty("--bb-generated-image-zoom", String(zoom));
    stage.style.setProperty("--bb-generated-image-pan-x", `${panX}px`);
    stage.style.setProperty("--bb-generated-image-pan-y", `${panY}px`);
    zoomReset.textContent = `${Math.round(zoom * 100)}%`;
    zoomReset.setAttribute(
      "aria-label",
      `Reset image zoom, currently ${Math.round(zoom * 100)} percent`,
    );
    zoomOut.disabled = zoom <= MIN_ZOOM;
    zoomIn.disabled = zoom >= MAX_ZOOM;
  };

  const resetZoom = (): void => {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyZoom();
  };

  const setZoom = (nextZoom: number, anchorX = 0, anchorY = 0): void => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    if (clampedZoom === zoom) {
      return;
    }
    if (clampedZoom <= 1) {
      panX = 0;
      panY = 0;
    } else if (zoom > 0) {
      panX += anchorX * (1 - clampedZoom / zoom);
      panY += anchorY * (1 - clampedZoom / zoom);
    }
    zoom = clampedZoom;
    applyZoom();
  };

  const announce = (message: string): void => {
    status.textContent = message;
    if (statusTimer !== undefined) {
      window.clearTimeout(statusTimer);
    }
    statusTimer = window.setTimeout(() => {
      status.textContent = "";
      statusTimer = undefined;
    }, 3500);
  };

  const currentImage = (): GeneratedImageSummary => images[index];

  const copyCurrentImage = async (): Promise<void> => {
    const image = currentImage();
    const imageUrl = new URL(image.url, window.location.href).href;
    try {
      const response = await fetch(image.url, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`Image request failed with ${response.status}`);
      }
      const blob = await response.blob();
      const clipboard = navigator.clipboard;
      const ClipboardItemConstructor = globalThis.ClipboardItem;
      if (clipboard?.write && ClipboardItemConstructor) {
        await clipboard.write([
          new ClipboardItemConstructor({
            [blob.type || image.mimeType]: blob,
          }),
        ]);
        announce("Image copied");
        return;
      }
      if (clipboard?.writeText) {
        await clipboard.writeText(imageUrl);
        announce("Image link copied");
        return;
      }
      throw new Error("Clipboard is unavailable");
    } catch {
      // Some browsers reject clipboard writes after the image fetch has
      // resolved. A native selection copy keeps the link action useful.
      if (copyTextFallback(imageUrl)) {
        announce("Image link copied");
        return;
      }
      announce("Copy unavailable");
    }
  };

  const downloadCurrentImage = (): void => {
    const image = currentImage();
    const extension = image.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const link = document.createElement("a");
    link.href = image.url;
    link.download = `generated-image-${index + 1}.${extension}`;
    link.rel = "noreferrer";
    link.click();
    announce("Download started");
  };

  const revealCurrentImage = async (): Promise<void> => {
    const threadId = currentThreadId();
    if (!threadId) {
      announce("Cannot locate this thread");
      return;
    }
    try {
      const response = await fetch(
        `${window.location.origin}/api/v1/plugins/${encodeURIComponent(pluginId)}/http/reveal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ threadId, itemId: currentImage().itemId }),
        },
      );
      let payload: { error?: string } = {};
      try {
        payload = (await response.json()) as { error?: string };
      } catch {
        // The status code still gives us enough information for the fallback.
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Finder reveal failed");
      }
      announce("Opened in Finder");
    } catch {
      announce("Finder reveal unavailable");
    }
  };

  const zoomGroup = document.createElement("div");
  zoomGroup.setAttribute("data-bb-generated-images-preview-zoom-group", "");
  const zoomOut = createButton("zoom-out", "Zoom out", () => {
    setZoom(zoom - ZOOM_STEP);
  });
  zoomOut.setAttribute("data-bb-generated-images-preview-control", "");
  appendIcon(zoomOut, "minus");
  const zoomReset = createButton("zoom-reset", "Reset image zoom", resetZoom);
  zoomReset.setAttribute("data-bb-generated-images-preview-control", "");
  zoomReset.setAttribute("data-bb-generated-images-preview-zoom-reset", "");
  const zoomIn = createButton("zoom-in", "Zoom in", () => {
    setZoom(zoom + ZOOM_STEP);
  });
  zoomIn.setAttribute("data-bb-generated-images-preview-control", "");
  appendIcon(zoomIn, "plus");
  zoomGroup.append(zoomOut, zoomReset, zoomIn);

  const menu = document.createElement("div");
  menu.setAttribute("data-bb-generated-images-preview-menu", "");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Image actions");
  menu.hidden = true;
  const menuToggle = createButton("preview-menu", "More image actions", () => {
    menu.hidden = !menu.hidden;
    menuToggle.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden) {
      menu.querySelector<HTMLButtonElement>("button")?.focus();
    }
  });
  menuToggle.setAttribute("data-bb-generated-images-preview-control", "");
  menuToggle.setAttribute("aria-haspopup", "menu");
  menuToggle.setAttribute("aria-expanded", "false");
  appendIcon(menuToggle, "ellipsis");

  const addMenuItem = (
    action: string,
    label: string,
    icon: IconName,
    handler: () => void | Promise<void>,
  ): void => {
    const item = createButton(action, label, () => {
      menu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      void handler();
    });
    item.setAttribute("role", "menuitem");
    appendIcon(item, icon);
    const text = document.createElement("span");
    text.textContent = label;
    item.append(text);
    menu.append(item);
  };
  addMenuItem("preview-copy", "Copy image", "copy", copyCurrentImage);
  addMenuItem("preview-download", "Download image", "download", downloadCurrentImage);
  addMenuItem("preview-reveal", "Open in Finder", "folder", revealCurrentImage);

  const close = createButton("preview-close", "Close image preview", () => {
    dialog.close();
  });
  close.setAttribute("data-bb-generated-images-preview-control", "");
  close.setAttribute("data-bb-generated-images-preview-close", "");
  appendIcon(close, "x");
  toolbar.append(title, status, counter, zoomGroup, menuToggle, close, menu);

  let navigate = (_delta: number): void => {};

  const footer = document.createElement("div");
  footer.setAttribute("data-bb-generated-images-preview-footer", "");
  const previous = createButton(
    "preview-previous",
    "Previous generated image",
    () => navigate(-1),
  );
  previous.setAttribute("data-bb-generated-images-preview-control", "");
  previous.setAttribute("data-bb-generated-images-preview-nav", "");
  appendIcon(previous, "chevron-left");
  const next = createButton(
    "preview-next",
    "Next generated image",
    () => navigate(1),
  );
  next.setAttribute("data-bb-generated-images-preview-control", "");
  next.setAttribute("data-bb-generated-images-preview-nav", "");
  appendIcon(next, "chevron-right");
  previous.disabled = images.length < 2;
  next.disabled = images.length < 2;
  footer.append(previous, counter.cloneNode(true), next);

  let index = Math.max(0, Math.min(initialIndex, images.length - 1));
  const updatePreview = (): void => {
    const image = images[index];
    element.src = image.url;
    element.alt = image.revisedPrompt
      ? `Generated image ${index + 1} of ${images.length}: ${image.revisedPrompt}`
      : `Generated image ${index + 1} of ${images.length}`;
    counter.textContent = `${index + 1} / ${images.length}`;
    const footerCounter = footer.querySelector<HTMLElement>(
      `[data-bb-generated-images-preview-counter]`,
    );
    if (footerCounter) {
      footerCounter.textContent = counter.textContent;
      footerCounter.setAttribute("aria-live", "polite");
    }
    dialog.dataset.previewIndex = String(index);
    resetZoom();
  };
  navigate = (delta: number): void => {
    if (images.length < 2) {
      return;
    }
    index = (index + delta + images.length) % images.length;
    menu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    updatePreview();
  };

  let dragging = false;
  let pointerId: number | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;
  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    const anchorX = event.clientX - (rect.left + rect.width / 2);
    const anchorY = event.clientY - (rect.top + rect.height / 2);
    setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), anchorX, anchorY);
  }, { passive: false });
  stage.addEventListener("dblclick", (event) => {
    const rect = stage.getBoundingClientRect();
    const anchorX = event.clientX - (rect.left + rect.width / 2);
    const anchorY = event.clientY - (rect.top + rect.height / 2);
    setZoom(zoom > 1 ? 1 : 2, anchorX, anchorY);
  });
  stage.addEventListener("pointerdown", (event) => {
    if (zoom <= 1 || event.button !== 0) {
      return;
    }
    dragging = true;
    pointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = panX;
    dragOriginY = panY;
    stage.dataset.panning = "true";
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  stage.addEventListener("pointermove", (event) => {
    if (!dragging || pointerId !== event.pointerId) {
      return;
    }
    panX = dragOriginX + event.clientX - dragStartX;
    panY = dragOriginY + event.clientY - dragStartY;
    applyZoom();
    stage.dataset.panning = "true";
  });
  const stopDragging = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) {
      return;
    }
    dragging = false;
    pointerId = null;
    stage.dataset.panning = "false";
    stage.releasePointerCapture?.(event.pointerId);
  };
  stage.addEventListener("pointerup", stopDragging);
  stage.addEventListener("pointercancel", stopDragging);
  stage.addEventListener("lostpointercapture", stopDragging);

  updatePreview();
  dialog.append(toolbar, stage, footer);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    } else if (
      event.target &&
      !menu.contains(event.target as Node) &&
      event.target !== menuToggle
    ) {
      menu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigate(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigate(1);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(zoom + ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom(zoom - ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      resetZoom();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (statusTimer !== undefined) {
      window.clearTimeout(statusTimer);
    }
    dialog.remove();
  }, { once: true });
  document.body.append(dialog);

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    close.focus();
  } else {
    window.open(images[index].url, "_blank", "noopener,noreferrer");
    dialog.remove();
  }
}

function placeRail(rail: HTMLElement): void {
  const target = latestConversationAnchor();
  if (target) {
    if (rail.previousElementSibling !== target) {
      target.insertAdjacentElement("afterend", rail);
    }
    return;
  }

  const threadWindow = document.querySelector<HTMLElement>("[data-thread-window]");
  if (threadWindow && rail.parentElement !== threadWindow) {
    threadWindow.append(rail);
  }
}

function railIsPlaced(): boolean {
  const rail = document.querySelector<HTMLElement>(`[${RAIL_ATTRIBUTE}]`);
  const target = latestConversationAnchor();
  return Boolean(rail && (!target || rail.previousElementSibling === target));
}

function renderRail({
  images,
  mode,
  threadId,
  onModeChange,
}: {
  images: readonly GeneratedImageSummary[];
  mode: TrayMode;
  threadId: string;
  onModeChange: (mode: TrayMode) => void;
}): void {
  if (images.length === 0) {
    removeRail();
    return;
  }

  let rail = document.querySelector<HTMLElement>(`[${RAIL_ATTRIBUTE}]`);
  if (!rail) {
    rail = document.createElement("section");
    rail.setAttribute(RAIL_ATTRIBUTE, "true");
    rail.setAttribute("aria-label", "Generated images");
  }
  rail.dataset.threadId = threadId;
  rail.dataset.mode = mode;
  rail.replaceChildren();

  if (mode === "dismissed") {
    const restore = createButton(
      "restore",
      `Show ${images.length} generated image${images.length === 1 ? "" : "s"}`,
      () => onModeChange("expanded"),
    );
    restore.setAttribute("data-bb-generated-images-chip", "");
    appendIcon(restore, "image");
    const label = document.createElement("span");
    label.textContent = "Images";
    const count = document.createElement("span");
    count.setAttribute("data-bb-generated-images-count", "");
    count.textContent = String(images.length);
    restore.append(label, count);
    rail.append(restore);
    placeRail(rail);
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.setAttribute("data-bb-generated-images-toolbar", "");
  const toggle = createButton(
    "toggle",
    mode === "expanded" ? "Collapse generated images" : "Expand generated images",
    () => onModeChange(mode === "expanded" ? "collapsed" : "expanded"),
  );
  toggle.setAttribute("data-bb-generated-images-title", "");
  toggle.setAttribute("aria-expanded", String(mode === "expanded"));
  appendIcon(toggle, "image");
  const label = document.createElement("span");
  label.setAttribute("data-bb-generated-images-label", "");
  label.textContent = "Generated images";
  const count = document.createElement("span");
  count.setAttribute("data-bb-generated-images-count", "");
  count.textContent = String(images.length);
  toggle.append(label, count);
  appendIcon(toggle, mode === "expanded" ? "chevron-up" : "chevron-down");

  const dismiss = createButton("dismiss", "Dismiss generated images", () => {
    onModeChange("dismissed");
  });
  dismiss.setAttribute("data-bb-generated-images-icon-control", "");
  dismiss.title = "Dismiss generated images";
  appendIcon(dismiss, "x");
  toolbar.append(toggle, dismiss);
  rail.append(toolbar);

  if (mode === "expanded") {
    const thumbnails = document.createElement("div");
    thumbnails.setAttribute("data-bb-generated-images-thumbnails", "");
    for (const [index, image] of images.entries()) {
      const thumbnail = createButton(
        `open-${image.itemId}`,
        `Open generated image ${index + 1}`,
        () => requestGeneratedImagesPanel(index),
      );
      thumbnail.setAttribute("data-bb-generated-images-thumbnail", "");
      const element = document.createElement("img");
      element.src = image.url;
      element.alt = `Generated image ${index + 1}`;
      element.loading = "lazy";
      element.decoding = "async";
      element.title = image.revisedPrompt ?? "Generated image";
      thumbnail.append(element);
      thumbnails.append(thumbnail);
    }
    rail.append(thumbnails);
  }

  placeRail(rail);
}

export function mountGeneratedImages({
  pluginId,
  signal,
}: {
  pluginId: string;
  signal: AbortSignal;
}): () => void {
  const style = installStyles();
  const endpoint = `${window.location.origin}/api/v1/plugins/${encodeURIComponent(pluginId)}/http/images`;
  let disposed = false;
  let refreshTimer: number | undefined;
  let scheduledRefresh: number | undefined;
  let requestCounter = 0;
  let threadId: string | null = null;
  let images: GeneratedImageSummary[] = [];
  let mode: TrayMode = "expanded";
  let lastSignature = "";

  const renderCurrentTray = (): void => {
    if (!threadId || images.length === 0) {
      removeRail();
      return;
    }
    renderRail({
      images,
      mode,
      threadId,
      onModeChange: (nextMode) => {
        if (!threadId) {
          return;
        }
        mode = nextMode;
        saveTrayMode(threadId, mode);
        renderCurrentTray();
      },
    });
  };

  const refresh = async (): Promise<void> => {
    const requestId = ++requestCounter;
    const nextThreadId = currentThreadId();
    if (!nextThreadId) {
      threadId = null;
      images = [];
      lastSignature = "";
      removeRail();
      return;
    }

    if (threadId !== nextThreadId) {
      threadId = nextThreadId;
      images = [];
      mode = readTrayMode(nextThreadId);
      lastSignature = "";
      removeRail();
    }

    try {
      const response = await fetch(
        `${endpoint}?threadId=${encodeURIComponent(nextThreadId)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          signal,
        },
      );
      if (!response.ok || disposed || requestId !== requestCounter) {
        return;
      }

      const payload = (await response.json()) as GeneratedImagesResponse;
      const nextImages = Array.isArray(payload.images) ? payload.images : [];
      const nextSignature = nextImages
        .map((image) => `${image.itemId}:${image.seq}:${image.url}`)
        .join("|");
      images = nextImages;

      const rail = document.querySelector<HTMLElement>(`[${RAIL_ATTRIBUTE}]`);
      const needsRender =
        nextSignature !== lastSignature ||
        !rail ||
        rail.dataset.threadId !== nextThreadId ||
        rail.dataset.mode !== mode ||
        !railIsPlaced();
      lastSignature = nextSignature;
      if (needsRender) {
        renderCurrentTray();
      }
    } catch {
      // The app can briefly navigate or restart the plugin while this poll is
      // in flight. The next refresh will retry without surfacing noise.
    }
  };

  const scheduleRefresh = (): void => {
    if (disposed || scheduledRefresh !== undefined) {
      return;
    }
    scheduledRefresh = window.setTimeout(() => {
      scheduledRefresh = undefined;
      void refresh();
    }, 250);
  };

  const observer = new MutationObserver((mutations) => {
    if (
      mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement && !node.closest(`[${RAIL_ATTRIBUTE}]`),
        ),
      )
    ) {
      scheduleRefresh();
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  const onRouteChange = (): void => scheduleRefresh();
  window.addEventListener("popstate", onRouteChange);
  window.addEventListener("hashchange", onRouteChange);
  refreshTimer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
  void refresh();

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    requestCounter += 1;
    observer.disconnect();
    window.removeEventListener("popstate", onRouteChange);
    window.removeEventListener("hashchange", onRouteChange);
    if (refreshTimer !== undefined) {
      window.clearInterval(refreshTimer);
    }
    if (scheduledRefresh !== undefined) {
      window.clearTimeout(scheduledRefresh);
    }
    removePreview();
    removeRail();
    if (style.parentNode) {
      style.remove();
    }
  };

  signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}
