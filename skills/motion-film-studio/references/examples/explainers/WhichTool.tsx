import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { useLayout } from "../../kit/format";
import { Grain, Ring, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { AgentDot, ChannelGlyph, Icon, IconName } from "../../kit/ui";
import type { FilmDef, FilmProps } from "../registry";
import lines from "../../../../public/films/which-ai-tool/vo/lines.json";
import words from "../../../../public/films/which-ai-tool/vo/words.json";

loadFonts();

/**
 * WHICH AI TOOL DO YOU NEED? — AI, explained · 03. A transit map: a coral token
 * rides the trunk line, stops at each question, takes the YES branch to that
 * tool's terminal (ChatGPT/Claude, OpenClaw, n8n, a developer), comes back on
 * "No?", and ends at the Brainfast line. Fair to every tool.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);

/* ── beats ── */
const DEAL = [T.ws("l01", 0), T.ws("l01", 1), T.ws("l01", 2), T.ws("l01", 6)];
const PICK = T.ws("l02", 3);
const MAP_IN = T.VO.l03 - 8;
const Q = [T.ws("l03", 0), T.ws("l05", 1), T.ws("l07", 1), T.ws("l09", 2)];
const SUBS1 = [T.ws("l03", 5), T.ws("l03", 6), T.ws("l03", 7)];
const YES = [T.ws("l04", 0), T.ws("l06", 0) - 6, T.ws("l08", 0) - 6, T.ws("l10", 0) - 6];
const DONE1 = T.ws("l04", 4);
const NO = [T.ws("l05", 0), T.ws("l07", 0), T.ws("l09", 0), T.ws("l11", 0)];
const RUN = T.ws("l06", 7);
const SECURE = T.ws("l06", 10);
const NODES = [T.ws("l08", 4), T.ws("l08", 5), T.ws("l08", 6)];
const CUSTOM = T.ws("l10", 3);
const SCRATCH = T.ws("l10", 6);
const CHANNEL = T.ws("l11", 12);
const AGENT = T.ws("l11", 18);
const CHECKS = [T.ws("l12", 0), T.ws("l12", 2), T.ws("l12", 6)];
const COLLAPSE: [number, number] = [T.ws("l13", 0) - 16, T.ws("l13", 0) - 2];
const HIT = T.ws("l13", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => T.ws("l13", i));
const CTA = T.ws("l14", 0) - 2;
const URL = T.ws("l14", T.nwords("l14") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l14") + 60);

/* ── the map (world coordinates) ── */
const TX = 160; //  trunk x
const BX = 790; //  branch terminal x
const GAP = 640;
const SY = [GAP, GAP * 2, GAP * 3, GAP * 4]; // question stations
const END = GAP * 5;
const BOARD = "#121417";
type Stop = { name: string; line: string; q: string[]; desc: string[] };
const STOPS: Stop[] = [
  { name: "ChatGPT or Claude", line: "#2FBF8F", q: ["Just for you?"], desc: ["Your personal assistant:", "writing, ideas, research."] },
  { name: "OpenClaw", line: "#FF7A45", q: ["Love servers", "and tinkering?"], desc: ["Powerful open-source agent.", "You run it. You secure it."] },
  { name: "n8n", line: "#9B7BFF", q: ["Same steps,", "every time?"], desc: ["Automations you build,", "node by node."] },
  { name: "A developer", line: "#F2C94C", q: ["Never built before?", "Time and budget?"], desc: ["Fully custom,", "from scratch."] },
];

/** the camera: which world y sits at frame y 1000 */
const camY = (f: number) =>
  keys(
    f,
    [
      [MAP_IN, 0],
      [Q[0] - 6, SY[0]],
      [NO[0] + 4, SY[0]],
      [NO[0] + 22, SY[1]],
      [NO[1] + 4, SY[1]],
      [NO[1] + 22, SY[2]],
      [NO[2] + 4, SY[2]],
      [NO[2] + 22, SY[3]],
      [NO[3] + 4, SY[3]],
      [NO[3] + 30, END],
    ],
    E.expoInOut,
  );
const FY = 1130;
const toFrame = (f: number, y: number) => FY + (y - camY(f));

/** where the token is (world) */
const tokenAt = (f: number) => {
  // down the trunk to each question, out along the YES branch, back on NO
  let x = TX;
  let y = keys(f, [[MAP_IN, 0], [Q[0] - 6, SY[0]], [NO[0] + 4, SY[0]], [NO[0] + 22, SY[1]], [NO[1] + 4, SY[1]], [NO[1] + 22, SY[2]], [NO[2] + 4, SY[2]], [NO[2] + 22, SY[3]], [NO[3] + 4, SY[3]], [NO[3] + 30, END]], E.expoInOut);
  for (let i = 0; i < 4; i++) {
    const out = tw(f, YES[i], YES[i] + 16, 0, 1, E.expoInOut);
    const back = tw(f, NO[i] - 14, NO[i] + 2, 0, 1, E.expoInOut);
    x += (BX - TX) * out * (1 - back);
  }
  return { x, y };
};

const Stage: React.FC<{ f: number }> = ({ f }) => {
  const c = camY(f);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 120% 70% at 50% 40%, #1A1D22 0%, ${BOARD} 70%)` }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.035) 2px, transparent 2px)", backgroundSize: "60px 60px", backgroundPosition: `0 ${-(c % 60)}px` }} />
    </AbsoluteFill>
  );
};

const MapLayer: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f < MAP_IN - 10) return null;
  const vis = tw(f, MAP_IN - 8, MAP_IN + 8, 0, 1, E.expoOut);
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const y = (v: number) => toFrame(f, v);
  const tk = tokenAt(f);
  const travelled = tk.y; // the trunk lights up to here
  const visited = (i: number) => f >= YES[i];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: vis * (1 - col) }}>
      <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0 }}>
        {/* trunk: grey ahead, coral where the token has been */}
        <line x1={TX} y1={y(-200)} x2={TX} y2={y(END)} stroke="#3A3F47" strokeWidth={18} strokeLinecap="round" />
        <line x1={TX} y1={y(-200)} x2={TX} y2={y(travelled)} stroke={C.coral} strokeWidth={18} strokeLinecap="round" />
        {STOPS.map((s, i) => {
          const out = tw(f, YES[i], YES[i] + 16, 0, 1, E.expoInOut);
          return (
            <g key={s.name}>
              <line x1={TX} y1={y(SY[i])} x2={BX} y2={y(SY[i])} stroke={mixColor("#3A3F47", s.line, 0.35)} strokeWidth={18} strokeLinecap="round" />
              <line x1={TX} y1={y(SY[i])} x2={TX + (BX - TX) * out} y2={y(SY[i])} stroke={s.line} strokeWidth={18} strokeLinecap="round" />
              <circle cx={BX} cy={y(SY[i])} r={26} fill={C.white} stroke={visited(i) ? s.line : mixColor("#3A3F47", s.line, 0.35)} strokeWidth={10} />
            </g>
          );
        })}
        {SY.map((sy, i) => (
          <circle key={i} cx={TX} cy={y(sy)} r={32} fill={C.white} stroke={travelled >= sy - 1 ? C.coral : "#3A3F47"} strokeWidth={12} />
        ))}
        <circle cx={TX} cy={y(-200)} r={24} fill={C.white} stroke={C.coral} strokeWidth={10} />
        <circle cx={TX} cy={y(END)} r={44} fill={C.white} stroke={C.coral} strokeWidth={16} />
      </svg>
      {/* start label */}
      <div style={{ position: "absolute", left: TX + 50, top: y(-200) - 22, fontFamily: MONO, fontSize: 26, letterSpacing: "0.14em", color: "rgba(250,249,245,.6)" }}>START · YOUR BUSINESS</div>
      {/* questions, YES / NO labels, terminal cards */}
      {STOPS.map((s, i) => {
        const qs = clamp(springAt(f, Q[i] - 4, 30, 13, 170));
        const here = f >= Q[i] - 6;
        const yes = f >= YES[i];
        const card = clamp(springAt(f, YES[i] + 12, 30, 13, 170));
        const compact = tw(f, NO[i] - 6, NO[i] + 8, 0, 1, E.expoInOut);
        return (
          <React.Fragment key={s.name}>
            {here ? (
              <div style={{ position: "absolute", left: 250, top: y(SY[i]) - 250, width: 780, transform: `translateY(${(1 - qs) * 40}px)`, opacity: clamp(qs * 2) * mix(1, 0.4, compact), fontFamily: FONT, fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.02, color: C.cream }}>
                {s.q.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            ) : null}
            {i === 0 && here ? (
              <div style={{ position: "absolute", left: 250, top: y(SY[0]) - 120, display: "flex", gap: 12 }}>
                {["Writing", "Ideas", "Research"].map((t, k) => {
                  const ss = clamp(springAt(f, SUBS1[k] - 2, 30, 12, 190)) * (1 - compact);
                  return (
                    <div key={t} style={{ padding: "8px 18px", borderRadius: 999, background: "rgba(47,191,143,.18)", color: "#7FE3C0", fontFamily: MONO, fontSize: 22, letterSpacing: "0.1em", transform: `scale(${mix(0.5, 1, ss)})`, opacity: clamp(ss * 2) }}>{t.toUpperCase()}</div>
                  );
                })}
              </div>
            ) : null}
            {yes ? (
              <div style={{ position: "absolute", left: TX + 90, top: y(SY[i]) - 58, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: s.line, opacity: tw(f, YES[i], YES[i] + 8, 0, 1, E.linear) }}>YES</div>
            ) : null}
            {f >= NO[i] - 2 ? (
              <div style={{ position: "absolute", left: TX + 40, top: y(SY[i]) + 150, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: C.coralLight, opacity: tw(f, NO[i] - 2, NO[i] + 6, 0, 1, E.linear) }}>NO ↓</div>
            ) : null}
            {yes ? (
              <div style={{ position: "absolute", left: mix(360, 560, compact), top: y(SY[i]) + 56, width: mix(620, 440, compact), transformOrigin: "0 0", transform: `scale(${mix(0.6, 1, card)})`, opacity: clamp(card * 2) * mix(1, 0.55, compact), borderRadius: 30, background: "#1E2228", boxShadow: `inset 0 0 0 3px ${s.line}, 0 30px 60px rgba(0,0,0,.45)`, padding: "22px 26px", fontFamily: FONT, color: C.cream, overflow: "hidden" }}>
                <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", color: s.line, whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 28, lineHeight: 1.3, marginTop: 8, color: "rgba(250,249,245,.88)", whiteSpace: "nowrap", maxHeight: mix(80, 0, compact), overflow: "hidden" }}>
                  {s.desc.map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                </div>
                <Extra f={f} i={i} compact={compact} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {/* the end of the line */}
      <EndStation f={f} y={y(END)} />
    </div>
  );
};

/** per-terminal visual detail */
const Extra: React.FC<{ f: number; i: number; compact: number }> = ({ f, i, compact }) => {
  const h = mix(84, 0, compact);
  const pop = (at: number) => clamp(springAt(f, at, 30, 12, 190));
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, height: h, overflow: "hidden", marginTop: compact > 0.9 ? 0 : 12 };
  if (i === 0) {
    const d = pop(DONE1);
    return (
      <div style={row}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: "#2FBF8F", color: BOARD, fontFamily: MONO, fontSize: 24, letterSpacing: "0.12em", fontWeight: 700, transform: `scale(${mix(0.4, 1, d)}) rotate(${(1 - d) * -20}deg)`, opacity: clamp(d * 2) }}>
          <Icon name="check" size={24} color={BOARD} stroke={3.2} /> DONE
        </div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div style={row}>
        {[
          [RUN, "database", "YOU RUN IT"],
          [SECURE, "lock", "YOU SECURE IT"],
        ].map(([at, ic, t]) => {
          const s = pop(at as number);
          return (
            <div key={t as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 16, background: "rgba(255,122,69,.15)", color: "#FFB08F", fontFamily: MONO, fontSize: 20, letterSpacing: "0.08em", transform: `scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2), whiteSpace: "nowrap" }}>
              <Icon name={ic as IconName} size={24} color="#FFB08F" stroke={2.4} />
              {t as string}
            </div>
          );
        })}
      </div>
    );
  }
  if (i === 2) {
    return (
      <div style={{ ...row, position: "relative" }}>
        <svg width={440} height={84} style={{ position: "absolute", left: 0, top: 0 }}>
          {[0, 1].map((k) => {
            const t = tw(f, NODES[k + 1] - 6, NODES[k + 1] + 4, 0, 1, E.cubicInOut);
            return <line key={k} x1={70 + k * 150} y1={42} x2={70 + k * 150 + 150 * t} y2={42} stroke="#9B7BFF" strokeWidth={6} strokeDasharray="10 8" />;
          })}
        </svg>
        {NODES.map((at, k) => {
          const s = pop(at);
          return (
            <div key={k} style={{ position: "absolute", left: 10 + k * 150, top: 12, width: 120, height: 60, borderRadius: 16, background: "#2A2342", boxShadow: "inset 0 0 0 3px #9B7BFF", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.3, 1, s)})`, opacity: clamp(s * 2) }}>
              <Icon name={(["zap", "database", "mail"] as IconName[])[k]} size={28} color="#C9B8FF" stroke={2.4} />
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={row}>
      {[
        [CUSTOM, "{ }", "FULLY CUSTOM"],
        [SCRATCH, "</>", "FROM SCRATCH"],
      ].map(([at, g, t]) => {
        const s = pop(at as number);
        return (
          <div key={t as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 16, background: "rgba(242,201,76,.15)", color: "#F7DE8C", fontFamily: MONO, fontSize: 20, letterSpacing: "0.08em", transform: `scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2), whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{g as string}</span>
            {t as string}
          </div>
        );
      })}
    </div>
  );
};

const EndStation: React.FC<{ f: number; y: number }> = ({ f, y }) => {
  if (f < NO[3] + 6) return null;
  const q = clamp(springAt(f, NO[3] + 12, 30, 13, 170));
  const card = clamp(springAt(f, AGENT - 10, 30, 13, 150));
  const chans: ("web" | "whatsapp" | "instagram" | "slack")[] = ["web", "whatsapp", "instagram", "slack"];
  return (
    <>
      <div style={{ position: "absolute", left: 250, top: y - 330, width: 780, transform: `translateY(${(1 - q) * 40}px)`, opacity: clamp(q * 2), fontFamily: FONT, fontSize: 58, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.04, color: C.cream }}>
        Customers <span style={{ color: "rgba(250,249,245,.55)" }}>and</span> your team
        <br />
        asking all day,
        <br />
        on every channel?
      </div>
      <div style={{ position: "absolute", left: 90, top: y + 90, width: 900, transform: `translateY(${(1 - card) * 120}px) scale(${mix(0.8, 1, card)})`, transformOrigin: "50% 0%", opacity: clamp(card * 2), borderRadius: 38, background: C.cream, color: C.ink, boxShadow: `0 40px 90px rgba(0,0,0,.5), 0 0 0 4px ${C.coral}, 0 0 80px rgba(217,87,89,.35)`, padding: "28px 32px", fontFamily: FONT, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <AgentDot size={86} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em", color: C.coral }}>BRAINFAST LINE</div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.05 }}>An AI agent that already knows your business</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
          {chans.map((c, k) => {
            const s = clamp(springAt(f, CHANNEL - 6 + k * 3, 30, 12, 190));
            return (
              <div key={c} style={{ width: 84, height: 84, borderRadius: 24, background: C.white, boxShadow: "0 8px 20px rgba(23,23,23,.12)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2) }}>
                <ChannelGlyph ch={c} size={46} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
          {["No code", "Live in minutes", "See every conversation"].map((t, k) => {
            const s = clamp(springAt(f, CHECKS[k] - 2, 30, 12, 190));
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 999, background: C.coralTint, color: C.coralDeep, fontSize: 28, fontWeight: 700, transform: `scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2), whiteSpace: "nowrap" }}>
                <Icon name="check" size={26} color={C.coral} stroke={3} /> {t}
              </div>
            );
          })}
        </div>
        <Sheen at={AGENT + 4} dur={22} opacity={0.6} />
      </div>
      {f >= AGENT ? <Sparkles x={90} y={y + 90} w={900} h={420} at={AGENT + 6} color={C.coral} size={46} seed={4} /> : null}
    </>
  );
};

/* the token */
const Token: React.FC<{ f: number }> = ({ f }) => {
  if (f < MAP_IN || f > COLLAPSE[1]) return null;
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const trail = [6, 4, 2, 0].map((d) => {
    const p = tokenAt(f - d);
    return { x: p.x, y: toFrame(f, p.y), a: 1 - d / 8 };
  });
  const p = trail[3];
  const pulse = 1 + 0.12 * Math.sin(f * 0.25);
  return (
    <div style={{ opacity: 1 - col }}>
      {trail.slice(0, 3).map((t, i) => (
        <div key={i} style={{ position: "absolute", left: t.x - 22, top: t.y - 22, width: 44, height: 44, borderRadius: 22, background: C.coral, opacity: 0.3 * t.a }} />
      ))}
      <div style={{ position: "absolute", left: p.x - 60 * pulse, top: p.y - 60 * pulse, width: 120 * pulse, height: 120 * pulse, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,87,89,.45) 0%, rgba(217,87,89,0) 70%)" }} />
      <div style={{ position: "absolute", left: p.x - 34, top: p.y - 34, width: 68, height: 68, borderRadius: 34, background: `radial-gradient(circle at 35% 30%, #FFC4BF, ${C.coral} 55%, ${C.coralDeep})`, boxShadow: "0 0 34px 10px rgba(217,87,89,.65), 0 0 0 6px #fff" }} />
    </div>
  );
};

/* ── the hook: four options dealt like cards ── */
const HOOK: { name: string; line: string; icon: IconName }[] = [
  { name: "ChatGPT", line: "#2FBF8F", icon: "message" },
  { name: "OpenClaw", line: "#FF7A45", icon: "database" },
  { name: "n8n", line: "#9B7BFF", icon: "zap" },
  { name: "A developer", line: "#F2C94C", icon: "laptop" },
];
const Hook: React.FC<{ f: number }> = ({ f }) => {
  if (f > MAP_IN + 12) return null;
  const out = tw(f, MAP_IN - 26, MAP_IN - 10, 0, 1, E.expoIn);
  const pos = [
    [300, 900],
    [780, 900],
    [300, 1300],
    [780, 1300],
  ];
  return (
    <>
      {HOOK.map((h, i) => {
        const s = clamp(springAt(f, DEAL[i] - 6, 30, 12, 160));
        const [x, y] = pos[i];
        return (
          <div key={h.name} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - s) * 800 + out * (i % 2 ? 1 : -1) * 0}px) translateX(${out * (i % 2 ? 900 : -900)}px) rotate(${(1 - s) * (i % 2 ? 20 : -20) + (i % 2 ? 3 : -3)}deg)`, opacity: clamp(s * 3), width: 400, height: 330, borderRadius: 36, background: "#1E2228", boxShadow: `inset 0 0 0 4px ${h.line}, 0 30px 60px rgba(0,0,0,.5)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: FONT }}>
            <div style={{ width: 110, height: 110, borderRadius: 32, background: mixColor(BOARD, h.line, 0.25), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={h.icon} size={60} color={h.line} stroke={2.2} />
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.04em", color: C.cream }}>{h.name}</div>
          </div>
        );
      })}
      {f >= DEAL[3] + 6 ? (
        <div style={{ position: "absolute", left: 540, top: 1100, transform: `translate(-50%, -50%) scale(${clamp(springAt(f, DEAL[3] + 6, 30, 10, 200)) * (1 - out)}) rotate(-8deg)`, fontFamily: FONT, fontSize: 180, fontWeight: 900, color: C.coral, textShadow: "0 10px 40px rgba(217,87,89,.5)" }}>?</div>
      ) : null}
    </>
  );
};

const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, COLLAPSE[0], COLLAPSE[0] + 8, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: C.cream, zIndex: 5 }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: C.coral, boxShadow: `0 0 0 ${5 + 3 * Math.sin(f * 0.15)}px rgba(217,87,89,.25)` }} />
      AI, EXPLAINED · 03
    </div>
  );
};

