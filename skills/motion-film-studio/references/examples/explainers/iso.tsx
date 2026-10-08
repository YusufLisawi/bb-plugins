import React from "react";
import { mixColor } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Icon, IconName } from "../../kit/ui";

/** An isometric block (2:1). (x, y) = the centre of its top face. w = width, h = side height. */
export const IsoBlock: React.FC<{ x: number; y: number; w: number; h: number; color: string; glow?: number; children?: React.ReactNode; label?: string }> = ({ x, y, w, h, color, glow = 0, children, label }) => {
  const hw = w / 2;
  const hd = w / 4; // half the diamond's height (2:1)
  const top = mixColor(color, "#FFFFFF", 0.28 + 0.25 * glow);
  const left = mixColor(color, "#FFFFFF", 0.06 * glow);
  const right = mixColor(color, "#000000", 0.2 - 0.1 * glow);
  return (
    <div style={{ position: "absolute", left: x - hw, top: y - hd, width: w, height: h + hd * 2, filter: glow > 0 ? `drop-shadow(0 0 ${30 * glow}px ${color})` : undefined }}>
      <svg width={w} height={h + hd * 2} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polygon points={`0,${hd} ${hw},${hd * 2} ${hw},${hd * 2 + h} 0,${hd + h}`} fill={left} />
        <polygon points={`${hw},${hd * 2} ${w},${hd} ${w},${hd + h} ${hw},${hd * 2 + h}`} fill={right} />
        <polygon points={`${hw},0 ${w},${hd} ${hw},${hd * 2} 0,${hd}`} fill={top} />
        <polyline points={`0,${hd} ${hw},${hd * 2} ${w},${hd}`} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={2} />
      </svg>
      {/* anything laid flat on the top face */}
      <div style={{ position: "absolute", left: hw, top: hd, transform: "translate(-50%, -50%) scaleY(0.5) rotate(45deg)" }}>{children}</div>
      {label ? (
        <div style={{ position: "absolute", left: 0, top: hd * 2 + h * 0.5 - 16, width: hw, textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: "rgba(255,255,255,.95)", transform: "skewY(26.57deg)", transformOrigin: "0 0" }}>{label}</div>
      ) : null}
    </div>
  );
};

/** An icon laid on a top face (use as IsoBlock children). */
export const FaceIcon: React.FC<{ name: IconName; size?: number; color?: string }> = ({ name, size = 84, color = "#FFFFFF" }) => (
  <div style={{ transform: "rotate(-45deg)" }}>
    <Icon name={name} size={size} color={color} stroke={2.4} />
  </div>
);

/** A simple brain glyph (two lobes with folds). */
export const BrainGlyph: React.FC<{ size: number; color?: string }> = ({ size, color = "#FFFFFF" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 18 C 38 8, 18 14, 20 32 C 8 38, 8 58, 20 64 C 18 80, 36 90, 50 80" />
    <path d="M50 18 C 62 8, 82 14, 80 32 C 92 38, 92 58, 80 64 C 82 80, 64 90, 50 80" />
    <path d="M50 18 L 50 80" />
    <path d="M30 38 C 36 40, 38 46, 36 52" />
    <path d="M70 38 C 64 40, 62 46, 64 52" />
    <path d="M28 62 C 34 60, 40 62, 42 68" />
    <path d="M72 62 C 66 60, 60 62, 58 68" />
  </svg>
);

/** A small tag on a leader line (what a block is). */
export const Tag: React.FC<{ title: string; sub?: string; color: string; hot?: number; style?: React.CSSProperties }> = ({ title, sub, color, hot = 0, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "12px 22px 12px 14px", borderRadius: 999, background: C.white, boxShadow: `0 14px 30px rgba(23,23,23,.12), 0 0 0 ${3 + 3 * hot}px ${mixColor("#FFFFFF", color, 0.35 + 0.65 * hot)}`, fontFamily: FONT, whiteSpace: "nowrap", transform: `scale(${1 + 0.06 * hot})`, transformOrigin: "0 50%", ...style }}>
    <div style={{ width: 26, height: 26, borderRadius: 13, background: color }} />
    <div>
      <div style={{ fontSize: 36, fontWeight: 750, letterSpacing: "-0.03em", color: C.ink, lineHeight: 1.05 }}>{title}</div>
      {sub ? <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 3 }}>{sub}</div> : null}
    </div>
  </div>
);
