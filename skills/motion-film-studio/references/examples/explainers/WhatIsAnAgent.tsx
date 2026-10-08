import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { useLayout } from "../../kit/format";
import { DotField, Grain, Ring, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { CheckDisc, Icon, IconName } from "../../kit/ui";
import { Face, PEOPLE } from "../../kit/people";
import type { FilmDef, FilmProps } from "../registry";
import { BrainGlyph, FaceIcon, IsoBlock, Tag } from "./iso";
import lines from "../../../../public/films/what-is-an-agent/vo/lines.json";
import words from "../../../../public/films/what-is-an-agent/vo/words.json";

loadFonts();

/**
 * WHAT IS AN AI AGENT? — AI, explained · 01. An educational short for
 * non-technical business owners: an agent is built like a new hire, block by
 * block — a brain, your knowledge, tools, a job description, a human manager.
 * Isometric blocks stack into a tower; the details of each block sit beside it.
 */
type Line = keyof typeof lines;
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);

/* ── beats ── */
const STICKERS = T.ws("l01", 1);
const FALL = T.ws("l02", 4);
const SIMPLE = T.ws("l03", 3);
const HIRE = T.ws("l04", 0);
const B1 = T.ws("l05", 4);
const MODEL = T.ws("l06", 2);
const CHIPS = [T.ws("l06", 7), T.ws("l06", 7) + 8, T.ws("l06", 9)];
const ORBIT = T.ws("l07", 1);
const EXCEPT = T.ws("l08", 0);
const B2 = T.ws("l09", 5);
const DOCS = [T.ws("l09", 7), T.ws("l09", 9), T.ws("l09", 11)];
const B3 = T.ws("l10", 4);
const TOOLS = [T.ws("l10", 9), T.ws("l10", 12), T.ws("l10", 15)];
const B4 = T.ws("l11", 2);
const JOBL = [T.ws("l11", 6), T.ws("l11", 8), T.ws("l11", 11)];
const B5 = T.ws("l12", 2);
const ASKS = T.ws("l12", 8);
const RECAP = [T.ws("l13", 0), T.ws("l13", 1), T.ws("l13", 2), T.ws("l13", 4), T.ws("l13", 7)];
const AGENT = T.ws("l14", 3);
const TALKS = T.ws("l15", 2);
const DONE = T.ws("l15", 7);
const COLLAPSE: [number, number] = [T.ws("l16", 0) - 16, T.ws("l16", 0) - 2];
const HIT = T.ws("l16", 0) - 2;
const TAG = [1, 2, 3, 4, 5].map((i) => T.ws("l16", i));
const CTA = T.ws("l17", 0) - 2;
const URL = T.ws("l17", T.nwords("l17") - 1) - 4;
const DUR = Math.ceil(T.lineEnd("l17") + 60);

/* ── the tower ── */
const SX = 330; //  tower centre x
const SY = 1580; // slab top-face centre y
const BW = 370;
const BH = 118;
const topY = (i: number) => SY - (i + 1) * BH;
type BlockDef = { i: number; land: number; color: string; icon?: IconName; brain?: boolean; face?: boolean; title: string; sub: string };
const BLOCKS: BlockDef[] = [
  { i: 0, land: B1, color: "#7B55C7", brain: true, title: "Brain", sub: "THE AI MODEL" },
  { i: 1, land: B2, color: "#D4861C", icon: "book", title: "Knowledge", sub: "YOUR BUSINESS" },
  { i: 2, land: B3, color: "#1C9A83", icon: "zap", title: "Tools", sub: "IT CAN DO THINGS" },
  { i: 3, land: B4, color: "#2B86CC", icon: "file", title: "A job", sub: "INSTRUCTIONS" },
  { i: 4, land: B5, color: C.coral, face: true, title: "A human", sub: "IN THE LOOP" },
];
/** 0…1 while the recap lights block i, and 1 once the agent is complete */
const recapHot = (f: number, i: number) => Math.max(keys(f, [[RECAP[i] - 3, 0], [RECAP[i] + 3, 1], [RECAP[i] + 16, 0.25]], E.cubicInOut), 0);
const whole = (f: number) => tw(f, AGENT - 6, AGENT + 6, 0, 1, E.expoOut);
const shrink = (f: number) => tw(f, TALKS - 24, TALKS - 8, 0, 1, E.expoInOut);

