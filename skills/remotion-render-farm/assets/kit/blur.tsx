import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Motion blur that every renderer draws (CLI, Lambda, the browser in Chrome capture and default mode), from the
 * OPERADOR render lab (Oct 2026). Smear is the favourite: one render, a directional SVG Gaussian, smooth however
 * fast. MotionBlur is exact (it averages sub-frames) but costs `samples` renders of its children and comes out
 * faded in the browser's default mode. All three switch themselves off above 60 fps (a supersampled master already
 * renders real sub-frames) and when the layer is slow.
 */

/** Motion blur along any direction in one render: the layer is turned into its direction of travel, blurred along
 *  that axis only, and turned back. A 180° shutter smears half a frame of travel; a Gaussian of 0.29 × that length
 *  looks like a box of that length. `vx`, `vy` in px per frame; `id` unique in the frame. Spins and zooms: MotionBlur. */
export const Smear: React.FC<{ vx: number; vy: number; id: string; children: React.ReactNode }> = ({ vx, vy, id, children }) => {
  const { fps } = useVideoConfig();
  const sigma = 0.145 * Math.hypot(vx, vy);
  if (sigma < 0.8 || fps > 60) return <>{children}</>;
  const a = Math.atan2(vy, vx);
  return (
    <>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sigma} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `rotate(${a}rad)`, filter: `url(#${id})` }}>
        <AbsoluteFill style={{ transform: `rotate(${-a}rad)` }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </>
  );
};

/** Smear for a layer sliding sideways only (no rotation wrapper). `vx` in px per frame. */
export const SpeedSmear: React.FC<{ vx: number; id: string; children: React.ReactNode }> = ({ vx, id, children }) => {
  const { fps } = useVideoConfig();
  const sigma = 0.29 * 0.5 * Math.abs(vx);
  if (sigma < 1 || fps > 60) return <>{children}</>;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-25%" y="0%" width="150%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sigma} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Exact motion blur for one moving layer: the children drawn `samples` times at moments spread over the shutter
 * (half a frame, a 180° film shutter), each at 1/samples opacity, added up (plus-lighter) in an isolated group.
 * Inactive, it draws the children once, so still frames stay pixel-identical. The children must read the frame
 * themselves (useCurrentFrame), not take positions computed outside. Chrome capture and the CLI draw it right;
 * the default browser mode draws the copies faded.
 */
export const MotionBlur: React.FC<{ active: boolean; samples?: number; shutter?: number; children: React.ReactNode }> = ({ active, samples = 8, shutter = 0.5, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!active || fps > 60) return <>{children}</>;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {Array.from({ length: samples }, (_, k) => (
        <AbsoluteFill key={k} style={{ opacity: 1 / samples, mixBlendMode: "plus-lighter" }}>
          <Freeze frame={f + (k - (samples - 1) / 2) * (shutter / samples)}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
