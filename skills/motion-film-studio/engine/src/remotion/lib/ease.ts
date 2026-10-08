import { Easing, interpolate } from "remotion";

/** Easing vocabulary. `expoInOut` is the landing page's own slide curve
 *  (cubic-bezier(0.87, 0, 0.13, 1)), so page and film move alike. */
export const E = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  expoInOut: Easing.bezier(0.87, 0, 0.13, 1),
  quintOut: Easing.bezier(0.22, 1, 0.36, 1),
  quartInOut: Easing.bezier(0.76, 0, 0.24, 1),
  cubicInOut: Easing.bezier(0.65, 0, 0.35, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  softBack: Easing.bezier(0.3, 1.35, 0.5, 1),
  backIn: Easing.bezier(0.6, -0.28, 0.735, 0.045),
  cubicIn: Easing.bezier(0.32, 0, 0.67, 0),
  snap: Easing.bezier(0.9, 0, 0.1, 1),
  linear: (t: number) => t,
};

type Ease = (t: number) => number;

/** Clamped tween between two frames. Both sides are always clamped. */
export const tw = (
  frame: number,
  start: number,
  end: number,
  from = 0,
  to = 1,
  ease: Ease = E.expoOut,
) =>
  interpolate(frame, [start, end], [from, to], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Multi-keyframe clamped tween: keys = [[frame, value], ...]. Ease applies per segment. */
export const keys = (frame: number, k: [number, number][], ease: Ease = E.cubicInOut) => {
  if (frame <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (frame <= k[i][0]) {
      const [f0, v0] = k[i - 1];
      const [f1, v1] = k[i];
      return interpolate(frame, [f0, f1], [v0, v1], {
        easing: ease,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }
  return k[k.length - 1][1];
};

export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hex colour interpolation (sRGB) for colour hand-offs such as coral → ink. */
export const mixColor = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(mix(x, y, clamp(t))).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

/** Deterministic hash → [0,1) for per-element variation that never changes between renders. */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
