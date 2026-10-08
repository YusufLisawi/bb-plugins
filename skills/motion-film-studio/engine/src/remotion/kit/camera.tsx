import React from "react";
import { E, clamp, tw } from "../lib/ease";
import { Pt, crPath, crPoint } from "../lib/path";
import { useLayout } from "./format";

/**
 * One continuous camera through a small world is the single biggest "premium"
 * signal: the viewer never sees a hard cut, every transition is a move.
 *
 *   <World cam={{ x, y, s }} anchor={{ x: L.cx, y: L.cy }}> …children at world coords… </World>
 *
 * Camera recipe (from the films):
 *  - pans: 22–24 frames, E.expoInOut, with a "swing" (scale dips ~12% mid-move)
 *  - pull-backs: 40–45 frames, E.cubicInOut, reveal the system (all phones, the wall)
 *  - pushes: slow drift 0.9 → 0.95 over a hold so no frame is ever static
 *  - the dive: scale ×6 with E.expoIn into a brand element, then the next scene
 * Build x/y/s as sums of tweens: x = A * tw(pan1) − A * tw(pan2) + …
 */
export type Cam = { x: number; y: number; s: number };

export const swing = (t: number, depth = 0.12) => 1 - depth * Math.sin(Math.PI * clamp(t));

export const World: React.FC<{ cam: Cam; anchor?: { x: number; y: number }; children: React.ReactNode; style?: React.CSSProperties }> = ({ cam, anchor, children, style }) => {
  const L = useLayout();
  const a = anchor ?? { x: L.stage.x + L.stage.w / 2, y: L.stage.y + L.stage.h / 2 };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${a.x}px, ${a.y}px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`, ...style }}>
      {children}
    </div>
  );
};

/** World point → frame point for a camera (for screen-space flyers and effects that must follow the world). */
export const worldToScreen = (p: Pt, cam: Cam, anchor: { x: number; y: number }): Pt => ({ x: anchor.x + (p.x - cam.x) * cam.s, y: anchor.y + (p.y - cam.y) * cam.s });

/**
 * Something that travels along a smooth path (a question flying to the team, a
 * correction flying into the brain). Tilts along the tangent, scales from→to.
 */
export const Flyer: React.FC<{ f: number; pts: Pt[]; span: [number, number]; from?: number; to?: number; children: React.ReactNode }> = ({ f, pts, span, from = 1, to = 1, children }) => {
  if (f < span[0] || f >= span[1]) return null;
  const t = tw(f, span[0], span[1], 0, 1, E.expoInOut);
  const p = crPoint(pts, t);
  const q = crPoint(pts, Math.min(1, t + 0.02));
  const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  const tilt = clamp(Math.sin(Math.PI * t) * 1.2) * Math.max(-14, Math.min(14, ang * 0.25));
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${from + (to - from) * t})`, filter: "drop-shadow(0 26px 40px rgba(23,23,23,.28))" }}>
      {children}
    </div>
  );
};

/** A dashed lane that draws itself along a path, then marches (the "flow" between two things). */
export const Lane: React.FC<{ f: number; pts: Pt[]; len: number; draw: [number, number]; color: string; width?: number; march?: boolean }> = ({ f, pts, len, draw, color, width = 12, march = true }) => {
  const t = tw(f, draw[0], draw[1], 0, 1, E.expoInOut);
  if (t <= 0) return null;
  const d = crPath(pts);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={width * 3.6} strokeLinecap="round" strokeDasharray={`${len * t} ${len * 2}`} />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={t < 1 ? `${len * t} ${len * 2}` : "2 30"} strokeDashoffset={t < 1 || !march ? 0 : -(f - draw[1]) * 5} />
    </g>
  );
};
