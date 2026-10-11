import { definePluginApp } from "@get-bb/plugin-sdk/app";

const VOICE_BUTTON_SELECTOR =
  '[data-promptbox] button[aria-label="Start voice input"]';

interface PendingTouch {
  button: HTMLButtonElement;
  x: number;
  y: number;
}

function voiceButtonFrom(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest(VOICE_BUTTON_SELECTOR);
  return button instanceof HTMLButtonElement ? button : null;
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "mobile-voice-tap",
    mount({ signal }) {
      if (!window.matchMedia("(pointer: coarse)").matches) return;

      const pendingTouches = new Map<number, PendingTouch>();
      const duplicateClickUntil = new WeakMap<HTMLButtonElement, number>();
      const style = document.createElement("style");
      style.dataset.mobileVoiceTap = "";
      style.textContent = `@media (pointer: coarse) {
        ${VOICE_BUTTON_SELECTOR} {
          min-inline-size: 40px;
          min-block-size: 40px;
          touch-action: manipulation;
        }
      }`;
      (document.head ?? document.documentElement).append(style);

      const handlePointerDown = (event: PointerEvent) => {
        if (
          event.pointerType !== "touch" ||
          !event.isPrimary ||
          event.button !== 0
        ) {
          return;
        }

        const button = voiceButtonFrom(event.target);
        if (!button || button.disabled) return;
        event.preventDefault();
        pendingTouches.set(event.pointerId, {
          button,
          x: event.clientX,
          y: event.clientY,
        });
      };

      const handlePointerMove = (event: PointerEvent) => {
        const pending = pendingTouches.get(event.pointerId);
        if (!pending) return;
        if (
          Math.hypot(event.clientX - pending.x, event.clientY - pending.y) >
          12
        ) {
          pendingTouches.delete(event.pointerId);
        }
      };

      const handlePointerUp = (event: PointerEvent) => {
        const pending = pendingTouches.get(event.pointerId);
        pendingTouches.delete(event.pointerId);
        if (
          !pending ||
          !pending.button.isConnected ||
          pending.button.disabled ||
          voiceButtonFrom(event.target) !== pending.button
        ) {
          return;
        }

        // The host's touch pointerdown prevents the browser compatibility
        // click in some mobile WebViews. Handle the action here, and keep the
        // host's own pointerup fallback from starting voice a second time.
        event.preventDefault();
        event.stopImmediatePropagation();
        duplicateClickUntil.set(pending.button, performance.now() + 500);
        pending.button.click();
      };

      const handlePointerCancel = (event: PointerEvent) => {
        pendingTouches.delete(event.pointerId);
      };

      const handleClick = (event: MouseEvent) => {
        if (!event.isTrusted || event.detail === 0) return;
        const button = voiceButtonFrom(event.target);
        if (!button) return;

        const expiresAt = duplicateClickUntil.get(button);
        if (expiresAt === undefined || performance.now() > expiresAt) return;

        duplicateClickUntil.delete(button);
        event.preventDefault();
        event.stopImmediatePropagation();
      };

      document.addEventListener("pointerdown", handlePointerDown, {
        capture: true,
        signal,
      });
      document.addEventListener("pointermove", handlePointerMove, {
        capture: true,
        signal,
      });
      document.addEventListener("pointerup", handlePointerUp, {
        capture: true,
        signal,
      });
      document.addEventListener("pointercancel", handlePointerCancel, {
        capture: true,
        signal,
      });
      document.addEventListener("click", handleClick, {
        capture: true,
        signal,
      });

      return () => {
        style.remove();
        pendingTouches.clear();
      };
    },
  });
});
