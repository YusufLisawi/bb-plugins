import React from "react";
import { AbsoluteFill, Audio, Freeze, staticFile, useCurrentFrame } from "remotion";
import { Grain } from "../components/Fx";
import { CheckDisc, Icon, IconName } from "../components/Icons";
import { Mark } from "../components/Mark";
import { loadFonts } from "../fonts";
import { E, clamp, keys, mix, rnd, tw } from "../lib/ease";
import { C, FONT, MONO } from "../theme";
import { CHANNEL, ChannelGlyph } from "../loop/components/Kit";
import { Burst, Kinetic, Odometer, Ring, Sheen, Sparkle, Sparkles, springAt } from "../fx2/Fx2";
import { Lockup } from "../fx2/Lockup";
import { VO, ws } from "./timing";

loadFonts();

/**
 * Film #7 — "The hire". A WANTED poster for the impossible employee; nobody
 * applies — until Brainfast does, ticks every box and gets HIRED. Day one on
 * an ID badge, week one live on every channel, a performance review with a
 * correction that sticks, a promotion, and Employee of the Month — every month.
 */
const CREAM = "#FAF9F5";
const PAPER = "#F6F0E4";
const DROP = ws("l06", 2) - 1; // "applied"
const HIRED = DROP + 16;
const DAY1 = VO.l07 - 8;
const WEEK1 = VO.l08 - 8;
const REVIEW = VO.l09 - 8;
const PROMO = VO.l10 - 6;
const EOTM = VO.l11 - 6;
const HIT = ws("l12", 0) - 2;

const REQS: { t: string; icon: IconName; at: number }[] = [
  { t: "Works nights", icon: "moon", at: ws("l02", 1) - 2 },
  { t: "Weekends", icon: "calendar", at: ws("l02", 2) - 2 },
  { t: "Holidays", icon: "sun", at: ws("l02", 3) - 2 },
  { t: "Speaks every language your customers do", icon: "globe", at: ws("l03", 1) - 2 },
  { t: "Answers in seconds", icon: "zap", at: ws("l04", 0) - 2 },
];

/** Deterministic confetti. */
const Confetti: React.FC<{ at: number; x?: number; y?: number; n?: number }> = ({ at, x = 540, y = 700, n = 60 }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + 60) return null;
  const t = f - at;
  const cols = [C.coral, C.ink, "#F2B544", "#5E6AD2", "#1C9A83", CREAM];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (rnd(i * 3.1) - 0.5) * 2.4;
        const v = 18 + rnd(i * 7.3) * 22;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 0.9 * t * t;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 14, height: 26, background: cols[i % cols.length], transform: `rotate(${t * (8 + rnd(i) * 20)}deg)`, opacity: 1 - tw(t, 40, 60, 0, 1, E.linear) }} />;
      })}
    </>
  );
};

