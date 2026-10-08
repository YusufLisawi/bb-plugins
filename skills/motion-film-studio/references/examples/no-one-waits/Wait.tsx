import React from "react";
import { AbsoluteFill, Audio, Freeze, staticFile, useCurrentFrame } from "remotion";
import { Grain } from "../components/Fx";
import { CheckDisc, Icon, IconName } from "../components/Icons";
import { Mark } from "../components/Mark";
import { loadFonts } from "../fonts";
import { E, clamp, mix, rnd, tw } from "../lib/ease";
import { C, FONT, MONO } from "../theme";
import { CHANNEL, ChannelGlyph } from "../loop/components/Kit";
import { Burst, Kinetic, Ring, Sheen, Sparkle, Sparkles, springAt } from "../fx2/Fx2";
import { Lockup } from "../fx2/Lockup";
import { VO, ws } from "./timing";

loadFonts();

/**
 * Film #6 — "No one waits". Four people, four cities, four hours of the clock,
 * each waiting on a business for an answer. The camera swipes through time from
 * one to the next; on "With Brainfast" every one of them is answered at once —
 * in seconds, in their language — the urgent one goes to a person, the owner
 * sees it all, and the waiting timer from the first shot rolls back to zero.
 */
const CREAM = "#FAF9F5";
const LIFT = ws("l06", 0);
const HIT = ws("l10", 0) - 2;
const V_AT = [VO.l02, VO.l03, VO.l04, VO.l05];
const TEAM_AT = VO.l07 - 6;
const DASH_AT = VO.l08 - 8;
const NOBODY_AT = VO.l09 - 6;

type P = { city: string; time: string; night: boolean; name: string; tint: string; biz: string; icon: IconName; ch: keyof typeof CHANNEL; msg: string; ans: string; sky: [string, string, string]; urgent?: boolean; lang?: string };
const PEOPLE: P[] = [
  { city: "Lisbon", time: "11:47 PM", night: true, name: "Ana", tint: "#F6D5D1", biz: "Brightside Clinic", icon: "stethoscope", ch: "web", msg: "Can I get the first appointment tomorrow?", ans: "Yes! 8:30 AM is yours. See you then.", sky: ["#070B1E", "#1C1636", "#3A2340"] },
  { city: "New York", time: "2:14 AM", night: true, name: "Kwame", tint: "#DCEDFA", biz: "Harbor Hotel", icon: "bed", ch: "whatsapp", msg: "Landing at 3 AM. Will you still hold my room?", ans: "Of course! Your room is held. Safe travels.", sky: ["#040A16", "#0D2138", "#1B3A57"] },
  { city: "Berlin", time: "5:58 AM", night: false, name: "Lena", tint: "#E6E1F5", biz: "Flowdesk", icon: "laptop", ch: "web", msg: "Our checkout just broke. We launch in 2 hours!", ans: "I've asked a teammate, they'll reply shortly.", sky: ["#101A33", "#4B3A5E", "#D0877A"], urgent: true },
  { city: "Madrid", time: "4:30 PM", night: false, name: "Lucía", tint: "#FBE3C4", biz: "Nova Store", icon: "bag", ch: "instagram", msg: "¿Dónde está mi pedido?", ans: "¡Llega mañana! Aquí tienes el seguimiento.", sky: ["#E9925A", "#F4B97A", "#FBE3C0"], lang: "ES" },
];

/* ───────── pieces ───────── */
const Skyline: React.FC<{ seed: number; color: string; lit: number; h?: number }> = ({ seed, color, lit, h = 520 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h }}>
    {Array.from({ length: 14 }, (_, i) => {
      const w = 60 + rnd(seed * 3 + i) * 90;
      const x = i * 80 - 40 + rnd(seed + i * 1.7) * 30;
      const bh = 160 + rnd(seed * 5 + i * 2.3) * (h - 180);
      return (
        <div key={i} style={{ position: "absolute", left: x, bottom: 0, width: w, height: bh, background: color }}>
          {lit > 0
            ? Array.from({ length: 10 }, (_, k) => {
                const on = rnd(seed * 11 + i * 13 + k) > 0.62;
                if (!on) return null;
                return <div key={k} style={{ position: "absolute", left: 10 + (k % 3) * ((w - 20) / 3), top: 18 + Math.floor(k / 3) * 34, width: 10, height: 14, background: "#FFD89A", opacity: 0.55 * lit }} />;
              })
            : null}
        </div>
      );
    })}
  </div>
);

