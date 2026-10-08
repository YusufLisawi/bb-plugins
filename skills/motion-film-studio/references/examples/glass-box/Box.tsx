import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { E, clamp, keys, mix, rnd, tw } from "../../lib/ease";
import { C, FONT } from "../../theme";
import { Burst, Kinetic, Ring, Sparkle } from "../../fx2/Fx2";
import { GlassCube } from "../components/Cube";
import { CREAM } from "../components/Glass";
import { DROP, VO, ws } from "../timing";

/**
 * 0–7.8 s. "Most AI is a black box." A matte cube turns slowly in the dark.
 * "You switch it on, and hope for the best." — its light comes on, question
 * marks drift out of it. "Brainfast is a glass box." — the faces clear to
 * glass, the mark glows inside, light sweeps across on the drop, and the
 * camera flies through the front face into what it can see.
 */
export const CUBE = { x: 540, y: 1100, size: 500 };
const LED_ON = ws("l02", 1) - 1; // "switch"
const DOUBT = ws("l02", 5) - 4; // "hope for the best"
const TURN = ws("l03", 0) - 2; // "Brainfast"
const CLEAR: [number, number] = [ws("l03", 3) - 4, DROP - 6]; // "glass box"
export const FLY: [number, number] = [DROP + 8, DROP + 30];

export const cubeRy = (f: number) => (f < TURN ? 20 + f * 0.45 : keys(f, [[TURN, 20 + TURN * 0.45], [DROP - 4, 125]], E.cubicInOut) + Math.max(0, f - DROP + 4) * 0.25);

