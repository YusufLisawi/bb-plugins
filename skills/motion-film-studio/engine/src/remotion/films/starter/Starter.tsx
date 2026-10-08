import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../../fonts";
import { E, clamp, mix, mixColor, rnd, tw } from "../../lib/ease";
import { C, FONT, ACCENT_RGB } from "../../theme";
import { Cam, World, swing } from "../../kit/camera";
import { Fit, fitPoint, useLayout } from "../../kit/format";
import { Bokeh, DotField, Grain, Impact, Sheen, Sparkles, springAt } from "../../kit/fx";
import { Bug, Lockup } from "../../kit/lockup";
import { Cue, cue, moments } from "../../kit/sound";
import { makeTiming, Words } from "../../kit/timing";
import { Kinetic } from "../../kit/type";
import { AgentDot, Bubble, ChannelGlyph, ChannelId, Mono, ResultCard, Typing } from "../../kit/ui";
import { Mark } from "../../brand/Mark";
import { MARK_H, MARK_W } from "../../lib/logo";
import type { FilmDef, FilmProps } from "../registry";
// written by scripts/split_take.py — re-running it re-times the whole film
import lines from "../../../../public/films/starter/vo/lines.json";
import words from "../../../../public/films/starter/vo/words.json";

loadFonts();

/**
 * STARTER — a kit demo: a 14-second film that exercises the kit in all four
 * formats. Read it to see the plumbing in use (beats → scenes → words →
 * lockup → SOUND). New films start from a blank canvas (scripts/new-film.sh)
 * with their own concept, not from this one.
 *
 *   hook   "Every business runs on questions."   dark, questions rise from three channels
 *   drop   "Brainfast…"                           impact, the mark draws, the world turns cream
 *   proof  "…answers every one of them, in seconds."  a chat answered + the RESULT card lands
 *   hit    "Brainfast. Create a new brain, fast." everything collapses into the lockup
 *   CTA    "Build your first agent for free…"     pill + URL + tap
 *
 * Every beat is a word of the voice (T.ws) — never a hand-typed frame.
 */
type Line = keyof typeof lines; // "l01" | "l02" | …
const T = makeTiming(lines as Record<Line, number>, words as unknown as Record<Line, Words>);
const DUR = 420;

/* ── beats (frames) — shared by scenes AND the SOUND export below ── */
const DROP = T.ws("l02", 0); //                 "Brainfast"
const Q_AT = DROP + 10; //                        customer asks
const ANSWER = T.ws("l02", 1); //                 "answers"
const RESULT = T.ws("l02", 6) - 2; //             "in seconds"
const COLLAPSE: [number, number] = [T.ws("l03", 0) - 14, T.ws("l03", 0) - 2];
const HIT = T.ws("l03", 0) - 2; //                "Brainfast." — the final hit
const TAG = [1, 2, 3, 4, 5].map((i) => T.ws("l03", i));
const CTA = T.ws("l04", 0) - 2;
const URL = T.ws("l04", 7) - 4;

/** 0 before the drop (dark, noisy) → 1 after (cream, calm). The switch is a
 *  4-frame cut hidden inside the impact bloom — a slow cross-fade passes
 *  through a dull grey that reads as a mistake. */
const dayness = (f: number) => tw(f, DROP - 1, DROP + 3, 0, 1, E.cubicInOut);

