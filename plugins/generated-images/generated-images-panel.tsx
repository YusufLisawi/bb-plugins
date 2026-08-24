import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useBbNavigate } from "@get-bb/plugin-sdk/app";
import {
  GENERATED_IMAGES_OPEN_PANEL_EVENT,
  generatedImagesPendingIndexKey,
  type GeneratedImageSummary,
  type GeneratedImagesResponse,
} from "./shared.ts";

export const GENERATED_IMAGES_PANEL_ID = "generated-images";
const PLUGIN_ID = "generated-images";
const REFRESH_INTERVAL_MS = 2500;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type PanelIconName =
  | "chevron-left"
  | "chevron-right"
  | "copy"
  | "download"
  | "ellipsis"
  | "folder"
  | "image"
  | "minus"
  | "plus";

type OpenPanelDetail = {
  threadId: string;
  index: number;
};

const PANEL_ICON_PATHS: Record<PanelIconName, readonly string[]> = {
  "chevron-left": ["m14 6-6 6 6 6"],
  "chevron-right": ["m10 6 6 6-6 6"],
  copy: [
    "M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z",
    "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2",
  ],
  download: ["M12 4v10", "m7 10 5 5 5-5", "M5 20h14"],
  ellipsis: ["M5 12h.01M12 12h.01M19 12h.01"],
  folder: [
    "M3.5 7.5A1.5 1.5 0 0 1 5 6h5l2 2h7a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5z",
  ],
  image: [
    "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z",
    "m4 15 4.1-4.1a1 1 0 0 1 1.4 0l2.6 2.6 2-2a1 1 0 0 1 1.4 0L20 16",
    "M15.5 8.5h.01",
  ],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
};

function PanelIcon({ name }: { name: PanelIconName }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      className="bb-generated-images-panel-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {PANEL_ICON_PATHS[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

function isOpenPanelDetail(value: unknown): value is OpenPanelDetail {
  if (!value || typeof value !== "object") {
    return false;
  }
  const detail = value as Partial<OpenPanelDetail>;
  return (
    typeof detail.threadId === "string" &&
    typeof detail.index === "number" &&
    Number.isFinite(detail.index)
  );
}

function parseIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return null;
}

function readInitialIndex(threadId: string, params: unknown): number {
  let parameterIndex: number | null = null;
  if (params && typeof params === "object") {
    parameterIndex = parseIndex((params as { index?: unknown }).index);
  }

  try {
    const pendingKey = generatedImagesPendingIndexKey(threadId);
    const pendingIndex = parseIndex(window.sessionStorage.getItem(pendingKey));
    if (pendingIndex !== null) {
      window.sessionStorage.removeItem(pendingKey);
      return pendingIndex;
    }
  } catch {
    // The panel still opens at the first image when browser storage is blocked.
  }

  return parameterIndex ?? 0;
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

export function GeneratedImagesHeaderBridge({
  threadId,
}: {
  threadId: string;
}): null {
  const { openThreadPanel } = useBbNavigate();

  useEffect(() => {
    const onOpenPanel = (event: Event): void => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isOpenPanelDetail(detail) || detail.threadId !== threadId) {
        return;
      }

      try {
        window.sessionStorage.setItem(
          generatedImagesPendingIndexKey(threadId),
          String(Math.max(0, Math.floor(detail.index))),
        );
      } catch {
        // The content script already sent the event; the panel can still use it
        // directly when storage is unavailable.
      }

      openThreadPanel({
        actionId: GENERATED_IMAGES_PANEL_ID,
        title: "Generated images",
        params: {},
      });
    };

    window.addEventListener(GENERATED_IMAGES_OPEN_PANEL_EVENT, onOpenPanel);
    return () => {
      window.removeEventListener(
        GENERATED_IMAGES_OPEN_PANEL_EVENT,
        onOpenPanel,
      );
    };
  }, [openThreadPanel, threadId]);

  return null;
}

