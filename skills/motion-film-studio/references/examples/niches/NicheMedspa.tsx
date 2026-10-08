import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Grain, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { Icon } from "../../kit/ui";
import { Face, FaceSpec, PEOPLE } from "../../kit/people";
import { ChannelBadge } from "../../kit/agentic";
import { Mark } from "../../brand/Mark";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/niche-medspa/vo/lines.json";
import words from "../../../../public/films/niche-medspa/vo/words.json";

loadFonts();

/**
 * NICHE · Med spa. World: a calm spa — blush and sand, marble, arches. The
 * signature is the orchestrator as a pearl run: every message drops in from
 * Instagram, WhatsApp or the website as a pearl, the orchestrator ring reads
 * it and rolls it down the right track to the right specialist's arch. Then
 * one conversation handed between agents unnoticed, and a WhatsApp campaign
 * fanning out to past clients, every reply rolling back to the booking agent.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const w = (l: Line, i: number) => T.ws(l, i);

const M = [w("l02", 0) - 4, w("l03", 0) - 4, w("l04", 0) - 4];
const ONEBOT = w("l05", 0);
const CANT = w("l05", 2);
const TEAM = w("l05", 9);
const DROP = w("l06", 0) - 2;
const ORCH = w("l06", 3);
const CH = [w("l06", 8), w("l06", 9), w("l06", 12)];
const HANDS = w("l06", 14);
const SPEC = w("l06", 19);
const EXPERT = w("l07", 1);
const MENU = w("l07", 6);
const BOOKING = w("l08", 1);
const CALENDAR = w("l08", 5);
const ONECONV = w("l09", 0);
const HANDOFF = w("l09", 7);
const PAST = w("l10", 2);
const CAMPAIGN = w("l11", 2);
const QUOTE = w("l11", 6);
const REPLY = w("l12", 1);
const BOOKAGENT = w("l12", 6);
const HIT = w("l13", 0) - 16;
const TAG = [0, 1, 2, 4, 6].map((i) => w("l13", i));
const CTA = w("l14", 0) - 2;
const URL = w("l14", T.nwords("l14") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l14") + 50);
const S1 = DROP; // the pearl run
const S2 = EXPERT - 8; // the two specialists
const S3 = ONECONV - 6; // one conversation
const S4 = PAST - 8; // past clients + the campaign

const SAND = "#F6EDE6", BLUSH = "#F0D5CC", SAGE = "#C7D8C3", GOLD = "#C9A96E";
const MSGS: { t: string; ch: "instagram" | "web" | "whatsapp"; to: 0 | 1 }[] = [
  { t: "How much is a facial?", ch: "instagram", to: 0 },
  { t: "Does laser hurt?", ch: "web", to: 0 },
  { t: "Can I come Friday?", ch: "whatsapp", to: 1 },
];
const EXPERT_P: FaceSpec = { name: "Expert", skin: "#E7BFA2", hair: "#3B2418", style: "bun", shirt: "#E27BA0", bg: "#FBE0EA" };
const BOOKER_P: FaceSpec = { name: "Booking", skin: "#A86D4A", hair: "#1A1210", style: "short", shirt: "#1C9A83", bg: "#DCF2EC" };

const Backdrop: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${SAND} 0%, #FBF7F3 60%, ${SAND} 100%)` }}>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M ${-100 + i * 180} 1920 C ${100 + i * 160} ${1400 - i * 60}, ${-50 + i * 200} ${800 + i * 40}, ${200 + i * 170} 0`} fill="none" stroke="#E4D6CC" strokeWidth={2 + (i % 3)} />
      ))}
    </svg>
  </div>
);

/** an arch: a spa doorway that is also an agent's room */
const Arch: React.FC<{ x: number; y: number; w: number; h: number; fill: string; children?: React.ReactNode; glow?: number }> = ({ x, y, w: W, h: H, fill, children, glow = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: W, height: H, borderRadius: `${W / 2}px ${W / 2}px 28px 28px`, background: fill, boxShadow: `0 30px 70px rgba(120,80,60,.15), inset 0 0 0 6px rgba(255,255,255,.55), 0 0 ${60 * glow}px rgba(217,87,89,${0.45 * glow})`, overflow: "hidden" }}>
    {children}
  </div>
);