const Waiting: React.FC<{ f: number; from: number; stopAt?: number; color?: string; size?: number }> = ({ f, from, stopAt, color = C.coral, size = 24 }) => {
  const t = Math.max(0, Math.min(stopAt ?? f, f) - from) / 30 + 3;
  const s = Math.floor(t);
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(f * 0.15));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: size, letterSpacing: "0.1em", color }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: color, opacity: pulse }} />
      WAITING 0:{String(s).padStart(2, "0")}
    </div>
  );
};

const MsgCard: React.FC<{ p: P; f: number; at: number; w?: number; answerAt?: number; small?: boolean }> = ({ p, f, at, w = 900, answerAt, small }) => {
  const s = clamp(springAt(f, at, 30, 14, 160));
  const answered = answerAt !== undefined && f >= answerAt;
  const as = answerAt !== undefined ? clamp(springAt(f, answerAt, 30, 13, 190)) : 0;
  const k = small ? 0.62 : 1;
  return (
    <div style={{ width: w, padding: `${34 * k}px ${36 * k}px`, boxSizing: "border-box", borderRadius: 44 * k, background: "rgba(255,255,255,.96)", boxShadow: "0 40px 90px rgba(0,0,0,.35)", fontFamily: FONT, color: C.ink, transform: `translateY(${(1 - s) * 160}px) scale(${mix(0.9, 1, s)})`, opacity: clamp(s * 2), position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 * k }}>
        <div style={{ width: 70 * k, height: 70 * k, borderRadius: 35 * k, background: p.tint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 * k, fontWeight: 700 }}>{p.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 32 * k, fontWeight: 700, letterSpacing: "-0.02em" }}>{p.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 18 * k, letterSpacing: "0.1em", color: C.gray, marginTop: 2 }}>TO {p.biz.toUpperCase()}</div>
        </div>
        <div style={{ width: 56 * k, height: 56 * k, borderRadius: 16 * k, background: "#F3F0EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChannelGlyph ch={p.ch} size={32 * k} />
        </div>
      </div>
      <div style={{ marginTop: 22 * k, display: "flex", flexDirection: "column", gap: 16 * k }}>
        <div style={{ alignSelf: "flex-start", maxWidth: "88%", padding: `${20 * k}px ${26 * k}px`, borderRadius: `${32 * k}px ${32 * k}px ${32 * k}px ${10 * k}px`, background: "#F1EEE8", fontSize: 36 * k, fontWeight: 550, lineHeight: 1.25, letterSpacing: "-0.015em" }} dir="auto">
          {p.msg}
        </div>
        {answered ? (
          <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "flex-end", gap: 12 * k, flexDirection: "row-reverse", transform: `scale(${mix(0.6, 1, as)})`, transformOrigin: "100% 100%", opacity: clamp(as * 2) }}>
            <div style={{ width: 52 * k, height: 52 * k, borderRadius: 26 * k, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mark height={28 * k} color={CREAM} stroke={24} />
            </div>
            <div style={{ maxWidth: 560 * k, padding: `${20 * k}px ${26 * k}px`, borderRadius: `${32 * k}px ${32 * k}px ${10 * k}px ${32 * k}px`, background: C.coral, color: "#FFFFFF", fontSize: 34 * k, fontWeight: 550, lineHeight: 1.25 }} dir="auto">
              {p.ans}
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: 20 * k, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {answered ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 22 * k, letterSpacing: "0.1em", color: "#2E9C6A" }}>
            <CheckDisc t={tw(f, answerAt!, answerAt! + 10, 0, 1, E.cubicInOut)} size={30 * k} bg="#2E9C6A" fg="#FFFFFF" />
            {p.urgent ? "WITH YOUR TEAM" : `ANSWERED IN ${(1 + rnd(p.name.length) * 1.5).toFixed(1)}S`}
          </div>
        ) : (
          <Waiting f={f} from={at} size={22 * k} />
        )}
        {p.lang ? <div style={{ padding: `${6 * k}px ${14 * k}px`, borderRadius: 999, background: "#FBE3C4", color: "#C2702A", fontFamily: MONO, fontSize: 20 * k, letterSpacing: "0.1em" }}>{p.lang}</div> : null}
      </div>
      {answerAt !== undefined ? <Sheen at={answerAt + 2} dur={18} opacity={0.6} /> : null}
    </div>
  );
};

