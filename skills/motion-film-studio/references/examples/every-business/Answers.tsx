import React from "react";
import { AbsoluteFill, Audio, Freeze, staticFile, useCurrentFrame } from "remotion";
import { Grain } from "../components/Fx";
import { Mark } from "../components/Mark";
import { loadFonts } from "../fonts";
import { E, tw } from "../lib/ease";
import { C, FONT } from "../theme";
import { Bokeh } from "../fx2/Fx2";
import { Finale } from "./scenes/Finale";
import { Flow, FlowText } from "./scenes/Flow";
import { Hook, HookText } from "./scenes/Hook";
import { CARD_OPEN, Reveal } from "./scenes/Reveal";
import { DROP, HIT } from "./timing";

loadFonts();

/** Cream stage with slow colour fields — the five businesses' colours, low and soft. */
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const orbs = [
    { c: "217,87,89", x: 200, y: 300, r: 620, sp: 0.011 },
    { c: "94,106,210", x: 900, y: 700, r: 560, sp: 0.009 },
    { c: "28,154,131", x: 150, y: 1500, r: 600, sp: 0.008 },
    { c: "212,134,28", x: 950, y: 1650, r: 520, sp: 0.012 },
  ];
  const lift = tw(f, DROP, DROP + 30, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: o.x + Math.sin(f * o.sp + i) * 90 - o.r,
            top: o.y + Math.cos(f * o.sp * 0.8 + i * 2) * 110 - o.r,
            width: o.r * 2,
            height: o.r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${o.c},${0.13 + 0.03 * lift}) 0%, rgba(${o.c},0) 68%)`,
          }}
        />
      ))}
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(23,23,23,.06) 1.6px, transparent 1.6px)", backgroundSize: "40px 40px", backgroundPosition: `0px ${-(f * 0.4) % 40}px` }} />
      <Bokeh n={10} color="217,87,89" opacity={0.08} seed={11} speed={0.8} />
    </AbsoluteFill>
  );
};

/** Brand bug, top-left, from the reveal until the final hit. */
const Bug: React.FC = () => {
  const f = useCurrentFrame();
  const v = tw(f, CARD_OPEN + 8, CARD_OPEN + 24, 0, 1, E.expoOut) * tw(f, HIT - 14, HIT - 4, 1, 0, E.expoIn);
  if (v <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 80, top: 120, display: "flex", alignItems: "center", gap: 6, opacity: v, transform: `translateY(${(1 - v) * -12}px)` }}>
      <Mark height={36} color={C.coral} />
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 34, letterSpacing: "-0.025em", color: C.ink, lineHeight: 1 }}>brainfast.</span>
    </div>
  );
};

export const Answers: React.FC<{ audio?: boolean; grain?: boolean }> = ({ audio = true, grain = true }) => (
  <AbsoluteFill style={{ fontFamily: FONT, background: C.cream, overflow: "hidden" }}>
    <Stage />
    <Hook />
    <Flow />
    <Reveal />
    <Finale />
    <HookText />
    <FlowText />
    <Bug />
    {grain ? <Grain opacity={0.04} /> : null}
    {audio ? <Audio src={staticFile("answers/mix.wav")} /> : null}
  </AbsoluteFill>
);

/** Motion-blur master: 8 sub-frames over a 180° shutter, averaged in float by scripts/finish.py. */
export const ASS = 8;
export const AnswersSS: React.FC = () => {
  const i = useCurrentFrame();
  const n = Math.floor(i / ASS);
  const j = i % ASS;
  const t = Math.max(0, n + (j - (ASS - 1) / 2) * (0.5 / ASS));
  return (
    <Freeze frame={t}>
      <Answers audio={false} grain={false} />
    </Freeze>
  );
};
