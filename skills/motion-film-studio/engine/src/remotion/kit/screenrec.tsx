import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { E, clamp, mix, tw } from "../lib/ease";
import { C, FONT, MONO } from "../theme";
import { Mark } from "../brand/Mark";
import { Icon, IconName } from "./ui";
import { Face, FaceSpec } from "./people";

/**
 * A phone SCREEN RECORDING, full-bleed 1080×1920 — the most native look for a
 * "reply to comment" video. iOS details: the red recording pill behind the
 * clock, white status icons, gray tap circles, notification banners.
 */
export const IOS = '-apple-system, "SF Pro Text", "TikTok Sans", "DM Sans", system-ui, sans-serif';

export const StatusBar: React.FC<{ time: string; dark?: boolean; rec?: boolean }> = ({ time, dark = false, rec = true }) => {
  const col = dark ? "#FFFFFF" : "#111111";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, zIndex: 30, fontFamily: IOS }}>
      <div style={{ position: "absolute", left: 92, top: 42, height: 50, padding: "0 16px", borderRadius: 25, background: rec ? "#FF3B30" : "transparent", display: "flex", alignItems: "center", fontSize: 36, fontWeight: 650, color: rec ? "#FFFFFF" : col, letterSpacing: "-0.01em" }}>{time}</div>
      <div style={{ position: "absolute", left: 540 - 125, top: 30, width: 250, height: 74, borderRadius: 37, background: "#000" }} />
      <div style={{ position: "absolute", right: 70, top: 50, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          {[12, 17, 22, 27].map((h) => (
            <div key={h} style={{ width: 7, height: h, borderRadius: 2, background: col }} />
          ))}
        </div>
        <svg width={40} height={30} viewBox="0 0 24 18">
          <path d="M12 16.5 L 15 13 A 5 5 0 0 0 9 13 Z M 4.5 9 A 11 11 0 0 1 19.5 9 L 17.3 11.4 A 8 8 0 0 0 6.7 11.4 Z M 1 5.5 A 16 16 0 0 1 23 5.5 L 20.8 7.9 A 13 13 0 0 0 3.2 7.9 Z" fill={col} />
        </svg>
        <div style={{ width: 54, height: 26, borderRadius: 8, boxShadow: `inset 0 0 0 2.5px ${col}`, opacity: 0.9, padding: 4, boxSizing: "border-box" }}>
          <div style={{ width: "72%", height: "100%", borderRadius: 3, background: col }} />
        </div>
      </div>
    </div>
  );
};

/** iOS-style touch indicator. */
export const Tap: React.FC<{ f: number; x: number; y: number; at: number }> = ({ f, x, y, at }) => {
  if (f < at - 6 || f > at + 12) return null;
  const inn = tw(f, at - 6, at, 0, 1, E.expoOut);
  const out = tw(f, at + 2, at + 12, 0, 1, E.linear);
  return <div style={{ position: "absolute", left: x - 42, top: y - 42, width: 84, height: 84, borderRadius: 42, background: "rgba(120,120,128,.45)", border: "3px solid rgba(255,255,255,.7)", transform: `scale(${mix(1.3, 1, inn)})`, opacity: inn * (1 - out), zIndex: 60 }} />;
};

