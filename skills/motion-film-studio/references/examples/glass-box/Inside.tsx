import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CheckDisc, Icon } from "../../components/Icons";
import { E, clamp, keys, mix, rnd, tw } from "../../lib/ease";
import { C, FONT } from "../../theme";
import { CHANNEL, ChannelGlyph } from "../../loop/components/Kit";
import { Kinetic, Sheen, Sparkles, springAt } from "../../fx2/Fx2";
import { GlassCube } from "../components/Cube";
import { CREAM, Chip, DIM, FAINT, GBubble, GLabel, GPanel, Thumbs, Touch } from "../components/Glass";
import { VO, ws } from "../timing";
import { FLY } from "./Box";

/**
 * 7.4–21.6 s, inside the glass box:
 *  · Chat Logs, live — every question, every answer, every lead streams past
 *  · one answer isn't quite right → it opens; 👎; "Please describe what was
 *    wrong with this response"; "Thanks for your feedback!"
 *  · Improvements → Apply Feedbacks → the note flies into the agent's brain,
 *    the web of what it knows lights up → "Replaced the previous answer" →
 *    sealed, for good
 *  · the next customer asks the same thing and gets it right. 👍
 * Every string in the UI is the product's own.
 */
const PANEL = { x: 60, y: 560, w: 960, h: 1200 };
const IN_AT = FLY[1] - 8;
const Q_AT = ws("l04", 5) - 2; // "every question"
const A_AT = ws("l04", 7) - 2; // "every answer"
const LEAD_AT = ws("l04", 9) - 2; // "every lead"
const OPEN: [number, number] = [VO.l05 - 6, VO.l05 + 10]; // "Spot an answer…"
const WRONG = ws("l05", 4) - 2; // "not quite right"
const DISLIKE = ws("l06", 1) - 1;
const POP = ws("l06", 2) - 1;
const TYPE: [number, number] = [ws("l06", 3) - 3, ws("l06", 6) - 2];
const THANKS = ws("l06", 6);
const IMPROVE_IN: [number, number] = [VO.l07 - 8, VO.l07 + 8];
const APPLY = ws("l07", 2) - 2; // the button is on screen first, then pressed on "feedback"
const FLYNOTE: [number, number] = [APPLY + 4, APPLY + 22];
const LEARNS = ws("l07", 5) - 2;
const SEAL = ws("l07", 7) - 3; // "for good"
const NEXT_IN: [number, number] = [VO.l08 - 8, VO.l08 + 8];
const NQ = VO.l08 + 2;
const NA = ws("l08", 3) - 4;
const NR = ws("l08", 5) + 2;
const NLIKE = NR + 8;
export const INSIDE_END = VO.l09 + 4;

type Row = { name: string; ch: keyof typeof CHANNEL; msg: string; intent: string };
const ROWS: Row[] = [
  { name: "Tom B.", ch: "instagram", msg: "Are you open on Sunday?", intent: "Hours" },
  { name: "Grace L.", ch: "gmail", msg: "How do I change my plan?", intent: "Account" },
  { name: "Omar S.", ch: "web", msg: "Do you offer student discounts?", intent: "Pricing" },
  { name: "Lucas M.", ch: "messenger", msg: "Can I return this after 30 days?", intent: "Returns" },
  { name: "Nina P.", ch: "whatsapp", msg: "Can someone call me back?", intent: "Handoff" },
  { name: "Amira H.", ch: "instagram", msg: "Is the blue one in stock?", intent: "Product" },
  { name: "James K.", ch: "web", msg: "Can I book a demo for Friday?", intent: "Booking" },
  { name: "Sofia R.", ch: "whatsapp", msg: "Do you ship to Spain?", intent: "Shipping" },
];
const ROW_H = 132;
const arriveAt = (k: number) => IN_AT + 6 + k * 7;
const LUCAS = 3;