/** One person's moment: their sky, their city, their hour, their message. */
const Moment: React.FC<{ p: P; i: number; f: number }> = ({ p, i, f }) => {
  const at = V_AT[i];
  const moonX = [800, 260, 780, 790][i];
  const moonY = [780, 820, 1530, 800][i];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 55%, ${p.sky[2]} 100%)`, overflow: "hidden" }}>
      {p.night
        ? Array.from({ length: 50 }, (_, k) => (
            <div key={k} style={{ position: "absolute", left: rnd(i * 50 + k) * 1080, top: rnd(i * 70 + k * 3) * 1200, width: 3, height: 3, borderRadius: 2, background: "#FFF6E0", opacity: 0.3 + 0.5 * Math.sin(f * 0.1 + k) ** 2 }} />
          ))
        : null}
      <div style={{ position: "absolute", left: moonX - 90, top: moonY - 90, width: 180, height: 180, borderRadius: 90, background: p.night ? "radial-gradient(circle at 40% 40%, #FFF8E6 0%, #F1E3C4 60%, #D9C7A0 100%)" : i === 2 ? "radial-gradient(circle, #FFD3A0 0%, #F39A6B 60%, rgba(243,154,107,0) 100%)" : "radial-gradient(circle, #FFF6D8 0%, #FFD98A 50%, rgba(255,217,138,0) 100%)", boxShadow: p.night ? "0 0 120px rgba(255,240,210,.35)" : "0 0 200px rgba(255,200,120,.6)", transform: `translateY(${i === 2 ? 0 : -(f - at) * 0.15}px)` }} />
      <Skyline seed={i + 3} color={p.night ? "#06070F" : i === 2 ? "#2A2140" : "#B96A45"} lit={p.night ? 1 : i === 2 ? 0.5 : 0} />
      <div style={{ position: "absolute", left: 80, top: 170, display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderRadius: 999, background: "rgba(255,255,255,.14)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.25)", fontFamily: MONO, fontSize: 26, letterSpacing: "0.12em", color: i === 3 ? C.ink : CREAM }}>
        <Icon name={p.night ? "moon" : "sun"} size={28} color={i === 3 ? C.ink : CREAM} stroke={2.2} />
        {p.city.toUpperCase()} · {p.time}
      </div>
      <div style={{ position: "absolute", left: 90, top: 1060 }}>
        <MsgCard p={p} f={f} at={at + 14} />
      </div>
    </AbsoluteFill>
  );
};

/* ───────── scenes ───────── */
const Hook: React.FC<{ f: number }> = ({ f }) => {
  if (f > V_AT[0] + 14) return null;
  const s = clamp(springAt(f, 2, 30, 14, 150));
  const out = tw(f, V_AT[0] - 4, V_AT[0] + 12, 0, 1, E.expoIn);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 70% at 50% 60%, #2A1E2C 0%, #120E16 70%)", opacity: 1 - tw(out, 0.5, 1, 0, 1, E.linear), transform: `scale(${1 + out * 0.3})` }}>
      <div style={{ position: "absolute", left: 140, right: 140, top: 1020, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24, transform: `translateY(${(1 - s) * 80}px)`, opacity: s }}>
        <div style={{ padding: "28px 34px", borderRadius: "40px 40px 40px 12px", background: "rgba(255,255,255,.95)", fontFamily: FONT, fontSize: 44, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em" }}>Hello? Is anyone there?</div>
        <div style={{ display: "flex", gap: 12, padding: "24px 30px", borderRadius: 40, background: "rgba(255,255,255,.12)" }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ width: 16, height: 16, borderRadius: 8, background: CREAM, opacity: 0.35 + 0.65 * Math.max(0, Math.sin(f * 0.2 - k * 0.9)) }} />
          ))}
        </div>
        <Waiting f={f} from={0} size={30} />
      </div>
    </AbsoluteFill>
  );
};

const Moments: React.FC<{ f: number }> = ({ f }) => {
  if (f < V_AT[0] - 10 || f > LIFT + 6) return null;
  const pos = [1, 2, 3].reduce((acc, i) => acc + tw(f, V_AT[i] - 8, V_AT[i] + 8, 0, 1, E.expoInOut), 0);
  const inT = tw(f, V_AT[0] - 10, V_AT[0] + 6, 0, 1, E.expoOut);
  const out = tw(f, LIFT - 8, LIFT + 4, 0, 1, E.expoIn);
  return (
    <AbsoluteFill style={{ opacity: inT, transform: `scale(${mix(1.15, 1, inT) * (1 - 0.2 * out)})`, filter: out > 0 ? `brightness(${1 + 2 * out})` : undefined }}>
      {PEOPLE.map((p, i) => {
        const x = (i - pos) * 1080;
        if (Math.abs(x) >= 1080) return null;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 0, width: 1080, height: 1920 }}>
            <Moment p={p} i={i} f={f} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** "With Brainfast, every one of them gets an answer. In seconds. In their language." */
const TILE = { w: 480, h: 560 };
const TILES = [
  { x: 40, y: 640 },
  { x: 560, y: 640 },
  { x: 40, y: 1240 },
  { x: 560, y: 1240 },
];
const ANSWERS = [ws("l06", 6) - 2, ws("l06", 7), ws("l06", 8) + 2, ws("l06", 9) + 4];
const Answered: React.FC<{ f: number }> = ({ f }) => {
  if (f < LIFT - 4 || f > TEAM_AT + 12) return null;
  const out = tw(f, TEAM_AT - 4, TEAM_AT + 10, 0, 1, E.expoIn);
  const mark = tw(f, LIFT, LIFT + 18, 0, 1, E.cubicInOut);
  const markUp = tw(f, LIFT + 20, LIFT + 34, 0, 1, E.expoInOut);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 100% 70% at 50% 55%, #2B1D26 0%, #120E14 75%)" }}>
      <Ring x={540} y={900} at={LIFT} r={1000} width={28} color={C.coral} dur={32} />
      <Burst x={540} y={900} at={LIFT} n={18} r0={60} r1={420} colors={[C.coral, CREAM, C.coralLight]} width={6} dur={28} />
      <div style={{ position: "absolute", left: 540 - 110, top: mix(900, 440, markUp) - 120, transform: `scale(${mix(1, 0.45, markUp)})`, opacity: 1 - tw(f, LIFT + 30, LIFT + 40, 0, 1, E.linear) }}>
        <Mark height={240} progress={mark} color={C.coral} />
      </div>
      {PEOPLE.map((p, i) => {
        const t = TILES[i];
        const s = clamp(springAt(f, ws("l06", 2) - 6 + i * 3, 30, 14, 160));
        const lang = i === 3 ? tw(f, ws("l06", 12) - 2, ws("l06", 12) + 14, 0, 1, E.cubicInOut) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: t.x, top: t.y, width: TILE.w, height: TILE.h, borderRadius: 40, overflow: "hidden", background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 60%, ${p.sky[2]} 100%)`, boxShadow: `0 30px 70px rgba(0,0,0,.45), 0 0 0 ${lang * 6}px ${C.coral}`, transform: `translateY(${(1 - s) * 200 + out * 1200 * (i < 2 ? -1 : 1)}px) scale(${mix(0.7, 1, s)})`, opacity: clamp(s * 2) }}>
            <Skyline seed={i + 3} color={p.night ? "#06070F" : i === 2 ? "#2A2140" : "#B96A45"} lit={p.night ? 1 : 0.3} h={200} />
            <div style={{ position: "absolute", left: 24, top: 22, fontFamily: MONO, fontSize: 18, letterSpacing: "0.12em", color: i === 3 ? C.ink : CREAM }}>
              {p.city.toUpperCase()} · {p.time}
            </div>
            <div style={{ position: "absolute", left: 20, top: 70 }}>
              <MsgCard p={p} f={f} at={-100} w={440} small answerAt={ANSWERS[i]} />
            </div>
            <Sparkles x={0} y={0} w={TILE.w} h={TILE.h} at={ANSWERS[i] + 2} color={C.coral} size={30} seed={i + 5} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** "And when it really matters, your team steps in." */
