import React from "react";
import { AbsoluteFill, Audio, Freeze, staticFile, useCurrentFrame } from "remotion";
import { Grain } from "../components/Fx";
import { Mark } from "../components/Mark";
import { loadFonts } from "../fonts";
import { E, rnd, tw } from "../lib/ease";
import { C, FONT } from "../theme";
import { Box, BoxText } from "./scenes/Box";
import { End } from "./scenes/End";
import { Grow, GrowText } from "./scenes/Grow";
import { Inside, InsideText } from "./scenes/Inside";
import { CREAM } from "./components/Glass";
import { DROP, HIT } from "./timing";

loadFonts();

/** The dark stage: a soft coral bloom that wakes on the drop, drifting motes, a faint floor. */
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const wake = tw(f, DROP - 10, DROP + 20, 0, 1, E.cubicInOut);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 60% at 50% 48%, #1B191F 0%, #0D0C0F 62%, #080709 100%)" }}>
      <div style={{ position: "absolute", left: -200, right: -200, top: 380, height: 1300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(217,87,89,.20) 0%, rgba(217,87,89,0) 62%)", opacity: 0.25 + 0.75 * wake, transform: `translateY(${Math.sin(f * 0.01) * 30}px)` }} />
      {Array.from({ length: 36 }, (_, i) => {
        const x = rnd(i * 1.7) * 1080 + Math.sin(f * 0.01 + i) * 30;
        const y = ((rnd(i * 2.9) * 2000 - f * (0.25 + rnd(i) * 0.5)) % 2000 + 2000) % 2000 - 40;
        const r = 1.5 + rnd(i * 4.4) * 2.5;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, background: i % 5 ? CREAM : C.coralLight, opacity: 0.12 + 0.25 * rnd(i * 6.1) }} />;
      })}
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "80px 80px", maskImage: "linear-gradient(180deg, transparent 55%, black 100%)", WebkitMaskImage: "linear-gradient(180deg, transparent 55%, black 100%)", opacity: 0.8 }} />
    </AbsoluteFill>
  );
};

const Bug: React.FC = () => {
  const f = useCurrentFrame();
  const v = tw(f, DROP + 30, DROP + 46, 0, 1, E.expoOut) * tw(f, HIT - 14, HIT - 4, 1, 0, E.expoIn);
  if (v <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 80, top: 120, display: "flex", alignItems: "center", gap: 6, opacity: v, transform: `translateY(${(1 - v) * -12}px)` }}>
      <Mark height={36} color={C.coral} />
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 34, letterSpacing: "-0.025em", color: CREAM, lineHeight: 1 }}>brainfast.</span>
    </div>
  );
};

export const Glass: React.FC<{ audio?: boolean; grain?: boolean }> = ({ audio = true, grain = true }) => (
  <AbsoluteFill style={{ fontFamily: FONT, background: "#0D0C0F", overflow: "hidden" }}>
    <Stage />
    <Box />
    <Inside />
    <Grow />
    <End />
    <BoxText />
    <InsideText />
    <GrowText />
    <Bug />
    {grain ? <Grain opacity={0.05} /> : null}
    {audio ? <Audio src={staticFile("glass/mix.wav")} /> : null}
  </AbsoluteFill>
);

export const GSS = 8;
export const GlassSS: React.FC = () => {
  const i = useCurrentFrame();
  const n = Math.floor(i / GSS);
  const j = i % GSS;
  const t = Math.max(0, n + (j - (GSS - 1) / 2) * (0.5 / GSS));
  return (
    <Freeze frame={t}>
      <Glass audio={false} grain={false} />
    </Freeze>
  );
};