const Logs: React.FC<{ f: number }> = ({ f }) => {
  const inT = springAt(f, IN_AT, 30, 16, 140);
  const open = tw(f, OPEN[0], OPEN[1], 0, 1, E.expoInOut);
  if (f > OPEN[1] + 2) return null;
  const arrived = ROWS.reduce((n, _, k) => n + clamp(springAt(f, arriveAt(k), 30, 16, 170)), 0);
  const livePulse = 0.5 + 0.5 * Math.sin(f * 0.25);
  return (
    <GPanel style={{ left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, transform: `scale(${mix(0.8, 1, clamp(inT))})`, opacity: clamp(inT * 2) * (1 - tw(open, 0.6, 1, 0, 1, E.linear)) }}>
      <div style={{ position: "absolute", left: 44, right: 44, top: 40, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em" }}>Chat Logs</div>
        <Chip bg="rgba(217,87,89,.18)">
          <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: C.coral, opacity: 0.4 + 0.6 * livePulse }} />
          Live
        </Chip>
        <div style={{ flex: 1 }} />
        <GLabel>All agents · today</GLabel>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 140, bottom: 24, overflow: "hidden" }}>
        {ROWS.map((r, k) => {
          const s = clamp(springAt(f, arriveAt(k), 30, 16, 170));
          if (s <= 0) return null;
          const pos = arrived - 1 - k; // newest on top
          const y = pos * ROW_H + (1 - s) * -60;
          const isLucas = k === LUCAS;
          const dimOthers = isLucas ? 0 : open;
          const isNewest = k === ROWS.length - 1;
          const qGlint = isNewest ? tw(f, Q_AT, Q_AT + 14, 0, 1, E.cubicInOut) : -1;
          const showA = isNewest && f >= A_AT;
          const aS = clamp(springAt(f, A_AT, 30, 14, 190));
          const lead = k === ROWS.length - 2 && f >= LEAD_AT;
          const leadS = clamp(springAt(f, LEAD_AT, 30, 12, 200));
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: y,
                height: ROW_H - 12,
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "0 24px",
                borderRadius: 30,
                background: `rgba(255,255,255,${0.045 + (isLucas ? 0.08 * open : 0)})`,
                boxShadow: isLucas && open > 0 ? `inset 0 0 0 2px rgba(238,143,139,${0.8 * open})` : "inset 0 0 0 1px rgba(255,255,255,.06)",
                opacity: s * (1 - dimOthers),
              }}
            >
              <div style={{ width: 70, height: 70, borderRadius: 20, background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ChannelGlyph ch={r.ch} size={38} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>{r.name}</div>
                  <GLabel size={16} color={FAINT}>
                    {pos < 1 ? "now" : `${Math.round(pos * 7)}s ago`}
                  </GLabel>
                </div>
                <div style={{ position: "relative", fontSize: 28, color: DIM, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden" }}>
                  {showA ? (
                    <span style={{ color: CREAM, opacity: aS }}>
                      <span style={{ color: C.coralLight }}>↳ </span>Yes! We ship to Spain in 3–5 days.
                    </span>
                  ) : (
                    <span style={{ color: qGlint > 0 && qGlint < 1 ? CREAM : DIM }}>{r.msg}</span>
                  )}
                  {qGlint > 0 && qGlint < 1 ? (
                    <div style={{ position: "absolute", top: 0, bottom: 0, width: 160, left: `${mix(-20, 100, qGlint)}%`, background: "linear-gradient(90deg, rgba(238,143,139,0), rgba(238,143,139,.55), rgba(238,143,139,0))" }} />
                  ) : null}
                </div>
              </div>
              {lead ? (
                <div style={{ transform: `scale(${mix(0.5, 1, leadS)})`, opacity: clamp(leadS * 2) }}>
                  <Chip icon="userPlus" color="#FFFFFF" bg={C.coral}>
                    New lead
                  </Chip>
                </div>
              ) : (
                <Chip color={DIM} bg="rgba(255,255,255,.07)">
                  {r.intent}
                </Chip>
              )}
            </div>
          );
        })}
      </div>
      <Sheen at={IN_AT + 8} dur={24} opacity={0.18} />
    </GPanel>
  );
};

