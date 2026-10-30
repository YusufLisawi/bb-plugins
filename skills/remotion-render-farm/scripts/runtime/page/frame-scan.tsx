import { createRef, type FC, type ReactNode, type RefObject, useImperativeHandle, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Internals } from "remotion";

/**
 * Change detection for the render farm: steps a composition through its frames without drawing them and
 * fingerprints each frame by what decides its picture: the page (every element, text and inline style), the content
 * of every file it shows, the pixels of its canvases. Same fingerprint, same picture, so a new render only needs the
 * chunks whose fingerprints changed. The sound gets its own fingerprint per frame (the audio assets the frame plays).
 * Mounts the composition the way @remotion/web-renderer does (create-scaffold.tsx, tested with 4.0.539), with the
 * props of the render. Measured: about 1,000 frames a second a window on a busy film, identical on every machine
 * with the same Chrome, identical however the frames are split.
 */

export type ScanComposition = { id: string; component: FC<Record<string, unknown>>; durationInFrames: number; fps: number; width: number; height: number };
type Clock = { set: (frame: number) => void };
type Scope = { remotion_renderReady: boolean; remotion_cancelledError?: string; remotion_delayRenderTimeouts: Record<string, { label: string | null }> };
type Asset = Record<string, unknown>;

const Time: FC<{ id: string; from: number; audio: boolean; clock: RefObject<Clock | null>; children: ReactNode }> = ({ id, from, audio, clock, children }) => {
  const [frame, setFrame] = useState(from);
  useImperativeHandle(clock, () => ({ set: (f) => flushSync(() => setFrame(f)) }));
  return (
    <Internals.RemotionRootContexts _experimentalKeepAudioContextAlive={false} audioEnabled={audio} videoEnabled logLevel="error" numberOfAudioTags={0} audioLatencyHint="interactive" previewSampleRate={null} frameState={{ [id]: frame }}>
      {children}
    </Internals.RemotionRootContexts>
  );
};

const mount = (c: ScanComposition, props: Record<string, unknown>, from: number, audio: boolean) => {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, { position: "fixed", inset: "0", overflow: "hidden", visibility: "hidden", pointerEvents: "none", zIndex: "-9999" });
  const div = document.createElement("div");
  Object.assign(div.style, { position: "absolute", top: "0", left: "0", display: "flex", flexDirection: "column", backgroundColor: "transparent", width: `${c.width}px`, height: `${c.height}px` });
  div.className = "farm-scan";
  const removeCss = Internals.CSSUtils.injectCSS(Internals.CSSUtils.makeDefaultPreviewCSS(".farm-scan", "white"));
  wrapper.appendChild(div);
  document.body.appendChild(wrapper);
  const errors: { error: unknown } = { error: null };
  const root = createRoot(div, { onUncaughtError: (e) => void (errors.error = e) });
  const scope = { remotion_renderReady: true, remotion_delayRenderTimeouts: {}, remotion_puppeteerTimeout: 30000, remotion_attempt: 0, remotion_delayRenderHandles: [] };
  const clock = createRef<Clock>();
  const assets = createRef<{ collectAssets: () => Asset[] }>();
  const resources = Internals.makeRenderResourceManager();
  const manager = {
    compositions: [{ id: c.id, component: c.component, order: null, defaultProps: {}, folderName: null, parentFolderName: null, schema: null, calculateMetadata: null, durationInFrames: c.durationInFrames, fps: c.fps, height: c.height, width: c.width }],
    canvasContent: { type: "composition", compositionId: c.id },
    currentAssetMetadata: null,
    currentCompositionMetadata: { props, durationInFrames: c.durationInFrames, fps: c.fps, height: c.height, width: c.width, defaultCodec: null, defaultOutName: null, defaultVideoImageFormat: null, defaultPixelFormat: null, defaultProResProfile: null, defaultSampleRate: null },
    folders: [],
  };
  const Component = c.component;
  flushSync(() =>
    root.render(
      <Internals.RenderResourceManagerContext.Provider value={resources}>
        <Internals.MaxMediaCacheSizeContext.Provider value={null}>
          <Internals.RemotionEnvironmentContext.Provider value={{ isStudio: false, isRendering: true, isPlayer: false, isReadOnlyStudio: false, isClientSideRendering: true }}>
            <Internals.DelayRenderContextType.Provider value={scope as never}>
              <Internals.CompositionManager.Provider value={manager as never}>
                <Internals.PixelDensityContext.Provider value={1}>
                  <Internals.RenderAssetManagerProvider collectAssets={assets as never}>
                    <Time id={c.id} from={from} audio={audio} clock={clock}>
                      <Internals.CanUseRemotionHooks.Provider value>
                        <Component {...props} />
                      </Internals.CanUseRemotionHooks.Provider>
                    </Time>
                  </Internals.RenderAssetManagerProvider>
                </Internals.PixelDensityContext.Provider>
              </Internals.CompositionManager.Provider>
            </Internals.DelayRenderContextType.Provider>
          </Internals.RemotionEnvironmentContext.Provider>
        </Internals.MaxMediaCacheSizeContext.Provider>
      </Internals.RenderResourceManagerContext.Provider>,
    ),
  );
  return {
    div,
    scope: scope as Scope,
    clock,
    assets,
    errors,
    dispose: () => {
      try {
        root.unmount();
      } finally {
        resources.dispose();
        wrapper.remove();
        removeCss();
      }
    },
  };
};