/** iOS notification banner (drops from the top). */
export const Banner: React.FC<{ f: number; at: number; until: number; app: string; icon: React.ReactNode; title: string; body: string }> = ({ f, at, until, app, icon, title, body }) => {
  if (f < at - 2 || f > until + 12) return null;
  const s = tw(f, at, at + 10, 0, 1, E.expoOut) * (1 - tw(f, until, until + 10, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: 130, transform: `translateY(${(s - 1) * 260}px)`, zIndex: 40, borderRadius: 44, background: "rgba(245,245,247,.97)", boxShadow: "0 20px 50px rgba(0,0,0,.28)", padding: "24px 28px", display: "flex", gap: 22, fontFamily: IOS }}>
      <div style={{ width: 84, height: 84, borderRadius: 20, overflow: "hidden", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#6E6E73" }}>
          <span style={{ fontWeight: 600 }}>{app.toUpperCase()}</span>
          <span>now</span>
        </div>
        <div style={{ fontSize: 33, fontWeight: 700, color: "#111", marginTop: 4, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 31, color: "#333", marginTop: 2, lineHeight: 1.25 }}>{body}</div>
      </div>
    </div>
  );
};

export const AppIcon: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => <div style={{ width: "100%", height: "100%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>;
export const MailIcon = () => (
  <AppIcon bg="linear-gradient(180deg,#3BA2FF,#1A6FF0)">
    <Icon name="mail" size={50} color="#FFFFFF" stroke={2.3} />
  </AppIcon>
);
export const BfIcon = () => (
  <AppIcon bg={C.coral}>
    <Mark height={48} color={C.cream} stroke={26} />
  </AppIcon>
);

/* ── WhatsApp chat screen ── */
export const WA = { head: "#F6F6F6", bg: "#EFE7DE", me: "#D9FDD3", green: "#25D366" };
export const WaScreen: React.FC<{ name: string; who?: FaceSpec; bizIcon?: React.ReactNode; sub?: string; children: React.ReactNode; scroll?: number }> = ({ name, who, bizIcon, sub = "online", children, scroll = 0 }) => (
  <div style={{ position: "absolute", inset: 0, background: WA.bg, fontFamily: IOS }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 250, background: WA.head, borderBottom: "1px solid #DDD" }}>
      <div style={{ position: "absolute", left: 30, top: 150, display: "flex", alignItems: "center", gap: 18 }}>
        <svg width={30} height={50} viewBox="0 0 12 20"><path d="M10 2 L 2 10 L 10 18" stroke="#0A84FF" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden", background: "#DDD" }}>{who ? <Face p={who} size={80} /> : bizIcon}</div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 650, color: "#111" }}>{name}</div>
          <div style={{ fontSize: 27, color: "#6E6E73" }}>{sub}</div>
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 250, bottom: 150, overflow: "hidden" }}>
      <div style={{ padding: "460px 40px 30px", display: "flex", flexDirection: "column", gap: 18, transform: `translateY(${-scroll}px)` }}>{children}</div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: WA.head, display: "flex", alignItems: "flex-start", padding: "22px 26px", gap: 18, boxSizing: "border-box" }}>
      <div style={{ flex: 1, height: 72, borderRadius: 36, background: C.white, border: "1px solid #DDD" }} />
      <div style={{ width: 72, height: 72, borderRadius: 36, background: WA.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="mic" size={36} color="#FFF" stroke={2.4} />
      </div>
    </div>
  </div>
);
export const WaMsg: React.FC<{ f: number; at: number; me?: boolean; children: React.ReactNode; time: string; ai?: boolean }> = ({ f, at, me, children, time, ai }) => {
  if (f < at) return null;
  const s = tw(f, at, at + 6, 0, 1, E.expoOut);
  return (
    <div style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 860, transform: `translateY(${(1 - s) * 20}px)`, opacity: s }}>
      <div style={{ padding: "16px 22px 12px", borderRadius: me ? "26px 26px 6px 26px" : "26px 26px 26px 6px", background: me ? WA.me : C.white, boxShadow: "0 1px 1px rgba(0,0,0,.12)", fontSize: 42, lineHeight: 1.28, color: "#111" }}>
        {ai ? <div style={{ fontSize: 24, fontWeight: 650, color: C.coral, marginBottom: 4 }}>AI assistant</div> : null}
        {children}
        <div style={{ fontSize: 23, color: "#8A8A8E", textAlign: "right", marginTop: 4 }}>{time}</div>
      </div>
    </div>
  );
};

