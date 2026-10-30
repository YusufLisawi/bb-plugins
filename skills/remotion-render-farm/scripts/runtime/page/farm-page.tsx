import { type FC, Fragment, isValidElement, type ReactNode } from "react";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { Composition, Folder, Still } from "remotion";
import { scanFrames } from "./frame-scan";

/**
 * The render farm's page (remotion-render-farm skill). build-page.ts copies it into <project>/.farm/page and bundles
 * it with the project's Root; a worker's Chrome window loads it once per job:
 *   ?probe=1[&comp=Id]        the compositions: id, frames, fps, size (calculateMetadata resolved for comp)
 *   ?comp=Id&scan=a-b         fingerprints of frames a…b, without drawing them (frame-scan.tsx); &audio=1 adds the sound's
 *   ?comp=Id&ranges=a-b,c-d   one muted video per range; mode=hic (Chrome capture, default) or mode=dom; &scale=0.5
 *   ?comp=Id&audioranges=a-b  the composition's sound for each range, as WAV
 * and &props=<base64url JSON> (input props, read by index.html), &who=<job id>. Results are posted to /__farm/save
 * as <who>-<name>; <who>-result.json comes last and lists them (or the error).
 */

type Props = Record<string, unknown>;
type Comp = {
  id: string;
  component?: FC<Props>;
  lazyComponent?: () => Promise<{ default: FC<Props> }>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps?: Props;
  calculateMetadata?: (o: Props) => Promise<Props | undefined> | Props | undefined;
  still?: boolean;
};
type Output = { name: string; from: number; to: number; frames: number; seconds: number };

const q = new URLSearchParams(location.search);
const WHO = (q.get("who") ?? "page").replace(/[^a-z0-9-]/g, "").slice(0, 48) || "page";
const status = (s: string) => {
  const el = document.getElementById("status");
  if (el) el.textContent = s;
};

const save = async (name: string, body: Blob | string) => {
  const file = `${WHO}-${name}`;
  const r = await fetch(`/__farm/save?name=${encodeURIComponent(file)}`, { method: "POST", body });
  if (!r.ok) throw new Error(`saving ${file}: ${r.status}`);
  return file;
};

/** The <Composition>s and <Still>s the Root returns, found by walking its elements: no rendering, no internals.
 *  Components without hooks that return compositions (a helper per film) are followed too. */
const collect = (Root: FC) => {
  const out = new Map<string, Comp>();
  const visit = (node: ReactNode): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isValidElement(node)) return;
    const props = node.props as Props & { children?: ReactNode };
    if (node.type === Composition || node.type === Still) {
      const c = props as unknown as Comp;
      const still = node.type === Still;
      out.set(c.id, { ...c, durationInFrames: still ? 1 : c.durationInFrames, fps: c.fps ?? 30, still });
      return;
    }
    if (node.type === Fragment || node.type === Folder) return visit(props.children);
    if (typeof node.type === "function") {
      try {
        visit((node.type as (p: Props) => ReactNode)(props));
      } catch {
        // a component with hooks: it isn't a list of compositions
      }
      return;
    }
    visit(props.children);
  };
  visit((Root as unknown as (p: Props) => ReactNode)({}));
  return out;
};

const inputProps = JSON.parse((window as Window & { remotion_inputProps?: string }).remotion_inputProps ?? "{}") as Props;

/** The composition as it renders: its component, its props (defaults + input props) and calculateMetadata applied. */
const resolveComp = async (c: Comp) => {
  const component = c.component ?? (c.lazyComponent ? (await c.lazyComponent()).default : undefined);
  if (!component) throw new Error(`${c.id} has no component`);
  const defaults = c.defaultProps ?? {};
  let props: Props = { ...defaults, ...inputProps };
  let m: Props = {};
  if (c.calculateMetadata) {
    m = (await c.calculateMetadata({ defaultProps: defaults, props, abortSignal: new AbortController().signal, compositionId: c.id, isRendering: true })) ?? {};
    if (m.props) props = m.props as Props;
  }
  return {
    id: c.id,
    component,
    durationInFrames: Number(m.durationInFrames ?? c.durationInFrames),
    fps: Number(m.fps ?? c.fps),
    width: Number(m.width ?? c.width),
    height: Number(m.height ?? c.height),
    props,
  };
};

/** Every font the page declared, loaded before the first frame: text is measured, and a frame measured before its
 *  font arrived would differ from the same frame later (in the picture and in its fingerprint). */