/** a dark band behind the headline zone so the map scrolls under it cleanly */
const TopFade: React.FC = () => <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 560, background: `linear-gradient(180deg, ${BOARD} 0%, ${BOARD} 62%, rgba(18,20,23,0) 100%)`, pointerEvents: "none" }} />;

export const WhichTool: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT }}>
      <Stage f={f} />
      <Hook f={f} />
      <MapLayer f={f} />
      <Token f={f} />
      <TopFade />
      <Series f={f} />
      <Kinetic from={T.VO.l01} to={T.VO.l02 - 9} color={C.cream} hi={C.coralLight} words={[
        { t: "Which", at: T.ws("l01", 0) },
        { t: "AI", at: T.ws("l01", 1) },
        { t: "tool", at: T.ws("l01", 2), br: true },
        { t: "do", at: T.ws("l01", 3) },
        { t: "you", at: T.ws("l01", 4) },
        { t: "need?", at: T.ws("l01", 6), hi: true },
      ]} />
      <Kinetic from={T.VO.l02 - 1} to={Q[0] + 60} color={C.cream} hi={C.coralLight} words={[
        { t: "How", at: T.ws("l02", 1) },
        { t: "to", at: T.ws("l02", 2) },
        { t: "pick,", at: T.ws("l02", 3), hi: true, br: true },
        { t: "in", at: T.ws("l02", 4) },
        { t: "under", at: T.ws("l02", 5) },
        { t: "a", at: T.ws("l02", 6) },
        { t: "minute.", at: T.ws("l02", 7), hi: true },
      ]} />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} dark />
      {grain ? <Grain opacity={0.05} /> : null}
      {audio ? <Audio src={staticFile("films/which-ai-tool/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  ...DEAL.map((d, i) => cue(d - 3, "whoosh", -9, `card ${i + 1}`)),
  ...DEAL.map((d, i) => cue(d + 1, "snap", -3, `card ${i + 1} lands`)),
  cue(DEAL[3] + 6, "pop", -4, "?"),
  ...moments.move(MAP_IN, "cards away, the map", -6),
  cue(MAP_IN + 4, "draw", -8, "the line"),
  ...Q.map((q, i) => cue(q - 4, "ping", -7, `station ${i + 1}`)),
  ...SUBS1.map((s, i) => cue(s - 2, "tick", -9, `sub ${i + 1}`)),
  ...YES.map((y, i) => cue(y + 2, "whoosh", -8, `yes branch ${i + 1}`)),
  ...YES.map((y, i) => cue(y + 14, "snap", -4, `terminal ${i + 1}`)),
  cue(DONE1, "check", -3, "done"),
  ...NO.map((n, i) => cue(n - 8, "whoosh", -9, `back to the trunk ${i + 1}`)),
  ...NO.map((n, i) => cue(n + 12, "whoosh", -8, `down the line ${i + 1}`)),
  cue(RUN, "blip", -6, "you run it"),
  cue(SECURE, "seal", -7, "you secure it"),
  ...NODES.map((n, i) => cue(n, "pop", -7, `node ${i + 1}`)),
  cue(CUSTOM, "type", -8, "custom"),
  cue(SCRATCH, "keys", -8, "scratch"),
  cue(NO[3] + 26, "riser", -6, "into the Brainfast line"),
  cue(CHANNEL - 6, "flurry", -11, "channels"),
  cue(AGENT - 10, "swell", -6, "the agent card"),
  ...moments.land(AGENT, "the Brainfast line"),
  cue(AGENT + 6, "shimmer", -8, "sparkles"),
  ...CHECKS.map((c, i) => cue(c - 2, "check", -6, `check ${i + 1}`)),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DEAL, MAP_IN, Q, YES, NO, AGENT, CHECKS, HIT, CTA, URL, DUR };

export const WHICHTOOL: FilmDef = {
  id: "WhichTool",
  slug: "which-ai-tool",
  title: "WhichTool",
  component: WhichTool,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/which-ai-tool/mix.wav",
};
