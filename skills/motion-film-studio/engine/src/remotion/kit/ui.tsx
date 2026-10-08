import React from "react";
import { Img, staticFile } from "remotion";
import { CheckDisc, Icon, IconName } from "../brand/Icons";
import { Mark } from "../brand/Mark";
import { E, mix, tw } from "../lib/ease";
import { C, FONT, MONO, ACCENT_RGB } from "../theme";

/**
 * Product UI, authored at a fixed "design box" size (e.g. an 880 × 1140 chat
 * card) and placed with <Fit> so every format reuses it. Light surfaces for
 * cream scenes, `dark` variants for night / glass scenes.
 *
 * Writing UI that sells:
 *  - use the product's REAL strings (button labels, toasts, empty states) —
 *    grep the app's source; invented UI reads as fake
 *  - show the RESULT of each answer (a tracker, a booked slot, a lead card),
 *    not just a chat bubble
 *  - text ≥ 26 px in the design box; nowrap on one-line labels, explicit
 *    line breaks in bubbles (deterministic heights, no reflow)
 *  - every panel on a dark scene sets `color` explicitly (black-on-dark bugs)
 *  - clip scrolling areas below their header so outgoing content never crosses it
 */

export const CHANNEL = {
  whatsapp: { img: "img/icons/whatsapp.svg", label: "WhatsApp" },
  instagram: { img: "img/icons/instagram.svg", label: "Instagram" },
  messenger: { img: "img/icons/messenger.svg", label: "Messenger" },
  gmail: { img: "img/icons/gmail.svg", label: "Email" },
  slack: { img: "img/icons/slack.svg", label: "Slack" },
  discord: { img: "img/icons/discord.svg", label: "Discord" },
  web: { icon: "globe" as IconName, label: "Website" },
  phone: { icon: "phone" as IconName, label: "Phone" },
} as const;
export type ChannelId = keyof typeof CHANNEL;

export const ChannelGlyph: React.FC<{ ch: ChannelId; size: number; color?: string }> = ({ ch, size, color = C.ink }) => {
  const c = CHANNEL[ch] as { img?: string; icon?: IconName };
  return c.img ? <Img src={staticFile(c.img)} style={{ width: size, height: size, display: "block" }} /> : <Icon name={c.icon!} size={size} color={color} stroke={2} />;
};

/** Small caps label (UI metadata, section eyebrows). */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.gray, size = 20, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.1em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

/** A white product card (light scenes). */
export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ position: "relative", background: C.white, borderRadius: 44, boxShadow: "0 50px 110px rgba(23,23,23,.14), 0 4px 14px rgba(23,23,23,.05)", fontFamily: FONT, color: C.ink, overflow: "hidden", ...style }}>{children}</div>
);

