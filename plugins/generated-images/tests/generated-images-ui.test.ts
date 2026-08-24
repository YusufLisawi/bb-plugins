import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

function installDom() {
  const dom = new JSDOM(
    `<main>
      <div data-timeline-row-id="assistant-row">
        <div class="group/message w-full">Assistant reply</div>
      </div>
      <div data-timeline-row-id="user-row">
        <div class="group/message ml-auto">User reply</div>
      </div>
    </main>`,
    { url: "https://bb.test/threads/thr_test" },
  );
  const previous = {
    Event: globalThis.Event,
    HTMLElement: globalThis.HTMLElement,
    HTMLStyleElement: globalThis.HTMLStyleElement,
    MutationObserver: globalThis.MutationObserver,
    document: globalThis.document,
    window: globalThis.window,
  };

  Object.assign(globalThis, {
    Event: dom.window.Event,
    HTMLElement: dom.window.HTMLElement,
    HTMLStyleElement: dom.window.HTMLStyleElement,
    MutationObserver: dom.window.MutationObserver,
    document: dom.window.document,
    window: dom.window,
  });

  return () => {
    Object.assign(globalThis, previous);
    dom.window.close();
  };
}

async function flushUi(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test("renders an inline tray and opens the native viewer panel handoff", async () => {
  const restoreDom = installDom();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        images: [
          {
            itemId: "exec_one",
            seq: 1,
            revisedPrompt: "First image",
            mimeType: "image/png",
            url: "/image-one.png",
          },
          {
            itemId: "exec_two",
            seq: 2,
            revisedPrompt: "Second image",
            mimeType: "image/png",
            url: "/image-two.png",
          },
        ],
      }),
    );

  let panelRequest: { threadId: string; index: number } | null = null;
  const onPanelRequest = (event: Event): void => {
    panelRequest = (event as CustomEvent<{ threadId: string; index: number }>).detail;
  };

  try {
    const { mountGeneratedImages } = await import("../generated-images.ts");
    window.addEventListener("bb-generated-images:open-panel", onPanelRequest);
    const dispose = mountGeneratedImages({
      pluginId: "generated-images",
      signal: new AbortController().signal,
    });
    await flushUi();

    const assistant = document.querySelector<HTMLElement>(
      '[data-timeline-row-id="assistant-row"]',
    );
    const tray = document.querySelector<HTMLElement>(
      "[data-bb-generated-image-rail]",
    );
    assert.ok(assistant);
    assert.ok(tray);
    assert.equal(assistant.nextElementSibling, tray);
    assert.equal(tray.dataset.mode, "expanded");
    assert.equal(tray.querySelectorAll("img").length, 2);
    const style = document.getElementById("bb-generated-images-style");
    assert.ok(style);
    assert.doesNotMatch(style.textContent ?? "", /object-fit:\s*cover/);
    assert.doesNotMatch(
      style.textContent ?? "",
      /box-shadow:\s*0 1px 2px/,
    );
    assert.doesNotMatch(
      style.textContent ?? "",
      /box-shadow:\s*0 1\.5rem 4rem/,
    );

    tray
      .querySelector<HTMLButtonElement>(
        '[data-bb-generated-images-action="toggle"]',
      )
      ?.click();
    assert.equal(tray.dataset.mode, "collapsed");
    assert.equal(tray.querySelectorAll("img").length, 0);
    assert.equal(
      window.localStorage.getItem("bb-generated-images:tray:thr_test"),
      "collapsed",
    );

    tray
      .querySelector<HTMLButtonElement>(
        '[data-bb-generated-images-action="dismiss"]',
      )
      ?.click();
    assert.equal(tray.dataset.mode, "dismissed");
    assert.match(tray.textContent ?? "", /Images/);
    assert.equal(
      window.localStorage.getItem("bb-generated-images:tray:thr_test"),
      "dismissed",
    );

    tray
      .querySelector<HTMLButtonElement>(
        '[data-bb-generated-images-action="restore"]',
      )
      ?.click();
    assert.equal(tray.dataset.mode, "expanded");
    assert.equal(tray.querySelectorAll("img").length, 2);

    tray
      .querySelector<HTMLButtonElement>(
        '[data-bb-generated-images-action="open-exec_two"]',
      )
      ?.click();
    assert.deepEqual(panelRequest, { threadId: "thr_test", index: 1 });
    assert.equal(
      window.sessionStorage.getItem(
        "bb-generated-images:tray:thr_test:pending-index",
      ),
      "1",
    );
    assert.equal(
      document.querySelector("dialog[data-bb-generated-image-preview]"),
      null,
    );

    dispose();
    assert.equal(document.querySelector("[data-bb-generated-image-rail]"), null);
  } finally {
    globalThis.fetch = originalFetch;
    window.removeEventListener("bb-generated-images:open-panel", onPanelRequest);
    restoreDom();
  }
});
