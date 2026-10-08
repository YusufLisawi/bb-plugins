import React from "react";
import { Img, staticFile } from "remotion";
import { C } from "../theme";
import {
  MARK_H,
  MARK_LEN,
  MARK_NUBS,
  MARK_PARTS,
  MARK_STROKE,
  MARK_W,
  PART_LEN,
  PART_START,
  markPoint,
  LOGO_TYPE,
  LOGO_FILE,
  LOGO_ICON,
} from "../lib/logo";

/**
 * The brand mark. Stroke logos draw as a pen stroke; image logos (brand.json
 * logo.type "image") reveal with a left-to-right wipe and ignore colour/stroke/
 * head, and render nothing for trails (`start` > 0).
 * The Brainfast mark as a pen stroke. `progress` is how much of the pen path is
 * drawn (0–1), `start` trims the tail (for comet trails and erasing). At
 * progress 1 / start 0 it is pixel-identical to the official logo.
 */
export const Mark: React.FC<{
  progress?: number;
  start?: number;
  color?: string;
  stroke?: number;
  height?: number;
  head?: string | null;
  headScale?: number;
  opacity?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({
  progress = 1,
  start = 0,
  color = C.coral,
  stroke = MARK_STROKE,
  height = 318,
  head = null,
  headScale = 1,
  opacity = 1,
  style,
  children,
}) => {
  if (LOGO_TYPE === "image") {
    if (start > 0) return null;
    const p = Math.max(0, Math.min(1, progress));
    // a wide logo is illegible in small square spots (avatar tiles, the corner bug): use the square icon there
    if (LOGO_ICON && height < 120 && MARK_W / MARK_H > 1.6)
      return <Img src={staticFile(LOGO_ICON)} style={{ width: height, height, objectFit: "contain", display: "block", opacity, borderRadius: height * 0.22, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, ...style }} />;
    return (
      <div style={{ position: "relative", width: (MARK_W * height) / MARK_H, height, opacity, clipPath: `inset(-2% ${(1 - p) * 102}% -2% -2%)`, ...style }}>
        <Img src={staticFile(LOGO_FILE)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        {children}
      </div>
    );
  }
  const s = height / MARK_H;
  const a = Math.max(0, Math.min(1, start)) * MARK_LEN;
  const e = Math.max(0, Math.min(1, progress)) * MARK_LEN;
  const hp = e > 0.5 && e < MARK_LEN - 0.5 ? markPoint(e) : null;
  return (
    <svg
      width={MARK_W * s}
      height={MARK_H * s}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      fill="none"
      style={{ overflow: "visible", display: "block", opacity, ...style }}
    >
      {MARK_PARTS.map((d, i) => {
        const lo = Math.max(0, a - PART_START[i]);
        const hi = Math.min(PART_LEN[i], e - PART_START[i]);
        if (hi - lo <= 0.05) return null;
        return (
          <path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${hi - lo} ${PART_LEN[i] * 2 + 50}`}
            strokeDashoffset={-lo}
          />
        );
      })}
      {MARK_NUBS.map((d, i) => {
        const at = PART_START[i + 1];
        if (e < at || a > at) return null;
        return <path key={`n${i}`} d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" />;
      })}
      {hp && head ? <circle cx={hp.x} cy={hp.y} r={(stroke / 2) * headScale} fill={head} /> : null}
      {children}
    </svg>
  );
};