/* ── act 1: three kinds of messages, one bot ── */
const Three: React.FC<{ f: number }> = ({ f }) => {
  const bot = springAt(f, ONEBOT - 2, 30, 12, 170);
  const strain = tw(f, CANT - 2, CANT + 10, 0, 1, E.cubicInOut);
  const split = tw(f, TEAM - 4, TEAM + 8, 0, 1, E.expoInOut);
  return (
    <>
      {MSGS.map((m, i) => {
        const s = springAt(f, -16 + i * 3, 30, 12, 170);
        const pulse = 1 + 0.08 * Math.sin(clamp((f - M[i]) / 10) * Math.PI);
        const wob = strain > 0 && split < 1 ? Math.sin((f - CANT) * 0.9 + i) * 6 * strain : 0;
        return (
          <div key={i} style={{ position: "absolute", left: [70, 250, 120][i], top: 360 + i * 190, display: "flex", alignItems: "center", gap: 18, transform: `translate(${wob}px, ${(1 - clamp(s)) * 40}px) scale(${mix(0.85, 1, clamp(s)) * pulse})`, opacity: clamp(s * 2) * (1 - split) }}>
            <ChannelBadge ch={m.ch} size={70} />
            <div style={{ padding: "22px 30px", borderRadius: 999, background: C.white, boxShadow: "0 16px 40px rgba(120,80,60,.14)", fontSize: 48, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{m.t}</div>
          </div>
        );
      })}
      {bot > 0.01 ? (
        <div style={{ position: "absolute", left: 540, top: 1260, transform: `translate(-50%, -50%) scale(${mix(0.6, 1, clamp(bot)) * (1 - split)}) rotate(${Math.sin((f - CANT) * 1.4) * 5 * strain}deg)`, opacity: clamp(bot * 2) * (1 - split), textAlign: "center" }}>
          <div style={{ width: 200, height: 200, borderRadius: 100, background: strain > 0.5 ? "#F3C9C2" : "#E6E1DA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110 }}>🤖</div>
          <div style={{ marginTop: 16, fontSize: 40, fontWeight: 750, color: strain > 0.5 ? C.coralDeep : C.gray }}>{strain > 0.5 ? "one bot, three jobs…" : "one bot"}</div>
        </div>
      ) : null}
      {split > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center", gap: 40, opacity: split }}>
          {[{ p: EXPERT_P, c: BLUSH }, { p: PEOPLE.grace, c: SAND }, { p: BOOKER_P, c: SAGE }].map((a, i) => (
            <div key={i} style={{ transform: `translateY(${(1 - split) * 60}px) scale(${mix(0.5, 1, split)})`, borderRadius: 999, padding: 10, background: a.c }}>
              <Face p={a.p} size={170} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

/* ── act 2: the orchestrator as a pearl run ── */
const RING = { x: 540, y: 820 };
const ARCH = [
  { x: 70, y: 1240, w: 400, h: 560, fill: BLUSH, label: "Treatment expert", p: EXPERT_P },
  { x: 610, y: 1240, w: 400, h: 560, fill: SAGE, label: "Booking agent", p: BOOKER_P },
];
const CHX = [260, 540, 820];
const PearlRun: React.FC<{ f: number }> = ({ f }) => {
  const enter = springAt(f, S1, 30, 14, 120);
  const ring = springAt(f, ORCH - 2, 30, 12, 160);
  // each pearl: channel → ring → track → arch
  const launch = (i: number) => HANDS - 26 + i * 12;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clamp(enter * 2) }}>
      {/* channels */}
      {(["instagram", "whatsapp", "web"] as const).map((c, i) => {
        const s = springAt(f, CH[i] - 2, 30, 11, 190);
        return (
          <div key={c} style={{ position: "absolute", left: CHX[i] - 55, top: 420, textAlign: "center", transform: `scale(${mix(0.6, 1, clamp(s))})`, opacity: mix(0.25, 1, clamp(s)) }}>
            <ChannelBadge ch={c} size={110} />
            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, color: C.ink, width: 110 }}>{["Instagram", "WhatsApp", "Website"][i]}</div>
          </div>
        );
      })}
      {/* tracks */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {CHX.map((x, i) => <path key={i} d={`M ${x} 600 C ${x} 700, ${RING.x} 690, ${RING.x} ${RING.y - 110}`} fill="none" stroke="#E7D9CF" strokeWidth={14} strokeLinecap="round" />)}
        {ARCH.map((a, i) => <path key={i} d={`M ${RING.x} ${RING.y + 110} C ${RING.x} 1080, ${a.x + a.w / 2} 1040, ${a.x + a.w / 2} ${a.y + 10}`} fill="none" stroke={i === 0 ? "#EBC3B7" : "#B5CBB0"} strokeWidth={16} strokeLinecap="round" />)}
      </svg>
      {/* the orchestrator ring */}
      <div style={{ position: "absolute", left: RING.x - 120, top: RING.y - 120, width: 240, height: 240, borderRadius: 120, background: C.white, boxShadow: `0 0 0 14px ${GOLD}33, 0 0 ${50 * clamp(ring)}px rgba(217,87,89,.35), 0 30px 60px rgba(120,80,60,.2)`, transform: `scale(${mix(0.5, 1, clamp(ring)) * (1 + 0.05 * Math.sin(f * 0.25))})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Mark height={76} color={C.coral} stroke={26} />
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.12em", color: C.gray }}>ORCHESTRATOR</div>
      </div>
      {/* the two specialists' arches */}
      {ARCH.map((a, i) => {
        const hot = MSGS.some((m, mi) => m.to === i && f >= launch(mi) + 34 && f < launch(mi) + 52);
        return (
          <Arch key={i} x={a.x} y={a.y} w={a.w} h={a.h} fill={a.fill} glow={hot ? 1 : 0}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 110, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Face p={a.p} size={180} />
              <div style={{ marginTop: 20, fontSize: 38, fontWeight: 800, color: C.ink, textAlign: "center" }}>{a.label}</div>
              <div style={{ marginTop: 6, fontSize: 24, color: "#6E625B", fontFamily: MONO }}>{i === 0 ? "SPECIALIST" : "SPECIALIST"}</div>
            </div>
          </Arch>
        );
      })}
      {/* pearls */}
      {MSGS.map((m, i) => {
        const t0 = launch(i);
        if (f < t0) return null;
        const a = ARCH[m.to];
        const p1 = tw(f, t0, t0 + 14, 0, 1, E.cubicIn); // channel → ring
        const p2 = tw(f, t0 + 18, t0 + 36, 0, 1, E.cubicInOut); // ring → arch
        const fade = tw(f, t0 + 36, t0 + 42, 0, 1, E.linear);
        const bez = (t: number, P: number[][]) => {
          const [a0, a1, a2, a3] = P; const u = 1 - t;
          return [u * u * u * a0[0] + 3 * u * u * t * a1[0] + 3 * u * t * t * a2[0] + t * t * t * a3[0], u * u * u * a0[1] + 3 * u * u * t * a1[1] + 3 * u * t * t * a2[1] + t * t * t * a3[1]];
        };
        const chx = CHX[["instagram", "whatsapp", "web"].indexOf(m.ch)];
        const [x, y] = f < t0 + 18 ? bez(p1, [[chx, 600], [chx, 700], [RING.x, 690], [RING.x, RING.y - 110]]) : bez(p2, [[RING.x, RING.y + 110], [RING.x, 1080], [a.x + a.w / 2, 1040], [a.x + a.w / 2, a.y + 10]]);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: 1 - fade, zIndex: 5 }}>
            <div style={{ width: 54, height: 54, borderRadius: 27, background: `radial-gradient(circle at 35% 30%, #FFFFFF, ${m.to === 0 ? "#F4B7A6" : "#9BC39A"} 70%)`, boxShadow: "0 8px 20px rgba(120,80,60,.3)" }} />
            <div style={{ position: "absolute", left: 64, top: 6, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,.95)", fontSize: 24, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{m.t}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ── act 3: the two specialists at work ── */
const Specialists: React.FC<{ f: number }> = ({ f }) => {
  const e = springAt(f, S2, 30, 13, 150);
  const menu = springAt(f, MENU - 4, 30, 12, 170);
  const b = springAt(f, BOOKING - 4, 30, 13, 150);
  const cal = springAt(f, CALENDAR - 2, 30, 11, 190);
  return (
    <>
      <Arch x={60} y={430} w={960} h={560} fill={BLUSH}>
        <div style={{ position: "absolute", left: 50, top: 150, display: "flex", gap: 30, alignItems: "center", opacity: clamp(e * 2), transform: `translateY(${(1 - clamp(e)) * 60}px)` }}>
          <Face p={EXPERT_P} size={150} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: "#8A6A60" }}>TREATMENT EXPERT</div>
            <div style={{ marginTop: 8, padding: "18px 24px", borderRadius: "28px 28px 28px 8px", background: C.white, fontSize: 36, lineHeight: 1.3, color: C.ink, maxWidth: 560 }}>Most clients feel a quick warm snap. We use a cooling tip ❄️</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 40, display: "flex", gap: 12, opacity: clamp(menu * 2), transform: `translateY(${(1 - clamp(menu)) * 40}px)` }}>
          {[["Facial", "60 min"], ["Laser", "30 min"], ["Peel", "45 min"], ["Brows", "20 min"]].map(([t, d]) => (
            <div key={t} style={{ flex: 1, padding: "12px 14px", borderRadius: 16, background: "rgba(255,255,255,.75)", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{t}</div>
              <div style={{ fontSize: 20, color: "#8A6A60", fontFamily: MONO }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: "#8A6A60", opacity: clamp(menu * 2) }}>TRAINED ON YOUR MENU</div>
      </Arch>
      <div style={{ opacity: clamp(b * 2), transform: `translateY(${(1 - clamp(b)) * 80}px)` }}>
        <Arch x={60} y={1050} w={960} h={560} fill={SAGE}>
          <div style={{ position: "absolute", left: 50, top: 150, display: "flex", gap: 30, alignItems: "center" }}>
            <Face p={BOOKER_P} size={150} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", color: "#4F6B4C" }}>BOOKING AGENT</div>
              <div style={{ marginTop: 8, padding: "18px 24px", borderRadius: "28px 28px 28px 8px", background: C.white, fontSize: 36, lineHeight: 1.3, color: C.ink }}>Friday 3:30 PM is free. Shall I book it?</div>
            </div>
          </div>
          <div style={{ position: "absolute", left: 70, right: 70, bottom: 40, display: "flex", alignItems: "center", gap: 18, padding: "16px 22px", borderRadius: 20, background: "rgba(255,255,255,.8)", transform: `scale(${mix(0.8, 1, clamp(cal))})`, opacity: clamp(cal * 2) }}>
            <Icon name="calendar" size={40} color="#1A73E8" stroke={2.3} />
            <div style={{ flex: 1, fontSize: 30, fontWeight: 750, color: C.ink }}>Fri 15:30 · Laser · 30 min</div>
            <div style={{ padding: "6px 14px", borderRadius: 999, background: C.green, color: "#FFF", fontSize: 24, fontWeight: 800 }}>✓ Booked</div>
          </div>
        </Arch>
      </div>
    </>
  );
};

/* ── act 4: one conversation, handed off unnoticed ── */
const OneConversation: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, S3, 30, 13, 150);
  const msgs: { at: number; me?: boolean; who?: 0 | 1; t: string }[] = [
    { at: S3 + 2, me: true, t: "Does laser hurt?" },
    { at: S3 + 10, who: 0, t: "Most clients feel a quick warm snap ❄️" },
    { at: ONECONV + 20, me: true, t: "ok! can I come Friday?" },
    { at: HANDOFF - 6, who: 1, t: "Friday 3:30 is yours ✓ See you then!" },
  ];
  const hand = springAt(f, HANDOFF - 14, 30, 12, 180);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 520, opacity: clamp(s * 2), transform: `translateY(${(1 - clamp(s)) * 80}px)`, borderRadius: 44, background: C.white, boxShadow: "0 40px 90px rgba(120,80,60,.16)", padding: "30px 30px 40px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 18, borderBottom: "2px solid #F3ECE6" }}>
        <ChannelBadge ch="instagram" size={56} />
        <div style={{ fontSize: 32, fontWeight: 800, color: C.ink }}>Glow Studio</div>
        <div style={{ marginLeft: "auto", fontSize: 22, color: C.gray }}>one conversation</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
        {msgs.map((m, i) => {
          if (f < m.at) return null;
          const t = tw(f, m.at, m.at + 8, 0, 1, E.expoOut);
          return (
            <React.Fragment key={i}>
              {i === 3 && hand > 0.01 ? (
                <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, border: "2px dashed #D9CFC7", color: "#9A8C83", fontSize: 22, fontFamily: MONO, opacity: clamp(hand * 2) }}>↪ handed to Booking agent · only you see this</div>
              ) : null}
              <div style={{ alignSelf: m.me ? "flex-end" : "flex-start", opacity: t, transform: `translateY(${(1 - t) * 20}px)`, display: "flex", alignItems: "center", gap: 12 }}>
                {!m.me ? <div style={{ width: 16, height: 16, borderRadius: 8, background: m.who === 0 ? "#EBA08C" : "#8DB88A" }} /> : null}
                <div style={{ padding: "18px 24px", borderRadius: m.me ? "28px 28px 8px 28px" : "28px 28px 28px 8px", background: m.me ? "linear-gradient(135deg,#7B5CFA,#C04BD8)" : "#F4EFEA", color: m.me ? "#FFF" : C.ink, fontSize: 44 }}>{m.t}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ── act 5: the campaign brings past clients back ── */
const CLIENTS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
  const specs = Object.values(PEOPLE);
  return { x: 540 + Math.cos(a) * 380, y: 1020 + Math.sin(a) * 380, p: specs[(i * 3) % specs.length] as FaceSpec, reply: i % 3 !== 2 };
});
const Campaign: React.FC<{ f: number }> = ({ f }) => {
  const s = springAt(f, S4, 30, 13, 150);
  const card = springAt(f, CAMPAIGN - 4, 30, 12, 170);
  const quote = springAt(f, QUOTE - 2, 30, 12, 170);
  const booker = springAt(f, REPLY - 8, 30, 12, 170);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clamp(s * 2) }}>
      {/* past clients around the spa */}
      {CLIENTS.map((c, i) => {
        const lit = f >= CAMPAIGN + 6 + i * 1.5;
        return (
          <div key={i} style={{ position: "absolute", left: c.x - 60, top: c.y - 60, width: 120, height: 120, borderRadius: 60, overflow: "hidden", opacity: lit ? 1 : 0.4, filter: lit ? "none" : "grayscale(1)", boxShadow: lit ? "0 0 0 6px #25D36655" : "none" }}>
            <Face p={c.p} size={120} />
          </div>
        );
      })}
      {/* outbound: one message fans out to each client */}
      {CLIENTS.map((c, i) => {
        const t0 = CAMPAIGN + i * 1.5;
        const p = tw(f, t0, t0 + 14, 0, 1, E.quintOut);
        if (f < t0 || p >= 1) return null;
        return <div key={`o${i}`} style={{ position: "absolute", left: mix(540, c.x, p) - 16, top: mix(1020, c.y, p) - 16, width: 32, height: 32, borderRadius: 10, background: "#25D366", boxShadow: "0 4px 12px rgba(37,211,102,.5)" }} />;
      })}
      {/* replies roll back to the booking agent */}
      {CLIENTS.filter((c) => c.reply).map((c, i) => {
        const t0 = REPLY + i * 3;
        const p = tw(f, t0, t0 + 16, 0, 1, E.cubicInOut);
        if (f < t0 || p >= 1) return null;
        return <div key={`r${i}`} style={{ position: "absolute", left: mix(c.x, 540, p) - 18, top: mix(c.y, 1020, p) - 18, width: 36, height: 36, borderRadius: 18, background: "radial-gradient(circle at 35% 30%, #fff, #9BC39A 70%)", boxShadow: "0 6px 14px rgba(80,120,80,.4)" }} />;
      })}
      {/* centre: the campaign, then the booking agent receiving */}
      <div style={{ position: "absolute", left: 540, top: 1020, transform: `translate(-50%, -50%) scale(${mix(0.6, 1, clamp(card))})`, opacity: clamp(card * 2) * (1 - clamp(booker)), width: 420, borderRadius: 32, background: C.white, boxShadow: "0 30px 70px rgba(120,80,60,.2)", padding: "24px 26px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><ChannelBadge ch="whatsapp" size={70} /></div>
        <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: C.gray }}>WHATSAPP CAMPAIGN</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.ink }}>Past clients · 3 months</div>
      </div>
      {booker > 0.01 ? (
        <div style={{ position: "absolute", left: 540, top: 1020, transform: `translate(-50%, -50%) scale(${mix(0.6, 1, clamp(booker))})`, opacity: clamp(booker * 2), borderRadius: 999, padding: 12, background: SAGE, boxShadow: `0 0 ${40 + 20 * Math.sin(f * 0.4)}px rgba(120,170,110,.6)` }}>
          <Face p={BOOKER_P} size={190} />
          <div style={{ position: "absolute", left: "50%", bottom: -58, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 30, fontWeight: 800, color: C.ink }}>Booking agent</div>
        </div>
      ) : null}
      {/* the message itself */}
      {quote > 0.01 ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: 450, transform: `translateY(${(1 - clamp(quote)) * -40}px)`, opacity: clamp(quote * 2) * (1 - tw(f, BOOKAGENT, BOOKAGENT + 8, 0, 1, E.linear) * 0.0), padding: "22px 28px", borderRadius: "30px 30px 30px 8px", background: C.white, boxShadow: "0 20px 50px rgba(120,80,60,.16)", fontSize: 40, lineHeight: 1.3, color: C.ink }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1E9E5A", marginBottom: 4 }}>Glow Studio · WhatsApp</div>
          It's been 3 months ✨ Time for your touch-up? Reply and I'll find you a slot.
        </div>
      ) : null}
      {f >= BOOKAGENT ? <Sparkles x={380} y={880} w={320} h={260} at={BOOKAGENT} color={GOLD} size={34} seed={7} /> : null}
    </div>
  );
};

export const NicheMedspa: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  const scene = f < S1 ? 0 : f < S2 ? 1 : f < S3 ? 2 : f < S4 ? 3 : 4;
  const out = tw(f, HIT - 12, HIT - 1, 0, 1, E.expoIn);
  const X = (a: number) => tw(f, a - 8, a + 6, 0, 1, E.expoInOut); // hand-over wipe
  const heads: { from: number; to: number; words: { t: string; at: number; hi?: boolean }[] }[] = [
    { from: S1, to: S2 - 10, words: [{ t: "One", at: S1 + 2 }, { t: "orchestrator,", at: ORCH, hi: true }, { t: "every", at: CH[0] - 6 }, { t: "channel", at: CH[0] }] },
    { from: S3, to: S4 - 10, words: [{ t: "The", at: w("l09", 2) }, { t: "client", at: w("l09", 3) }, { t: "never", at: w("l09", 4), hi: true }, { t: "notices", at: w("l09", 5), hi: true }] },
    { from: S4, to: HIT - 14, words: [{ t: "Past", at: PAST }, { t: "clients,", at: w("l10", 3) }, { t: "back.", at: w("l11", 5), hi: true }] },
  ];
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: SAND }}>
      <Backdrop />
      <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {scene === 0 ? <div style={{ position: "absolute", inset: 0, transform: `translateX(${-X(S1) * 1080}px)` }}><Three f={f} /></div> : null}
        {scene === 1 || (f >= S1 - 8 && f < S1) ? <PearlRun f={f} /> : null}
        {scene === 2 ? <Specialists f={f} /> : null}
        {scene === 3 ? <OneConversation f={f} /> : null}
        {scene === 4 ? <Campaign f={f} /> : null}
        {scene === 0 ? <Kinetic from={-12} to={ONEBOT - 8} y={170} size={78} width={960} align="center" color={C.ink} hi={C.coral} words={T.said("l01").map((x, i) => ({ ...x, hi: i === 4 || i === 5 }))} /> : null}
        {heads.map((h, i) => (f >= h.from - 4 && f <= h.to + 8 ? <Kinetic key={i} from={h.from} to={h.to} y={170} size={78} width={960} align="center" color={C.ink} hi={C.coral} words={h.words} /> : null))}
      </div>
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} cta="Try it for free" tagline={["Your", "whole", "front desk,", "as a", "team."]} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/niche-medspa/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

export const SOUND: Cue[] = [
  ...M.map((m, i) => cue(m, "receive", -5, `message ${i + 1}`)),
  cue(ONEBOT - 2, "pop", -7, "one bot"),
  cue(CANT, "buzz", -8, "overloaded"),
  cue(TEAM - 4, "shimmer", -8, "a team"),
  cue(DROP, "impact", -9, "the drop"),
  cue(S1, "whoosh", -9, "the pearl run"),
  cue(ORCH - 2, "poweron", -8, "the orchestrator"),
  ...CH.map((c, i) => cue(c - 2, "blip", -8, ["Instagram", "WhatsApp", "website"][i])),
  ...[0, 1, 2].map((i) => cue(HANDS - 26 + i * 12 + 15, "tick", -9, `pearl ${i + 1} read`)),
  ...[0, 1, 2].map((i) => cue(HANDS - 26 + i * 12 + 36, "snap", -7, `pearl ${i + 1} lands`)),
  cue(S2, "whoosh", -10, "the specialists"),
  cue(MENU - 4, "learn", -9, "trained on your menu"),
  cue(BOOKING - 4, "whoosh", -12, "booking agent"),
  cue(CALENDAR - 2, "check", -6, "booked"),
  cue(S3, "whoosh", -10, "one conversation"),
  cue(S3 + 2, "send", -7, "does laser hurt?"),
  cue(S3 + 10, "receive", -6, "expert answers"),
  cue(ONECONV + 20, "send", -7, "can I come Friday?"),
  cue(HANDOFF - 14, "tick", -12, "handed to booking (only you see it)"),
  cue(HANDOFF - 6, "receive", -6, "booking answers"),
  cue(S4, "whoosh", -10, "past clients"),
  cue(CAMPAIGN - 4, "pop", -6, "the campaign"),
  cue(CAMPAIGN, "flurry", -10, "messages fan out"),
  cue(QUOTE - 2, "receive", -7, "time for your touch-up?"),
  cue(REPLY - 8, "shimmer", -10, "booking agent"),
  cue(REPLY, "flurry", -12, "replies come back"),
  cue(BOOKAGENT, "check", -6, "to the booking agent"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { S1, S2, S3, S4, HIT, CTA, URL, DUR };

export const NICHEMEDSPA: FilmDef = { id: "NicheMedspa", slug: "niche-medspa", title: "Niche · Med spa (a team of agents)", component: NicheMedspa, durationInFrames: DUR, fps: 30, formats: ["v"], audio: "films/niche-medspa/mix.wav" };