const Stamp: React.FC<{ at: number; text: string; x: number; y: number; rot?: number; size?: number; color?: string }> = ({ at, text, x, y, rot = -12, size = 150, color = C.coral }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = keys(f, [[at, 2.6], [at + 5, 0.92], [at + 10, 1]], E.cubicInOut);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`, opacity: clamp((f - at) / 3), padding: "10px 34px", border: `10px solid ${color}`, borderRadius: 24, color, fontFamily: FONT, fontSize: size, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, mixBlendMode: color === C.coral ? "multiply" : "normal", textShadow: color === C.coral ? "none" : "0 10px 30px rgba(60,10,10,.35)", boxShadow: color === C.coral ? "none" : "0 10px 30px rgba(60,10,10,.25)" }}>
      {text}
    </div>
  );
};

/* ───────── A–B · the poster ───────── */
const Poster: React.FC<{ f: number }> = ({ f }) => {
  if (f > DAY1 + 10) return null;
  const inS = clamp(springAt(f, -2, 30, 12, 170));
  const droop = keys(f, [[ws("l05", 3) - 2, 0], [ws("l05", 3) + 6, 1], [DROP - 6, 1], [DROP + 4, 0]], E.cubicInOut);
  const shake = f >= HIRED && f < HIRED + 12 ? Math.sin((f - HIRED) * 2.5) * 10 * (1 - (f - HIRED) / 12) : 0;
  const out = tw(f, DAY1 - 6, DAY1 + 8, 0, 1, E.expoIn);
  const cvS = clamp(springAt(f, ws("l06", 1) - 4, 30, 14, 150));
  const letters = "WANTED.".split("");
  const ticked = (i: number) => DROP + 2 + i * 3;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 45%, #E0676A 0%, ${C.coral} 55%, #B94346 100%)`, transform: `translateY(${-out * 1920}px)` }}>
      <div style={{ position: "absolute", left: 80, top: 250, width: 920, height: 1380, background: PAPER, borderRadius: 10, boxShadow: "0 50px 120px rgba(60,10,10,.45)", transform: `translate(${shake}px, ${(1 - inS) * 1400}px) rotate(${-1.5 + droop * 6}deg)`, transformOrigin: "50% 0%", fontFamily: FONT, color: C.ink, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(120,90,60,.06) 1.5px, transparent 1.5px)", backgroundSize: "7px 7px" }} />
        <div style={{ position: "absolute", left: 60, right: 60, top: 60, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.coralDeep }}>
          <span>OPEN POSITION · 001</span>
          <span>URGENT</span>
        </div>
        <div style={{ position: "absolute", left: 50, top: 110, fontSize: 210, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1 }}>
          {letters.map((ch, i) => {
            const s = keys(f, [[ws("l01", 0) - 4 + i * 2, 2.2], [ws("l01", 0) + 2 + i * 2, 1]], E.expoOut);
            const o = clamp((f - (ws("l01", 0) - 4 + i * 2)) / 3);
            return (
              <span key={i} style={{ display: "inline-block", transform: `scale(${s})`, opacity: o, color: i === 6 ? C.coral : C.ink }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 60, right: 60, top: 350, height: 6, background: C.ink, transform: `scaleX(${tw(f, ws("l01", 1) - 6, ws("l01", 1) + 8, 0, 1, E.expoOut)})`, transformOrigin: "0 50%" }} />
        <div style={{ position: "absolute", left: 60, right: 60, top: 390, fontSize: 52, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.12 }}>
          {"Someone who knows your business inside out.".split(" ").map((w, i) => {
            const t = tw(f, ws("l01", Math.min(i + 1, 7)) - 3, ws("l01", Math.min(i + 1, 7)) + 8, 0, 1, E.expoOut);
            return (
              <span key={i} style={{ display: "inline-block", marginRight: "0.25em", opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 60, right: 60, top: 560, display: "flex", flexDirection: "column", gap: 18 }}>
          {REQS.map((r, i) => {
            const s = keys(f, [[r.at, 1.6], [r.at + 5, 0.96], [r.at + 9, 1]], E.cubicInOut);
            const o = clamp((f - r.at) / 3);
            const tick = tw(f, ticked(i), ticked(i) + 8, 0, 1, E.cubicInOut);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "22px 26px", borderRadius: 20, boxShadow: `inset 0 0 0 3px ${tick > 0.5 ? C.coral : C.ink}`, background: tick > 0.5 ? "#FBE7E4" : "transparent", transform: `scale(${s}) rotate(${(i % 2 ? 0.6 : -0.6) * (1 - tick)}deg)`, opacity: o }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, boxShadow: `inset 0 0 0 3px ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", background: tick > 0 ? C.coral : "transparent" }}>
                  {tick > 0 ? <CheckDisc t={tick} size={52} bg={C.coral} fg="#FFFFFF" /> : null}
                </div>
                <Icon name={r.icon} size={38} color={C.ink} stroke={2.4} />
                <div style={{ fontSize: i === 3 ? 33 : 40, fontWeight: 700, letterSpacing: "-0.02em", flex: 1 }}>{r.t}</div>
              </div>
            );
          })}
        </div>
        {/* applicants: zero */}
        {f >= ws("l05", 0) - 4 ? (
          <div style={{ position: "absolute", left: 60, right: 60, bottom: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 32px", borderRadius: 22, background: C.ink, color: CREAM, opacity: clamp((f - ws("l05", 0) + 4) / 6) }}>
            <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em" }}>APPLICANTS SO FAR</div>
            <div style={{ fontSize: 80, fontWeight: 800, color: f >= DROP ? C.coralLight : CREAM, transform: `scale(${f >= ws("l05", 3) - 1 && f < ws("l05", 3) + 8 ? 1.25 : 1})` }}>{f >= DROP + 2 ? "1" : "0"}</div>
          </div>
        ) : null}
        <Stamp at={HIRED} text="HIRED" x={640} y={500} rot={-14} size={170} />
      </div>
      {/* the pushpin */}
      <div style={{ position: "absolute", left: 540 - 26, top: 250 - 26 + (1 - inS) * 1400, width: 52, height: 52, borderRadius: 26, background: "radial-gradient(circle at 35% 35%, #FF8A8C, #A8292C)", boxShadow: "0 8px 16px rgba(0,0,0,.35)" }} />
      {/* the application */}
      {f >= ws("l06", 1) - 6 ? (
        <div style={{ position: "absolute", left: 190, top: 1665, width: 700, padding: "30px 34px", borderRadius: 30, background: "#FFFFFF", boxShadow: "0 40px 90px rgba(60,10,10,.45)", transform: `translate(${(1 - cvS) * 900}px, ${-out * 300}px) rotate(${mix(12, 3, cvS)}deg)`, fontFamily: FONT, color: C.ink, display: "flex", alignItems: "center", gap: 24, overflow: "hidden" }}>
          <div style={{ width: 110, height: 110, borderRadius: 28, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark height={62} color={CREAM} stroke={22} />
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: C.coralDeep }}>APPLICATION · 001</div>
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.03em" }}>brainfast.</div>
            <div style={{ fontSize: 26, color: C.gray }}>AI agent · ready tonight</div>
          </div>
          <Sheen at={DROP} dur={18} opacity={0.6} />
        </div>
      ) : null}
      <Ring x={640} y={750} at={HIRED} r={900} width={26} color={CREAM} dur={30} />
      <Burst x={640} y={750} at={HIRED} n={20} r0={120} r1={480} colors={[CREAM, C.ink, "#F2B544"]} width={7} dur={28} />
      <Confetti at={HIRED} x={640} y={720} />
    </AbsoluteFill>
  );
};

/* ───────── C · day one: the badge ───────── */
const STICKERS: { t: string; icon: IconName; at: number; from: [number, number] }[] = [
  { t: "Docs", icon: "file", at: ws("l07", 5) - 2, from: [220, 820] },
  { t: "Website", icon: "globe", at: ws("l07", 7) - 2, from: [840, 900] },
  { t: "FAQs", icon: "help", at: ws("l07", 9) - 2, from: [230, 1560] },
];
const Badge: React.FC<{ f: number; y?: number; title?: string; scale?: number }> = ({ f, y = 640, title = "AI Agent", scale = 1 }) => {
  const swing = Math.sin((f - DAY1) * 0.12) * 4 * Math.exp(-(f - DAY1) / 40);
  return (
    <div style={{ position: "absolute", left: 540 - 250, top: y, width: 500, transform: `rotate(${swing}deg) scale(${scale})`, transformOrigin: "50% -200px", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 225, top: -260, width: 50, height: 280, background: `repeating-linear-gradient(0deg, ${C.coral} 0 20px, ${C.coralDeep} 20px 40px)`, borderRadius: 6 }} />
      <div style={{ position: "relative", borderRadius: 40, background: "#FFFFFF", boxShadow: "0 50px 110px rgba(23,23,23,.2)", padding: "60px 40px 44px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 200, top: 20, width: 100, height: 18, borderRadius: 9, background: "#E9E4DA" }} />
        <div style={{ width: 200, height: 200, borderRadius: 100, margin: "10px auto 0", background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mark height={112} color={CREAM} stroke={22} />
        </div>
        <div style={{ fontSize: 58, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 26, color: C.ink }}>brainfast.</div>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.coralDeep, marginTop: 8 }}>{title.toUpperCase()}</div>
        <div style={{ marginTop: 26, height: 6, background: `repeating-linear-gradient(90deg, ${C.ink} 0 6px, transparent 6px 10px)` }} />
      </div>
    </div>
  );
};
const DayOne: React.FC<{ f: number }> = ({ f }) => {
  if (f < DAY1 - 2 || f > WEEK1 + 12) return null;
  const s = clamp(springAt(f, DAY1, 30, 11, 120));
  const out = tw(f, WEEK1 - 6, WEEK1 + 8, 0, 1, E.expoIn);
  const prog = tw(f, STICKERS[0].at, STICKERS[2].at + 20, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ background: CREAM, transform: `translateY(${(1 - s) * 1920 - out * 1920}px)` }}>
      <div style={{ position: "absolute", left: 80, top: 540, fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.coralDeep }}>DAY 01 · ONBOARDING</div>
      <Badge f={f} y={900} scale={1.3} />
      {STICKERS.map((st, i) => {
        if (f < st.at) return null;
        const p = clamp(springAt(f, st.at, 30, 12, 200));
        const eat = tw(f, st.at + 10, st.at + 22, 0, 1, E.expoIn);
        if (eat >= 1) return null;
        const x = mix(st.from[0], 540, eat);
        const y = mix(st.from[1], 1200, eat);
        return (
          <div key={i} style={{ position: "absolute", left: x - 120, top: y - 45, display: "flex", alignItems: "center", gap: 14, padding: "18px 30px", borderRadius: 999, background: "#FFFFFF", boxShadow: `0 20px 40px rgba(23,23,23,.14), inset 0 0 0 3px ${C.coral}`, fontFamily: FONT, fontSize: 42, fontWeight: 700, color: C.ink, transform: `scale(${mix(0.4, 1, p) * mix(1, 0.2, eat)})`, opacity: 1 - tw(eat, 0.8, 1, 0, 1, E.linear) }}>
            <Icon name={st.icon} size={40} color={C.coral} stroke={2.4} />
            {st.t}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 140, right: 140, top: 1660, fontFamily: FONT }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: C.gray }}>
          <span>ONBOARDING</span>
          <span>{Math.round(prog * 100)}%</span>
        </div>
        <div style={{ marginTop: 12, height: 18, borderRadius: 9, background: "#E9E4DA", overflow: "hidden" }}>
          <div style={{ width: `${prog * 100}%`, height: "100%", background: C.coral, borderRadius: 9 }} />
        </div>
      </div>
      {STICKERS.map((st, i) => <Sparkle key={i} x={540 + (i - 1) * 180} y={1060} at={st.at + 22} size={44} color={C.coral} />)}
    </AbsoluteFill>
  );
};

/* ───────── D · week one: live everywhere ───────── */
const CHS: { ch: keyof typeof CHANNEL; at: number; msg: string; x: number }[] = [
  { ch: "web", at: ws("l08", 6) - 2, msg: "Open on Sunday?", x: 200 },
  { ch: "whatsapp", at: ws("l08", 7) - 2, msg: "Can I book for 4?", x: 540 },
  { ch: "instagram", at: ws("l08", 9) - 2, msg: "Do you ship to Italy?", x: 880 },
];
const WeekOne: React.FC<{ f: number }> = ({ f }) => {
  if (f < WEEK1 - 2 || f > REVIEW + 12) return null;
  const s = clamp(springAt(f, WEEK1, 30, 14, 140));
  const out = tw(f, REVIEW - 6, REVIEW + 8, 0, 1, E.expoIn);
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  return (
    <AbsoluteFill style={{ background: C.ink, transform: `translateY(${(1 - s) * 1920 - out * 1920}px)`, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 80, top: 540, fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: C.coralLight }}>WEEK 01 · LIVE</div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 640, display: "flex", gap: 10 }}>
        {days.map((d, i) => {
          const on = tw(f, WEEK1 + 10 + i * 4, WEEK1 + 16 + i * 4, 0, 1, E.expoOut);
          return (
            <div key={d} style={{ flex: 1, height: 110, borderRadius: 20, background: `rgba(217,87,89,${0.15 + 0.6 * on})`, color: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 20, letterSpacing: "0.1em", gap: 6 }}>
              {d}
              <div style={{ width: 10, height: 10, borderRadius: 5, background: on > 0.5 ? "#7BE0A9" : "rgba(255,255,255,.2)" }} />
            </div>
          );
        })}
      </div>
      {CHS.map((c, i) => {
        const p = clamp(springAt(f, c.at, 30, 12, 190));
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: c.x - 95, top: 1000, width: 190, height: 190, borderRadius: 54, background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.3, 1, p)})`, opacity: f >= c.at ? clamp(p * 2) : 0.15, boxShadow: p > 0 ? `0 0 0 ${10 * (1 - tw(f, c.at, c.at + 20, 0, 1, E.expoOut))}px rgba(217,87,89,.5)` : "none" }}>
              <ChannelGlyph ch={c.ch} size={100} />
            </div>
            {f >= c.at + 6 ? (
              <div style={{ position: "absolute", left: c.x - 150, width: 300, top: 1240, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ padding: "16px 22px", borderRadius: "26px 26px 26px 8px", background: "rgba(255,255,255,.12)", color: CREAM, fontSize: 26, fontWeight: 600, transform: `scale(${clamp(springAt(f, c.at + 6, 30, 13, 190))})` }}>{c.msg}</div>
                {f >= c.at + 16 ? (
                  <div style={{ padding: "16px 22px", borderRadius: "26px 26px 8px 26px", background: C.coral, color: "#FFFFFF", fontSize: 26, fontWeight: 600, transform: `scale(${clamp(springAt(f, c.at + 16, 30, 13, 190))})` }}>Answered ✓</div>
                ) : null}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 80, right: 80, top: 1560, padding: "26px 32px", borderRadius: 28, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "space-between", color: CREAM }}>
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: "rgba(250,249,245,.7)" }}>CONVERSATIONS THIS WEEK</div>
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.04em" }}>
          <Odometer value={1284} from={0} at={WEEK1 + 12} dur={70} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── E · the performance review ───────── */
const ROWS = [
  { q: "What time do you open?", a: "9 AM, every day.", ok: true },
  { q: "Can I return these shoes?", a: "Returns are case by case.", ok: false },
  { q: "Do you deliver on Sundays?", a: "Yes, 10 AM – 4 PM.", ok: true },
];
const Review: React.FC<{ f: number }> = ({ f }) => {
  if (f < REVIEW - 2 || f > PROMO + 12) return null;
  const s = clamp(springAt(f, REVIEW, 30, 14, 140));
  const out = tw(f, PROMO - 6, PROMO + 8, 0, 1, E.expoIn);
  const fb = ws("l09", 9) - 2; // "feedback"
  const right = ws("l09", 13) - 2; // "right"
  const note = clamp(springAt(f, fb, 30, 12, 180));
  const fixed = f >= right;
  return (
    <AbsoluteFill style={{ background: CREAM, transform: `translateY(${(1 - s) * 1920 - out * 1920}px)`, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 90, top: 560, width: 900, height: 1180, borderRadius: 36, background: "#FFFFFF", boxShadow: "0 50px 110px rgba(23,23,23,.16)", padding: "50px 44px", boxSizing: "border-box", color: C.ink }}>
        <div style={{ position: "absolute", left: 340, top: -40, width: 220, height: 80, borderRadius: 20, background: C.ink }} />
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", color: C.coralDeep }}>PERFORMANCE REVIEW · WEEK 01</div>
        <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 10 }}>Chat Logs</div>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 20 }}>
          {ROWS.map((r, i) => {
            const rs = clamp(springAt(f, REVIEW + 10 + i * 5, 30, 15, 170));
            const bad = !r.ok;
            const ok = r.ok || fixed;
            return (
              <div key={i} style={{ padding: "22px 24px", borderRadius: 24, background: bad && !fixed && f >= fb ? "#FDECEA" : "#F6F3EE", boxShadow: bad && f >= fb ? `inset 0 0 0 3px ${fixed ? "#2E9C6A" : C.coral}` : "none", transform: `translateX(${(1 - rs) * 300}px)`, opacity: rs, position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: 30, fontWeight: 700 }}>“{r.q}”</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mark height={22} color={CREAM} stroke={24} />
                  </div>
                  <div style={{ flex: 1, fontSize: 28, color: "#3A3A3A" }}>{bad && fixed ? "Yes! Free returns within 30 days." : r.a}</div>
                  <Icon name={ok ? "thumbsUp" : "thumbsDown"} size={34} color={ok ? "#2E9C6A" : C.coral} stroke={2.4} />
                </div>
                {bad && fixed ? <Sheen at={right} dur={16} opacity={0.6} /> : null}
              </div>
            );
          })}
        </div>
        {f >= fb ? (
          <div style={{ position: "absolute", left: 470, top: 700, width: 380, padding: "26px 28px", background: "#FFF3C9", boxShadow: "0 20px 40px rgba(23,23,23,.18)", transform: `rotate(${mix(-14, 4, note)}deg) scale(${mix(0.5, 1, note)})`, opacity: clamp(note * 2), fontSize: 30, fontWeight: 600, lineHeight: 1.25, color: C.ink }}>
            <div style={{ position: "absolute", left: 140, top: -16, width: 100, height: 32, background: "rgba(217,87,89,.5)" }} />
            Mention free returns (30 days).
          </div>
        ) : null}
        {fixed ? (
          <div style={{ position: "absolute", left: 60, bottom: 60, display: "flex", alignItems: "center", gap: 12, padding: "18px 26px", borderRadius: 999, background: "#EAF6EF", color: "#2E9C6A", fontSize: 28, fontWeight: 700 }}>
            <CheckDisc t={tw(f, right, right + 10, 0, 1, E.cubicInOut)} size={40} bg="#2E9C6A" fg="#FFFFFF" />
            Replaced the previous answer
          </div>
        ) : null}
        <Stamp at={ws("l09", 15) - 2} text="A+" x={740} y={1010} rot={-10} size={170} />
      </div>
    </AbsoluteFill>
  );
};

/* ───────── F · the promotion ───────── */
const TASKS: { icon: IconName; t: string; m: string; at: number }[] = [
  { icon: "calendar", t: "Meeting booked", m: "TUE · 10:30 AM", at: ws("l10", 4) - 2 },
  { icon: "userPlus", t: "Lead captured", m: "MARIA R. · WANTS A QUOTE", at: ws("l10", 6) - 2 },
  { icon: "headset", t: "Team brought in", m: "SAM · SUPPORT · FULL CONTEXT", at: ws("l10", 9) - 2 },
];
const Promotion: React.FC<{ f: number }> = ({ f }) => {
  if (f < PROMO - 2 || f > EOTM + 12) return null;
  const s = clamp(springAt(f, PROMO, 30, 14, 140));
  const out = tw(f, EOTM - 6, EOTM + 8, 0, 1, E.expoIn);
  const promoted = ws("l10", 2) - 2;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 40%, #E0676A 0%, ${C.coral} 55%, #B94346 100%)`, transform: `translateY(${(1 - s) * 1920 - out * 1920}px)`, fontFamily: FONT }}>
      <Stamp at={promoted} text="PROMOTED" x={540} y={620} rot={-6} size={130} color={CREAM} />
      <Confetti at={promoted + 2} x={540} y={600} n={70} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 860, display: "flex", flexDirection: "column", gap: 26 }}>
        {TASKS.map((t, i) => {
          const p = clamp(springAt(f, t.at, 30, 13, 170));
          return (
            <div key={i} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 24, padding: "30px 32px", borderRadius: 34, background: "#FFFFFF", boxShadow: "0 30px 70px rgba(60,10,10,.3)", transform: `translateX(${(1 - p) * (i % 2 ? 1100 : -1100)}px) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)`, color: C.ink }}>
              <div style={{ width: 90, height: 90, borderRadius: 26, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={t.icon} size={48} color={C.coral} stroke={2.3} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>{t.t}</div>
                <div style={{ fontFamily: MONO, fontSize: 21, letterSpacing: "0.1em", color: C.gray, marginTop: 6 }}>{t.m}</div>
              </div>
              <CheckDisc t={tw(f, t.at + 6, t.at + 16, 0, 1, E.cubicInOut)} size={60} bg={C.coral} fg="#FFFFFF" />
              <Sheen at={t.at + 4} dur={16} opacity={0.6} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ───────── G · employee of the month, every month ───────── */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const Frame: React.FC<{ m: string; w: number }> = ({ m, w }) => (
  <div style={{ width: w, padding: w * 0.06, borderRadius: w * 0.04, background: "linear-gradient(135deg, #E9B949, #B8862B)", boxShadow: "0 20px 40px rgba(23,23,23,.25)" }}>
    <div style={{ background: CREAM, borderRadius: w * 0.02, padding: `${w * 0.08}px ${w * 0.06}px`, textAlign: "center", fontFamily: FONT }}>
      <div style={{ width: w * 0.46, height: w * 0.46, borderRadius: "50%", margin: "0 auto", background: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mark height={w * 0.26} color={CREAM} stroke={22} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: w * 0.05, letterSpacing: "0.12em", color: C.gray, marginTop: w * 0.05 }}>EMPLOYEE OF THE MONTH</div>
      <div style={{ fontSize: w * 0.11, fontWeight: 800, letterSpacing: "-0.03em", color: C.ink }}>{m}</div>
    </div>
  </div>
);
const EmployeeOfTheMonth: React.FC<{ f: number }> = ({ f }) => {
  if (f < EOTM - 2 || f > HIT + 2) return null;
  const s = clamp(springAt(f, EOTM, 30, 13, 150));
  const every = ws("l11", 4) - 4;
  const wall = tw(f, every, every + 16, 0, 1, E.expoInOut);
  const col = tw(f, HIT - 14, HIT, 0, 1, E.expoIn);
  return (
    <AbsoluteFill style={{ background: CREAM, transform: `translateY(${(1 - s) * 1920}px) scale(${mix(1, 0.1, col)})`, transformOrigin: "540px 860px", opacity: 1 - tw(col, 0.6, 1, 0, 1, E.linear) }}>
      {MONTHS.map((m, i) => {
        const c = i % 4;
        const r = Math.floor(i / 4);
        const gx = 45 + c * 252;
        const gy = 700 + r * 300;
        const hero = i === 0;
        const x = hero ? mix(290, gx, wall) : gx;
        const y = hero ? mix(680, gy, wall) : gy;
        const w = hero ? mix(500, 236, wall) : 236;
        const p = hero ? 1 : clamp(springAt(f, every + 2 + i * 1.6, 30, 12, 200));
        if (!hero && f < every) return null;
        return (
          <div key={m} style={{ position: "absolute", left: x, top: y, transform: `scale(${p}) rotate(${hero ? 0 : (rnd(i) - 0.5) * 6}deg)` }}>
            <Frame m={hero ? "JANUARY" : m} w={w} />
          </div>
        );
      })}
      <Sparkles x={290} y={680} w={500} h={600} at={EOTM + 10} color="#E9B949" size={50} seed={2} />
    </AbsoluteFill>
  );
};

/* ───────── words ───────── */
const Words: React.FC = () => (
  <>
    <Kinetic from={ws("l06", 0) - 4} to={DAY1 - 8} y={120} size={96} color={CREAM} hi={C.ink} words={[
      { t: "Then", at: ws("l06", 0) }, { t: "Brainfast", at: ws("l06", 1), hi: true }, { t: "applied.", at: ws("l06", 2) },
    ]} />
    <Kinetic from={VO.l07} to={WEEK1 - 8} y={250} size={92} color={C.ink} hi={C.coral} words={[
      { t: "It", at: ws("l07", 2) }, { t: "learns", at: ws("l07", 3), br: true }, { t: "your", at: ws("l07", 4) }, { t: "docs,", at: ws("l07", 5), hi: true },
      { t: "site", at: ws("l07", 7), hi: true }, { t: "&", at: ws("l07", 8) }, { t: "FAQs.", at: ws("l07", 9), hi: true },
    ]} />
    <Kinetic from={VO.l08} to={REVIEW - 8} y={250} size={92} color={CREAM} hi={C.coralLight} words={[
      { t: "Live", at: ws("l08", 3) }, { t: "on", at: ws("l08", 4) }, { t: "your", at: ws("l08", 5), br: true },
      { t: "website,", at: ws("l08", 6), hi: true }, { t: "WhatsApp", at: ws("l08", 7), hi: true, br: true }, { t: "&", at: ws("l08", 8) }, { t: "Instagram.", at: ws("l08", 9), hi: true },
    ]} />
    <Kinetic from={VO.l09} to={ws("l09", 8) - 8} y={250} size={92} color={C.ink} hi={C.coral} words={[
      { t: "First", at: ws("l09", 0) }, { t: "performance", at: ws("l09", 1), br: true }, { t: "review:", at: ws("l09", 2) },
      { t: "you", at: ws("l09", 3) }, { t: "see", at: ws("l09", 4), hi: true }, { t: "every", at: ws("l09", 5) }, { t: "chat.", at: ws("l09", 6) },
    ]} />
    <Kinetic from={ws("l09", 8) - 3} to={PROMO - 8} y={250} size={92} color={C.ink} hi={C.coral} words={[
      { t: "Give", at: ws("l09", 8) }, { t: "feedback.", at: ws("l09", 9), hi: true, br: true },
      { t: "Right", at: ws("l09", 13), hi: true }, { t: "next", at: ws("l09", 14) }, { t: "time.", at: ws("l09", 15) },
    ]} />
    <Kinetic from={ws("l10", 3) - 3} to={EOTM - 8} y={250} size={84} color={CREAM} hi={C.ink} words={[
      { t: "It", at: ws("l10", 3) }, { t: "books,", at: ws("l10", 4), hi: true }, { t: "captures", at: ws("l10", 6), br: true },
      { t: "leads,", at: ws("l10", 7), hi: true }, { t: "brings", at: ws("l10", 9) }, { t: "in", at: ws("l10", 10), br: true },
      { t: "your", at: ws("l10", 11) }, { t: "team.", at: ws("l10", 12), hi: true },
    ]} />
    <Kinetic from={VO.l11} to={HIT - 16} y={250} size={96} color={C.ink} hi={C.coral} words={[
      { t: "Employee", at: ws("l11", 0) }, { t: "of", at: ws("l11", 1), br: true }, { t: "the", at: ws("l11", 2) }, { t: "month.", at: ws("l11", 3), br: true },
      { t: "Every", at: ws("l11", 4), hi: true }, { t: "month.", at: ws("l11", 5), hi: true },
    ]} />
  </>
);

export const Hire: React.FC<{ audio?: boolean; grain?: boolean }> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: f >= HIT - 2 ? CREAM : C.coral, overflow: "hidden" }}>
      <Poster f={f} />
      <DayOne f={f} />
      <WeekOne f={f} />
      <Review f={f} />
      <Promotion f={f} />
      <EmployeeOfTheMonth f={f} />
      <Lockup hit={HIT} tag={[ws("l12", 1), ws("l12", 2), ws("l12", 3), ws("l12", 4), ws("l12", 5)]} ctaAt={ws("l13", 0) - 2} urlAt={ws("l13", 7) - 4} cta="Build your first agent for free" />
      <Words />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("hire/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const HSS = 8;
export const HireSS: React.FC = () => {
  const i = useCurrentFrame();
  const n = Math.floor(i / HSS);
  const j = i % HSS;
  const t = Math.max(0, n + (j - (HSS - 1) / 2) * (0.5 / HSS));
  return (
    <Freeze frame={t}>
      <Hire audio={false} grain={false} />
    </Freeze>
  );
};

export const HIRE_BEATS = { DROP, HIRED, DAY1, WEEK1, REVIEW, PROMO, EOTM, HIT, REQS: REQS.map((r) => r.at), STICKERS: STICKERS.map((s) => s.at), CHS: CHS.map((c) => c.at), TASKS: TASKS.map((t) => t.at) };
