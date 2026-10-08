import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CheckDisc, Icon, IconName } from "../../components/Icons";
import { E, clamp, keys, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, MONO } from "../../theme";
import { Kinetic, Odometer, Sheen, Sparkles, springAt } from "../../fx2/Fx2";
import { AgentDot, BIZ, Biz, BizBadge, BizKey } from "../components/Biz";
import { AgentBubble, CARD, Composer, Header, MeBubble, Result, Typing } from "../components/Card";
import { HIT, VO, ws } from "../timing";
import { AVATAR, CARD_OPEN } from "./Reveal";

/**
 * 16–34 s, one continuous piece of UI:
 *  · the card opens out of the avatar and swallows what the business knows
 *  · one agent, five businesses: each hook question gets its answer (the card
 *    morphs from shop to hotel to clinic to estate agent to software company)
 *  · the camera pulls back: it is one tile in a live wall of every conversation
 *  · one answer isn't right → 👎, a note, "Thanks for your feedback!", Apply →
 *    the answer is replaced, for good
 *  · the wall multiplies as the counters roll — it grows as fast as you do —
 *    and everything collapses into the mark on the final hit.
 */

/* ───────── timing ───────── */
const KNOW_IN = ws("l04", 7) - 4; // "trained on everything…"
const KNOW_EAT = ws("l04", 10) - 2; // "…your business knows" — the stickers are absorbed
type Ex = { k: BizKey; in: number; q: number; a: number; chip: number };
const EX: Ex[] = [
  { k: "store", in: VO.l05 - 4, q: VO.l05, a: ws("l05", 1) + 2, chip: ws("l05", 4) - 4 }, // "It answers like your best people"
  { k: "clinic", in: ws("l05", 6) - 7, q: ws("l05", 6) - 2, a: ws("l05", 7) - 1, chip: ws("l05", 7) + 5 }, // "It books."
  { k: "homes", in: ws("l05", 8) - 6, q: ws("l05", 8) - 1, a: ws("l05", 9) + 3, chip: ws("l05", 11) - 2 }, // "It captures every lead."
  { k: "saas", in: VO.l06 - 8, q: VO.l06 - 3, a: ws("l06", 4) + 2, chip: ws("l06", 8) - 2 }, // "…it brings in your team."
];
const SAM = ws("l06", 6); // "brings in" — a person joins
const PULL: [number, number] = [VO.l07 - 10, ws("l07", 3) + 4]; // "You see every conversation."
const LIFT: [number, number] = [VO.l08 - 6, VO.l08 + 8]; // "Give feedback once…"
const DISLIKE = ws("l08", 1) - 1;
const POP = DISLIKE + 4;
const TYPE: [number, number] = [POP + 3, ws("l08", 2) + 10];
const THANKS = ws("l08", 3) - 3;
const APPLY = ws("l08", 5) - 4; // "…it learns"
const FIXED = ws("l08", 6); // "for good"
const DROP_BACK: [number, number] = [VO.l09 - 4, VO.l09 + 10];
const WIDE: [number, number] = [VO.l09 + 4, ws("l09", 6) + 4]; // "so it grows as fast as you do"
const COLLAPSE: [number, number] = [HIT - 16, HIT];

/* ───────── the wall ───────── */
const TW = 880;
const TH = 1140;
const PITCH_X = 940;
const PITCH_Y = 1200;
const QA: { k: BizKey; q: string; a: string }[] = [
  { k: "store", q: "Do you ship abroad?", a: "Yes, to 40+ countries." },
  { k: "clinic", q: "Do you take my insurance?", a: "Yes, most major plans." },
  { k: "homes", q: "Can I book a viewing?", a: "Sure! Saturday at 11?" },
  { k: "hotel", q: "Is breakfast included?", a: "Yes, 7–10 AM, on the terrace." },
  { k: "saas", q: "How do I reset my password?", a: "Here's your reset link." },
  { k: "clinic", q: "Is there parking?", a: "Yes, free, right behind us." },
  { k: "store", q: "Do you have it in blue?", a: "Yes! Size M or L?" },
  { k: "saas", q: "Can I change my plan?", a: "Done, you're on Team now." },
  { k: "homes", q: "Are pets allowed?", a: "Cats and small dogs, yes." },
  { k: "hotel", q: "Late check-out?", a: "Of course, until 1 PM." },
];
const FEED_TILE = { c: 1, r: -1 }; // the store tile whose answer gets corrected
const tileSpec = (c: number, r: number) => QA[(((c * 7 + r * 3) % QA.length) + QA.length) % QA.length];