/* ───────── the conversation that wasn't right ───────── */
const CARD = { x: 90, y: 560, w: 900, h: 1180 };
const TYPED = "Returns are 60 days. Offer an exchange first.";
const Conversation: React.FC<{ f: number }> = ({ f }) => {
  if (f < OPEN[0] || f > IMPROVE_IN[1] + 4) return null;
  const open = tw(f, OPEN[0], OPEN[1], 0, 1, E.expoInOut);
  // the card grows out of Lucas's row
  const arrived = ROWS.length;
  const rowTop = PANEL.y + 140 + (arrived - 1 - LUCAS) * ROW_H;
  const rowRect = { x: PANEL.x + 24, y: rowTop, w: PANEL.w - 48, h: ROW_H - 12 };
  const cl = {
    t: mix(rowRect.y - CARD.y, 0, open),
    l: mix(rowRect.x - CARD.x, 0, open),
    r: mix(CARD.x + CARD.w - (rowRect.x + rowRect.w), 0, open),
    b: mix(CARD.y + CARD.h - (rowRect.y + rowRect.h), 0, open),
  };
  const aside = tw(f, IMPROVE_IN[0], IMPROVE_IN[1], 0, 1, E.expoInOut);
  const flag = keys(f, [[WRONG - 2, 0], [WRONG + 4, 1], [DISLIKE + 16, 1], [DISLIKE + 26, 0.35]], E.cubicInOut);
  const shake = f >= WRONG && f < WRONG + 14 ? Math.sin((f - WRONG) * 2.2) * 8 * (1 - (f - WRONG) / 14) : 0;
  const pop = clamp(springAt(f, POP, 30, 14, 180));
  const n = Math.round(tw(f, TYPE[0], TYPE[1], 0, TYPED.length, E.linear));
  const thanks = clamp(springAt(f, THANKS, 30, 14, 180));
  const press = keys(f, [[DISLIKE - 3, 1], [DISLIKE, 0.85], [DISLIKE + 6, 1]]);
  return (
    <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, transform: `translateX(${-aside * 900}px) scale(${1 - 0.25 * aside})`, opacity: 1 - aside, clipPath: `inset(${cl.t}px ${cl.r}px ${cl.b}px ${cl.l}px round ${mix(30, 44, open)}px)` }}>
      <GPanel style={{ inset: 0 }} glow={0.4 * flag}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 36, display: "flex", alignItems: "center", gap: 18, opacity: tw(open, 0.4, 1, 0, 1, E.linear) }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: "#E6E1F5", color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>L</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>Lucas M.</div>
            <GLabel size={17}>Chat logs · conversation</GLabel>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChannelGlyph ch="messenger" size={36} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 150, display: "flex", flexDirection: "column", gap: 22, opacity: tw(open, 0.5, 1, 0, 1, E.linear) }}>
          <GBubble who="customer">Can I return this after 30 days?</GBubble>
          <div style={{ alignSelf: "flex-end", transform: `translateX(${shake}px)` }}>
            <GBubble who="agent" flag={flag}>
              Sorry, returns are only
              <br />
              accepted within 30 days.
            </GBubble>
          </div>
          <Thumbs down={f >= DISLIKE ? 1 : 0} press={press} />
          {f >= WRONG + 4 ? (
            <GBubble who="customer" s={clamp(springAt(f, WRONG + 4, 30, 14, 190))}>
              Your website says 60 days…
            </GBubble>
          ) : null}
        </div>
        {/* the feedback popover (the product's own wording) */}
        {f >= POP ? (
          <div style={{ position: "absolute", left: 36, right: 36, top: 690, padding: "32px 34px", borderRadius: 34, background: "rgba(30,28,33,.92)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.16), 0 30px 80px rgba(0,0,0,.5)", transform: `translateY(${(1 - pop) * 80}px) scale(${mix(0.92, 1, pop)})`, opacity: clamp(pop * 2) }}>
            <div style={{ fontSize: 31, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Please describe what was wrong with this response</div>
            <div style={{ marginTop: 20, padding: "20px 22px", borderRadius: 20, boxShadow: `inset 0 0 0 2px ${C.coral}`, fontSize: 30, color: CREAM, minHeight: 40, lineHeight: 1.3 }}>
              {TYPED.slice(0, n)}
              <span style={{ display: "inline-block", width: 3, height: 32, marginLeft: 2, verticalAlign: "-5px", background: Math.floor(f / 8) % 2 ? "transparent" : CREAM }} />
            </div>
          </div>
        ) : null}
        {f >= THANKS ? (
          <div style={{ position: "absolute", left: 36, right: 36, bottom: 36, display: "flex", alignItems: "center", gap: 14, padding: "22px 24px", borderRadius: 26, background: CREAM, color: C.ink, fontSize: 24, fontWeight: 600, whiteSpace: "nowrap", transform: `translateY(${(1 - thanks) * 60}px)`, opacity: clamp(thanks * 2) }}>
            <CheckDisc t={tw(f, THANKS + 2, THANKS + 12, 0, 1, E.cubicInOut)} size={40} bg={C.coral} fg="#FFFFFF" />
            Thanks for your feedback! We'll use it to improve the agent.
          </div>
        ) : null}
      </GPanel>
      <Touch f={f} x={CARD.w - 40 - 66 - 33} y={150 + 110 + 22 + 130 + 22 + 33} at={DISLIKE} />
    </div>
  );
};