/** the camera: raised and closer while the tower is short, settling as it grows */
const cam = (f: number) => ({
  ty: keys(f, [[HIRE, -330], [B2 - 10, -330], [B2 + 4, -250], [B3 + 4, -165], [B4 + 4, -80], [B5 + 4, 0]], E.cubicInOut),
  sc: keys(f, [[HIRE, 1.22], [B2 - 10, 1.22], [B2 + 4, 1.16], [B3 + 4, 1.1], [B4 + 4, 1.05], [B5 + 4, 1]], E.cubicInOut),
});
const camPt = (f: number, x: number, y: number) => {
  const c = cam(f);
  return { x: SX + (x - SX) * c.sc, y: SY + c.ty + (y - SY) * c.sc };
};
const Cam: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const c = cam(f);
  return <div style={{ position: "absolute", inset: 0, transformOrigin: `${SX}px ${SY}px`, transform: `translateY(${c.ty}px) scale(${c.sc})` }}>{children}</div>;
};

const Block: React.FC<{ f: number; b: BlockDef }> = ({ f, b }) => {
  if (f < b.land - 12) return null;
  const fall = tw(f, b.land - 11, b.land, 0, 1, E.cubicIn);
  const squash = keys(f, [[b.land - 1, 1], [b.land + 2, 0.84], [b.land + 8, 1.05], [b.land + 13, 1]], E.cubicInOut);
  const glow = Math.max(recapHot(f, b.i), whole(f) * (0.6 + 0.4 * Math.sin(f * 0.12 + b.i)));
  const y = topY(b.i) - (1 - fall) * 1000;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: `${SX}px ${topY(b.i) + BH + BW / 4}px`, transform: `scaleY(${squash}) scaleX(${2 - squash})` }}>
      <IsoBlock x={SX} y={y} w={BW} h={BH} color={b.color} glow={glow}>
        {b.brain ? (
          <div style={{ transform: "rotate(-45deg)" }}>
            <BrainGlyph size={120} />
          </div>
        ) : b.face ? (
          <div style={{ transform: "rotate(-45deg)" }}>
            <Face p={PEOPLE.grace} size={128} ring="#FFFFFF" />
          </div>
        ) : (
          <FaceIcon name={b.icon!} size={100} />
        )}
      </IsoBlock>
    </div>
  );
};