export const Box: React.FC = () => {
  const f = useCurrentFrame();
  if (f > FLY[1] + 2) return null;
  const glass = tw(f, CLEAR[0], CLEAR[1], 0, 1, E.cubicInOut);
  const glow = keys(f, [[TURN, 0], [CLEAR[0], 0.3], [DROP, 1], [DROP + 30, 0.6]], E.cubicInOut);
  const inner = tw(f, CLEAR[0] + 8, DROP - 2, 0, 1, E.cubicInOut);
  const led = tw(f, LED_ON, LED_ON + 5, 0, 1, E.expoOut);
  const sheen = f >= DROP && f <= DROP + 22 ? (f - DROP) / 22 : f >= 4 && f <= 30 ? (f - 4) / 26 : -1;
  const fly = tw(f, FLY[0], FLY[1], 0, 1, E.expoIn);
  const scale = mix(1, 7.5, fly) * (1 + 0.03 * Math.sin(f * 0.05));
  const fade = tw(f, FLY[1] - 8, FLY[1], 0, 1, E.linear);
  const hum = f >= LED_ON && f < TURN ? Math.sin(f * 0.9) * 0.6 : 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* a pool of light under the box once it's glass */}
      <div style={{ position: "absolute", left: CUBE.x - 420, top: CUBE.y + 190, width: 840, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(217,87,89,.35) 0%, rgba(217,87,89,0) 70%)", opacity: glass * (1 - fly) }} />
      <div style={{ position: "absolute", left: CUBE.x - CUBE.size / 2, top: CUBE.y - CUBE.size / 2, width: CUBE.size, height: CUBE.size, perspective: 2200, transform: `scale(${scale}) translateX(${hum}px)`, opacity: 1 - fade }}>
        <GlassCube size={CUBE.size} rx={-18} ry={cubeRy(f)} glass={glass} glow={glow} inner={inner} led={led} sheen={sheen} />
      </div>
      {/* doubt: question marks and unanswered bubbles drift out of the black box */}
      {f >= DOUBT - 2 && f < CLEAR[0] + 10
        ? Array.from({ length: 9 }, (_, i) => {
            const at = DOUBT + i * 3;
            const t = tw(f, at, at + 34, 0, 1, E.cubicInOut);
            if (f < at) return null;
            const clear = tw(f, CLEAR[0] - 6, CLEAR[0] + 6, 0, 1, E.linear);
            const x = CUBE.x + (rnd(i * 3.7) - 0.5) * 760;
            const y = CUBE.y - 160 - t * (170 + rnd(i) * 160); // stays clear of the headline
            const bubble = i % 3 === 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - 40,
                  top: y - 40,
                  width: bubble ? 120 : 80,
                  height: 80,
                  borderRadius: bubble ? 40 : 0,
                  background: bubble ? "rgba(255,255,255,.08)" : "transparent",
                  boxShadow: bubble ? "inset 0 0 0 1.5px rgba(255,255,255,.14)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: bubble ? 50 : 118,
                  fontWeight: 700,
                  color: bubble ? "rgba(250,249,245,.8)" : i % 2 ? "rgba(238,143,139,.8)" : "rgba(250,249,245,.72)",
                  opacity: Math.sin(Math.PI * clamp(t)) * (1 - clear),
                  transform: `rotate(${(rnd(i * 2.1) - 0.5) * 30}deg) scale(${0.7 + 0.5 * t})`,
                }}
              >
                {bubble ? "…" : "?"}
              </div>
            );
          })
        : null}
      <Ring x={CUBE.x} y={CUBE.y} at={DROP} r={900} width={26} color={C.coral} dur={32} />
      <Ring x={CUBE.x} y={CUBE.y} at={DROP + 3} r={640} width={10} color={C.coralLight} dur={28} opacity={0.7} />
      <Burst x={CUBE.x} y={CUBE.y} at={DROP} n={22} r0={260} r1={520} colors={[C.coral, CREAM, C.coralLight]} width={6} dur={30} />
      {/* the drop: a bloom of light from inside the box (not a flat grey flash) */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${CUBE.x}px ${CUBE.y}px, rgba(255,240,234,.75) 0%, rgba(217,87,89,.32) 22%, rgba(217,87,89,0) 55%)`, opacity: (1 - tw(f, DROP, DROP + 16, 0, 1, E.cubicInOut)) * (f >= DROP ? 1 : 0) }} />
      <Sparkle x={CUBE.x + 250} y={CUBE.y - 250} at={DROP + 4} size={60} color={CREAM} />
      <Sparkle x={CUBE.x - 260} y={CUBE.y + 170} at={DROP + 9} size={44} color={C.coralLight} />
    </AbsoluteFill>
  );
};

export const BoxText: React.FC = () => (
  <>
    <Kinetic
      from={VO.l01}
      to={VO.l02 - 10}
      y={260}
      size={112}
      color={CREAM}
      hi="#8E8A94"
      words={[
        { t: "Most", at: ws("l01", 0) },
        { t: "AI", at: ws("l01", 1) },
        { t: "is", at: ws("l01", 2) },
        { t: "a", at: ws("l01", 3), br: true },
        { t: "black", at: ws("l01", 4), hi: true },
        { t: "box.", at: ws("l01", 5), hi: true },
      ]}
    />
    <Kinetic
      from={VO.l02 - 2}
      to={VO.l03 - 8}
      y={260}
      size={100}
      color={CREAM}
      hi={C.coralLight}
      words={[
        { t: "You", at: ws("l02", 0) },
        { t: "switch", at: ws("l02", 1) },
        { t: "it", at: ws("l02", 2) },
        { t: "on,", at: ws("l02", 3), br: true },
        { t: "and", at: ws("l02", 4) },
        { t: "hope", at: ws("l02", 5), hi: true },
        { t: "for", at: ws("l02", 6), br: true },
        { t: "the", at: ws("l02", 7) },
        { t: "best.", at: ws("l02", 8) },
      ]}
    />
    <Kinetic
      from={VO.l03 - 2}
      to={FLY[0] + 2}
      y={260}
      size={112}
      color={CREAM}
      hi={C.coral}
      shineAt={DROP}
      shineHi="#FFFFFF"
      words={[
        { t: "Brainfast", at: ws("l03", 0) },
        { t: "is", at: ws("l03", 1) },
        { t: "a", at: ws("l03", 2), br: true },
        { t: "glass", at: ws("l03", 3), hi: true },
        { t: "box.", at: ws("l03", 4), hi: true },
      ]}
    />
  </>
);

export const BOX_BEATS = { LED_ON, DOUBT, TURN, CLEAR, FLY };
