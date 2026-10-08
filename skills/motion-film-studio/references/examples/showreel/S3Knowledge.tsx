import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DotGrid, Pic } from "../components/Fx";
import { Hud } from "../components/Hud";
import { Icon, IconName } from "../components/Icons";
import { Mark } from "../components/Mark";
import { Line } from "../components/Type";
import { E, clamp, keys, mix, rnd, tw } from "../lib/ease";
import { MARK_H, MARK_W, markSamples } from "../lib/logo";
import { C, FONT, MONO } from "../theme";

/**
 * 4.0–6.0 s — "Feed it what you know." Four sources fly in (website, PDF,
 * docs, FAQ), a coral scan reads them, their text lines break into data points
 * that stream into the shape of the Brainfast mark, and the stroke solidifies
 * through the points on the beat. The brain then pulses and irises into coral.
 */
export const BRAIN = { x: 1384, y: 546, h: 460 };
const BS = BRAIN.h / MARK_H;
const BX0 = BRAIN.x - (MARK_W * BS) / 2;
const BY0 = BRAIN.y - BRAIN.h / 2;

const CARD_W = 336;
const CARD_H = 146;
const LINES = [
  { y: 98, w: 270 },
  { y: 120, w: 196 },
];

type Src = { title: string; meta: string; icon?: IconName; img?: string; x: number; y: number; dx: number; dy: number; rot: number };
const SOURCES: Src[] = [
  { title: "brainfast.ai", meta: "WEBSITE · 24 PAGES", icon: "globe", x: 1040, y: 226, dx: -260, dy: -190, rot: -14 },
  { title: "Pricing.pdf", meta: "PDF · 12 PAGES", icon: "file", x: 1700, y: 240, dx: 260, dy: -200, rot: 12 },
  { title: "Onboarding", meta: "GOOGLE DOCS", img: "img/icons/docs.svg", x: 1712, y: 858, dx: 280, dy: 200, rot: -10 },
  { title: "Help center", meta: "FAQ · 86 ANSWERS", icon: "help", x: 1036, y: 864, dx: -260, dy: 210, rot: 14 },
];
const ENTER = [233, 237, 241, 245];
const SCAN = 266;
const DISSOLVE = [284, 288, 292, 296];
const SOLID = 328;

type P = { sx: number; sy: number; tx: number; ty: number; cx: number; cy: number; t0: number; dur: number; card: number };

