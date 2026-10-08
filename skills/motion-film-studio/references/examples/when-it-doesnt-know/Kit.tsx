import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame } from "remotion";
import { Icon, IconName } from "../../components/Icons";
import { Mark } from "../../components/Mark";
import { E, clamp, mix, mixColor, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { DROP, LFPS } from "../timing";

export const pop = (f: number, at: number, damping = 13, stiffness = 170, mass = 0.6) =>
  spring({ frame: f - at, fps: LFPS, config: { damping, mass, stiffness } });

/** 0 before the drop (dark, chaotic), 1 after it (cream, calm). */
export const dayness = (f: number) => tw(f, DROP - 2, DROP + 14, 0, 1, E.cubicInOut);
export const inkOn = (f: number) => mixColor(C.cream, C.ink, dayness(f));

export type HWord = { t: string; at: number; hi?: boolean; br?: boolean };

/**
 * The film's voice made visible: a bold headline where each word rises out of
 * its own mask on the frame it is spoken; key words turn coral. Unlike a caption
 * it *builds* — so the screen reads like a line of a poster being set.
 */
export const Headline: React.FC<{
  words: HWord[];
  from: number;
  to: number;
  y: number;
  size?: number;
  align?: "left" | "center";
  color?: string;
  width?: number;
}> = ({ words, from, to, y, size = 84, align = "left", color, width = 920 }) => {
  const f = useCurrentFrame();
  if (f < from - 4 || f > to + 7) return null;
  const out = tw(f, to, to + 7, 0, 1, E.expoIn);
  const ink = color ?? inkOn(f);
  return (
    <div
      style={{
        position: "absolute",
        left: align === "left" ? 80 : (1080 - width) / 2,
        top: y,
        width,
        textAlign: align,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.04em",
        lineHeight: 1.04,
        color: ink,
        opacity: 1 - out,
        transform: `translateY(${-out * 40}px)`,
      }}
    >
      {words.map((w, i) => {
        const t = tw(f, w.at - 3, w.at + 11, 0, 1, E.expoOut);
        return (
          <React.Fragment key={i}>
            <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.04em 0.03em 0.16em", margin: "-0.04em -0.03em -0.16em" }}>
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - t) * 135}%)`,
                  opacity: t > 0 ? 1 : 0,
                  color: w.hi ? mixColor(ink, C.coral, clamp(t * 1.5)) : ink,
                }}
              >
                {w.t}
              </span>
            </span>
            {w.br ? <br /> : i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Background: dark and noisy during the problem, cream and ordered after the drop. */
export const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const d = dayness(f);
  const bg = mixColor("#121113", C.cream, d);
  const dot = d > 0.5 ? "23,23,23" : "250,249,245";
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(rgba(${dot},${0.07 + 0.02 * (1 - d)}) 1.6px, transparent 1.6px)`,
          backgroundSize: "40px 40px",
          backgroundPosition: `${(f * 0.3) % 40}px 0px`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Brand bug, top-left, same size in every scene; appears with the solution. */
export const Bug: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  const v = tw(f, from, from + 14, 0, 1, E.expoOut) * tw(f, to, to + 10, 1, 0, E.expoIn);
  if (v <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 6, opacity: v, transform: `translateY(${(1 - v) * -12}px)` }}>
      <Mark height={36} color={C.coral} />
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 34, letterSpacing: "-0.025em", color: inkOn(f), lineHeight: 1 }}>brainfast.</span>
    </div>
  );
};

/* ───────── building blocks ───────── */

export const CHANNEL: Record<string, { img?: string; icon?: IconName; label: string }> = {
  whatsapp: { img: "img/icons/whatsapp.svg", label: "WhatsApp" },
  instagram: { img: "img/icons/instagram.svg", label: "Instagram" },
  messenger: { img: "img/icons/messenger.svg", label: "Messenger" },
  gmail: { img: "img/icons/gmail.svg", label: "Email" },
  web: { icon: "globe", label: "Website" },
  phone: { icon: "phone", label: "Phone" },
  slack: { img: "img/icons/slack.svg", label: "Slack" },
};

export const ChannelGlyph: React.FC<{ ch: keyof typeof CHANNEL; size: number; color?: string }> = ({ ch, size, color = C.ink }) => {
  const c = CHANNEL[ch];
  return c.img ? <Img src={staticFile(c.img)} style={{ width: size, height: size, display: "block" }} /> : <Icon name={c.icon!} size={size} color={color} stroke={2} />;
};