/** Dark glass panel (night / glass scenes). */
export const GlassPanel: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode; glow?: number }> = ({ style, children, glow = 0 }) => (
  <div
    style={{
      position: "relative",
      borderRadius: 44,
      background: "linear-gradient(160deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.035) 45%, rgba(255,255,255,.05) 100%)",
      boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.13), inset 0 1px 0 rgba(255,255,255,.25), 0 50px 120px rgba(0,0,0,.55), 0 0 ${80 * glow}px rgba(${ACCENT_RGB},${0.35 * glow})`,
      overflow: "hidden",
      fontFamily: FONT,
      color: C.cream,
      ...style,
    }}
  >
    {children}
  </div>
);

/** The agent avatar: brand mark on coral. */
export const AgentDot: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <div style={{ width: size, height: size, borderRadius: size / 2, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Mark height={size * 0.54} color={C.cream} stroke={24} />
  </div>
);

/** A person's avatar (initial on a tint). */
export const Person: React.FC<{ name: string; tint?: string; size?: number; badge?: ChannelId }> = ({ name, tint = C.coralTint, size = 72, badge }) => (
  <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
    <div style={{ width: size, height: size, borderRadius: size / 2, background: tint, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: size * 0.42, fontWeight: 700, color: C.ink }}>{name[0]}</div>
    {badge ? (
      <div style={{ position: "absolute", right: -4, bottom: -4, width: size * 0.44, height: size * 0.44, borderRadius: "50%", background: C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(23,23,23,.12)" }}>
        <ChannelGlyph ch={badge} size={size * 0.3} />
      </div>
    ) : null}
  </div>
);

/**
 * A chat bubble that pops from its corner. `me` = the customer (right, filled),
 * otherwise the agent (left, white with the brand avatar). `s` = spring 0…1.
 * Pass lines as an array for deterministic wrapping.
 */
export const Bubble: React.FC<{ me?: boolean; lines: string[]; s?: number; color?: string; dark?: boolean; avatar?: boolean; size?: number; children?: React.ReactNode }> = ({
  me,
  lines,
  s = 1,
  color = C.ink,
  dark = false,
  avatar = true,
  size = 36,
  children,
}) => (
  <div style={{ alignSelf: me ? "flex-end" : "flex-start", display: "flex", alignItems: "flex-end", gap: 14, flexDirection: me ? "row-reverse" : "row", transform: `scale(${0.6 + 0.4 * s})`, transformOrigin: me ? "100% 100%" : "0% 100%", opacity: Math.min(1, s * 2) }}>
    {!me && avatar ? <AgentDot size={size * 1.45} /> : null}
    <div
      dir="auto"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: `${size * 0.62}px ${size * 0.82}px`,
        borderRadius: me ? `${size * 1.1}px ${size * 1.1}px ${size * 0.3}px ${size * 1.1}px` : `${size * 1.1}px ${size * 1.1}px ${size * 1.1}px ${size * 0.3}px`,
        background: me ? color : dark ? `rgba(${ACCENT_RGB},.20)` : C.white,
        boxShadow: me ? "none" : dark ? "inset 0 0 0 1.5px rgba(238,143,139,.5)" : "inset 0 0 0 2px #ECE8E0",
        color: me ? "#FFFFFF" : dark ? C.cream : C.ink,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 550,
        lineHeight: 1.25,
        letterSpacing: "-0.015em",
        whiteSpace: "nowrap",
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {children}
    </div>
  </div>
);

/** Three bouncing dots (the agent is thinking). */
export const Typing: React.FC<{ f: number; color?: string; dark?: boolean }> = ({ f, color = C.gray2, dark = false }) => (
  <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "flex-end", gap: 14 }}>
    <AgentDot size={52} />
    <div style={{ display: "flex", gap: 10, padding: "28px 30px", borderRadius: "38px 38px 38px 12px", background: dark ? "rgba(255,255,255,.08)" : C.white, boxShadow: dark ? "none" : "inset 0 0 0 2px #ECE8E0" }}>
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ width: 14, height: 14, borderRadius: 7, background: dark ? C.cream : color, transform: `translateY(${-8 * Math.max(0, Math.sin((f / 7) * Math.PI - k * 0.9))}px)` }} />
      ))}
    </div>
  </div>
);

/** Pill chip (status, intent, "New lead"). */
export const Chip: React.FC<{ icon?: IconName; children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties }> = ({ icon, children, color = C.coral, bg = C.coralTint, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: bg, color, fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>
    {icon ? <Icon name={icon} size={20} color={color} stroke={2.4} /> : null}
    {children}
  </div>
);

/** A result card: what the agent DID (booked, paid, captured…). Pop it in with a spring and give it a Sheen + Sparkles as it lands. */
export const ResultCard: React.FC<{ icon: IconName; title: string; meta: string; tag?: string; check?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ icon, title, meta, tag, check = 1, style, children }) => (
  <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 26, padding: "0 34px", height: 170, boxSizing: "border-box", borderRadius: 40, background: C.white, boxShadow: "0 40px 80px rgba(23,23,23,.16), 0 4px 12px rgba(23,23,23,.06)", fontFamily: FONT, color: C.ink, ...style }}>
    <div style={{ width: 100, height: 100, borderRadius: 30, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon name={icon} size={52} color={C.coral} stroke={2.2} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>{title}</div>
      <Mono size={21} style={{ marginTop: 8 }}>
        {meta}
      </Mono>
    </div>
    {tag ? <div style={{ padding: "10px 18px", borderRadius: 999, background: C.coral, color: C.white, fontFamily: MONO, fontSize: 22, letterSpacing: "0.08em" }}>{tag}</div> : null}
    <CheckDisc t={check} size={60} bg={C.coral} fg={C.white} />
    {children}
  </div>
);

/** Fingertip tap: a ring closes onto the point (8 f), then a coral ripple (18 f). Coordinates of the parent. */
export const Touch: React.FC<{ f: number; x: number; y: number; at: number; light?: boolean }> = ({ f, x, y, at, light = true }) => {
  if (f < at - 8 || f > at + 20) return null;
  const come = tw(f, at - 8, at, 0, 1, E.expoOut);
  const rip = tw(f, at, at + 18, 0, 1, E.expoOut);
  const r = mix(58, 32, come);
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 20 }}>
      <div style={{ position: "absolute", left: -r, top: -r, width: r * 2, height: r * 2, boxSizing: "border-box", borderRadius: "50%", background: light ? "rgba(23,23,23,.16)" : "rgba(255,255,255,.14)", border: "4px solid rgba(255,255,255,.95)", opacity: f < at + 4 ? come : 1 - rip }} />
      {f >= at ? (
        <div style={{ position: "absolute", left: -(32 + 62 * rip), top: -(32 + 62 * rip), width: (32 + 62 * rip) * 2, height: (32 + 62 * rip) * 2, boxSizing: "border-box", borderRadius: "50%", border: `${5 * (1 - rip)}px solid ${C.coral}`, opacity: 1 - rip }} />
      ) : null}
    </div>
  );
};

/** Mouse cursor (desktop dashboards). press 0…1 squeezes it. */
export const Cursor: React.FC<{ x: number; y: number; press?: number; opacity?: number }> = ({ x, y, press = 0, opacity = 1 }) => (
  <svg width={60} height={60} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 8, top: y - 6, opacity, transform: `scale(${1 - 0.15 * press})`, transformOrigin: "8px 6px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.25))", zIndex: 30 }}>
    <path d="M4 3l15 7-6.5 2L10 19z" fill={C.ink} stroke={C.white} strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

/** Sonner-style toast (real product toasts sell the realism). */
export const Toast: React.FC<{ text: string; t?: number; dark?: boolean; style?: React.CSSProperties }> = ({ text, t = 1, dark = true, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 26px", borderRadius: 26, background: dark ? C.ink : C.white, color: dark ? C.cream : C.ink, boxShadow: "0 24px 60px rgba(23,23,23,.2)", fontFamily: FONT, fontSize: 26, fontWeight: 600, whiteSpace: "nowrap", ...style }}>
    <CheckDisc t={t} size={40} bg={C.coral} fg={C.white} />
    {text}
  </div>
);

/** Phone frame; children draw inside the screen (612 × 1272 at scale 1). */
export const PHONE = { w: 640, h: 1300, inset: 14, r: 96 };
export const Phone: React.FC<{ children: React.ReactNode; screenBg?: string; style?: React.CSSProperties }> = ({ children, screenBg = "#F5F3EE", style }) => (
  <div style={{ position: "relative", width: PHONE.w, height: PHONE.h, borderRadius: PHONE.r, background: "#0E0E11", boxShadow: "0 70px 140px rgba(23,23,23,.3), inset 0 0 0 2px rgba(255,255,255,.08)", ...style }}>
    <div style={{ position: "absolute", left: PHONE.inset, top: PHONE.inset, width: PHONE.w - PHONE.inset * 2, height: PHONE.h - PHONE.inset * 2, borderRadius: PHONE.r - 14, overflow: "hidden", background: screenBg }}>
      {children}
      <div style={{ position: "absolute", top: 24, left: (PHONE.w - PHONE.inset * 2) / 2 - 80, width: 160, height: 46, borderRadius: 23, background: "#050506", zIndex: 9 }} />
    </div>
  </div>
);

/** A "waiting" timer (someone is left hanging). */
export const Waiting: React.FC<{ seconds: number; color?: string; size?: number; pulse?: number }> = ({ seconds, color = C.coral, size = 24, pulse = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: size, letterSpacing: "0.1em", color }}>
    <div style={{ width: size / 2, height: size / 2, borderRadius: size / 4, background: color, opacity: pulse }} />
    WAITING 0:{String(Math.floor(seconds)).padStart(2, "0")}
  </div>
);

export { CheckDisc, Icon };
export type { IconName };
