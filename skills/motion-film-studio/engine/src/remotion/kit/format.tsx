import React from "react";
import { useVideoConfig } from "remotion";

/**
 * One film, any aspect ratio. Nothing in a film should hard-code 1080 or 1920:
 * positions come from `useLayout()` zones and fixed-size UI is authored in a
 * "design box" and fitted into the stage with <Fit>.
 *
 *   v   1080 × 1920   9:16  Reels / Stories / TikTok / Shorts
 *   h   1920 × 1080  16:9   YouTube, web, presentations, LinkedIn
 *   sq  1080 × 1080   1:1   feed
 *   p   1080 × 1350   4:5   feed (tallest non-story)
 */
export type FormatId = "v" | "h" | "sq" | "p";
export const FORMATS: Record<FormatId, { w: number; h: number; label: string }> = {
  v: { w: 1080, h: 1920, label: "9:16" },
  h: { w: 1920, h: 1080, label: "16:9" },
  sq: { w: 1080, h: 1080, label: "1:1" },
  p: { w: 1080, h: 1350, label: "4:5" },
};

export type Rect = { x: number; y: number; w: number; h: number };
export type Layout = {
  W: number;
  H: number;
  cx: number;
  cy: number;
  /** 1 at a 1080 short side — multiply every hand-tuned size by it */
  u: number;
  kind: "v" | "h" | "sq" | "p";
  /** keep text and key UI inside this (platform chrome covers the rest) */
  safe: Rect;
  /** where the headline sits; size = headline font size */
  headline: Rect & { size: number };
  /** where product UI, devices and diagrams live */
  stage: Rect;
  /** brand bug (small logo) anchor, top-left */
  bug: { x: number; y: number; size: number };
  /** lockup centre line and wordmark size */
  lockup: { cy: number; size: number };
};

const kindOf = (W: number, H: number): Layout["kind"] => {
  const r = W / H;
  if (r > 1.25) return "h";
  if (r < 0.62) return "v";
  if (r < 0.9) return "p";
  return "sq";
};

export const layoutFor = (W: number, H: number): Layout => {
  const kind = kindOf(W, H);
  const u = Math.min(W, H) / 1080;
  const base = { W, H, cx: W / 2, cy: H / 2, u, kind };
  if (kind === "v")
    return {
      ...base,
      // Reels/TikTok chrome: caption + buttons over the bottom ~300 px, icons down the right edge
      safe: { x: 60, y: 120, w: W - 120, h: H - 420 },
      headline: { x: 80, y: 250, w: W - 160, h: 300, size: 92 },
      stage: { x: 60, y: 560, w: W - 120, h: 1200 },
      bug: { x: 80, y: 120, size: 36 },
      lockup: { cy: H * 0.448, size: 158 },
    };
  if (kind === "h")
    return {
      ...base,
      // headline column on the left, stage on the right — never letterbox a vertical film
      safe: { x: 80 * u, y: 60 * u, w: W - 160 * u, h: H - 120 * u },
      headline: { x: 120 * u, y: H * 0.3, w: W * 0.4, h: H * 0.45, size: 88 * u },
      stage: { x: W * 0.5, y: 80 * u, w: W * 0.46, h: H - 160 * u },
      bug: { x: 120 * u, y: 72 * u, size: 34 * u },
      lockup: { cy: H * 0.4, size: 150 * u },
    };
  if (kind === "p")
    return {
      ...base,
      safe: { x: 60, y: 80, w: W - 120, h: H - 200 },
      headline: { x: 80, y: 150, w: W - 160, h: 260, size: 80 },
      stage: { x: 90, y: 440, w: W - 180, h: H - 520 },
      bug: { x: 80, y: 70, size: 32 },
      lockup: { cy: H * 0.42, size: 140 },
    };
  return {
    ...base,
    safe: { x: 60, y: 60, w: W - 120, h: H - 120 },
    headline: { x: 80, y: 110, w: W - 160, h: 220, size: 72 },
    stage: { x: 140, y: 340, w: W - 280, h: H - 400 },
    bug: { x: 80, y: 50, size: 30 },
    lockup: { cy: H * 0.4, size: 130 },
  };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height);
};

/**
 * Fit a fixed-size design box (e.g. a 880×1140 chat card) into a rect —
 * centred, uniformly scaled, never upscaled past `max`. Author UI once at a
 * comfortable size; every format reuses it.
 */
export const Fit: React.FC<{ w: number; h: number; into?: Rect; max?: number; align?: "center" | "top"; children: React.ReactNode; style?: React.CSSProperties }> = ({
  w,
  h,
  into,
  max = 1,
  align = "center",
  children,
  style,
}) => {
  const L = useLayout();
  const r = into ?? L.stage;
  const s = Math.min(r.w / w, r.h / h, max);
  const x = r.x + (r.w - w * s) / 2;
  const y = align === "top" ? r.y : r.y + (r.h - h * s) / 2;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `scale(${s})`, transformOrigin: "0 0", ...style }}>{children}</div>
  );
};

/** Where a point inside a <Fit> design box lands on screen (for flyers, taps, bursts). */
export const fitPoint = (L: Layout, w: number, h: number, px: number, py: number, into?: Rect, max = 1) => {
  const r = into ?? L.stage;
  const s = Math.min(r.w / w, r.h / h, max);
  return { x: r.x + (r.w - w * s) / 2 + px * s, y: r.y + (r.h - h * s) / 2 + py * s, s };
};