export function GeneratedImagesPanel({
  threadId,
  params,
}: {
  threadId: string;
  params: unknown;
}): ReactElement {
  const initialIndexRef = useRef<number | undefined>(undefined);
  if (initialIndexRef.current === undefined) {
    initialIndexRef.current = readInitialIndex(threadId, params);
  }

  const [images, setImages] = useState<GeneratedImageSummary[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef(images);
  const activeItemIdRef = useRef(activeItemId);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const statusTimerRef = useRef<number | undefined>(undefined);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  imagesRef.current = images;
  activeItemIdRef.current = activeItemId;
  zoomRef.current = zoom;
  panRef.current = pan;

  const endpoint = `${window.location.origin}/api/v1/plugins/${encodeURIComponent(PLUGIN_ID)}/http/images`;

  useEffect(() => {
    let disposed = false;
    let requestController: AbortController | undefined;

    const loadImages = async (): Promise<void> => {
      requestController?.abort();
      requestController = new AbortController();
      try {
        const response = await fetch(
          `${endpoint}?threadId=${encodeURIComponent(threadId)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: requestController.signal,
          },
        );
        if (!response.ok) {
          throw new Error(`Image request failed with ${response.status}`);
        }
        const payload = (await response.json()) as GeneratedImagesResponse;
        if (!disposed) {
          setImages(Array.isArray(payload.images) ? payload.images : []);
          setLoadError(null);
        }
      } catch (error) {
        if (
          !disposed &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setLoadError("Images could not be loaded right now.");
        }
      }
    };

    void loadImages();
    const timer = window.setInterval(() => void loadImages(), REFRESH_INTERVAL_MS);
    return () => {
      disposed = true;
      requestController?.abort();
      window.clearInterval(timer);
    };
  }, [endpoint, threadId]);

  useEffect(() => {
    if (images.length === 0) {
      setActiveItemId(null);
      return;
    }

    setActiveItemId((current) => {
      if (current && images.some((image) => image.itemId === current)) {
        return current;
      }
      const requestedIndex = Math.min(
        initialIndexRef.current ?? 0,
        images.length - 1,
      );
      return images[Math.max(0, requestedIndex)].itemId;
    });
  }, [images]);

  useEffect(() => {
    const onOpenPanel = (event: Event): void => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isOpenPanelDetail(detail) || detail.threadId !== threadId) {
        return;
      }
      const requestedIndex = Math.max(0, Math.floor(detail.index));
      initialIndexRef.current = requestedIndex;
      const image = imagesRef.current[requestedIndex];
      if (image) {
        activeItemIdRef.current = image.itemId;
        setActiveItemId(image.itemId);
      }
    };

    window.addEventListener(GENERATED_IMAGES_OPEN_PANEL_EVENT, onOpenPanel);
    return () => {
      window.removeEventListener(
        GENERATED_IMAGES_OPEN_PANEL_EVENT,
        onOpenPanel,
      );
    };
  }, [threadId]);

  const activeIndex = useMemo(() => {
    const index = activeItemId
      ? images.findIndex((image) => image.itemId === activeItemId)
      : -1;
    if (index >= 0) {
      return index;
    }
    return images.length > 0
      ? Math.min(initialIndexRef.current ?? 0, images.length - 1)
      : 0;
  }, [activeItemId, images]);
  const activeImage = images[activeIndex] ?? null;

  useEffect(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMenuOpen(false);
  }, [activeImage?.itemId]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== undefined) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onOutsidePointerDown = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onOutsidePointerDown);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointerDown);
    };
  }, [menuOpen]);

  const announce = (message: string): void => {
    setStatusMessage(message);
    if (statusTimerRef.current !== undefined) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage("");
      statusTimerRef.current = undefined;
    }, 3200);
  };

  const resetViewer = (): void => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const updateZoom = (nextZoom: number, anchorX = 0, anchorY = 0): void => {
    const currentZoom = zoomRef.current;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    if (clampedZoom === currentZoom) {
      return;
    }

    let nextPan = panRef.current;
    if (clampedZoom <= 1) {
      nextPan = { x: 0, y: 0 };
    } else if (currentZoom > 0) {
      nextPan = {
        x: nextPan.x + anchorX * (1 - clampedZoom / currentZoom),
        y: nextPan.y + anchorY * (1 - clampedZoom / currentZoom),
      };
    }

    zoomRef.current = clampedZoom;
    panRef.current = nextPan;
    setZoom(clampedZoom);
    setPan(nextPan);
  };

  const selectImage = (index: number): void => {
    const image = images[index];
    if (!image) {
      return;
    }
    activeItemIdRef.current = image.itemId;
    setActiveItemId(image.itemId);
    resetViewer();
    setMenuOpen(false);
  };

  const navigateImage = (delta: number): void => {
    if (images.length < 2) {
      return;
    }
    selectImage((activeIndex + delta + images.length) % images.length);
  };

  const copyActiveImage = async (): Promise<void> => {
    if (!activeImage) {
      return;
    }
    const imageUrl = new URL(activeImage.url, window.location.href).href;
    const clipboard = navigator.clipboard;
    const ClipboardItemConstructor = globalThis.ClipboardItem;

    // Start the clipboard write during the trusted click. Passing a promise as
    // the ClipboardItem value lets the browser fetch the blob without losing
    // the user-activation grant while the request is in flight.
    if (clipboard?.write && ClipboardItemConstructor) {
      const imageBlob = fetch(activeImage.url, {
        cache: "no-store",
        credentials: "same-origin",
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Image request failed with ${response.status}`);
        }
        return response.blob();
      });
      try {
        await clipboard.write([
          new ClipboardItemConstructor({
            [activeImage.mimeType]: imageBlob,
          }),
        ]);
        announce("Image copied");
        return;
      } catch {
        // Continue with the link fallback below.
      }
    }

    // A text write is started immediately as well; waiting for the image fetch
    // first would make this fallback fail in browsers with strict activation.
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(imageUrl);
        announce("Image link copied");
        return;
      } catch {
        // Try the native selection fallback below.
      }
    }

    try {
      throw new Error("Clipboard is unavailable");
    } catch {
      if (copyTextFallback(imageUrl)) {
        announce("Image link copied");
      } else {
        announce("Copy unavailable");
      }
    }
  };

  const downloadActiveImage = (): void => {
    if (!activeImage) {
      return;
    }
    const extension =
      activeImage.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const link = document.createElement("a");
    link.href = activeImage.url;
    link.download = `generated-image-${activeIndex + 1}.${extension}`;
    link.rel = "noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
    announce("Download started");
  };

  const revealActiveImage = async (): Promise<void> => {
    if (!activeImage) {
      return;
    }
    try {
      const response = await fetch(
        `${window.location.origin}/api/v1/plugins/${encodeURIComponent(PLUGIN_ID)}/http/reveal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ threadId, itemId: activeImage.itemId }),
        },
      );
      if (!response.ok) {
        throw new Error("Finder reveal failed");
      }
      announce("Opened in Finder");
    } catch {
      announce("Finder reveal unavailable");
    }
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    updateZoom(
      zoomRef.current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP),
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2),
    );
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    updateZoom(
      zoomRef.current > 1 ? 1 : 2,
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2),
    );
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (zoomRef.current <= 1 || event.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const nextPan = {
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    };
    panRef.current = nextPan;
    setPan(nextPan);
  };

  const stopPointerDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (
      menuOpen &&
      event.target instanceof Node &&
      menuRef.current?.contains(event.target)
    ) {
      return;
    }

    if (event.key === "ArrowLeft" && images.length > 1) {
      event.preventDefault();
      navigateImage(-1);
    } else if (event.key === "ArrowRight" && images.length > 1) {
      event.preventDefault();
      navigateImage(1);
    } else if (event.key === "Home" && images.length > 0) {
      event.preventDefault();
      selectImage(0);
    } else if (event.key === "End" && images.length > 0) {
      event.preventDefault();
      selectImage(images.length - 1);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateZoom(zoomRef.current + ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      updateZoom(zoomRef.current - ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      resetViewer();
    } else if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      setMenuOpen(false);
    }
  };

  return (
    <section
      aria-label="Generated images viewer"
      className="bb-generated-images-panel"
      data-bb-generated-images-panel="true"
      data-thread-id={threadId}
      onKeyDown={onPanelKeyDown}
    >
      <header className="bb-generated-images-panel-toolbar">
        <div
          className="bb-generated-images-panel-heading"
          title={activeImage?.revisedPrompt ?? "Generated image collection"}
        >
          <span className="bb-generated-images-panel-kicker">
            <PanelIcon name="image" />
            Generated images
          </span>
        </div>
        <div className="bb-generated-images-panel-toolbar-actions">
          <span
            aria-live="polite"
            className="bb-generated-images-panel-status"
            data-visible={Boolean(statusMessage)}
            role="status"
          >
            {statusMessage}
          </span>
          <div
            aria-label="Image navigation"
            className="bb-generated-images-panel-navigation"
          >
            <button
              aria-label="Previous generated image"
              className="bb-generated-images-panel-icon-button"
              data-bb-generated-images-panel-action="previous"
              disabled={!activeImage || images.length < 2}
              onClick={() => navigateImage(-1)}
              title="Previous image (←)"
              type="button"
            >
              <PanelIcon name="chevron-left" />
            </button>
            <span
              aria-label={
                images.length > 0
                  ? `Image ${activeIndex + 1} of ${images.length}`
                  : "No generated images"
              }
              className="bb-generated-images-panel-counter"
              role="status"
            >
              {images.length > 0 ? `${activeIndex + 1} / ${images.length}` : "—"}
            </span>
            <button
              aria-label="Next generated image"
              className="bb-generated-images-panel-icon-button"
              data-bb-generated-images-panel-action="next"
              disabled={!activeImage || images.length < 2}
              onClick={() => navigateImage(1)}
              title="Next image (→)"
              type="button"
            >
              <PanelIcon name="chevron-right" />
            </button>
          </div>
          <div className="bb-generated-images-panel-zoom" aria-label="Zoom controls">
            <button
              aria-label="Zoom out"
              className="bb-generated-images-panel-icon-button"
              data-bb-generated-images-panel-action="zoom-out"
              disabled={!activeImage || zoom <= MIN_ZOOM}
              onClick={() => updateZoom(zoomRef.current - ZOOM_STEP)}
              title="Zoom out"
              type="button"
            >
              <PanelIcon name="minus" />
            </button>
            <button
              aria-label="Reset image zoom"
              className="bb-generated-images-panel-zoom-value"
              data-bb-generated-images-panel-action="zoom-reset"
              disabled={!activeImage}
              onClick={resetViewer}
              title="Reset zoom"
              type="button"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              aria-label="Zoom in"
              className="bb-generated-images-panel-icon-button"
              data-bb-generated-images-panel-action="zoom-in"
              disabled={!activeImage || zoom >= MAX_ZOOM}
              onClick={() => updateZoom(zoomRef.current + ZOOM_STEP)}
              title="Zoom in"
              type="button"
            >
              <PanelIcon name="plus" />
            </button>
          </div>
          <div className="bb-generated-images-panel-menu-wrap" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="More image actions"
              className="bb-generated-images-panel-icon-button"
              data-bb-generated-images-panel-action="menu"
              disabled={!activeImage}
              onClick={() => setMenuOpen((open) => !open)}
              title="More image actions"
              type="button"
            >
              <PanelIcon name="ellipsis" />
            </button>
            {menuOpen && activeImage ? (
              <div
                aria-label="Image actions"
                className="bb-generated-images-panel-menu"
                role="menu"
              >
                <button
                  className="bb-generated-images-panel-menu-item"
                  data-bb-generated-images-panel-action="copy"
                  onClick={() => {
                    setMenuOpen(false);
                    void copyActiveImage();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <PanelIcon name="copy" />
                  Copy image
                </button>
                <button
                  className="bb-generated-images-panel-menu-item"
                  data-bb-generated-images-panel-action="download"
                  onClick={() => {
                    setMenuOpen(false);
                    downloadActiveImage();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <PanelIcon name="download" />
                  Download image
                </button>
                <button
                  className="bb-generated-images-panel-menu-item"
                  data-bb-generated-images-panel-action="reveal"
                  onClick={() => {
                    setMenuOpen(false);
                    void revealActiveImage();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <PanelIcon name="folder" />
                  Open in Finder
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main
        aria-label="Active generated image"
        className="bb-generated-images-panel-stage"
        data-bb-generated-images-panel-stage="true"
        data-panning={isPanning}
        data-zoom={zoom}
        data-zoomed={zoom > 1}
        aria-keyshortcuts="ArrowLeft ArrowRight Home End"
        onDoubleClick={activeImage ? onDoubleClick : undefined}
        onPointerCancel={stopPointerDrag}
        onPointerDown={activeImage ? onPointerDown : undefined}
        onPointerMove={activeImage ? onPointerMove : undefined}
        onPointerUp={activeImage ? stopPointerDrag : undefined}
        onWheel={activeImage ? onWheel : undefined}
        ref={stageRef}
        tabIndex={activeImage ? 0 : -1}
      >
        {activeImage ? (
          <img
            alt={
              activeImage.revisedPrompt
                ? `Generated image ${activeIndex + 1} of ${images.length}: ${activeImage.revisedPrompt}`
                : `Generated image ${activeIndex + 1} of ${images.length}`
            }
            className="bb-generated-images-panel-active-image"
            draggable={false}
            src={activeImage.url}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            }}
          />
        ) : (
          <div className="bb-generated-images-panel-empty">
            <PanelIcon name="image" />
            <h1>{loadError ? "Unable to load images" : "No generated images yet"}</h1>
            <p>
              {loadError ??
                "Generated images from this thread will appear here when they are ready."}
            </p>
          </div>
        )}
      </main>

      <footer className="bb-generated-images-panel-carousel">
        <div className="bb-generated-images-panel-carousel-heading">
          <span>All images</span>
          <span>{images.length > 0 ? `${images.length} images` : "Waiting for images"}</span>
        </div>
        <div
          aria-label="Generated image carousel"
          className="bb-generated-images-panel-carousel-track"
          role="list"
        >
          {images.map((image, index) => (
            <button
              aria-current={activeIndex === index ? "true" : undefined}
              aria-label={`View generated image ${index + 1}`}
              className="bb-generated-images-panel-thumbnail"
              data-active={activeIndex === index}
              data-bb-generated-images-panel-thumbnail={image.itemId}
              key={image.itemId}
              onClick={() => selectImage(index)}
              title={image.revisedPrompt ?? `Generated image ${index + 1}`}
              type="button"
            >
              <img
                alt=""
                loading={index === activeIndex ? "eager" : "lazy"}
                src={image.url}
              />
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
      </footer>
    </section>
  );
}