/* ── the Brainfast mobile app ── */
export const BfScreen: React.FC<{ agent: string; tab?: string; children: React.ReactNode }> = ({ agent, tab, children }) => (
  <div style={{ position: "absolute", inset: 0, background: C.cream, fontFamily: FONT, color: C.ink }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 290, background: C.white, borderBottom: "2px solid #ECE8E0" }}>
      <div style={{ position: "absolute", left: 40, top: 140, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mark height={44} color={C.cream} stroke={26} />
        </div>
        <div>
          <div style={{ fontSize: 38, fontWeight: 750, letterSpacing: "-0.03em" }}>{agent}</div>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.1em", color: C.gray }}>BRAINFAST · AGENT</div>
        </div>
      </div>
      {tab ? (
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 0, display: "flex", gap: 34, fontSize: 30, fontWeight: 650, color: C.gray }}>
          {["Chat Logs", "Live chats", "Knowledge", "Settings"].map((t) => (
            <div key={t} style={{ paddingBottom: 16, color: t === tab ? C.ink : C.gray, borderBottom: t === tab ? `5px solid ${C.coral}` : "5px solid transparent", whiteSpace: "nowrap" }}>{t}</div>
          ))}
        </div>
      ) : null}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 290, bottom: 0, overflow: "hidden" }}>{children}</div>
  </div>
);

export const Row: React.FC<{ f: number; at: number; icon?: IconName; img?: string; title: string; sub?: string; right?: React.ReactNode; hot?: number }> = ({ f, at, icon, img, title, sub, right, hot = 0 }) => {
  if (f < at) return null;
  const s = tw(f, at, at + 8, 0, 1, E.expoOut);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "24px 40px", borderBottom: "2px solid #EFECE5", background: hot > 0 ? `rgba(217,87,89,${0.08 * hot})` : "transparent", transform: `translateX(${(1 - s) * 60}px)`, opacity: s }}>
      <div style={{ width: 80, height: 80, borderRadius: 22, background: "#F4F1EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {img ? <Img src={staticFile(img)} style={{ width: 46, height: 46 }} /> : <Icon name={icon ?? "file"} size={42} color={C.coral} stroke={2.2} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {sub ? <div style={{ fontSize: 30, color: C.gray, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div> : null}
      </div>
      {right}
    </div>
  );
};

export const Pill: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({ children, color = C.green, bg = C.greenTint }) => (
  <div style={{ padding: "8px 16px", borderRadius: 999, background: bg, color, fontFamily: MONO, fontSize: 22, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{children}</div>
);

/** Sonner-style toast inside the app. */
export const AppToast: React.FC<{ f: number; at: number; until: number; text: string }> = ({ f, at, until, text }) => {
  if (f < at - 1 || f > until + 10) return null;
  const s = tw(f, at, at + 8, 0, 1, E.expoOut) * (1 - tw(f, until, until + 8, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: 260, transform: `translateY(${(1 - s) * 80}px)`, opacity: s, zIndex: 35, display: "flex", alignItems: "center", gap: 18, padding: "26px 30px", borderRadius: 26, background: C.ink, color: C.cream, fontFamily: FONT, fontSize: 30, fontWeight: 600, boxShadow: "0 20px 50px rgba(0,0,0,.3)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="check" size={26} color="#FFF" stroke={3} />
      </div>
      {text}
    </div>
  );
};

/** A horizontal "swipe between apps" transition: scenes slide like the iOS app switcher bar swipe. */
export const swipeX = (f: number, at: number) => tw(f, at - 8, at + 8, 0, 1, E.expoInOut);
export const zoomTo = (f: number, keysArr: [number, number, number, number][]) => {
  // [frame, scale, originX, originY]
  let s = 1, ox = 540, oy = 960;
  for (let i = 0; i < keysArr.length; i++) {
    const [k, sc, x, y] = keysArr[i];
    const prev = keysArr[i - 1];
    if (!prev) { if (f <= k) { s = sc; ox = x; oy = y; } continue; }
    if (f >= prev[0]) {
      const t = tw(f, prev[0], k, 0, 1, E.cubicInOut);
      s = mix(prev[1], sc, t); ox = mix(prev[2], x, t); oy = mix(prev[3], y, t);
    }
  }
  return { s, ox, oy };
};
export const clamp01 = clamp;