/* ───────── Improvements: Apply → it learns, for good ───────── */
const BRAIN = { x: 540, y: 960 };
/** A calm orbit of knowledge around the glass brain: evenly spaced nodes on an
 *  ellipse, spokes that stop at the glass (they never cross the mark). */
const NODES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
  return {
    x: BRAIN.x + Math.cos(a) * 330,
    y: BRAIN.y + Math.sin(a) * 175,
    ix: BRAIN.x + Math.cos(a) * 165,
    iy: BRAIN.y + Math.sin(a) * 120,
    d: ((i * 5) % 14) / 14,
  };
});
const Improve: React.FC<{ f: number }> = ({ f }) => {
  if (f < IMPROVE_IN[0] - 2 || f > NEXT_IN[1] + 4) return null;
  const inT = tw(f, IMPROVE_IN[0], IMPROVE_IN[1], 0, 1, E.expoInOut);
  const out = tw(f, NEXT_IN[0], NEXT_IN[1], 0, 1, E.expoInOut);
  const press = keys(f, [[APPLY - 3, 1], [APPLY, 0.92], [APPLY + 7, 1]]);
  const flyT = tw(f, FLYNOTE[0], FLYNOTE[1], 0, 1, E.expoIn);
  const lit = tw(f, FLYNOTE[1] - 2, LEARNS + 6, 0, 1, E.cubicInOut);
  const learnS = clamp(springAt(f, LEARNS, 30, 12, 200));
  const seal = tw(f, SEAL, SEAL + 16, 0, 1, E.cubicInOut);
  const kick = f >= FLYNOTE[1] ? 1 - tw(f, FLYNOTE[1], FLYNOTE[1] + 20, 0, 1, E.expoOut) : 0;
  const noteY0 = 1250;
  const noteX = mix(90, BRAIN.x - 220, flyT);
  const noteY = mix(noteY0, BRAIN.y - 60, flyT) - Math.sin(Math.PI * flyT) * 120;
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - inT) * 1000 - out * 1000}px)`, opacity: 1 - out, fontFamily: FONT }}>
      <GPanel style={{ left: 90, top: 560, width: 900, height: 1180 }}>
        <div style={{ position: "absolute", left: 44, right: 44, top: 40 }}>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em" }}>Improvements</div>
          <div style={{ fontSize: 27, lineHeight: 1.35, color: DIM, marginTop: 10 }}>Review negative feedback and train your agent to avoid similar mistakes.</div>
        </div>
      </GPanel>
      {/* the web of what it knows */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={BRAIN.x} cy={BRAIN.y} rx={330} ry={175} fill="none" stroke="rgba(250,249,245,.14)" strokeWidth={1.5} />
        <ellipse cx={BRAIN.x} cy={BRAIN.y} rx={330} ry={175} fill="none" stroke={C.coral} strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray={`${1660 * lit} 1700`} />
        {NODES.map((n, i) => {
          const on = tw(lit, n.d * 0.7, n.d * 0.7 + 0.3, 0, 1, E.cubicInOut);
          const px = mix(n.x, n.ix, on);
          const py = mix(n.y, n.iy, on);
          return (
            <g key={i}>
              <line x1={n.x} y1={n.y} x2={n.ix} y2={n.iy} stroke={on > 0 ? C.coralLight : "rgba(250,249,245,.18)"} strokeOpacity={0.2 + 0.35 * on} strokeWidth={1.5} />
              {on > 0 && on < 1 ? <circle cx={px} cy={py} r={5} fill="#FFFFFF" opacity={Math.sin(Math.PI * on)} /> : null}
              <circle cx={n.x} cy={n.y} r={7 + 3 * on} fill={on > 0.5 ? C.coral : "rgba(250,249,245,.55)"} />
              {on > 0.5 ? <circle cx={n.x} cy={n.y} r={16} fill="none" stroke={C.coral} strokeOpacity={0.35} strokeWidth={2} /> : null}
            </g>
          );
        })}
        {seal > 0 ? (
          <circle cx={BRAIN.x} cy={BRAIN.y} r={170} fill="none" stroke={C.coral} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 170 * seal} ${2 * Math.PI * 170}`} transform={`rotate(-90 ${BRAIN.x} ${BRAIN.y})`} />
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: BRAIN.x - 110, top: BRAIN.y - 110, width: 220, height: 220, perspective: 1600, transform: `scale(${1 + 0.12 * kick})` }}>
        <GlassCube size={220} rx={-16} ry={30 + f * 0.6} glass={1} glow={0.4 + 0.6 * lit} inner={1} />
      </div>
      {seal > 0.98 ? (
        <div style={{ position: "absolute", left: BRAIN.x + 110, top: BRAIN.y - 150, width: 64, height: 64, borderRadius: 32, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${clamp(springAt(f, SEAL + 15, 30, 12, 220))})` }}>
          <Icon name="lock" size={32} color="#FFFFFF" stroke={2.4} />
        </div>
      ) : null}
      {/* the learned answer */}
      {f >= LEARNS ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: BRAIN.y + 230, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 30px 18px 18px", borderRadius: 999, background: CREAM, color: C.ink, fontSize: 32, fontWeight: 700, transform: `scale(${mix(0.5, 1, learnS)})`, opacity: clamp(learnS * 2) }}>
            <CheckDisc t={tw(f, LEARNS, LEARNS + 12, 0, 1, E.cubicInOut)} size={50} bg={C.coral} fg="#FFFFFF" />
            Replaced the previous answer
          </div>
        </div>
      ) : null}
      {/* the correction card and the button */}
      {flyT < 1 ? (
        <div style={{ position: "absolute", left: noteX, top: noteY, width: 900 - 2 * 44, transform: `scale(${mix(1, 0.2, flyT)})`, transformOrigin: "50% 50%", opacity: 1 - tw(flyT, 0.8, 1, 0, 1, E.linear) }}>
          <div style={{ marginLeft: 44, padding: "28px 30px", borderRadius: 30, background: "rgba(255,255,255,.07)", boxShadow: "inset 0 0 0 1.5px rgba(238,143,139,.6)", color: CREAM }}>
            <GLabel color={C.coralLight} size={18}>Trainer correction</GLabel>
            <div style={{ fontSize: 33, fontWeight: 600, marginTop: 10, lineHeight: 1.25 }}>{TYPED}</div>
            <div style={{ fontSize: 24, color: FAINT, marginTop: 10 }}>on “Can I return this after 30 days?”</div>
          </div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1590, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 14, padding: "24px 40px", borderRadius: 999, background: f >= APPLY ? "#2E9C6A" : C.coral, color: "#FFFFFF", fontSize: 34, fontWeight: 700, transform: `scale(${press})` }}>
          <Icon name={f >= APPLY ? "check" : "sparkles"} size={34} color="#FFFFFF" stroke={2.4} />
          {f >= APPLY ? "Applied" : "Apply Feedbacks"}
          <Sheen at={IMPROVE_IN[1] - 4} dur={18} opacity={0.5} />
        </div>
      </div>
      <Touch f={f} x={540} y={1638} at={APPLY} />
      <Sparkles x={BRAIN.x - 200} y={BRAIN.y - 200} w={400} h={400} at={SEAL + 12} color={C.coralLight} size={46} seed={5} />
    </AbsoluteFill>
  );
};

/* ───────── the next customer ───────── */
const Next: React.FC<{ f: number }> = ({ f }) => {
  if (f < NEXT_IN[0] - 2 || f > INSIDE_END + 12) return null;
  const inT = springAt(f, NEXT_IN[0], 30, 16, 140);
  const out = tw(f, INSIDE_END - 4, INSIDE_END + 10, 0, 1, E.expoIn);
  const q = clamp(springAt(f, NQ, 30, 14, 190));
  const a = clamp(springAt(f, NA, 30, 14, 190));
  const r = clamp(springAt(f, NR, 30, 14, 190));
  return (
    <div style={{ position: "absolute", left: 90, top: 560, width: 900, height: 1080, transform: `translateY(${(1 - clamp(inT)) * 900 - out * 200}px) scale(${1 - 0.2 * out})`, opacity: clamp(inT * 2) * (1 - out) }}>
      <GPanel style={{ inset: 0 }} glow={0.5 * a}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 36, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: "#DCEDFA", color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>Maya T.</div>
            <GLabel size={17}>A new conversation · just now</GLabel>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChannelGlyph ch="whatsapp" size={36} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 150, display: "flex", flexDirection: "column", gap: 22 }}>
          {f >= NQ ? (
            <GBubble who="customer" s={q}>
              Can I return my jacket?
              <br />
              It's been 5 weeks.
            </GBubble>
          ) : null}
          {f >= NA ? (
            <GBubble who="agent" s={a}>
              Yes! You have 60 days.
              <br />
              Exchange or refund?
              <Sheen at={NA + 4} dur={18} color="255,255,255" opacity={0.4} />
            </GBubble>
          ) : null}
          {f >= NR ? (
            <GBubble who="customer" s={r}>
              Exchange, please!
            </GBubble>
          ) : null}
          {f >= NA + 6 ? <Thumbs up={f >= NLIKE ? 1 : 0} style={{ marginTop: -6 }} /> : null}
        </div>
      </GPanel>
      <Sparkles x={560} y={420} w={300} h={120} at={NLIKE + 2} color={C.coralLight} size={40} seed={2} />
    </div>
  );
};

export const Inside: React.FC = () => {
  const f = useCurrentFrame();
  if (f < IN_AT - 2 || f > INSIDE_END + 14) return null;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Logs f={f} />
      <Conversation f={f} />
      <Improve f={f} />
      <Next f={f} />
    </AbsoluteFill>
  );
};

export const InsideText: React.FC = () => (
  <>
    <Kinetic from={VO.l04 - 2} to={OPEN[0] - 2} y={250} size={100} color={CREAM} hi={C.coral} words={[
      { t: "Watch", at: ws("l04", 0) },
      { t: "every", at: ws("l04", 1), br: true },
      { t: "conversation,", at: ws("l04", 2) },
      { t: "live.", at: ws("l04", 3), hi: true },
    ]} />
    <Kinetic from={VO.l05 - 2} to={VO.l06 - 8} y={250} size={96} color={CREAM} hi={C.coralLight} words={[
      { t: "Spot", at: ws("l05", 0) },
      { t: "an", at: ws("l05", 1) },
      { t: "answer", at: ws("l05", 2), br: true },
      { t: "that's", at: ws("l05", 3) },
      { t: "not", at: ws("l05", 4), hi: true },
      { t: "quite", at: ws("l05", 5), hi: true },
      { t: "right?", at: ws("l05", 6), hi: true },
    ]} />
    <Kinetic from={VO.l06 - 2} to={IMPROVE_IN[0] - 2} y={250} size={96} color={CREAM} hi={C.coral} words={[
      { t: "Tap", at: ws("l06", 0) },
      { t: "dislike.", at: ws("l06", 1), hi: true, br: true },
      { t: "Tell", at: ws("l06", 3) },
      { t: "it", at: ws("l06", 4) },
      { t: "what's", at: ws("l06", 5) },
      { t: "wrong.", at: ws("l06", 6) },
    ]} />
    <Kinetic from={VO.l07 - 2} to={NEXT_IN[0] - 2} y={250} size={96} color={CREAM} hi={C.coral} shineAt={SEAL + 2} shineHi="#FFFFFF" words={[
      { t: "Apply", at: ws("l07", 0) },
      { t: "it.", at: ws("l07", 1) },
      { t: "It", at: ws("l07", 4) },
      { t: "learns,", at: ws("l07", 5), hi: true, br: true },
      { t: "for", at: ws("l07", 6), hi: true },
      { t: "good.", at: ws("l07", 7), hi: true },
    ]} />
    <Kinetic from={VO.l08 - 2} to={INSIDE_END - 6} y={250} size={96} color={CREAM} hi={C.coral} words={[
      { t: "The", at: ws("l08", 0) },
      { t: "next", at: ws("l08", 1) },
      { t: "customer", at: ws("l08", 2), br: true },
      { t: "gets", at: ws("l08", 3) },
      { t: "it", at: ws("l08", 4) },
      { t: "right.", at: ws("l08", 5), hi: true },
    ]} />
  </>
);

export const INSIDE_BEATS = { IN_AT, Q_AT, A_AT, LEAD_AT, OPEN, WRONG, DISLIKE, POP, TYPE, THANKS, IMPROVE_IN, APPLY, FLYNOTE, LEARNS, SEAL, NEXT_IN, NQ, NA, NR, NLIKE, INSIDE_END, ARRIVE: ROWS.map((_, k) => arriveAt(k)) };
