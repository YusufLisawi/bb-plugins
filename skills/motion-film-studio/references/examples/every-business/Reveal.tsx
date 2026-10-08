import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mark } from "../../components/Mark";
import { measure } from "../../components/Type";
import { E, clamp, keys, mix, mixColor, tw } from "../../lib/ease";
import { MARK_H, MARK_W } from "../../lib/logo";
import { C, FONT } from "../../theme";
import { Burst, Ring, Sparkle } from "../../fx2/Fx2";
import { CARD } from "../components/Card";
import { DROP, ws } from "../timing";

/**
 * 14–17 s. The drop: the wall has spiralled into one coral point; it ignites,
 * the pen draws the Brainfast mark, a light runs along the stroke, the name
 * lands ("Meet Brainfast") — then the mark shrinks into the agent's avatar,
 * exactly where the chat card's header will hold it.
 */
const CX = 540;
const CY = 900;
const BIG = 380;
const FS = 150;
export const AVATAR = { x: CARD.x + 40 + 38, y: CARD.y + 75, size: 76 };

const T_LOCK = ws("l04", 0) - 2; // "Meet"
const T_AGENT = ws("l04", 2) - 4; // "your own AI agent"
export const CARD_OPEN = T_AGENT + 6;

export const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  if (f < DROP - 8 || f > CARD_OPEN + 20) return null;
  const draw = tw(f, DROP, DROP + 20, 0, 1, E.cubicInOut);
  const flash = keys(f, [[DROP + 19, 0], [DROP + 22, 1], [DROP + 34, 0]], E.cubicInOut);
  const shine = tw(f, DROP + 24, DROP + 46, 0, 1, E.cubicInOut) * 1.18;
  const bigW = (BIG * MARK_W) / MARK_H;

  // lockup geometry ("Meet Brainfast")
  const markH = FS * (40 / 60);
  const markW = (markH * MARK_W) / MARK_H;
  const gap = FS * (4 / 60);
  const textW = measure("brainfast.", FS, 600, -0.025);
  const total = markW + gap + textW;
  const lx0 = 540 - total / 2;
  const lock = tw(f, T_LOCK - 6, T_LOCK + 10, 0, 1, E.expoInOut);
  const toAgent = tw(f, T_AGENT - 4, T_AGENT + 12, 0, 1, E.expoInOut);

  // the mark: big centre → lockup position → avatar
  const h1 = mix(BIG, markH, lock);
  const h = mix(h1, AVATAR.size * 0.54, toAgent);
  const cx1 = mix(CX, lx0 + markW / 2, lock);
  const cx = mix(cx1, AVATAR.x, toAgent);
  const cy = mix(CY, AVATAR.y, toAgent);
  const w = (h * MARK_W) / MARK_H;
  const markCol = mixColor(mixColor(C.coral, C.coralLight, flash), C.cream, toAgent);
  const disc = tw(f, T_AGENT + 2, T_AGENT + 12, 0, 1, E.expoOut);
  const dot = tw(f, DROP - 8, DROP, 0, 1, E.expoOut);
  const letters = "brainfast.";
  const gone = tw(f, CARD_OPEN + 10, CARD_OPEN + 16, 0, 1, E.linear);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: 1 - gone }}>
      {/* white flash on the drop */}
      <AbsoluteFill style={{ background: "#FFFFFF", opacity: 0.5 * (1 - tw(f, DROP, DROP + 12, 0, 1, E.linear)) * (f >= DROP ? 1 : 0) }} />
      {f < DROP + 2 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <circle cx={CX} cy={CY} r={6 + 12 * dot} fill={C.coral} />
          <circle cx={CX} cy={CY} r={30 + 40 * dot} fill={C.coral} opacity={0.15 * dot} />
        </svg>
      ) : null}
      <Ring x={CX} y={CY} at={DROP} r={980} width={30} color={C.coral} dur={32} />
      <Ring x={CX} y={CY} at={DROP + 3} r={720} width={10} color={C.coralLight} dur={30} opacity={0.8} />
      <Burst x={CX} y={CY} at={DROP} n={18} r0={50} r1={420} colors={[C.coral, C.ink, C.coralLight]} width={7} dur={28} />
      {/* agent disc grows under the mark as it becomes the avatar */}
      {disc > 0 ? (
        <div style={{ position: "absolute", left: AVATAR.x - (AVATAR.size / 2) * disc, top: AVATAR.y - (AVATAR.size / 2) * disc, width: AVATAR.size * disc, height: AVATAR.size * disc, borderRadius: "50%", background: C.coral }} />
      ) : null}
      {f >= DROP ? (
        <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, transform: `scale(${1 + 0.05 * flash})` }}>
          <Mark height={h} progress={draw} color={markCol} stroke={mix(20, 24, toAgent)} />
          {draw < 1 ? (
            <div style={{ position: "absolute", inset: 0 }}>
              <Mark height={h} progress={draw} start={Math.max(0, draw - 0.04)} color={C.cream} stroke={7} />
            </div>
          ) : null}
          {draw < 1 ? (
            <div style={{ position: "absolute", inset: 0 }}>
              <Mark height={h} progress={draw} start={draw} head={C.cream} headScale={0.6} opacity={draw > 0.01 ? 1 : 0} />
            </div>
          ) : null}
          {shine > 0 && shine < 1.18 ? (
            <div style={{ position: "absolute", inset: 0 }}>
              <Mark height={h} progress={Math.min(1, shine)} start={Math.max(0, shine - 0.18)} color="#FFFFFF" stroke={9} opacity={0.85} />
            </div>
          ) : null}
        </div>
      ) : null}
      {/* the name */}
      {lock > 0 && toAgent < 1 ? (
        <div
          style={{
            position: "absolute",
            left: lx0 + markW + gap,
            top: CY,
            transform: "translateY(-50%)",
            fontSize: FS,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1,
            color: C.ink,
            whiteSpace: "pre",
            opacity: 1 - toAgent,
          }}
        >
          <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.1em 0.02em 0.22em", margin: "-0.1em -0.02em -0.22em" }}>
            {letters.split("").map((ch, i) => {
              const t = tw(f, T_LOCK - 2 + i * 1.6, T_LOCK + 14 + i * 1.6, 0, 1, E.expoOut);
              const back = tw(f, T_AGENT - 6 + (letters.length - i) * 0.8, T_AGENT + 4 + (letters.length - i) * 0.8, 0, 1, E.expoIn);
              return (
                <span key={i} style={{ position: "relative", top: `${((1 - t) + back) * 1.2}em`, opacity: clamp(t * 2) * (1 - back) }}>
                  {ch}
                </span>
              );
            })}
          </span>
        </div>
      ) : null}
      <Sparkle x={CX + bigW * 0.42} y={CY - BIG * 0.46} at={DROP + 22} size={60} color={C.coral} />
      <Sparkle x={CX - bigW * 0.5} y={CY + BIG * 0.3} at={DROP + 26} size={44} color={C.coral} />
      <Sparkle x={CX + bigW * 0.1} y={CY + BIG * 0.55} at={DROP + 30} size={36} color={C.coral} />
    </AbsoluteFill>
  );
};

export const REVEAL_BEATS = { T_LOCK, T_AGENT, CARD_OPEN };
