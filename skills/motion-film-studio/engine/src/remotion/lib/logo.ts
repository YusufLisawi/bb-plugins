import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";

import brand from "../brand.json";

/**
 * The brand mark, from brand.json → logo.
 *  - type "stroke": `parts` are the strokes a pen draws in order (Brainfast: the
 *    bolt + outer brain, then the two right lobes), `nubs` are tiny joins drawn
 *    as the pen passes them. `Mark` draws it with a travelling pen head.
 *  - type "image": a filled logo file in public/ (svg or png); `Mark` reveals
 *    it with a wipe. MARK_PARTS is empty.
 * viewBox gives the aspect ratio in both cases.
 */
type Logo = { type: string; viewBox: number[]; stroke?: number; parts?: string[]; nubs?: string[]; file?: string; icon?: string };
const L = brand.logo as Logo;
export const LOGO_TYPE = L.type as "stroke" | "image";
export const LOGO_FILE = L.file ?? "";
/** optional square icon (app icon) for small square spots when the logo is wide */
export const LOGO_ICON = L.icon ?? "";
export const MARK_W = L.viewBox[0];
export const MARK_H = L.viewBox[1];
export const MARK_STROKE = L.stroke ?? 20;
export const MARK_PARTS: string[] = LOGO_TYPE === "stroke" ? L.parts ?? [] : [];
export const MARK_NUBS: string[] = LOGO_TYPE === "stroke" ? L.nubs ?? [] : [];
export const MARK_FULL = [...MARK_PARTS, ...MARK_NUBS].join(" ");

export const PART_LEN = MARK_PARTS.map((d) => getLength(d));
export const MARK_LEN = Math.max(1, PART_LEN.reduce((a, c) => a + c, 0));
/** Where along the whole pen stroke each part starts. */
export const PART_START = PART_LEN.map((_, i) => PART_LEN.slice(0, i).reduce((a, c) => a + c, 0));

/** Where the bolt reaches its lowest tip (end of the 5th curve) as a share of the pen path. */
export const BOLT_TIP = (() => {
  if (brand.id !== "brainfast") return 0.35;
  const d = "M134.232 46.0051C134.232 46.0051 106.797 116.958 107.894 119.141C108.992 121.324 159.473 110.409 174.837 123.508C186.047 133.065 177.032 148.614 164.96 168.262C154.352 186.819 47.6423 309.293 45.3416 307.985";
  return getLength(d) / MARK_LEN;
})();

/** Point + unit normal at distance `s` along the whole pen stroke. */
export const markPoint = (s: number) => {
  let i = 0;
  while (i < MARK_PARTS.length - 1 && s > PART_START[i] + PART_LEN[i]) i++;
  const local = Math.max(0, Math.min(PART_LEN[i], s - PART_START[i]));
  if (!MARK_PARTS.length) return { x: MARK_W / 2, y: MARK_H / 2, nx: 0, ny: -1, part: 0 };
  const p = getPointAtLength(MARK_PARTS[i], local);
  const t = getTangentAtLength(MARK_PARTS[i], local);
  return { x: p.x, y: p.y, nx: -t.y, ny: t.x, part: i };
};

/** `n` points spread evenly along the mark (viewBox units), cached per n. */
const cache = new Map<number, ReturnType<typeof markPoint>[]>();
export const markSamples = (n: number) => {
  if (!cache.has(n)) {
    cache.set(
      n,
      Array.from({ length: n }, (_, k) => markPoint(((k + 0.5) / n) * MARK_LEN)),
    );
  }
  return cache.get(n)!;
};