const Tile: React.FC<{ c: number; r: number; f: number; detail: boolean }> = ({ c, r, f, detail }) => {
  const spec = tileSpec(c, r);
  const b = BIZ[spec.k];
  const x = CARD.x + c * PITCH_X;
  const y = CARD.y + r * PITCH_Y;
  const phase = rnd(c * 13.1 + r * 7.7) * 60;
  const typing = ((f + phase) % 90) < 30;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: TW, height: TH, borderRadius: 48, background: C.white, boxShadow: "0 40px 90px rgba(23,23,23,.10)", overflow: "hidden", fontFamily: FONT }}>
      <div style={{ height: 150, display: "flex", alignItems: "center", gap: 20, padding: "0 40px", borderBottom: "2px solid #F0EDE6" }}>
        <BizBadge b={b} size={76} />
        {detail ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.025em", color: C.ink }}>{b.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 4 }}>{b.kind.toUpperCase()} · AI AGENT</div>
          </div>
        ) : (
          <div style={{ flex: 1, height: 30, borderRadius: 15, background: "#EEEBE4" }} />
        )}
        <div style={{ width: 16, height: 16, borderRadius: 8, background: "#35B97B" }} />
      </div>
      <div style={{ padding: "40px 40px", display: "flex", flexDirection: "column", gap: 28 }}>
        {detail ? (
          <>
            <MeBubble b={b} text={spec.q} />
            <AgentBubble lines={[spec.a]} />
            {typing ? <Typing f={f + phase} /> : null}
          </>
        ) : (
          <>
            <div style={{ alignSelf: "flex-end", width: 520, height: 100, borderRadius: 40, background: b.color, opacity: 0.85 }} />
            <div style={{ alignSelf: "flex-start", width: 600, height: 150, borderRadius: 40, background: "#F1EEE8" }} />
            <div style={{ alignSelf: "flex-end", width: 380, height: 100, borderRadius: 40, background: b.color, opacity: 0.55 }} />
          </>
        )}
      </div>
    </div>
  );
};

/* ───────── the main card ───────── */
const STICKERS: { icon: IconName; text: string; x: number; y: number; rot: number }[] = [
  { icon: "file", text: "Docs & PDFs", x: 150, y: 820, rot: -4 },
  { icon: "globe", text: "Your website", x: 520, y: 880, rot: 3 },
  { icon: "help", text: "FAQs", x: 250, y: 1010, rot: 2 },
  { icon: "bag", text: "Products", x: 600, y: 1080, rot: -3 },
  { icon: "calendar", text: "Calendar", x: 180, y: 1220, rot: -2 },
  { icon: "book", text: "Policies", x: 560, y: 1290, rot: 4 },
];