/** Waits for the frame's delayRender() handles (images loading, a 3D scene drawing), like the renderer does. */
const ready = async (scope: Scope, ms: number) => {
  const t0 = performance.now();
  while (scope.remotion_renderReady !== true) {
    if (scope.remotion_cancelledError !== undefined) throw new Error(scope.remotion_cancelledError.split("\n")[0]);
    if (performance.now() - t0 > ms) throw new Error(`frame not ready after ${ms / 1000} s: ${Object.values(scope.remotion_delayRenderTimeouts).map((d) => d.label).join(", ")}`);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
};

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf, 0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha = async (data: string | BufferSource) => hex(await crypto.subtle.digest("SHA-256", typeof data === "string" ? new TextEncoder().encode(data) : data));

// React's useId() counts every mount since the page loaded, so the same frame would get other ids after scanning
// from another start: number them by first appearance in the frame instead
const REACT_ID = /[:«]r[0-9a-z]+[:»]/g;
// files a frame shows: src="…", href="…", url(…) in inline styles (serialized as url(&quot;…&quot;))
const FILE_REF = /(?:src|href)="([^"#][^"]*)"|url\((?:&quot;|["'])?([^"'&)#][^"'&)]*)/g;

/** A file reference by its content: path=hash for the project's files, the URL itself for anything else. */
const byContent = (u: string, files: Record<string, string>) => {
  if (u.startsWith("data:")) return "";
  if (u.startsWith("blob:")) return `blob-${Math.random()}`; // made in this page load: unknown content
  try {
    const url = new URL(u, location.href);
    if (url.origin !== location.origin) return url.href;
    const path = decodeURIComponent(url.pathname);
    return `${path}=${files[path] ?? "?"}`;
  } catch {
    return u;
  }
};

let pixels: CanvasRenderingContext2D | null = null;
/** A canvas's pixels aren't in the page: read them back (full size, so a one-pixel change still counts).
 *  Nothing readable (a WebGL buffer already handed to the compositor) is never trusted: the frame always renders. */
const canvasFingerprint = async (c: HTMLCanvasElement) => {
  if (!c.width || !c.height) return "empty";
  pixels ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const ctx = pixels!;
  if (ctx.canvas.width !== c.width || ctx.canvas.height !== c.height) Object.assign(ctx.canvas, { width: c.width, height: c.height });
  ctx.clearRect(0, 0, c.width, c.height);
  try {
    ctx.drawImage(c, 0, 0);
  } catch {
    return `unreadable-${Math.random()}`;
  }
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let blank = true;
  for (let i = 3; i < data.length; i += 4 * 97)
    if (data[i]) {
      blank = false;
      break;
    }
  return blank ? `blank-${Math.random()}` : sha(data);
};

/** files: path → content hash of every file the page can load (dist/__assets.json, written by build-page.ts). */
export const fingerprint = async (div: HTMLElement, files: Record<string, string>) => {
  const ids = new Map<string, string>();
  const html = div.innerHTML.replace(REACT_ID, (m) => {
    let v = ids.get(m);
    if (!v) ids.set(m, (v = `#${ids.size}`));
    return v;
  });
  const shown = new Set<string>();
  for (const m of html.matchAll(FILE_REF)) shown.add((m[1] ?? m[2]).replace(/&amp;/g, "&"));
  const parts = [...shown].sort().map((u) => byContent(u, files));
  for (const c of div.querySelectorAll("canvas")) parts.push(await canvasFingerprint(c));
  if (div.querySelector("video, iframe")) parts.push(`media-${Math.random()}`); // drawn by the browser: always render
  return sha(`${html}\n${parts.join("\n")}`);
};

/** The sound of one frame: the audio assets it plays. @remotion/media <Audio> hands over the frame's samples (volume
 *  applied), hashed as they are; remotion's <Audio> its file, volume and position. Ids are left out (random per mount). */
const audioFingerprint = async (assets: Asset[], files: Record<string, string>) => {
  if (!assets.length) return "";
  const list = await Promise.all(
    assets.map(async ({ id: _id, audio, ...a }) => {
      const samples = ArrayBuffer.isView(audio) ? await sha(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength)) : Array.isArray(audio) ? await sha(new Float32Array(audio as number[])) : "";
      return JSON.stringify({ ...a, src: typeof a.src === "string" ? byContent(a.src, files) : a.src, samples });
    }),
  );
  return sha(list.sort().join("\n"));
};

/** Fingerprints frames from…to (inclusive): the picture (fps), the sound (audio, "" = silent) and what each frame
 *  cost to scan (ms), by which the farm splits the next scan (a busy scene costs several times a quiet one).
 *  The sound is only fingerprinted with `audio` (it extracts every frame's samples: about four times the cost);
 *  without it, audio = "" everywhere (the farm then takes the sound from farm.json's file). */
export const scanFrames = async (c: ScanComposition, props: Record<string, unknown>, from: number, to: number, files: Record<string, string>, audio: boolean, onProgress?: (frame: number) => void) => {
  const m = mount(c, props, from, audio);
  try {
    const fps: string[] = [];
    const audio: string[] = [];
    const ms: number[] = [];
    for (let f = from; f <= to; f++) {
      const t0 = performance.now();
      m.clock.current!.set(f);
      await ready(m.scope, 30000);
      if (m.errors.error) throw m.errors.error;
      fps.push(await fingerprint(m.div, files));
      audio.push(await audioFingerprint(m.assets.current?.collectAssets() ?? [], files));
      ms.push(Math.round((performance.now() - t0) * 10) / 10);
      if (onProgress && f % 50 === 0) onProgress(f);
    }
    return { fps, audio, ms };
  } finally {
    m.dispose();
  }
};