/* ── hook: the questions ── */
const QUESTIONS: { ch: ChannelId; text: string }[] = [
  { ch: "whatsapp", text: "Where's my order?" },
  { ch: "instagram", text: "Are you open today?" },
  { ch: "web", text: "Can I book for Friday?" },
];
const Hook: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f > DROP + 24) return null;
  const blast = tw(f, DROP, DROP + 20, 0, 1, E.expoOut);
  const r = L.stage;
  return (
    <AbsoluteFill style={{ opacity: 1 - tw(f, DROP + 6, DROP + 20, 0, 1, E.linear) }}>
      {QUESTIONS.map((q, i) => {
        const at = T.ws("l01", 1) + i * 8;
        const s = clamp(springAt(f, at, 30, 13, 170));
        const x = r.x + r.w * [0.08, 0.3, 0.14][i];
        const y = r.y + r.h * [0.18, 0.44, 0.7][i];
        const a = Math.atan2(y - (r.y + r.h / 2), x - (r.x + r.w / 2));
        // continuous float (low-frequency sine) — never per-frame randomness
        const bob = Math.sin(f * 0.06 + i * 2) * 10 * L.u;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(a) * 900 * blast * L.u,
              top: y + bob + Math.sin(a) * 900 * blast * L.u,
              display: "flex",
              alignItems: "center",
              gap: 18 * L.u,
              padding: `${20 * L.u}px ${32 * L.u}px ${20 * L.u}px ${20 * L.u}px`,
              borderRadius: 999,
              background: "rgba(250,249,245,.96)",
              boxShadow: "0 24px 50px rgba(0,0,0,.45)",
              fontSize: 40 * L.u,
              fontWeight: 600,
              color: C.ink,
              whiteSpace: "nowrap",
              transform: `translateY(${(1 - s) * 120 * L.u}px) scale(${mix(0.6, 1, s)}) rotate(${(rnd(i) - 0.5) * 6 + blast * 30}deg)`,
              opacity: clamp(s * 2),
            }}
          >
            <div style={{ width: 64 * L.u, height: 64 * L.u, borderRadius: 18 * L.u, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChannelGlyph ch={q.ch} size={40 * L.u} />
            </div>
            {q.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ── drop: the mark draws itself over the impact ── */
const Reveal: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f < DROP - 2 || f > Q_AT + 12) return null;
  const c = { x: L.stage.x + L.stage.w / 2, y: L.stage.y + L.stage.h / 2 };
  const draw = tw(f, DROP, DROP + 18, 0, 1, E.cubicInOut);
  const out = tw(f, Q_AT - 2, Q_AT + 10, 0, 1, E.expoIn);
  const h = 300 * L.u * (1 - 0.6 * out);
  return (
    <AbsoluteFill>
      <Impact x={c.x} y={c.y} at={DROP} scale={L.u} />
      <div style={{ position: "absolute", left: c.x - (h * MARK_W) / MARK_H / 2, top: c.y - h / 2, opacity: 1 - out }}>
        <Mark height={h} progress={draw} color={C.coral} />
      </div>
    </AbsoluteFill>
  );
};

/* ── proof: a chat answered, and the result lands (design box 880 × 1040, fitted to the stage) ── */
const BOX = { w: 880, h: 1040 };
const Proof: React.FC<{ f: number }> = ({ f }) => {
  const L = useLayout();
  if (f < Q_AT - 4 || f > HIT + 2) return null;
  const open = clamp(springAt(f, Q_AT - 4, 30, 16, 150));
  const col = tw(f, COLLAPSE[0], COLLAPSE[1], 0, 1, E.expoIn);
  const q = clamp(springAt(f, Q_AT, 30, 14, 190));
  const a = clamp(springAt(f, ANSWER, 30, 14, 190));
  const r = clamp(springAt(f, RESULT, 30, 13, 170));
  // the camera never stops: a slow push while the card is up
  const cam: Cam = { x: BOX.w / 2, y: BOX.h / 2, s: mix(0.96, 1.02, tw(f, Q_AT, COLLAPSE[0], 0, 1, E.linear)) * swing(0) * mix(1, 0.05, col) };
  const p = fitPoint(L, BOX.w, BOX.h, 0, 780);
  return (
    <AbsoluteFill style={{ opacity: 1 - tw(col, 0.7, 1, 0, 1, E.linear) }}>
      <Fit w={BOX.w} h={BOX.h}>
        <World cam={cam} anchor={{ x: BOX.w / 2, y: BOX.h / 2 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: BOX.w, height: BOX.h, borderRadius: 48, background: C.white, boxShadow: "0 50px 110px rgba(23,23,23,.14)", overflow: "hidden", transform: `translateY(${(1 - open) * 600}px) scale(${mix(0.85, 1, open)})`, opacity: clamp(open * 2) }}>
            <div style={{ height: 150, display: "flex", alignItems: "center", gap: 20, padding: "0 40px", borderBottom: "2px solid #F0EDE6" }}>
              <AgentDot size={76} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.025em", color: C.ink }}>Nova Store</div>
                <Mono size={19}>Online store · AI agent</Mono>
              </div>
            </div>
            <div style={{ padding: "40px 40px", display: "flex", flexDirection: "column", gap: 28 }}>
              {f >= Q_AT ? <Bubble me lines={["Hi! Where's my order?"]} s={q} color="#5E6AD2" /> : null}
              {f >= Q_AT + 4 && f < ANSWER ? <Typing f={f} /> : null}
              {f >= ANSWER ? <Bubble lines={["It's out for delivery,", "arriving today by 6 PM."]} s={a} /> : null}
            </div>
            <Sheen at={Q_AT} dur={20} opacity={0.6} />
          </div>
          {f >= RESULT ? (
            <div style={{ position: "absolute", left: 40, top: 780, width: BOX.w - 80, transform: `translateY(${(1 - r) * 140}px) scale(${mix(0.8, 1, r)})`, opacity: clamp(r * 2) }}>
              <ResultCard icon="truck" title="Out for delivery" meta="Order #4521 · today by 6 PM" check={tw(f, RESULT + 6, RESULT + 16, 0, 1, E.cubicInOut)}>
                <Sheen at={RESULT + 4} dur={18} opacity={0.8} />
              </ResultCard>
            </div>
          ) : null}
        </World>
      </Fit>
      <Sparkles x={p.x} y={p.y} w={(BOX.w - 0) * p.s} h={170 * p.s} at={RESULT + 6} color={C.coral} size={40 * L.u} seed={3} />
    </AbsoluteFill>
  );
};

/* ── the words ── */
const Words_: React.FC = () => {
  const f = useCurrentFrame();
  const ink = mixColor(C.cream, C.ink, dayness(f));
  return (
    <>
      <Kinetic from={T.VO.l01} to={DROP - 10} color={C.cream} hi={C.coralLight} words={[
        { t: "Every", at: T.ws("l01", 0) },
        { t: "business", at: T.ws("l01", 1), br: true },
        { t: "runs", at: T.ws("l01", 2) },
        { t: "on", at: T.ws("l01", 3), br: true },
        { t: "questions.", at: T.ws("l01", 4), hi: true },
      ]} />
      <Kinetic from={ANSWER - 4} to={COLLAPSE[0] - 4} color={ink} hi={C.coral} shineAt={T.ws("l02", 7) + 4} shineHi="#FFC2BA" words={[
        { t: "Answered", at: ANSWER, br: true },
        { t: "in", at: T.ws("l02", 6) },
        { t: "seconds.", at: T.ws("l02", 7), hi: true },
      ]} />
    </>
  );
};

/** The world: dark and noisy before the drop, cream and ordered after it. */
const Stage: React.FC<{ f: number }> = ({ f }) => {
  const d = dayness(f);
  return (
    <AbsoluteFill style={{ background: mixColor("#121113", C.cream, d) }}>
      <DotField color={d > 0.5 ? "23,23,23" : "250,249,245"} opacity={0.06} />
      <Bokeh n={10} color={ACCENT_RGB} opacity={0.08 + 0.04 * (1 - d)} seed={7} speed={0.8} />
    </AbsoluteFill>
  );
};

export const Starter: React.FC<FilmProps> = ({ audio = true, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT }}>
      <Stage f={f} />
      <Hook f={f} />
      <Reveal f={f} />
      <Proof f={f} />
      <Lockup hit={HIT} tag={TAG} ctaAt={CTA} urlAt={URL} />
      <Words_ />
      <Bug from={Q_AT + 10} to={HIT - 4} />
      {grain ? <Grain opacity={0.045} /> : null}
      {audio ? <Audio src={staticFile("films/starter/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};

/* ── sound: built from the SAME beats (bun scripts/film_sound.ts <this file>) ── */
export const SOUND: Cue[] = [
  ...QUESTIONS.map((_, i) => cue(T.ws("l01", 1) + i * 8, "blip", -4, `question ${i + 1}`)),
  cue(DROP, "riser", -4, "into the drop (peak-aligned: its loudest moment lands on the drop)"),
  ...moments.hit(DROP, "the drop"),
  cue(Q_AT, "send", -3, "customer asks"),
  cue(ANSWER, "receive", -2, "agent answers"),
  ...moments.land(RESULT, "result card"),
  cue(RESULT + 6, "shimmer", -9, "sparkles"),
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),
];
export const BEATS = { DROP, Q_AT, ANSWER, RESULT, COLLAPSE, HIT, TAG, CTA, URL, DUR };

export const STARTER: FilmDef = {
  id: "Starter",
  slug: "starter",
  title: "Starter",
  component: Starter,
  durationInFrames: DUR,
  fps: 30,
  formats: ["v", "h", "sq", "p"],
  audio: "films/starter/mix.wav",
};