const Exchange: React.FC<{ e: Ex; f: number; out: number }> = ({ e, f, out }) => {
  const b = BIZ[e.k];
  const qs = springAt(f, e.q, 30, 14, 190);
  const as = springAt(f, e.a, 30, 14, 190);
  const cs = springAt(f, e.chip, 30, 13, 190);
  const isSaas = e.k === "saas";
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 38, display: "flex", flexDirection: "column", gap: 30, transform: `translateY(${-out * 520}px)`, opacity: 1 - out }}>
      {f >= e.q ? <MeBubble b={b} text={b.q} s={clamp(qs)} /> : null}
      {f >= e.q + 4 && f < e.a ? <Typing f={f} /> : null}
      {f >= e.a ? <AgentBubble lines={b.a} s={clamp(as)} /> : null}
      {isSaas && f >= SAM ? (
        <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 14, marginLeft: 68, transform: `scale(${mix(0.6, 1, clamp(springAt(f, SAM, 30, 13, 190)))})`, transformOrigin: "0% 50%", opacity: clamp(springAt(f, SAM, 30, 13, 190) * 2) }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: "#F4E6C8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.ink }}>S</div>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.1em", color: b.color }}>SAM JOINED THE CHAT</div>
        </div>
      ) : null}
      {f >= e.chip ? (
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <Result k={e.k} b={b} f={f} at={e.chip} s={clamp(cs)} />
          <div style={{ position: "absolute", inset: 0, marginLeft: 68, borderRadius: 36, overflow: "hidden", pointerEvents: "none" }}>
            <Sheen at={e.chip + 3} dur={16} color="255,255,255" opacity={0.9} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const MainCard: React.FC<{ f: number }> = ({ f }) => {
  const open = tw(f, CARD_OPEN, CARD_OPEN + 18, 0, 1, E.expoOut);
  // which business is on the card
  let cur = -1;
  EX.forEach((e, i) => {
    if (f >= e.in) cur = i;
  });
  const e = cur >= 0 ? EX[cur] : null;
  const prev = cur > 0 ? BIZ[EX[cur - 1].k] : cur === 0 ? null : undefined;
  const roll = e ? tw(f, e.in, e.in + 8, 0, 1, E.expoInOut) : 1;
  const b = e ? BIZ[e.k] : null;
  // accent wash across the header on every morph
  const wash = e ? tw(f, e.in - 1, e.in + 10, 0, 1, E.cubicInOut) : 0;
  const pulse = STICKERS.map((_, i) => KNOW_EAT + i * 3 + 10).reduce((m, t) => Math.max(m, f >= t ? 1 - tw(f, t, t + 12, 0, 1, E.expoOut) : 0), 0);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: CARD.y,
        width: CARD.w,
        height: CARD.h,
        borderRadius: 48,
        background: C.white,
        boxShadow: "0 50px 110px rgba(23,23,23,.14), 0 4px 14px rgba(23,23,23,.05)",
        overflow: "hidden",
        fontFamily: FONT,
        clipPath: `circle(${mix(38, 1600, open)}px at ${AVATAR.x - CARD.x}px ${AVATAR.y - CARD.y}px)`,
      }}
    >
      <Header b={b} prev={prev} roll={roll} />
      {e && wash > 0 && wash < 1 ? (
        <div style={{ position: "absolute", left: 0, top: 0, height: 150, width: `${wash * 100}%`, background: `linear-gradient(90deg, ${b!.tint}00, ${b!.tint} 70%, ${b!.tint}00)`, opacity: 1 - wash }} />
      ) : null}
      {/* avatar pulse while it learns */}
      {pulse > 0 ? <div style={{ position: "absolute", left: AVATAR.x - CARD.x - 38 - 20 * pulse, top: AVATAR.y - CARD.y - 38 - 20 * pulse, width: 76 + 40 * pulse, height: 76 + 40 * pulse, borderRadius: "50%", border: `${6 * pulse}px solid ${C.coral}`, opacity: pulse, boxSizing: "border-box" }} /> : null}
      {/* the conversation area clips below the header, so outgoing messages never cross it */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 152, bottom: 150, overflow: "hidden" }}>
        {EX.map((ex, i) => {
          if (f < ex.in - 2) return null;
          const next = EX[i + 1];
          const out = next ? tw(f, next.in - 3, next.in + 4, 0, 1, E.expoIn) : 0;
          if (out >= 1) return null;
          return <Exchange key={i} e={ex} f={f} out={out} />;
        })}
      </div>
      {f >= CARD_OPEN + 10 ? <Composer b={roll < 0.5 && prev !== undefined ? prev : b} /> : null}
    </div>
  );
};