const Team: React.FC<{ f: number }> = ({ f }) => {
  if (f < TEAM_AT - 2 || f > DASH_AT + 12) return null;
  const p = PEOPLE[2];
  const s = clamp(springAt(f, TEAM_AT, 30, 15, 150));
  const out = tw(f, DASH_AT - 4, DASH_AT + 10, 0, 1, E.expoIn);
  const joined = ws("l07", 5) - 2;
  const reply = ws("l07", 7);
  const js = clamp(springAt(f, joined, 30, 13, 190));
  const rs = clamp(springAt(f, reply, 30, 13, 190));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 60%, ${p.sky[2]} 100%)`, opacity: 1 - tw(out, 0.5, 1, 0, 1, E.linear) }}>
      <Skyline seed={5} color="#2A2140" lit={0.5} />
      <div style={{ position: "absolute", left: 90, top: 600, width: 900, transform: `translateY(${(1 - s) * 300 - out * 200}px) scale(${mix(0.8, 1, s)})`, opacity: clamp(s * 2) }}>
        <div style={{ padding: "36px 38px", borderRadius: 48, background: "rgba(255,255,255,.97)", boxShadow: "0 50px 110px rgba(0,0,0,.4)", fontFamily: FONT, color: C.ink, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: p.tint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>L</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>Lena</div>
              <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray }}>TO FLOWDESK · URGENT</div>
            </div>
            <div style={{ padding: "8px 16px", borderRadius: 999, background: "#FBE0DE", color: C.coralDeep, fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em" }}>● URGENT</div>
          </div>
          <div style={{ alignSelf: "flex-start", padding: "22px 28px", borderRadius: "34px 34px 34px 10px", background: "#F1EEE8", fontSize: 36, fontWeight: 550 }}>{p.msg}</div>
          <div style={{ alignSelf: "flex-end", padding: "22px 28px", borderRadius: "34px 34px 10px 34px", background: C.coral, color: "#FFFFFF", fontSize: 34, fontWeight: 550 }}>{p.ans}</div>
          {f >= joined ? (
            <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderRadius: 999, background: "#EAF6EF", color: "#2E9C6A", fontFamily: MONO, fontSize: 21, letterSpacing: "0.1em", transform: `scale(${mix(0.5, 1, js)})`, opacity: clamp(js * 2) }}>
              <Icon name="headset" size={24} color="#2E9C6A" stroke={2.3} />
              SAM · ON CALL · JOINED THE CHAT
            </div>
          ) : null}
          {f >= reply ? (
            <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "flex-end", gap: 12, flexDirection: "row-reverse", transform: `scale(${mix(0.6, 1, rs)})`, transformOrigin: "100% 100%", opacity: clamp(rs * 2) }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: "#F4E6C8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>S</div>
              <div style={{ padding: "22px 28px", borderRadius: "34px 34px 10px 34px", background: C.ink, color: CREAM, fontSize: 34, fontWeight: 550 }}>On it. Rolling back the deploy now.</div>
            </div>
          ) : null}
        </div>
      </div>
      <Sparkles x={90} y={900} w={900} h={300} at={joined + 2} color="#FFFFFF" size={40} seed={3} />
    </AbsoluteFill>
  );
};

/** "You see every conversation, and every answer keeps getting better." */
const LOG = [
  { p: 0, st: "Answered · 1.2s" },
  { p: 1, st: "Answered · 0.9s" },
  { p: 2, st: "With your team" },
  { p: 3, st: "Answered · ES" },
  { p: 0, st: "Answered · 1.4s", name: "Omar", city: "Dubai · 9:02 AM", msg: "Do you have parking?" },
  { p: 1, st: "Answered · 1.1s", name: "Mei", city: "Singapore · 3:40 PM", msg: "Can I change my booking?" },
];
const Dashboard: React.FC<{ f: number }> = ({ f }) => {
  if (f < DASH_AT - 2 || f > NOBODY_AT + 12) return null;
  const s = clamp(springAt(f, DASH_AT, 30, 16, 140));
  const out = tw(f, NOBODY_AT - 4, NOBODY_AT + 10, 0, 1, E.expoIn);
  const better = ws("l08", 6);
  const bs = clamp(springAt(f, better, 30, 13, 190));
  return (
    <AbsoluteFill style={{ background: CREAM, opacity: 1 - tw(out, 0.5, 1, 0, 1, E.linear) }}>
      <div style={{ position: "absolute", left: 60, top: 600, width: 960, borderRadius: 48, background: "#FFFFFF", boxShadow: "0 50px 110px rgba(23,23,23,.14)", padding: "36px 36px 30px", boxSizing: "border-box", fontFamily: FONT, color: C.ink, transform: `translateY(${(1 - s) * 400}px)`, opacity: clamp(s * 2) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", flex: 1 }}>Chat Logs</div>
          <div style={{ padding: "8px 16px", borderRadius: 999, background: C.coral, color: "#FFFFFF", fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em" }}>● LIVE</div>
        </div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {LOG.map((r, i) => {
            const p = PEOPLE[r.p];
            const rs = clamp(springAt(f, DASH_AT + 6 + i * 4, 30, 15, 170));
            const hi = i === 3 && f >= better;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 20px", borderRadius: 26, background: hi ? "#FFF4F2" : "#F7F5F0", boxShadow: hi ? `inset 0 0 0 2px ${C.coral}` : "none", transform: `translateX(${(1 - rs) * 200}px)`, opacity: rs }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: p.tint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>{(r.name ?? p.name)[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{r.name ?? p.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: "0.08em", color: C.gray }}>{(r.city ?? `${p.city} · ${p.time}`).toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: 25, color: C.gray, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden" }} dir="auto">
                    {r.msg ?? p.msg}
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: "0.06em", color: r.st.startsWith("With") ? C.coralDeep : "#2E9C6A", whiteSpace: "nowrap" }}>{r.st.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
        {f >= better ? (
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, padding: "20px 24px", borderRadius: 26, background: C.ink, color: CREAM, fontSize: 28, fontWeight: 600, transform: `scale(${mix(0.6, 1, bs)})`, opacity: clamp(bs * 2) }}>
            <Icon name="thumbsDown" size={30} color={C.coralLight} stroke={2.2} />
            <span style={{ flex: 1 }}>Feedback applied · Replaced the previous answer</span>
            <CheckDisc t={tw(f, better + 4, better + 14, 0, 1, E.cubicInOut)} size={38} bg={C.coral} fg="#FFFFFF" />
          </div>
        ) : null}
        <Sheen at={better + 6} dur={20} opacity={0.5} />
      </div>
    </AbsoluteFill>
  );
};

/** "…because nobody should have to wait." */
const Nobody: React.FC<{ f: number }> = ({ f }) => {
  if (f < NOBODY_AT - 2 || f > HIT + 4) return null;
  const s = clamp(springAt(f, NOBODY_AT, 30, 15, 150));
  const zero = tw(f, ws("l09", 5) - 10, ws("l09", 5) + 4, 0, 1, E.cubicInOut);
  const col = tw(f, HIT - 12, HIT, 0, 1, E.expoIn);
  const secs = Math.round(mix(7, 0, zero));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #F5B57F 0%, #F9D7B4 45%, ${CREAM} 100%)`, transform: `scale(${1 - 0.9 * col})`, opacity: 1 - tw(col, 0.6, 1, 0, 1, E.linear) }}>
      <div style={{ position: "absolute", left: 540 - 230, top: 1080, width: 460, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transform: `translateY(${(1 - s) * 80}px)`, opacity: s }}>
        <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: C.coralDeep, position: "relative" }}>
          WAITING
          <div style={{ position: "absolute", left: -6, right: -6, top: "50%", height: 4, background: C.coralDeep, transform: `scaleX(${zero})`, transformOrigin: "0 50%" }} />
        </div>
        <div style={{ fontFamily: FONT, fontSize: 150, fontWeight: 300, letterSpacing: "-0.04em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>0:{String(secs).padStart(2, "0")}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── words ───────── */
const Words: React.FC = () => {
  const f = useCurrentFrame();
  const madrid = f >= V_AT[3] - 4 && f < LIFT;
  const ink = madrid ? C.ink : CREAM;
  return (
    <>
      <Kinetic from={VO.l01} to={V_AT[0] - 8} y={300} size={104} color={CREAM} hi={C.coral} words={[
        { t: "Somewhere,", at: ws("l01", 0) }, { t: "right", at: ws("l01", 1) }, { t: "now,", at: ws("l01", 2), br: true },
        { t: "someone", at: ws("l01", 3) }, { t: "is", at: ws("l01", 4) }, { t: "waiting", at: ws("l01", 5), hi: true, br: true },
        { t: "for", at: ws("l01", 6) }, { t: "an", at: ws("l01", 7) }, { t: "answer.", at: ws("l01", 8) },
      ]} />
      <Kinetic from={VO.l02} to={V_AT[1] - 10} y={290} size={92} color={CREAM} hi={C.coralLight} words={[
        { t: "A", at: ws("l02", 0) }, { t: "parent", at: ws("l02", 1), hi: true }, { t: "at", at: ws("l02", 2) }, { t: "midnight,", at: ws("l02", 3), br: true },
        { t: "trying", at: ws("l02", 4) }, { t: "to", at: ws("l02", 5) }, { t: "book", at: ws("l02", 6), br: true },
        { t: "the", at: ws("l02", 7) }, { t: "first", at: ws("l02", 8) }, { t: "appointment.", at: ws("l02", 9) },
      ]} />
      <Kinetic from={VO.l03} to={V_AT[2] - 10} y={290} size={92} color={CREAM} hi={C.coralLight} words={[
        { t: "A", at: ws("l03", 0) }, { t: "traveler", at: ws("l03", 1), hi: true }, { t: "landing", at: ws("l03", 2), br: true }, { t: "late,", at: ws("l03", 3) },
        { t: "hoping", at: ws("l03", 4) }, { t: "the", at: ws("l03", 5) }, { t: "room", at: ws("l03", 6), br: true },
        { t: "is", at: ws("l03", 7) }, { t: "still", at: ws("l03", 8) }, { t: "there.", at: ws("l03", 9) },
      ]} />
      <Kinetic from={VO.l04} to={V_AT[3] - 10} y={290} size={96} color={CREAM} hi={C.coralLight} words={[
        { t: "A", at: ws("l04", 0) }, { t: "founder", at: ws("l04", 1), hi: true }, { t: "whose", at: ws("l04", 2), br: true },
        { t: "checkout", at: ws("l04", 3) }, { t: "just", at: ws("l04", 4), br: true }, { t: "broke.", at: ws("l04", 5), hi: true },
      ]} />
      <Kinetic from={VO.l05} to={LIFT - 8} y={290} size={92} color={ink} hi={C.coralDeep} words={[
        { t: "Someone", at: ws("l05", 0) }, { t: "in", at: ws("l05", 1) }, { t: "Madrid,", at: ws("l05", 2), hi: true, br: true },
        { t: "asking", at: ws("l05", 3) }, { t: "in", at: ws("l05", 4) }, { t: "Spanish", at: ws("l05", 5), hi: true, br: true },
        { t: "where", at: ws("l05", 6) }, { t: "their", at: ws("l05", 7) }, { t: "order", at: ws("l05", 8) }, { t: "is.", at: ws("l05", 9) },
      ]} />
      <Kinetic from={ws("l06", 2) - 3} to={ws("l06", 10) - 8} y={250} size={92} color={CREAM} hi={C.coral} words={[
        { t: "Every", at: ws("l06", 2) }, { t: "one", at: ws("l06", 3) }, { t: "of", at: ws("l06", 4) }, { t: "them", at: ws("l06", 5), br: true },
        { t: "gets", at: ws("l06", 6) }, { t: "an", at: ws("l06", 7) }, { t: "answer.", at: ws("l06", 8), hi: true },
      ]} />
      <Kinetic from={ws("l06", 10) - 3} to={TEAM_AT - 6} y={250} size={92} color={CREAM} hi={C.coral} words={[
        { t: "In", at: ws("l06", 9) }, { t: "seconds.", at: ws("l06", 10), hi: true, br: true },
        { t: "In", at: ws("l06", 11) }, { t: "their", at: ws("l06", 12) }, { t: "language.", at: ws("l06", 13), hi: true },
      ]} />
      <Kinetic from={VO.l07} to={DASH_AT - 6} y={250} size={92} color={CREAM} hi={C.coralLight} words={[
        { t: "When", at: ws("l07", 1) }, { t: "it", at: ws("l07", 2) }, { t: "really", at: ws("l07", 3) }, { t: "matters,", at: ws("l07", 4), br: true },
        { t: "your", at: ws("l07", 5), hi: true }, { t: "team", at: ws("l07", 6), hi: true }, { t: "steps", at: ws("l07", 7) }, { t: "in.", at: ws("l07", 8) },
      ]} />
      <Kinetic from={VO.l08} to={ws("l08", 4) - 8} y={250} size={100} color={C.ink} hi={C.coral} words={[
        { t: "You", at: ws("l08", 0) }, { t: "see", at: ws("l08", 1), hi: true, br: true }, { t: "every", at: ws("l08", 2) }, { t: "conversation.", at: ws("l08", 3) },
      ]} />
      <Kinetic from={ws("l08", 4) - 3} to={NOBODY_AT - 6} y={250} size={92} color={C.ink} hi={C.coral} words={[
        { t: "Every", at: ws("l08", 5) }, { t: "answer", at: ws("l08", 6), br: true }, { t: "keeps", at: ws("l08", 7) }, { t: "getting", at: ws("l08", 8), br: true },
        { t: "better.", at: ws("l08", 9), hi: true },
      ]} />
      <Kinetic from={NOBODY_AT} to={HIT - 14} y={420} size={120} align="center" color={C.ink} hi={C.coralDeep} words={[
        { t: "Nobody", at: ws("l09", 1), br: true }, { t: "should", at: ws("l09", 2) }, { t: "have", at: ws("l09", 3), br: true },
        { t: "to", at: ws("l09", 4) }, { t: "wait.", at: ws("l09", 5), hi: true },
      ]} />
    </>
  );
};

const Bug: React.FC = () => {
  const f = useCurrentFrame();
  const v = tw(f, LIFT + 34, LIFT + 48, 0, 1, E.expoOut) * tw(f, HIT - 14, HIT - 4, 1, 0, E.expoIn);
  if (v <= 0.001) return null;
  const ink = f >= DASH_AT ? C.ink : CREAM;
  return (
    <div style={{ position: "absolute", left: 80, top: 120, display: "flex", alignItems: "center", gap: 6, opacity: v }}>
      <Mark height={36} color={C.coral} />
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 34, letterSpacing: "-0.025em", color: ink, lineHeight: 1 }}>brainfast.</span>
    </div>
  );
};

