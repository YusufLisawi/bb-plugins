// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  loadPluginApp,
  mountPluginContentScripts,
} from "@get-bb/plugin-sdk/testing/app";

let mounted: Awaited<ReturnType<typeof mountPluginContentScripts>> | undefined;

async function setup(coarse = true) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: coarse }) as MediaQueryList),
  });
  document.body.innerHTML =
    '<div data-promptbox><button aria-label="Start voice input"><span>Mic</span></button></div>';
  const button = document.querySelector("button")!;
  const activate = vi.fn();
  button.addEventListener("click", activate);
  const app = await loadPluginApp(() => import("./app"));
  mounted = await mountPluginContentScripts(app, {
    pluginId: "mobile-voice-tap",
    generation: 1,
  });
  return { button, activate };
}

function pointer(
  target: Element,
  type: string,
  properties: Partial<PointerEvent> = {},
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const values = {
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: 10,
    clientY: 10,
    ...properties,
  };
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { value });
  }
  target.dispatchEvent(event);
  return event;
}

afterEach(async () => {
  await mounted?.lifecycle.dispose();
  mounted = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

it("activates once from a touch on the microphone icon and blocks the host pointerup fallback", async () => {
  const { button, activate } = await setup();
  const hostFallback = vi.fn();
  document.addEventListener("pointerup", hostFallback, { once: true });
  const icon = button.querySelector("span")!;
  expect(pointer(icon, "pointerdown").defaultPrevented).toBe(true);
  expect(pointer(icon, "pointerup").defaultPrevented).toBe(true);
  expect(activate).toHaveBeenCalledTimes(1);
  expect(hostFallback).not.toHaveBeenCalled();
  document.removeEventListener("pointerup", hostFallback);
});

it("does not start voice input after a scrolling gesture", async () => {
  const { button, activate } = await setup();
  pointer(button, "pointerdown");
  pointer(button, "pointermove", { clientY: 35 });
  pointer(button, "pointerup", { clientY: 35 });
  expect(activate).not.toHaveBeenCalled();
});

it("does not start voice input after a cancelled touch", async () => {
  const { button, activate } = await setup();
  pointer(button, "pointerdown");
  pointer(button, "pointercancel");
  pointer(button, "pointerup");
  expect(activate).not.toHaveBeenCalled();
});

it("leaves a disabled microphone button inactive", async () => {
  const { button, activate } = await setup();
  button.disabled = true;
  pointer(button, "pointerdown");
  pointer(button, "pointerup");
  expect(activate).not.toHaveBeenCalled();
});

it("does not intercept mouse pointers", async () => {
  const { button, activate } = await setup();
  expect(pointer(button, "pointerdown", { pointerType: "mouse" }).defaultPrevented).toBe(false);
  pointer(button, "pointerup", { pointerType: "mouse" });
  expect(activate).not.toHaveBeenCalled();
});

it("keeps desktop behavior native without installing a style", async () => {
  const { button, activate } = await setup(false);
  expect(document.querySelector("style[data-mobile-voice-tap]")).toBeNull();
  pointer(button, "pointerdown");
  pointer(button, "pointerup");
  expect(activate).not.toHaveBeenCalled();
});

it("preserves the requested 40 px target and removes its style/listeners on disposal", async () => {
  const { button, activate } = await setup();
  expect(document.querySelector("style[data-mobile-voice-tap]")?.textContent).toContain("min-inline-size: 40px");
  await mounted!.lifecycle.dispose();
  mounted = undefined;
  expect(document.querySelector("style[data-mobile-voice-tap]")).toBeNull();
  pointer(button, "pointerdown");
  pointer(button, "pointerup");
  expect(activate).not.toHaveBeenCalled();
});