const useParticles = () =>
  useMemo<P[]>(() => {
    const targets = markSamples(230).map((p) => ({ x: BX0 + p.x * BS, y: BY0 + p.y * BS }));
    const angle = (x: number, y: number) => Math.atan2(y - BRAIN.y, x - BRAIN.x);
    const cardAng = SOURCES.map((s) => angle(s.x, s.y));
    const buckets: { x: number; y: number; a: number }[][] = SOURCES.map(() => []);
    for (const t of targets) {
      const a = angle(t.x, t.y);
      let best = 0;
      let bd = Infinity;
      cardAng.forEach((ca, i) => {
        const d = Math.abs(Math.atan2(Math.sin(a - ca), Math.cos(a - ca)));
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      buckets[best].push({ ...t, a });
    }
    const out: P[] = [];
    buckets.forEach((bucket, ci) => {
      const src = SOURCES[ci];
      bucket.sort((p, q) => p.a - q.a);
      const n = bucket.length;
      bucket.forEach((t, k) => {
        // spread this card's particles along its two text lines, in order
        const u = (k + 0.5) / n;
        const line = u < 0.58 ? 0 : 1;
        const lu = line === 0 ? u / 0.58 : (u - 0.58) / 0.42;
        const sx = src.x - CARD_W / 2 + 22 + lu * LINES[line].w;
        const sy = src.y - CARD_H / 2 + LINES[line].y + 4;
        // control point: midpoint swung around the brain for a swirl
        const mx = (sx + t.x) / 2;
        const my = (sy + t.y) / 2;
        const sw = 0.55 + rnd(k * 3.1 + ci) * 0.3;
        const ax = mx - BRAIN.x;
        const ay = my - BRAIN.y;
        const cx = BRAIN.x + ax * Math.cos(sw) - ay * Math.sin(sw);
        const cy = BRAIN.y + ax * Math.sin(sw) + ay * Math.cos(sw);
        out.push({
          sx,
          sy,
          tx: t.x,
          ty: t.y,
          cx,
          cy,
          t0: DISSOLVE[ci] + lu * 10 + rnd(k * 7.3 + ci * 2) * 5,
          dur: 26 + rnd(k * 1.7 + ci) * 8,
          card: ci,
        });
      });
    });
    return out;
  }, []);

const Card: React.FC<{ s: Src; i: number }> = ({ s, i }) => {
  const f = useCurrentFrame();
  const t = tw(f, ENTER[i], ENTER[i] + 22, 0, 1, E.expoOut);
  const scan = tw(f, SCAN + i * 3, SCAN + i * 3 + 16, 0, 1, E.cubicInOut);
  const gone = tw(f, DISSOLVE[i] + 14, DISSOLVE[i] + 30, 0, 1, E.expoIn);
  const barsOut = tw(f, DISSOLVE[i], DISSOLVE[i] + 3, 1, 0, E.linear);
  if (t <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: s.x - CARD_W / 2,
        top: s.y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 22,
        background: C.white,
        boxShadow: "0 24px 60px rgba(23,23,23,.10), 0 2px 6px rgba(23,23,23,.05)",
        border: "1px solid rgba(23,23,23,.06)",
        opacity: Math.min(1, t * 2) * (1 - gone),
        transform: `perspective(1400px) translate(${(1 - t) * s.dx}px, ${(1 - t) * s.dy}px) rotateY(${(1 - t) * s.rot * 3}deg) rotateX(${(1 - t) * -18}deg) rotate(${(1 - t) * s.rot}deg) scale(${mix(0.8, 1, t) * (1 - 0.08 * gone)})`,
        fontFamily: FONT,
        color: C.ink,
      }}
    >
      <div style={{ position: "absolute", left: 20, top: 18, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.sand, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {s.img ? <Pic src={s.img} size={30} /> : <Icon name={s.icon!} size={28} color={i === 1 ? C.coral : C.ink} />}
        </div>
        <div>
          <div style={{ fontSize: 25, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{s.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 14, color: C.gray, letterSpacing: "0.06em", marginTop: 4 }}>{s.meta}</div>
        </div>
      </div>
      {LINES.map((l, k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: 22,
            top: l.y,
            width: l.w,
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${C.coral} ${scan * 100}%, #E4E1D8 ${scan * 100}%)`,
            opacity: barsOut,
          }}
        />
      ))}
    </div>
  );
};

export const S3Knowledge: React.FC = () => {
  const f = useCurrentFrame();
  const parts = useParticles();

  const solid = tw(f, SOLID, SOLID + 16, 0, 1, E.expoOut);
  const pulse = keys(f, [[SOLID + 14, 0], [SOLID + 20, 1], [SOLID + 34, 0]], E.cubicInOut);
  const dotsFade = tw(f, SOLID + 4, SOLID + 18, 1, 0, E.linear);
  const caption = tw(f, SOLID + 8, SOLID + 24, 0, 1, E.expoOut);
  const scanX = tw(f, SCAN - 4, SCAN + 22, 880, 1900, E.cubicInOut);
  const scanO = keys(f, [[SCAN - 4, 0], [SCAN, 1], [SCAN + 18, 1], [SCAN + 24, 0]], E.linear);

  return (
    <AbsoluteFill style={{ background: C.cream, fontFamily: FONT, color: C.ink }}>
      <DotGrid color={C.ink} opacity={0.075} gap={40} r={1.5} flicker={0.04} ripples={[{ x: BRAIN.x, y: BRAIN.y, at: SOLID + 14, speed: 30, width: 90, amp: 1.6 }]} />

      <AbsoluteFill style={{ transform: `scale(${1 + 0.03 * tw(f, 236, 364, 0, 1, E.linear)})`, transformOrigin: `${BRAIN.x}px ${BRAIN.y}px` }}>
      {/* headline */}
      <div style={{ position: "absolute", left: 120, top: 368 }}>
        <Line start={237} dur={20}>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: C.coral }}>01 — KNOWLEDGE</div>
        </Line>
        <div style={{ height: 22 }} />
        <div style={{ fontSize: 124, fontWeight: 700, letterSpacing: "-0.046em", lineHeight: 0.98 }}>
          <Line start={239}>Feed it what</Line>
          <Line start={245}>you know.</Line>
        </div>
      </div>

      {SOURCES.map((s, i) => (
        <Card key={i} s={s} i={i} />
      ))}

      {/* scan beam */}
      <div style={{ position: "absolute", left: scanX, top: 120, width: 3, height: 840, background: C.coral, opacity: scanO * 0.9, borderRadius: 2 }} />
      <div
        style={{
          position: "absolute",
          left: scanX - 160,
          top: 120,
          width: 160,
          height: 840,
          background: `linear-gradient(90deg, rgba(217,87,89,0), rgba(217,87,89,.10))`,
          opacity: scanO,
        }}
      />

      {/* the empty brain: a faint dotted silhouette the data will fill */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {markSamples(150).map((p, k) => {
          const a = tw(f, 252 + (k / 150) * 22, 262 + (k / 150) * 22, 0, 1, E.expoOut);
          return (
            <circle key={k} cx={BX0 + p.x * BS} cy={BY0 + p.y * BS} r={2.4 * a} fill={C.ink} opacity={0.2 * a * dotsFade} />
          );
        })}
      </svg>

      {/* data points streaming into the mark */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {parts.map((p, k) => {
          if (f < DISSOLVE[p.card]) return null;
          const u = E.cubicInOut(clamp((f - p.t0) / p.dur));
          const x = (1 - u) * (1 - u) * p.sx + 2 * (1 - u) * u * p.cx + u * u * p.tx;
          const y = (1 - u) * (1 - u) * p.sy + 2 * (1 - u) * u * p.cy + u * u * p.ty;
          const r = mix(3.6, 5.2, u) * (1 + 0.4 * Math.sin(u * Math.PI));
          return <circle key={k} cx={x} cy={y} r={r} fill={C.coral} opacity={dotsFade * (u > 0.02 ? 1 : 0.9)} />;
        })}
      </svg>

      {/* the mark solidifies through the points */}
      <div
        style={{
          position: "absolute",
          left: BX0,
          top: BY0,
          transform: `scale(${1 + 0.05 * pulse})`,
          transformOrigin: `${BRAIN.x - BX0}px ${BRAIN.y - BY0}px`,
        }}
      >
        <Mark height={BRAIN.h} progress={solid} color={C.coral} />
      </div>
      <div
        style={{
          position: "absolute",
          left: BRAIN.x,
          top: BY0 + BRAIN.h + 34,
          transform: `translate(-50%, ${(1 - caption) * 14}px)`,
          opacity: caption,
          fontFamily: MONO,
          fontSize: 17,
          letterSpacing: "0.16em",
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        TRAINED ON YOUR BUSINESS
      </div>
      </AbsoluteFill>

      <Hud tone="light" />
    </AbsoluteFill>
  );
};