/** The knowledge stickers: pop into the empty chat, then get swallowed by the avatar. */
const Knowledge: React.FC<{ f: number }> = ({ f }) => {
  if (f < KNOW_IN - 2 || f > KNOW_EAT + 40) return null;
  return (
    <>
      {STICKERS.map((s, i) => {
        const p = springAt(f, KNOW_IN + i * 3, 30, 12, 200);
        const eatAt = KNOW_EAT + i * 3;
        const eat = tw(f, eatAt, eatAt + 12, 0, 1, E.expoIn);
        if (eat >= 1) return null;
        const x = mix(s.x, AVATAR.x - 60, eat);
        const y = mix(s.y, AVATAR.y - 30, eat) - Math.sin(Math.PI * eat) * 160;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 28px 16px 18px",
              borderRadius: 999,
              background: C.white,
              boxShadow: `0 20px 40px rgba(23,23,23,.14), inset 0 0 0 3px ${C.coral}`,
              fontFamily: FONT,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: C.ink,
              whiteSpace: "nowrap",
              transform: `rotate(${s.rot * (1 - eat)}deg) scale(${mix(0.4, 1, clamp(p)) * mix(1, 0.15, eat)})`,
              opacity: clamp(p * 2),
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 25, background: C.coralTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={s.icon} size={28} color={C.coral} stroke={2.3} />
            </div>
            {s.text}
          </div>
        );
      })}
    </>
  );
};

