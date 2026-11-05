import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

const WIDTH_KEY = "bb-mail:pane-width";
const MIN_WIDTH = 380;
/** The list keeps at least this much room beside the pane. */
const LIST_ROOM = 352;

function initialWidth(): number {
  try {
    const stored = Number(window.localStorage.getItem(WIDTH_KEY));
    if (Number.isFinite(stored) && stored >= MIN_WIDTH) return stored;
  } catch {
    // No stored width: use the default.
  }
  return 560;
}

/**
 * The open conversation, beside the list. It exists only while a
 * conversation is selected, takes the whole page on narrow screens, and its
 * left edge drags (or arrow-keys) to resize.
 */
export function ConversationPane({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(initialWidth);
  const pane = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(WIDTH_KEY, String(Math.round(width)));
      } catch {
        // The width just won't be remembered.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [width]);

  function clamp(next: number): number {
    const room = pane.current?.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
    return Math.min(Math.max(MIN_WIDTH, room - LIST_ROOM), Math.max(MIN_WIDTH, next));
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = pane.current?.getBoundingClientRect().width ?? width;
    const onMove = (move: globalThis.PointerEvent) => setWidth(clamp(startWidth + (startX - move.clientX)));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") setWidth((value) => clamp(value + 32));
    else if (event.key === "ArrowRight") setWidth((value) => clamp(value - 32));
    else return;
    event.preventDefault();
  }

  return (
    <section
      ref={pane}
      aria-label="Conversation"
      style={{ "--pane-width": `${width}px` } as CSSProperties}
      className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background md:relative md:inset-auto md:z-auto md:w-[var(--pane-width)] md:max-w-[calc(100%-22rem)] md:shrink-0 md:border-l md:border-border/60"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the conversation"
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={onKey}
        className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize transition-colors hover:bg-border/70 focus-visible:bg-ring/40 focus-visible:outline-none md:block"
      />
      {children}
    </section>
  );
}
