import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { TaskStatus } from "../contract.js";

export interface DropTarget {
  status: TaskStatus;
  /** The card the dragged one lands before; null puts it at the end. */
  beforeId: string | null;
}

export interface ActiveDrag {
  id: string;
  width: number;
  height: number;
}

interface Pending {
  id: string;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  timer: number | null;
}

const MOUSE_SLOP = 5;
const TOUCH_SLOP = 8;
const TOUCH_HOLD_MS = 280;
const EDGE = 48;
const SCROLL_STEP = 14;

/** Which column and slot the pointer is over, read from the board's DOM. */
function targetAt(x: number, y: number, dragId: string): DropTarget | null {
  for (const zone of Array.from(document.querySelectorAll<HTMLElement>("[data-drop-column]"))) {
    const box = zone.getBoundingClientRect();
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
    const status = zone.dataset.dropColumn as TaskStatus;
    const cards = Array.from(zone.querySelectorAll<HTMLElement>("[data-task-id]")).filter((card) => card.dataset.taskId !== dragId);
    const before = cards.find((card) => {
      const cardBox = card.getBoundingClientRect();
      return y < cardBox.top + cardBox.height / 2;
    });
    return { status, beforeId: before?.dataset.taskId ?? null };
  }
  return null;
}

/** Scrolls a column's list, or the board sideways, when the pointer nears an edge. */
function autoScroll(x: number, y: number) {
  for (const list of Array.from(document.querySelectorAll<HTMLElement>("[data-card-list]"))) {
    const box = list.getBoundingClientRect();
    if (x < box.left || x > box.right) continue;
    if (y < box.top + EDGE && y > box.top - EDGE) list.scrollBy({ top: -SCROLL_STEP });
    else if (y > box.bottom - EDGE && y < box.bottom + EDGE) list.scrollBy({ top: SCROLL_STEP });
  }
  const board = document.querySelector<HTMLElement>("[data-board-columns]");
  if (board && board.scrollWidth > board.clientWidth) {
    const box = board.getBoundingClientRect();
    if (x < box.left + EDGE) board.scrollBy({ left: -SCROLL_STEP });
    else if (x > box.right - EDGE) board.scrollBy({ left: SCROLL_STEP });
  }
}

/**
 * Pointer-driven drag for cards: works with a mouse right away and with touch
 * after a short hold, so scrolling a column on a phone still scrolls. The
 * dragged card follows the pointer in an overlay moved with transforms, so
 * pointer moves do not re-render the board; only a new drop slot does.
 */
export function usePointerDrag(onDrop: (id: string, target: DropTarget) => void) {
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pending = useRef<Pending | null>(null);
  const activeRef = useRef<ActiveDrag | null>(null);
  const targetRef = useRef<DropTarget | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const lastDragEnd = useRef(0);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const place = useCallback(() => {
    const drag = pending.current;
    const overlay = overlayRef.current;
    if (!drag || !overlay) return;
    overlay.style.transform = `translate3d(${pointer.current.x - drag.offsetX}px, ${pointer.current.y - drag.offsetY}px, 0) rotate(1.5deg)`;
  }, []);

  const end = useCallback((drop: boolean) => {
    const drag = pending.current;
    if (drag?.timer != null) window.clearTimeout(drag.timer);
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
    const wasActive = activeRef.current;
    const finalTarget = targetRef.current;
    pending.current = null;
    activeRef.current = null;
    targetRef.current = null;
    document.body.style.removeProperty("user-select");
    document.body.style.removeProperty("cursor");
    setActive(null);
    setTarget(null);
    if (wasActive) {
      lastDragEnd.current = Date.now();
      if (drop && finalTarget) onDropRef.current(wasActive.id, finalTarget);
    }
  }, []);

  const activate = useCallback(() => {
    const drag = pending.current;
    if (!drag || activeRef.current) return;
    const next = { id: drag.id, width: drag.width, height: drag.height };
    activeRef.current = next;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    setActive(next);
    const tick = () => {
      autoScroll(pointer.current.x, pointer.current.y);
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    window.requestAnimationFrame(place);
  }, [place]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = pending.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!activeRef.current) {
        if (drag.touch) {
          // Moving before the hold ends means the user is scrolling.
          if (moved > TOUCH_SLOP) end(false);
          return;
        }
        if (moved < MOUSE_SLOP) return;
        activate();
      }
      place();
      const next = targetAt(event.clientX, event.clientY, drag.id);
      const current = targetRef.current;
      if (next?.status !== current?.status || next?.beforeId !== current?.beforeId) {
        targetRef.current = next;
        setTarget(next);
      }
    };
    const onUp = (event: PointerEvent) => {
      if (pending.current && event.pointerId === pending.current.pointerId) end(true);
    };
    const onCancel = () => end(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeRef.current) end(false);
    };
    // While a touch drag is live, stop the page from scrolling under it.
    const onTouchMove = (event: TouchEvent) => {
      if (activeRef.current) event.preventDefault();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchmove", onTouchMove);
      end(false);
    };
  }, [activate, end, place]);

  /** Attach to a card's onPointerDown. */
  const start = useCallback(
    (event: ReactPointerEvent<HTMLElement>, id: string) => {
      if (event.button !== 0 || pending.current) return;
      const card = event.currentTarget;
      // Buttons inside the card (sub-agents, hide) keep their own clicks.
      const inner = (event.target as HTMLElement).closest("button, a, input, textarea, select");
      if (inner && inner !== card && card.contains(inner)) return;
      const box = card.getBoundingClientRect();
      const touch = event.pointerType === "touch";
      pointer.current = { x: event.clientX, y: event.clientY };
      pending.current = {
        id,
        pointerId: event.pointerId,
        touch,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - box.left,
        offsetY: event.clientY - box.top,
        width: box.width,
        height: box.height,
        timer: touch ? window.setTimeout(activate, TOUCH_HOLD_MS) : null,
      };
    },
    [activate],
  );

  /** True right after a drop, so the card's click does not also open it. */
  const justDragged = useCallback(() => Date.now() - lastDragEnd.current < 250, []);

  return { active, target, overlayRef, start, justDragged };
}
