import React from "react";
import { Icon, IconName } from "../../components/Icons";
import { Mark } from "../../components/Mark";
import { C, FONT, MONO } from "../../theme";

/** Dark-glass UI kit for film #5. */
export const CREAM = "#FAF9F5";
export const DIM = "rgba(250,249,245,.62)";
export const FAINT = "rgba(250,249,245,.38)";

export const GPanel: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode; glow?: number }> = ({ style, children, glow = 0 }) => (
  <div
    style={{
      position: "absolute",
      borderRadius: 44,
      background: "linear-gradient(160deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.035) 45%, rgba(255,255,255,.05) 100%)",
      boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.13), inset 0 1px 0 rgba(255,255,255,.25), 0 50px 120px rgba(0,0,0,.55), 0 0 ${80 * glow}px rgba(217,87,89,${0.35 * glow})`,
      overflow: "hidden",
      fontFamily: FONT,
      color: CREAM,
      ...style,
    }}
  >
    {children}
  </div>
);

export const GLabel: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = DIM, size = 19, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.12em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

/** Customer on the left (neutral glass), agent on the right (coral glass) — the business-side log view. */
export const GBubble: React.FC<{ who: "customer" | "agent"; children: React.ReactNode; s?: number; flag?: number; style?: React.CSSProperties }> = ({ who, children, s = 1, flag = 0, style }) => {
  const agent = who === "agent";
  return (
    <div
      style={{
        alignSelf: agent ? "flex-end" : "flex-start",
        display: "flex",
        alignItems: "flex-end",
        gap: 14,
        flexDirection: agent ? "row-reverse" : "row",
        transform: `scale(${0.6 + 0.4 * s})`,
        transformOrigin: agent ? "100% 100%" : "0% 100%",
        opacity: Math.min(1, s * 2),
        ...style,
      }}
    >
      {agent ? (
        <div style={{ width: 52, height: 52, borderRadius: 26, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Mark height={28} color={CREAM} stroke={24} />
        </div>
      ) : null}
      <div
        style={{
          position: "relative",
          maxWidth: 640,
          padding: "22px 30px",
          borderRadius: agent ? "36px 36px 10px 36px" : "36px 36px 36px 10px",
          background: agent ? "rgba(217,87,89,.20)" : "rgba(255,255,255,.09)",
          boxShadow: agent
            ? `inset 0 0 0 1.5px rgba(238,143,139,${0.45 + 0.55 * flag}), 0 0 ${40 * flag}px rgba(217,87,89,${0.5 * flag})`
            : "inset 0 0 0 1.5px rgba(255,255,255,.12)",
          fontSize: 34,
          lineHeight: 1.3,
          letterSpacing: "-0.012em",
          color: CREAM,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Thumbs: React.FC<{ down?: number; up?: number; press?: number; style?: React.CSSProperties }> = ({ down = 0, up = 0, press = 1, style }) => (
  <div style={{ alignSelf: "flex-end", display: "flex", gap: 14, marginRight: 66, ...style }}>
    {(["thumbsUp", "thumbsDown"] as IconName[]).map((ic, i) => {
      const on = i === 0 ? up : down;
      return (
        <div
          key={ic}
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            background: on > 0.5 ? (i === 0 ? "#35B97B" : C.coral) : "rgba(255,255,255,.08)",
            boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${i === 1 ? press : 1})`,
          }}
        >
          <Icon name={ic} size={32} color={on > 0.5 ? "#FFFFFF" : DIM} stroke={2.2} />
        </div>
      );
    })}
  </div>
);

/** A fingertip on dark glass: closes onto the point, then a coral ripple. Screen coords. */
export const Touch: React.FC<{ f: number; x: number; y: number; at: number }> = ({ f, x, y, at }) => {
  if (f < at - 8 || f > at + 20) return null;
  const come = Math.min(1, Math.max(0, (f - (at - 8)) / 8));
  const e = 1 - Math.pow(1 - come, 3);
  const rip = Math.min(1, Math.max(0, (f - at) / 18));
  const rr = 1 - Math.pow(1 - rip, 3);
  const r = 58 - 26 * e;
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: "50%", background: "rgba(255,255,255,.14)", border: "3px solid rgba(255,255,255,.85)", boxSizing: "border-box", opacity: f < at + 4 ? e : 1 - rr }} />
      {f >= at ? (
        <div style={{ position: "absolute", left: -(32 + 64 * rr), top: -(32 + 64 * rr), width: (32 + 64 * rr) * 2, height: (32 + 64 * rr) * 2, borderRadius: "50%", border: `${5 * (1 - rr)}px solid ${C.coral}`, boxSizing: "border-box", opacity: 1 - rr }} />
      ) : null}
    </div>
  );
};

export const Chip: React.FC<{ icon?: IconName; children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties }> = ({ icon, children, color = C.coral, bg = "rgba(217,87,89,.16)", style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: bg, color, fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>
    {icon ? <Icon name={icon} size={20} color={color} stroke={2.4} /> : null}
    {children}
  </div>
);