const Tower: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f < HIRE - 4) return null;
  const slab = clamp(springAt(f, HIRE - 2, 30, 13, 160));
  const sh = shrink(f);
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const badge = clamp(springAt(f, HIRE + 8, 30, 12, 180)) * (1 - tw(f, B1 - 14, B1 - 6, 0, 1, E.expoIn));
  const crown = clamp(springAt(f, AGENT - 2, 30, 11, 170));
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${SX}px ${SY}px`, transform: `translate(${mix(0, L.cx - SX, col)}px, ${mix(0, L.lockup.cy - SY, col)}px) scale(${mix(1, 0.62, sh) * (1 - 0.95 * col)})`, opacity: 1 - tw(col, 0.7, 1, 0, 1, E.linear) }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${SX}px ${SY}px`, transform: `scale(${mix(0.5, 1, slab)})`, opacity: clamp(slab * 2) }}>
        <IsoBlock x={SX} y={SY} w={BW + 90} h={34} color="#CFC7B8" />
        <div style={{ position: "absolute", left: SX - 260, top: SY + 30, width: 520, height: 110, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(23,23,23,.18), rgba(23,23,23,0) 70%)", zIndex: -1 }} />
      </div>
      {BLOCKS.map((b) => (
        <Block key={b.i} f={f} b={b} />
      ))}
      {BLOCKS.map((b) => (f >= b.land && f < b.land + 20 ? <Ring key={b.i} x={SX} y={topY(b.i) + BH + BW / 4} at={b.land} r={260} width={10} color={mixColor(b.color, "#FFFFFF", 0.3)} dur={18} opacity={0.7} /> : null))}
      {/* the new hire's name badge */}
      {badge > 0.01 ? (
        <div style={{ position: "absolute", left: SX - 200, top: SY - 400, width: 400, transform: `rotate(-4deg) scale(${mix(0.5, 1, badge)}) translateY(${Math.sin(f * 0.08) * 6}px)`, opacity: clamp(badge * 2), borderRadius: 22, overflow: "hidden", background: C.white, boxShadow: "0 20px 40px rgba(23,23,23,.18)", fontFamily: FONT, textAlign: "center" }}>
          <div style={{ background: C.coral, color: C.white, padding: "12px 0", fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>HELLO</div>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.12em", color: C.gray, marginTop: 12 }}>MY NAME IS</div>
          <div style={{ fontSize: 46, fontWeight: 700, fontStyle: "italic", color: C.ink, padding: "4px 0 18px" }}>New hire</div>
        </div>
      ) : null}
      {/* complete: the agent's crown */}
      {crown > 0.01 ? (
        <div style={{ position: "absolute", left: SX, top: topY(4) - 150, transform: `translate(-50%, -50%) scale(${mix(0.4, 1, crown)})`, opacity: clamp(crown * 2), display: "flex", alignItems: "center", gap: 12, padding: "14px 30px", borderRadius: 999, background: C.ink, color: C.cream, fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", whiteSpace: "nowrap", boxShadow: "0 18px 40px rgba(23,23,23,.3)", overflow: "hidden" }}>
          <Icon name="sparkles" size={30} color={C.coralLight} stroke={2.4} />
          AI AGENT
          <Sheen at={AGENT + 4} dur={20} opacity={0.5} />
        </div>
      ) : null}
      {crown > 0.01 ? <Sparkles x={SX - 190} y={topY(4) - 200} w={380} h={640} at={AGENT + 2} color={C.coral} size={46} seed={6} /> : null}
    </div>
  );
};

/* ── tags beside the tower ── */
const Tags: React.FC<{ f: number }> = ({ f }) => {
  if (f < B1) return null;
  const out = tw(f, TALKS - 24, TALKS - 10, 0, 1, E.expoIn);
  return (
    <>
      {BLOCKS.map((b) => {
        if (f < b.land + 2) return null;
        const s = clamp(springAt(f, b.land + 4, 30, 14, 170));
        const hot = recapHot(f, b.i);
        const y = topY(b.i) + BH * 0.55;
        return (
          <div key={b.i} style={{ position: "absolute", left: 600, top: y - 40, transform: `translateX(${(1 - s) * 60 + out * 600}px)`, opacity: clamp(s * 2) * (1 - out), display: "flex", alignItems: "center" }}>
            <div style={{ position: "absolute", left: -90, top: 40, width: 84 * s, height: 3, background: b.color, opacity: 0.6 }} />
            <Tag title={b.title} sub={b.sub} color={b.color} hot={hot} />
          </div>
        );
      })}
    </>
  );
};

/* ── the detail area (right column, above the tags) ── */
const DX = 580;
const DY = 590;
const Detail: React.FC<{ f: number; from: number; to: number; children: React.ReactNode; y?: number }> = ({ f, from, to, children, y = DY }) => {
  if (f < from - 2 || f > to + 12) return null;
  const s = clamp(springAt(f, from, 30, 14, 170));
  const out = tw(f, to, to + 10, 0, 1, E.expoIn);
  return <div style={{ position: "absolute", left: DX, top: y, width: 440, transform: `translateY(${(1 - s) * 60 - out * 40}px) scale(${mix(0.85, 1, s)})`, transformOrigin: "0 0", opacity: clamp(s * 2) * (1 - out) }}>{children}</div>;
};
const card: React.CSSProperties = { borderRadius: 30, background: C.white, boxShadow: "0 24px 54px rgba(23,23,23,.14)", padding: "24px 26px", fontFamily: FONT, color: C.ink };
const Row: React.FC<{ f: number; at: number; icon: IconName; text: string; color: string; check?: boolean; cross?: boolean }> = ({ f, at, icon, text, color, check, cross }) => {
  const s = clamp(springAt(f, at, 30, 14, 190));
  if (f < at - 1) return <div style={{ height: 66 }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: 66, transform: `translateX(${(1 - s) * 40}px)`, opacity: clamp(s * 2) }}>
      <div style={{ width: 50, height: 50, borderRadius: 16, background: mixColor(color, "#FFFFFF", 0.85), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={28} color={color} stroke={2.3} />
      </div>
      <div style={{ flex: 1, fontSize: 31, fontWeight: 650, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{text}</div>
      {check ? <CheckDisc t={tw(f, at + 4, at + 12, 0, 1, E.cubicInOut)} size={38} bg={C.green} fg={C.white} /> : null}
      {cross ? (
        <div style={{ width: 38, height: 38, borderRadius: 19, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${tw(f, at + 4, at + 10, 0, 1, E.backOut)})` }}>
          <svg width={18} height={18} viewBox="0 0 24 24" stroke="#fff" strokeWidth={4} strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </div>
      ) : null}
    </div>
  );
};

const Details: React.FC<{ f: number }> = ({ f }) => {
  // the brain's general knowledge, orbiting
  const GENERAL = ["History", "Recipes", "Taxes", "Poetry", "Python", "Physics"];
  const orb = tw(f, ORBIT - 4, ORBIT + 10, 0, 1, E.expoOut) * (1 - tw(f, EXCEPT - 6, EXCEPT + 4, 0, 1, E.expoIn));
  const q = clamp(springAt(f, EXCEPT, 30, 13, 180)) * (1 - tw(f, B2 - 20, B2 - 8, 0, 1, E.expoIn));
  return (
    <>
      <Detail f={f} from={MODEL - 4} to={EXCEPT - 8}>
        <div style={card}>
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.12em", color: C.gray }}>THE BRAIN = AN AI MODEL</div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", marginTop: 8, lineHeight: 1.05 }}>
            The kind inside
            <br />
            chat apps
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {["ChatGPT", "Claude", "Gemini"].map((n, i) => {
              const s = clamp(springAt(f, CHIPS[i], 30, 12, 190));
              return (
                <div key={n} style={{ padding: "8px 16px", borderRadius: 999, background: "#F1EFE8", fontSize: 24, fontWeight: 650, transform: `scale(${mix(0.5, 1, s)})`, opacity: clamp(s * 2) }}>
                  {n}
                </div>
              );
            })}
          </div>
        </div>
      </Detail>
      {q > 0.01 ? (
        <>
          <div style={{ position: "absolute", left: DX, top: DY + 60, transform: `scale(${mix(0.6, 1, q)})`, transformOrigin: "0 100%", opacity: clamp(q * 2), display: "flex", alignItems: "center", gap: 14 }}>
            <Face p={PEOPLE.omar} size={72} ring="#FFFFFF" />
            <div style={{ padding: "16px 22px", borderRadius: "28px 28px 28px 8px", background: "#5E6AD2", color: C.white, fontFamily: FONT, fontSize: 28, fontWeight: 600, lineHeight: 1.25, whiteSpace: "nowrap" }}>
              Are you open
              <br />
              this Sunday?
            </div>
          </div>
        </>
      ) : null}
      {/* your knowledge: documents fly into block 2 */}
      {DOCS.map((d, i) => {
        if (f < d - 4 || f > d + 22) return null;
        const t = tw(f, d - 2, d + 16, 0, 1, E.expoInOut);
        const sx = 900;
        const sy = 700 + i * 110;
        const tgt = camPt(f, SX, topY(1) + 20);
        const ex = tgt.x;
        const ey = tgt.y;
        const label = ["Website", "Price list", "FAQs"][i];
        const icon: IconName = (["globe", "card", "help"] as IconName[])[i];
        return (
          <div key={i} style={{ position: "absolute", left: mix(sx, ex, t), top: mix(sy, ey, t) - Math.sin(Math.PI * t) * 160, transform: `translate(-50%, -50%) scale(${mix(1, 0.3, tw(t, 0.6, 1, 0, 1, E.expoIn))}) rotate(${Math.sin(Math.PI * t) * -10}deg)`, opacity: 1 - tw(t, 0.88, 1, 0, 1, E.linear), width: 220, height: 150, borderRadius: 20, background: C.white, boxShadow: "0 18px 40px rgba(23,23,23,.2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: FONT }}>
            <Icon name={icon} size={46} color="#D4861C" stroke={2.2} />
            <div style={{ fontSize: 28, fontWeight: 750, color: C.ink }}>{label}</div>
          </div>
        );
      })}
      <Detail f={f} from={T.ws("l10", 4)} to={B4 - 10}>
        <div style={card}>
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.12em", color: C.gray, marginBottom: 6 }}>TOOLS = ACTIONS</div>
          <Row f={f} at={TOOLS[0]} icon="calendar" text="Booked · Fri 10:30" color="#1C9A83" check />
          <Row f={f} at={TOOLS[1]} icon="database" text="Spreadsheet updated" color="#1C9A83" check />
          <Row f={f} at={TOOLS[2]} icon="mail" text="Email sent" color="#1C9A83" check />
        </div>
      </Detail>
      <Detail f={f} from={B4 - 2} to={B5 - 10}>
        <div style={{ ...card, background: "#FFFDF7", borderTop: `10px solid #2B86CC` }}>
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.12em", color: C.gray, marginBottom: 6 }}>JOB DESCRIPTION</div>
          <Row f={f} at={JOBL[0]} icon="users" text="Role: Receptionist" color="#2B86CC" />
          <Row f={f} at={JOBL[1]} icon="sparkles" text="Be friendly" color="#2B86CC" check />
          <Row f={f} at={JOBL[2]} icon="card" text="Promise refunds" color="#2B86CC" cross />
        </div>
      </Detail>
      <Detail f={f} from={B5 - 2} to={RECAP[0] - 8}>
        <div style={card}>
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.12em", color: C.gray, marginBottom: 12 }}>NOT SURE? ASK A HUMAN</div>
          {f >= ASKS - 14 ? (
            <div style={{ alignSelf: "flex-start", display: "inline-block", padding: "14px 20px", borderRadius: "24px 24px 24px 8px", background: C.coralTint, fontSize: 26, fontWeight: 600, lineHeight: 1.25, opacity: clamp(springAt(f, ASKS - 14, 30, 14, 190) * 2) }}>
              A customer wants a refund.
              <br />
              Can you take this one?
            </div>
          ) : null}
          {f >= ASKS + 4 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", marginTop: 14, opacity: clamp(springAt(f, ASKS + 4, 30, 14, 190) * 2) }}>
              <div style={{ padding: "14px 20px", borderRadius: "24px 24px 8px 24px", background: C.ink, color: C.cream, fontSize: 26, fontWeight: 600 }}>On it.</div>
              <Face p={PEOPLE.grace} size={60} ring="#FFFFFF" />
            </div>
          ) : null}
        </div>
      </Detail>
    </>
  );
};

/* effects that belong to the tower (they ride the camera) */
const TowerFx: React.FC<{ f: number }> = ({ f }) => {
  const GENERAL = ["History", "Recipes", "Taxes", "Poetry", "Python", "Physics"];
  const orb = tw(f, ORBIT - 4, ORBIT + 10, 0, 1, E.expoOut) * (1 - tw(f, EXCEPT - 6, EXCEPT + 4, 0, 1, E.expoIn));
  const q = clamp(springAt(f, EXCEPT, 30, 13, 180)) * (1 - tw(f, B2 - 20, B2 - 8, 0, 1, E.expoIn));
  return (
    <>
      {orb > 0.01
        ? GENERAL.map((g, i) => {
            const a = (i / GENERAL.length) * Math.PI * 2 + f * 0.018;
            const x = SX + 30 + Math.cos(a) * 200;
            const y = topY(0) - 90 + Math.sin(a) * 95;
            const s = clamp(springAt(f, ORBIT + i * 3, 30, 13, 180)) * orb;
            return (
              <div key={g} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${mix(0.4, 1, s)})`, opacity: clamp(s * 2), padding: "10px 18px", borderRadius: 999, background: "#EFE9FB", color: "#5B3BA8", fontFamily: FONT, fontSize: 26, fontWeight: 700, whiteSpace: "nowrap", zIndex: Math.sin(a) > 0 ? 3 : 0 }}>
                {g}
              </div>
            );
          })
        : null}
      {q > 0.01 ? (
        <>
          {[0, 1, 2].map((k) => {
            const s = clamp(springAt(f, EXCEPT + 8 + k * 4, 30, 10, 200)) * q;
            return (
              <div key={k} style={{ position: "absolute", left: SX - 80 + k * 70, top: topY(0) - 150 - Math.abs(Math.sin(f * 0.15 + k)) * 16, transform: `scale(${s}) rotate(${(k - 1) * 14}deg)`, fontFamily: FONT, fontSize: 90, fontWeight: 900, color: "#7B55C7" }}>
                ?
              </div>
            );
          })}
        </>
      ) : null}
    </>
  );
};

/* ── the hook: buzzwords everywhere ── */
const BUZZ = ["LLM", "RAG", "tokens", "agentic", "MCP", "fine-tuning", "prompts", "vector DB", "embeddings", "context window", "GPT", "workflows"];
const Hook: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f > SIMPLE + 24) return null;
  const pill = clamp(springAt(f, 0, 30, 12, 170)) * (1 - tw(f, SIMPLE - 2, SIMPLE + 14, 0, 1, E.expoIn));
  const shake = f > T.ws("l02", 0) && f < FALL ? Math.sin(f * 0.9) * 4 : 0;
  return (
    <>
      {BUZZ.map((b, i) => {
        const at = 4 + i * 4;
        const s = clamp(springAt(f, at, 30, 11, 190));
        const a = (i / BUZZ.length) * Math.PI * 2 + 0.3;
        const r = 300 + rnd(i * 3.7) * 110;
        const x = L.cx + Math.cos(a) * r * 1.05;
        const y0 = 1060 + Math.sin(a) * r * 1.1;
        const drop = f > FALL ? Math.pow((f - FALL) * 1.2, 2) * (0.6 + rnd(i) * 0.6) : 0;
        const colors = [C.ink, C.coral, "#5E6AD2", "#1C9A83", "#D4861C", "#7B55C7"];
        const bg = colors[i % colors.length];
        return (
          <div key={b} style={{ position: "absolute", left: x, top: y0 + drop + Math.sin(f * 0.07 + i) * 6, transform: `translate(-50%, -50%) scale(${mix(0.3, 1, s)}) rotate(${(rnd(i * 9.1) - 0.5) * 18 + (f > FALL ? (f - FALL) * (rnd(i) - 0.5) * 6 : 0)}deg)`, opacity: clamp(s * 2) * (1 - tw(f, FALL + 16, FALL + 30, 0, 1, E.linear)), padding: "12px 22px", borderRadius: 16, background: bg, color: C.white, fontFamily: MONO, fontSize: 30, letterSpacing: "0.04em", whiteSpace: "nowrap", boxShadow: "0 12px 26px rgba(23,23,23,.2)" }}>
            {b}
          </div>
        );
      })}
      {pill > 0.01 ? (
        <div style={{ position: "absolute", left: L.cx + shake, top: 1060, transform: `translate(-50%, -50%) scale(${mix(0.4, 1, pill)})`, opacity: clamp(pill * 2), padding: "28px 52px", borderRadius: 999, background: C.cream, boxShadow: `0 30px 60px rgba(23,23,23,.18), inset 0 0 0 5px ${C.ink}`, fontFamily: FONT, fontSize: 104, fontWeight: 850, letterSpacing: "-0.05em", color: C.ink, whiteSpace: "nowrap" }}>
          AI agent<span style={{ color: C.coral }}>?</span>
        </div>
      ) : null}
    </>
  );
};

/* ── chatbot vs agent ── */
const Versus: React.FC<{ f: number }> = ({ f }) => {
  if (f < TALKS - 10 || f > COLLAPSE[1]) return null;
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const a = clamp(springAt(f, TALKS - 6, 30, 14, 170));
  const b = clamp(springAt(f, T.ws("l15", 4) - 4, 30, 14, 170));
  const panel = (s: number, y: number, title: string, children: React.ReactNode, dark: boolean) => (
    <div style={{ position: "absolute", left: 470, top: y, width: 540, transform: `translateX(${(1 - s) * 500}px)`, opacity: clamp(s * 2) * (1 - col), borderRadius: 32, background: dark ? C.ink : C.white, color: dark ? C.cream : C.ink, boxShadow: "0 24px 54px rgba(23,23,23,.16)", padding: "22px 26px", fontFamily: FONT }}>
      <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: dark ? C.coralLight : C.gray, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
  return (
    <>
      {panel(a, 880, "A CHATBOT TALKS", (
        <div style={{ display: "inline-block", padding: "14px 20px", borderRadius: "24px 24px 24px 8px", background: "#F1EFE8", fontSize: 28, fontWeight: 600, lineHeight: 1.25 }}>
          "You can book on
          <br />
          our website."
        </div>
      ), false)}
      {panel(b, 1150, "AN AGENT GETS IT DONE", (
        <>
          {[["calendar", "Booked · Fri 10:30"], ["mail", "Confirmation sent"]].map(([ic, t], i) => {
            const at = T.ws("l15", 5) + i * 8;
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, height: 62, opacity: clamp(springAt(f, at, 30, 14, 190) * 2) }}>
                <Icon name={ic as IconName} size={32} color={C.coralLight} stroke={2.3} />
                <div style={{ flex: 1, fontSize: 30, fontWeight: 650 }}>{t}</div>
                <CheckDisc t={tw(f, at + 4, at + 12, 0, 1, E.cubicInOut)} size={38} bg={C.coral} fg={C.white} />
              </div>
            );
          })}
        </>
      ), true)}
      {f >= DONE ? <Sparkles x={470} y={1150} w={540} h={180} at={DONE + 2} color={C.coral} size={40} seed={3} /> : null}
    </>
  );
};

/* ── series tag: this is an episode, not an ad ── */
const Series: React.FC<{ f: number }> = ({ f }) => {
  const s = tw(f, 2, 12, 0, 1, E.expoOut) * (1 - tw(f, COLLAPSE[0], COLLAPSE[0] + 8, 0, 1, E.expoIn));
  return (
    <div style={{ position: "absolute", left: 80, top: 150, display: "flex", alignItems: "center", gap: 12, opacity: s, transform: `translateY(${(1 - s) * -20}px)`, fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: C.ink }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: C.coral, boxShadow: `0 0 0 ${5 + 3 * Math.sin(f * 0.15)}px rgba(217,87,89,.18)` }} />
      AI, EXPLAINED · 01
    </div>
  );
};

const Headlines: React.FC = () => (
  <>
    <Kinetic from={T.VO.l01} to={T.VO.l02 - 9} color={C.ink} hi={C.coral} words={[
      { t: "Everyone's", at: T.ws("l01", 0) },
      { t: "talking", at: T.ws("l01", 1), br: true },
      { t: "about", at: T.ws("l01", 2) },
      { t: "AI", at: T.ws("l01", 3), hi: true },
      { t: "agents.", at: T.ws("l01", 4), hi: true },
    ]} />
    <Kinetic from={T.VO.l02 - 1} to={T.VO.l03 - 9} color={C.ink} hi={C.coral} words={[
      { t: "Almost", at: T.ws("l02", 0) },
      { t: "nobody", at: T.ws("l02", 1), hi: true, br: true },
      { t: "can", at: T.ws("l02", 2) },
      { t: "explain", at: T.ws("l02", 3) },
      { t: "one.", at: T.ws("l02", 4) },
    ]} />
    <Kinetic from={T.VO.l03 - 1} to={HIRE - 9} color={C.ink} hi={C.coral} words={[
      { t: "Here's", at: T.ws("l03", 1) },
      { t: "the", at: T.ws("l03", 2), br: true },
      { t: "simple", at: T.ws("l03", 3), hi: true },
      { t: "version.", at: T.ws("l03", 4), hi: true },
    ]} />
    <Kinetic from={HIRE - 2} to={T.VO.l05 - 9} color={C.ink} hi={C.coral} words={[
      { t: "Imagine", at: T.ws("l04", 0) },
      { t: "hiring", at: T.ws("l04", 1), br: true },
      { t: "a", at: T.ws("l04", 2) },
      { t: "new", at: T.ws("l04", 3) },
      { t: "employee.", at: T.ws("l04", 4), hi: true },
    ]} />
    <Kinetic from={T.VO.l05 - 1} to={EXCEPT - 9} color={C.ink} hi="#7B55C7" words={[
      { t: "First:", at: T.ws("l05", 0), br: true },
      { t: "a", at: T.ws("l05", 3) },
      { t: "brain.", at: T.ws("l05", 4), hi: true },
    ]} />
    <Kinetic from={EXCEPT - 2} to={T.VO.l09 - 9} color={C.ink} hi="#7B55C7" words={[
      { t: "Except", at: T.ws("l08", 0), br: true },
      { t: "your", at: T.ws("l08", 1) },
      { t: "business.", at: T.ws("l08", 2), hi: true },
    ]} />
    <Kinetic from={T.VO.l09 - 1} to={T.VO.l10 - 9} color={C.ink} hi="#D4861C" words={[
      { t: "Then:", at: T.ws("l09", 0), br: true },
      { t: "your", at: T.ws("l09", 4) },
      { t: "knowledge.", at: T.ws("l09", 5), hi: true },
    ]} />
    <Kinetic from={T.VO.l10 - 1} to={T.VO.l11 - 9} color={C.ink} hi="#1C9A83" words={[
      { t: "Then:", at: T.ws("l10", 0), br: true },
      { t: "hands.", at: T.ws("l10", 4), hi: true },
      { t: "Tools.", at: T.ws("l10", 5), hi: true },
    ]} />
    <Kinetic from={T.VO.l11 - 1} to={T.VO.l12 - 9} color={C.ink} hi="#2B86CC" words={[
      { t: "Then:", at: T.ws("l11", 0), br: true },
      { t: "a", at: T.ws("l11", 1) },
      { t: "job.", at: T.ws("l11", 2), hi: true },
    ]} />
    <Kinetic from={T.VO.l12 - 1} to={T.VO.l13 - 9} color={C.ink} hi={C.coral} words={[
      { t: "And:", at: T.ws("l12", 0), br: true },
      { t: "a", at: T.ws("l12", 1) },
      { t: "manager.", at: T.ws("l12", 2), hi: true },
    ]} />
    <Kinetic from={T.VO.l13 - 1} to={T.VO.l14 - 9} size={80} color={C.ink} hi={C.coral} words={[
      { t: "Brain", at: RECAP[0] },
      { t: "+ knowledge", at: RECAP[1], br: true },
      { t: "+ tools", at: RECAP[2] },
      { t: "+ a job", at: RECAP[3], br: true },
      { t: "+ a human", at: RECAP[4], hi: true },
    ]} />
    <Kinetic from={T.VO.l14 - 1} to={T.VO.l15 - 9} size={110} color={C.ink} hi={C.coral} shineAt={AGENT + 4} shineHi="#FFC2BA" words={[
      { t: "That's", at: T.ws("l14", 0) },
      { t: "an", at: T.ws("l14", 1), br: true },
      { t: "AI", at: T.ws("l14", 2), hi: true },
      { t: "agent.", at: T.ws("l14", 3), hi: true },
    ]} />
    <Kinetic from={T.VO.l15 - 1} to={COLLAPSE[0]} size={84} color={C.ink} hi={C.coral} words={[
      { t: "A", at: T.ws("l15", 0) },
      { t: "chatbot", at: T.ws("l15", 1) },
      { t: "talks.", at: T.ws("l15", 2), br: true },
      { t: "An", at: T.ws("l15", 3) },
      { t: "agent", at: T.ws("l15", 4), hi: true },
      { t: "gets", at: T.ws("l15", 5), br: true },
      { t: "things", at: T.ws("l15", 6), hi: true },
      { t: "done.", at: T.ws("l15", 7), hi: true },
    ]} />
  </>
);

export const WhatIsAnAgent: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT, background: C.cream }}>
      <DotField opacity={0.05} />
      <div style={{ position: "absolute", left: 540 + Math.sin(f * 0.01) * 60, top: -300, width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,85,199,.10), rgba(123,85,199,0) 65%)" }} />
      <div style={{ position: "absolute", left: -380, top: 1250 + Math.cos(f * 0.012) * 40, width: 1000, height: 1000, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,87,89,.10), rgba(217,87,89,0) 65%)" }} />
      <Hook f={f} />
      <Cam f={f}>
        <Tower f={f} />
        <Tags f={f} />
        <TowerFx f={f} />
      </Cam>
      <Details f={f} />
      <Versus f={f} />
      <Series f={f} />
      <Headlines />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      {grain ? <Grain opacity={0.04} /> : null}
      {audio ? <Audio src={staticFile("films/what-is-an-agent/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound ── */
export const SOUND: Cue[] = [
  cue(0, "pop", -3, "AI agent?"),
  ...Array.from({ length: 12 }, (_, i) => cue(4 + i * 4, i % 2 ? "blip" : "pop", -12, `buzzword ${i + 1}`)),
  cue(STICKERS + 4, "flurry", -10, "buzzword storm"),
  cue(FALL, "sink", -5, "the buzzwords fall"),
  cue(SIMPLE, "whoosh", -6, "clean slate"),
  cue(HIRE, "pop", -3, "the new hire"),
  ...BLOCKS.flatMap((b) => [cue(b.land - 5, "whoosh", -10, `${b.title} falls`), cue(b.land, "snap", -1, `${b.title} lands`), cue(b.land + 1, "impact", -14, `${b.title} thud`, { kind: "hit" })]),
  cue(MODEL, "blip", -7, "the model card"),
  ...CHIPS.map((c, i) => cue(c, "tick", -8, `chip ${i + 1}`)),
  cue(ORBIT, "shimmer", -10, "general knowledge orbits"),
  cue(EXCEPT, "notif", -5, "a question it can't answer"),
  cue(EXCEPT + 10, "miss", -6, "?"),
  ...DOCS.flatMap((d, i) => [cue(d, "whoosh", -11, `doc ${i + 1}`), cue(d + 15, "learn", -9, `doc ${i + 1} learned`)]),
  ...TOOLS.map((t, i) => cue(t + 4, "check", -6, `tool ${i + 1}`)),
  ...JOBL.map((j, i) => cue(j, i === 2 ? "miss" : "tick", -6, `job line ${i + 1}`)),
  cue(ASKS - 14, "send", -5, "asks a human"),
  cue(ASKS + 4, "receive", -4, "the human answers"),
  ...RECAP.map((r, i) => cue(r, "blip", -6, `recap ${i + 1}`)),
  cue(AGENT - 2, "swell", -6, "it comes together"),
  cue(AGENT, "impact", -6, "AI agent", { kind: "hit" }),
  cue(AGENT + 2, "shimmer", -7, "shine"),
  cue(TALKS - 6, "whoosh", -8, "chatbot card"),
  cue(TALKS, "receive", -6, "it only talks"),
  ...moments.land(DONE - 6, "the agent gets it done"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { FALL, SIMPLE, HIRE, B1, B2, B3, B4, B5, RECAP, AGENT, TALKS, DONE, HIT, CTA, URL, DUR };

export const WHATISANAGENT: FilmDef = {
  id: "WhatIsAnAgent",
  slug: "what-is-an-agent",
  title: "WhatIsAnAgent",
  component: WhatIsAnAgent,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v"],
  audio: "films/what-is-an-agent/mix.wav",
};