/* ───────── feedback, lifted out of the wall ───────── */
const FEED = { x: 110, y: 540, w: 860, h: 1060 };
const TYPED = "Free returns are 30 days, not 14.";
const Feedback: React.FC<{ f: number; s: number; anchorY: number }> = ({ f, s, anchorY }) => {
  const b = BIZ.store;
  const lift = tw(f, LIFT[0], LIFT[1], 0, 1, E.expoInOut);
  const back = tw(f, DROP_BACK[0], DROP_BACK[1], 0, 1, E.expoInOut);
  const k = lift * (1 - back);
  if (k <= 0.001) return null;
  // where the tile sits on screen inside the wall (camera at scale s, centred on the main card)
  const cx0 = CARD.x + CARD.w / 2;
  const cy0 = CARD.y + CARD.h / 2;
  const tx = 540 + (CARD.x + FEED_TILE.c * PITCH_X - cx0) * s;
  const ty = anchorY + (CARD.y + FEED_TILE.r * PITCH_Y - cy0) * s;
  const x = mix(tx, FEED.x, k);
  const y = mix(ty, FEED.y, k);
  const sc = mix((TW * s) / FEED.w, 1, k);
  const disliked = f >= DISLIKE;
  const pop = springAt(f, POP, 30, 14, 190);
  const n = Math.round(tw(f, TYPE[0], TYPE[1], 0, TYPED.length, E.linear));
  const thanks = springAt(f, THANKS, 30, 14, 190);
  const applied = f >= APPLY + 4;
  const fixedS = springAt(f, FIXED, 30, 12, 200);
  const popOut = tw(f, THANKS - 2, THANKS + 6, 0, 1, E.expoIn);
  const press = keys(f, [[DISLIKE - 3, 1], [DISLIKE, 0.85], [DISLIKE + 6, 1]]);
  const applyPress = keys(f, [[APPLY - 2, 1], [APPLY, 0.92], [APPLY + 6, 1]]);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: FEED.w, transform: `scale(${sc})`, transformOrigin: "0 0", fontFamily: FONT }}>
      <div style={{ position: "relative", width: FEED.w, height: FEED.h, borderRadius: 48, background: C.white, boxShadow: `0 60px 140px rgba(23,23,23,${0.25 * k})`, overflow: "hidden" }}>
        <div style={{ height: 150, display: "flex", alignItems: "center", gap: 20, padding: "0 40px", borderBottom: "2px solid #F0EDE6" }}>
          <BizBadge b={b} size={76} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.025em", color: C.ink }}>{b.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.1em", color: C.gray, marginTop: 4 }}>CHAT LOGS · CONVERSATION</div>
          </div>
        </div>
        <div style={{ padding: "40px 40px", display: "flex", flexDirection: "column", gap: 26 }}>
          <MeBubble b={b} text="Can I return these shoes?" />
          <div style={{ position: "relative" }}>
            {applied ? (
              <AgentBubble lines={["Yes! Free returns", "within 30 days."]} s={1}>
                <Sheen at={FIXED - 2} dur={18} color="217,87,89" opacity={0.35} />
              </AgentBubble>
            ) : (
              <AgentBubble lines={["Returns are accepted", "within 14 days."]} s={1} />
            )}
          </div>
          {/* rate the answer */}
          <div style={{ display: "flex", gap: 16, marginLeft: 68 }}>
            {(["thumbsUp", "thumbsDown"] as const).map((ic, i) => {
              const on = i === 1 && disliked && !applied;
              return (
                <div key={ic} style={{ width: 70, height: 70, borderRadius: 35, background: on ? C.coral : "#F2EFE9", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${i === 1 ? press : 1})` }}>
                  <Icon name={ic} size={34} color={on ? C.white : C.gray} stroke={2.2} />
                </div>
              );
            })}
          </div>
          {applied ? (
            <div style={{ alignSelf: "center", marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 30px 18px 18px", borderRadius: 999, background: C.coralTint, color: C.coralDeep, fontSize: 32, fontWeight: 700, transform: `scale(${mix(0.5, 1, clamp(fixedS))})`, opacity: clamp(fixedS * 2) }}>
                <CheckDisc t={tw(f, FIXED, FIXED + 12, 0, 1, E.cubicInOut)} size={52} bg={C.coral} fg={C.white} />
                Added the new answer
              </div>
            </div>
          ) : null}
        </div>
        {/* the feedback popover (the app's own wording) */}
        {f >= POP && popOut < 1 ? (
          <div style={{ position: "absolute", left: 40, right: 40, top: 610, padding: "34px 36px", borderRadius: 36, background: C.white, boxShadow: "0 30px 80px rgba(23,23,23,.22), inset 0 0 0 2px #EEEAE2", transform: `translateY(${(1 - clamp(pop)) * 60 - popOut * 40}px) scale(${mix(0.9, 1, clamp(pop))})`, opacity: clamp(pop * 2) * (1 - popOut) }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.2 }}>Please describe what was wrong with this response</div>
            <div style={{ marginTop: 22, padding: "22px 24px", borderRadius: 22, boxShadow: `inset 0 0 0 2px ${C.ink}`, fontSize: 32, color: C.ink, minHeight: 44 }}>
              {TYPED.slice(0, n)}
              <span style={{ display: "inline-block", width: 3, height: 34, marginLeft: 2, verticalAlign: "-6px", background: Math.floor(f / 8) % 2 ? "transparent" : C.ink }} />
            </div>
          </div>
        ) : null}
        {/* the toast, then Apply */}
        {f >= THANKS ? (
          <div style={{ position: "absolute", left: 40, right: 40, bottom: 40, display: "flex", flexDirection: "column", gap: 18, alignItems: "stretch" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 24px", borderRadius: 26, background: C.ink, color: C.cream, fontSize: 23.5, fontWeight: 600, whiteSpace: "nowrap", transform: `translateY(${(1 - clamp(thanks)) * 60}px)`, opacity: clamp(thanks * 2) }}>
              <CheckDisc t={tw(f, THANKS + 2, THANKS + 12, 0, 1, E.cubicInOut)} size={40} bg={C.coral} fg={C.white} />
              Thanks for your feedback! We'll use it to improve the agent.
            </div>
            <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 12, padding: "20px 34px", borderRadius: 999, background: applied ? "#2E9C6A" : C.coral, color: C.white, fontSize: 30, fontWeight: 700, transform: `scale(${applyPress})`, opacity: tw(f, APPLY - 10, APPLY - 4, 0, 1, E.linear), position: "relative", overflow: "hidden" }}>
              <Icon name={applied ? "check" : "sparkles"} size={30} color={C.white} stroke={2.4} />
              {applied ? "Applied" : "Apply Feedbacks"}
              <Sheen at={APPLY - 8} dur={16} opacity={0.6} />
            </div>
          </div>
        ) : null}
      </div>
      {f >= FIXED ? <Sparkles x={0} y={180} w={FEED.w} h={400} at={FIXED} color={C.coral} size={46} seed={9} /> : null}
    </div>
  );
};

/* ───────── the whole flow, under one camera ───────── */
export const Flow: React.FC = () => {
  const f = useCurrentFrame();
  if (f < CARD_OPEN - 2 || f > HIT + 2) return null;
  const pull = tw(f, PULL[0], PULL[1], 0, 1, E.expoInOut);
  const wide = tw(f, WIDE[0], WIDE[1], 0, 1, E.cubicInOut);
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const s = mix(1, 0.3, pull) * mix(1, 0.45, wide) * mix(1, 0.02, col);
  const cx0 = CARD.x + CARD.w / 2;
  const cy0 = CARD.y + CARD.h / 2;
  const liftK = tw(f, LIFT[0], LIFT[1], 0, 1, E.expoInOut) * (1 - tw(f, DROP_BACK[0], DROP_BACK[1], 0, 1, E.expoInOut));
  // at scale 1 the card sits exactly where the avatar handed it over; pulling back re-centres the wall
  const anchorY = mix(cy0, 1060, pull);
  const reach = pull > 0 ? (wide > 0 ? 5 : 2) : 0;
  const tiles: { c: number; r: number }[] = [];
  for (let c = -reach; c <= reach; c++) for (let r = -reach - (wide > 0 ? 2 : 0); r <= reach + (wide > 0 ? 2 : 0); r++) if (c || r) tiles.push({ c, r });
  // tiles light up in a wave as the business grows
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(540px, ${anchorY}px) scale(${s}) translate(${-cx0}px, ${-cy0}px)` }}>
        {tiles.map(({ c, r }) => {
          const d = Math.hypot(c, r);
          const appear = tw(f, PULL[0] + 4 + d * 3, PULL[0] + 18 + d * 3, 0, 1, E.expoOut) * (wide > 0 || d <= 2.9 ? 1 : 0);
          const farIn = d > 2.9 ? tw(f, WIDE[0] + (d - 2.9) * 3, WIDE[0] + 12 + (d - 2.9) * 3, 0, 1, E.expoOut) : 1;
          const hide = c === FEED_TILE.c && r === FEED_TILE.r && liftK > 0.02;
          const v = appear * farIn;
          if (v <= 0.01 || hide) return null;
          return (
            <div key={`${c}.${r}`} style={{ opacity: v }}>
              <Tile c={c} r={r} f={f} detail={d <= 2.9} />
            </div>
          );
        })}
        <MainCard f={f} />
      </div>
      {/* a calm band for the headline while the wall fills the frame */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 640, background: `linear-gradient(180deg, ${C.cream} 0%, ${C.cream} 62%, rgba(250,249,245,0) 100%)`, opacity: pull * (1 - col) }} />
      {/* dim the wall while one conversation is in focus */}
      <AbsoluteFill style={{ background: C.cream, opacity: 0.72 * liftK }} />
      <Knowledge f={f} />
      <Feedback f={f} s={s} anchorY={anchorY} />
      <Counters f={f} />
    </AbsoluteFill>
  );
};