export const Wait: React.FC<{ audio?: boolean; grain?: boolean }> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: f >= HIT - 2 ? CREAM : "#120E16", overflow: "hidden" }}>
      <Hook f={f} />
      <Moments f={f} />
      <Answered f={f} />
      <Team f={f} />
      <Dashboard f={f} />
      <Nobody f={f} />
      <Lockup hit={HIT} tag={[ws("l10", 1), ws("l10", 2), ws("l10", 3), ws("l10", 4), ws("l10", 5)]} ctaAt={ws("l11", 0) - 2} urlAt={ws("l11", 7) - 4} cta="Build your first agent for free" />
      <Words />
      <Bug />
      <Sparkle x={860} y={560} at={LIFT + 16} size={56} color={CREAM} />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("wait/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const WSS = 8;
export const WaitSS: React.FC = () => {
  const i = useCurrentFrame();
  const n = Math.floor(i / WSS);
  const j = i % WSS;
  const t = Math.max(0, n + (j - (WSS - 1) / 2) * (0.5 / WSS));
  return (
    <Freeze frame={t}>
      <Wait audio={false} grain={false} />
    </Freeze>
  );
};

export const WAIT_BEATS = { LIFT, HIT, V_AT, TEAM_AT, DASH_AT, NOBODY_AT, ANSWERS };