/** App tile with an unread badge (the chaos section). */
export const AppTile: React.FC<{ ch: keyof typeof CHANNEL; count: string; size?: number; style?: React.CSSProperties }> = ({ ch, count, size = 132, style }) => (
  <div style={{ position: "relative", width: size, height: size, ...style }}>
    <div style={{ width: size, height: size, borderRadius: size * 0.26, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 40px rgba(0,0,0,.35)" }}>
      <ChannelGlyph ch={ch} size={size * 0.52} />
    </div>
    <div
      style={{
        position: "absolute",
        right: -size * 0.14,
        top: -size * 0.14,
        minWidth: size * 0.42,
        height: size * 0.42,
        padding: "0 12px",
        boxSizing: "border-box",
        borderRadius: 999,
        background: "#E5484D",
        color: "#fff",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size * 0.22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 0 5px #121113",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {count}
    </div>
  </div>
);

export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div
    style={{
      background: C.white,
      borderRadius: 36,
      boxShadow: "0 30px 70px rgba(23,23,23,.12), 0 3px 10px rgba(23,23,23,.06)",
      fontFamily: FONT,
      color: C.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Bubble: React.FC<{ me?: boolean; children: React.ReactNode; tone?: "coral" | "ink" | "white" | "sand"; style?: React.CSSProperties }> = ({
  me,
  children,
  tone,
  style,
}) => {
  const t = tone ?? (me ? "coral" : "white");
  const bg = t === "coral" ? C.coral : t === "ink" ? C.ink : t === "sand" ? C.sand : C.white;
  const fg = t === "coral" || t === "ink" ? C.white : C.ink;
  return (
    <div
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: 560,
        padding: "22px 28px",
        fontFamily: FONT,
        fontSize: 32,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
        borderRadius: me ? "34px 34px 10px 34px" : "34px 34px 34px 10px",
        background: bg,
        color: fg,
        boxShadow: t === "white" ? "0 8px 20px rgba(23,23,23,.07)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Label in mono caps (UI metadata). */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.gray, size = 20, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.1em", color, textTransform: "uppercase", ...style }}>{children}</div>
);

/** A finger tap: a ring that contracts onto the point, then a ripple. */
export const Tap: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const f = useCurrentFrame();
  if (f < at - 10 || f > at + 24) return null;
  const come = tw(f, at - 10, at, 0, 1, E.expoOut);
  const rip = tw(f, at, at + 22, 0, 1, E.expoOut);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <circle cx={x} cy={y} r={mix(70, 30, come)} fill="rgba(23,23,23,.14)" stroke="rgba(255,255,255,.9)" strokeWidth={4} opacity={f < at + 6 ? come : 1 - rip} />
      {f >= at ? <circle cx={x} cy={y} r={30 + 70 * rip} fill="none" stroke={C.coral} strokeWidth={4 * (1 - rip)} opacity={1 - rip} /> : null}
    </svg>
  );
};

/** Phone device frame; children draw inside the screen (screen coords). */
export const PHONE = { w: 640, h: 1300, inset: 14, r: 96 };
export const Phone: React.FC<{ x: number; y: number; s?: number; rot?: number; children: React.ReactNode; screenBg?: string; style?: React.CSSProperties }> = ({
  x,
  y,
  s = 1,
  rot = 0,
  children,
  screenBg = "#F5F3EE",
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: PHONE.w,
      height: PHONE.h,
      borderRadius: PHONE.r,
      background: "#0E0E11",
      boxShadow: "0 70px 140px rgba(23,23,23,.35), inset 0 0 0 2px rgba(255,255,255,.08)",
      transform: `scale(${s}) rotate(${rot}deg)`,
      transformOrigin: "50% 0%",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: PHONE.inset,
        top: PHONE.inset,
        width: PHONE.w - PHONE.inset * 2,
        height: PHONE.h - PHONE.inset * 2,
        borderRadius: PHONE.r - 14,
        overflow: "hidden",
        background: screenBg,
      }}
    >
      {children}
      <div style={{ position: "absolute", top: 24, left: (PHONE.w - PHONE.inset * 2) / 2 - 80, width: 160, height: 46, borderRadius: 23, background: "#050506", zIndex: 9 }} />
    </div>
  </div>
);

/** Chat header with the agent avatar (Brainfast mark on coral). */
export const ChatHeader: React.FC<{ title: string; sub: string; live?: boolean }> = ({ title, sub, live }) => (
  <div style={{ height: 184, background: C.white, borderBottom: "1px solid #ECE9E2", display: "flex", alignItems: "flex-end", padding: "0 28px 24px", gap: 18, boxSizing: "border-box", fontFamily: FONT }}>
    <div style={{ width: 72, height: 72, borderRadius: 36, background: live ? C.ink : C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {live ? <Icon name="users" size={36} color={C.cream} /> : <Mark height={38} color={C.cream} stroke={24} />}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>{title}</div>
      <Mono size={17} style={{ marginTop: 4 }}>{sub}</Mono>
    </div>
    {live ? (
      <div style={{ padding: "8px 14px", borderRadius: 999, background: C.coral, color: C.white, fontFamily: MONO, fontSize: 17, letterSpacing: "0.1em" }}>● LIVE</div>
    ) : null}
  </div>
);