/** "…so it grows as fast as you do." */
const Counters: React.FC<{ f: number }> = ({ f }) => {
  if (f < WIDE[0] - 2 || f > HIT) return null;
  const inT = springAt(f, WIDE[0], 30, 15, 150);
  const out = tw(f, COLLAPSE[0] - 6, COLLAPSE[0] + 4, 0, 1, E.expoIn);
  const items: { n: number; from: number; label: string; icon: IconName }[] = [
    { n: 48902, from: 1284, label: "Conversations", icon: "message" },
    { n: 3120, from: 96, label: "Leads", icon: "userPlus" },
    { n: 23, from: 3, label: "Languages", icon: "globe" },
  ];
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1420, display: "flex", gap: 24, transform: `translateY(${(1 - clamp(inT)) * 120 + out * 60}px)`, opacity: clamp(inT * 2) * (1 - out) }}>
      {items.map((it, i) => (
        <div key={i} style={{ flex: 1, padding: "28px 26px", borderRadius: 36, background: "rgba(255,255,255,.92)", boxShadow: "0 30px 70px rgba(23,23,23,.16)", fontFamily: FONT, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 18, letterSpacing: "0.1em", color: C.gray }}>
            <Icon name={it.icon} size={22} color={C.coral} stroke={2.3} />
            {it.label.toUpperCase()}
          </div>
          <div style={{ marginTop: 12, fontSize: 62, fontWeight: 700, letterSpacing: "-0.04em", color: C.ink }}>
            <Odometer value={it.n} from={it.from} at={WIDE[0] + 4 + i * 3} dur={36} />
          </div>
          <Sheen at={WIDE[0] + 26 + i * 4} dur={18} opacity={0.8} />
        </div>
      ))}
    </div>
  );
};

