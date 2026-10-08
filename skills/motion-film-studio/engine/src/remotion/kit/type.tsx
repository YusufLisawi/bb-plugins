import React from "react";
import { useCurrentFrame } from "remotion";
import { E, clamp, mix, tw } from "../lib/ease";
import { FONT, SANS } from "../theme";
import { useLayout } from "./format";
import { ShineText } from "./fx";

/**
 * The voice made visible. Each word rises out of its own mask on the frame it
 * is spoken (ws(line, i) from timing), with a small tilt and a weight "breath"
 * (180 heavier → settles). Key words take the accent colour; `shineAt` runs a
 * highlight through the accent words once the line lands.
 *
 * Rules that keep it clean (all learned the hard way):
 *  - one headline per thought, 2–3 lines, ≤ 24 characters per line
 *  - the previous headline must finish its exit (`exit` frames) before the
 *    next line's first word rises: set `to` ≥ exit frames before the next `from`
 *  - masks carry padding for ascenders/descenders so nothing is ever cropped
 *  - on dark scenes pass a light `color` explicitly — never rely on inheritance
 */
export type KWord = { t: string; at: number; hi?: boolean; br?: boolean; italic?: boolean };

export const Kinetic: React.FC<{
  words: KWord[];
  from: number;
  to: number;
  x?: number;
  y?: number;
  size?: number;
  width?: number;
  align?: "left" | "center";
  color: string;
  hi: string;
  weight?: number;
  shineAt?: number;
  shineHi?: string;
  exit?: number;
  /** style for the accent (shine) words, e.g. a drop-shadow: an inherited text-shadow shows THROUGH
   *  background-clip text and turns the accent colour muddy, so headlines with a shadow pass it here */
  shineStyle?: React.CSSProperties;
}> = ({ words, from, to, x, y, size, width, align = "left", color, hi, weight = 700, shineAt, shineHi, exit = 8, shineStyle }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  if (f < from - 4 || f > to + exit) return null;
  const Z = L.headline;
  const W = width ?? Z.w;
  const X = x ?? (align === "center" ? (L.W - W) / 2 : Z.x);
  const Y = y ?? Z.y;
  const S = size ?? Z.size;
  const out = tw(f, to, to + exit, 0, 1, E.expoIn);
  return (
    <div
      style={{
        position: "absolute",
        left: X,
        top: Y,
        width: W,
        textAlign: align,
        fontFamily: FONT,
        fontSize: S,
        fontWeight: weight,
        letterSpacing: "-0.045em",
        lineHeight: 1.02,
        color,
        opacity: 1 - out,
        transform: `translateY(${-out * 50 * L.u}px)`,
      }}
    >
      {words.map((w, i) => {
        const t = tw(f, w.at - 3, w.at + 12, 0, 1, E.expoOut);
        const col = w.hi ? hi : color;
        return (
          <React.Fragment key={i}>
            <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.04em 0.2em", margin: "-0.06em -0.04em -0.2em" }}>
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - t) * 135}%) rotate(${(1 - t) * 6}deg)`,
                  transformOrigin: "0% 100%",
                  opacity: t > 0 ? 1 : 0,
                  fontStyle: w.italic ? "italic" : "normal",
                  fontVariationSettings: `"wght" ${Math.round(mix(weight + 180, weight, t))}`,
                }}
              >
                {shineAt !== undefined && w.hi ? (
                  <ShineText at={shineAt + i * 2} base={col} hi={shineHi ?? "#FFFFFF"} style={shineStyle}>
                    {w.t}
                  </ShineText>
                ) : (
                  <span style={{ color: col }}>{w.t}</span>
                )}
              </span>
            </span>
            {w.br ? <br /> : i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Letters rising one by one out of a mask (wordmarks, big single words). */
export const Letters: React.FC<{ text: string; at: number; stagger?: number; dur?: number; style?: React.CSSProperties }> = ({ text, at, stagger = 1.8, dur = 18, style }) => {
  const f = useCurrentFrame();
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.1em 0.02em 0.22em", margin: "-0.1em -0.02em -0.22em", whiteSpace: "pre", ...style }}>
      {text.split("").map((ch, i) => {
        const t = tw(f, at + i * stagger, at + dur + i * stagger, 0, 1, E.expoOut);
        return (
          <span key={i} style={{ position: "relative", top: `${(1 - t) * 1.2}em`, opacity: clamp(t * 2) }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/** Typewriter text with a blinking caret (composer boxes, notes). */
export const Typed: React.FC<{ text: string; from: number; to: number; caretColor?: string; style?: React.CSSProperties }> = ({ text, from, to, caretColor = "currentColor", style }) => {
  const f = useCurrentFrame();
  const n = Math.round(tw(f, from, to, 0, text.length, E.linear));
  const caret = f < to + 20 && Math.floor(f / 8) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, n)}
      <span style={{ display: "inline-block", width: "0.08em", height: "1em", marginLeft: 2, verticalAlign: "-0.15em", background: caret ? caretColor : "transparent" }} />
    </span>
  );
};

/** Measure text with the loaded font — for exact lockups and camera framing. */
let ctx: CanvasRenderingContext2D | null = null;
export const measure = (text: string, size: number, weight: number, trackingEm = 0, family = SANS) => {
  if (typeof document === "undefined") return text.length * size * 0.55;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.55;
  ctx.font = `${weight} ${size}px "${family}"`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${trackingEm * size}px`;
  ctx.fontKerning = "normal";
  return ctx.measureText(text).width;
};

/**
 * How many lines a paragraph wraps to inside `maxW` (word wrap measured with the
 * loaded font). Chat rows that grow in should grow to their REAL height — an
 * easing on a generous maxHeight reaches the real height in ~1 frame and the
 * whole list snaps (the glitch scan flags it).
 */
export const wrapLines = (text: string, size: number, weight: number, maxW: number, family = SANS) => {
  const words = text.split(/\s+/).filter(Boolean);
  const space = measure(" ", size, weight, 0, family);
  let lines = 1;
  let cur = 0;
  for (const w of words) {
    const ww = measure(w, size, weight, 0, family);
    if (cur > 0 && cur + space + ww > maxW) {
      lines++;
      cur = ww;
    } else cur += (cur > 0 ? space : 0) + ww;
  }
  return lines;
};