const loadFonts = async () => {
  await Promise.all([...document.fonts].map((f) => (f.status === "unloaded" ? f.load() : f.loaded).catch(() => undefined)));
  await document.fonts.ready;
};

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} did not finish within ${Math.round(ms / 1000)} s`)), ms))]);

const capture = typeof CanvasRenderingContext2D !== "undefined" && "drawElementImage" in CanvasRenderingContext2D.prototype && "requestPaint" in HTMLCanvasElement.prototype;

export const start = async (Root: FC) => {
  const t0 = performance.now();
  const result: { files: Output[]; seconds?: number; error?: string } = { files: [] };
  try {
    if (typeof Root !== "function") throw new Error("the Root export named in farm.json is not a component");
    const comps = collect(Root);
    const id = q.get("comp");
    if (q.get("probe")) {
      const list = [];
      for (const c of comps.values()) {
        if (id && c.id !== id) continue;
        const r = id ? await resolveComp(c) : c;
        list.push({ id: c.id, durationInFrames: r.durationInFrames, fps: r.fps, width: r.width, height: r.height, still: c.still ?? false, dynamic: !id && !!c.calculateMetadata });
      }
      if (id && !list.length) throw new Error(`no composition ${id}; the Root has ${[...comps.keys()].join(", ")}`);
      result.files.push({ name: await save("probe.json", JSON.stringify(list)), from: 0, to: 0, frames: list.length, seconds: 0 });
    } else {
      const c = id ? comps.get(id) : undefined;
      if (!c) throw new Error(`no composition ${id}; the Root has ${[...comps.keys()].join(", ")}`);
      const comp = await resolveComp(c);
      await loadFonts();
      const composition = { id: comp.id, component: comp.component, durationInFrames: comp.durationInFrames, fps: comp.fps, width: comp.width, height: comp.height, defaultProps: {} } as never;
      if (q.get("scan")) {
        const [a, b] = q.get("scan")!.split("-").map(Number);
        const files = (await fetch("/__assets.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))) as Record<string, string>;
        const scanned = await scanFrames(comp, comp.props, a, b, files, q.get("audio") === "1", (f) => status(`scan ${f} of ${a}–${b}`));
        result.files.push({ name: await save(`scan-${a}-${b}.json`, JSON.stringify(scanned)), from: a, to: b, frames: b - a + 1, seconds: (performance.now() - t0) / 1000 });
      } else if (q.get("audioranges")) {
        for (const range of q.get("audioranges")!.split(",")) {
          const [a, b] = range.split("-").map(Number);
          const t = performance.now();
          status(`sound ${a}–${b}`);
          const res = await withTimeout(renderMediaOnWeb({ composition, inputProps: comp.props, container: "wav", frameRange: [a, b], muted: false, delayRenderTimeoutInMilliseconds: 30000, logLevel: "error" }), 60000 + (b - a + 1) * 2000, `sound ${a}–${b}`);
          const name = await save(`a${a}-${b}.wav`, await res.getBlob());
          result.files.push({ name, from: a, to: b, frames: b - a + 1, seconds: (performance.now() - t) / 1000 });
        }
      } else if (q.get("ranges")) {
        const mode = q.get("mode") === "dom" ? "dom" : "hic";
        // capture mode silently falls back to the DOM composer without the flag: fail instead of rendering wrong
        if (mode === "hic" && !capture) throw new Error("Chrome capture (HTML-in-canvas) is not available: start Chrome with --enable-features=CanvasDrawElement --enable-blink-features=CanvasDrawElement");
        const scale = Number(q.get("scale") ?? 1);
        for (const range of q.get("ranges")!.split(",")) {
          const [a, b] = range.split("-").map(Number);
          const t = performance.now();
          status(`rendering ${a}–${b}`);
          const res = await withTimeout(
            renderMediaOnWeb({ composition, inputProps: comp.props, frameRange: [a, b], allowHtmlInCanvas: mode === "hic", pageResponsiveness: "disabled", videoBitrate: "high", scale, muted: true, delayRenderTimeoutInMilliseconds: 30000, logLevel: "error" }),
            60000 + (b - a + 1) * 4000,
            `frames ${a}–${b}`,
          );
          const name = await save(`c${a}-${b}.mp4`, await res.getBlob());
          result.files.push({ name, from: a, to: b, frames: b - a + 1, seconds: (performance.now() - t) / 1000 });
        }
      } else throw new Error("nothing to do: the query has no probe, scan, ranges or audioranges");
    }
  } catch (e) {
    const err = e as Error;
    result.error = `${err?.message ?? String(e)}${err?.stack ? `\n${err.stack.split("\n").slice(1, 6).join("\n")}` : ""}`;
  }
  result.seconds = (performance.now() - t0) / 1000;
  status(result.error ? `failed: ${result.error}` : `done in ${result.seconds.toFixed(1)} s`);
  await save("result.json", JSON.stringify(result));
};