/* ───────── words on top ───────── */
export const FlowText: React.FC = () => (
  <>
    <Kinetic from={ws("l04", 2) - 4} to={ws("l04", 6) - 10} y={250} size={100} color={C.ink} hi={C.coral} words={[
      { t: "Your", at: ws("l04", 2) },
      { t: "own", at: ws("l04", 3), br: true },
      { t: "AI", at: ws("l04", 4), hi: true },
      { t: "agent.", at: ws("l04", 5), hi: true },
    ]} />
    <Kinetic from={ws("l04", 6) - 4} to={VO.l05 - 8} y={250} size={100} color={C.ink} hi={C.coral} shineAt={ws("l04", 11) + 2} shineHi="#FFC2BA" words={[
      { t: "Trained", at: ws("l04", 6) },
      { t: "on", at: ws("l04", 7) },
      { t: "everything", at: ws("l04", 8), br: true },
      { t: "you", at: ws("l04", 9) },
      { t: "know.", at: ws("l04", 11), hi: true },
    ]} />
    <Kinetic from={EX[0].in} to={ws("l05", 6) - 8} y={300} size={120} color={C.ink} hi={C.coral} words={[{ t: "Answers.", at: ws("l05", 1), hi: true }]} />
    <Kinetic from={ws("l05", 6) - 4} to={ws("l05", 8) - 8} y={300} size={120} color={C.ink} hi={C.coral} words={[{ t: "Books.", at: ws("l05", 7), hi: true }]} />
    <Kinetic from={ws("l05", 8) - 4} to={VO.l06 - 8} y={250} size={110} color={C.ink} hi={C.coral} words={[
      { t: "Captures", at: ws("l05", 9), br: true },
      { t: "every", at: ws("l05", 10), hi: true },
      { t: "lead.", at: ws("l05", 11), hi: true },
    ]} />
    <Kinetic from={VO.l06 - 4} to={PULL[0] - 2} y={250} size={100} color={C.ink} hi={C.coral} words={[
      { t: "Brings", at: ws("l06", 6) },
      { t: "in", at: ws("l06", 7), br: true },
      { t: "your", at: ws("l06", 8), hi: true },
      { t: "team.", at: ws("l06", 9), hi: true },
    ]} />
    <Kinetic from={VO.l07 - 2} to={LIFT[0] - 4} y={200} size={104} color={C.ink} hi={C.coral} words={[
      { t: "You", at: ws("l07", 0) },
      { t: "see", at: ws("l07", 1), hi: true, br: true },
      { t: "every", at: ws("l07", 2) },
      { t: "conversation.", at: ws("l07", 3) },
    ]} />
    <Kinetic from={VO.l08 - 2} to={DROP_BACK[0] - 2} y={200} size={96} color={C.ink} hi={C.coral} words={[
      { t: "Feedback", at: ws("l08", 1) },
      { t: "once.", at: ws("l08", 2), br: true },
      { t: "Learned", at: ws("l08", 5), hi: true },
      { t: "for", at: ws("l08", 6), hi: true },
      { t: "good.", at: ws("l08", 7), hi: true },
    ]} />
    <Kinetic from={VO.l09 - 2} to={COLLAPSE[0] - 4} y={200} size={100} color={C.ink} hi={C.coral} shineAt={ws("l09", 7) + 2} shineHi="#FFC2BA" words={[
      { t: "Grows", at: ws("l09", 2) },
      { t: "as", at: ws("l09", 3) },
      { t: "fast", at: ws("l09", 4), hi: true, br: true },
      { t: "as", at: ws("l09", 5) },
      { t: "you", at: ws("l09", 6) },
      { t: "do.", at: ws("l09", 7), hi: true },
    ]} />
  </>
);

export const FLOW_BEATS = { KNOW_IN, KNOW_EAT, EX, SAM, PULL, LIFT, DISLIKE, POP, TYPE, THANKS, APPLY, FIXED, DROP_BACK, WIDE, COLLAPSE };
