import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DotGrid } from "../components/Fx";
import { Mark } from "../components/Mark";
import { E, clamp, keys, mixColor, rnd, tw } from "../lib/ease";
import { MARK_H, MARK_LEN, MARK_STROKE, MARK_W, markSamples } from "../lib/logo";
import { C } from "../theme";

/**
 * 0.0–2.0 s — the spark. A coral dot ignites, a pen draws the Brainfast mark
 * while a neural web wires itself up around it, the mark flashes complete on
 * beat 4, anticipates, and the camera flies through it into the tagline.
 */
export const MARK1 = { height: 620 };
const S = MARK1.height / MARK_H;
const OX = 960 - (MARK_W * S) / 2;
const OY = 540 - MARK1.height / 2;
const toScreen = (x: number, y: number) => ({ x: OX + x * S, y: OY + y * S });
export const SPARK_AT = toScreen(134.232, 46.0051);
const ZOOM_AT = toScreen(205, 205);

const DRAW_START = 4;
const DRAW_END = 94;
const DONE = 96;

type Node = { x: number; y: number; ax: number; ay: number; s: number; r: number; links: number[] };

const useNodes = () =>
  useMemo<Node[]>(() => {
    const pts = markSamples(240).map((p, k) => ({ ...toScreen(p.x, p.y), s: ((k + 0.5) / 240) * MARK_LEN }));
    const nodes: Node[] = [];
    let seed = 11;
    while (nodes.length < 38 && seed < 4000) {
      seed++;
      const ang = rnd(seed) * Math.PI * 2;
      const rad = 350 + rnd(seed * 3.3) * 420;
      const x = 960 + Math.cos(ang) * rad * 1.35;
      const y = 540 + Math.sin(ang) * rad * 0.78;
      if (x < 70 || x > 1850 || y < 60 || y > 1020) continue;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 120)) continue;
      let best = pts[0];
      let bd = Infinity;
      for (const p of pts) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      nodes.push({ x, y, ax: best.x, ay: best.y, s: best.s, r: 2.5 + rnd(seed * 7.7) * 3, links: [] });
    }
    nodes.forEach((n, i) => {
      const near = nodes
        .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
        .filter((o) => o.j !== i)
        .sort((a, b2) => a.d - b2.d)
        .slice(0, 2)
        .filter((o) => o.d < 330)
        .map((o) => o.j);
      n.links = near.filter((j) => j > i);
    });
    return nodes;
  }, []);

export const S1Spark: React.FC = () => {
  const f = useCurrentFrame();
  const nodes = useNodes();

  const p = tw(f, DRAW_START, DRAW_END, 0, 1, E.cubicInOut);
  const pen = p * MARK_LEN;
  const flash = keys(f, [[DONE - 1, 0], [DONE + 2, 1], [DONE + 12, 0]], E.cubicInOut);
  const strokeCol = mixColor(C.coral, C.coralLight, flash);

  // camera: settle-in push, a small anticipation pull, then fly through the mark
  const settle = tw(f, 0, 100, 0.9, 1, E.quintOut);
  const antic = keys(f, [[93, 0], [101, 1]], E.cubicInOut);
  const through = tw(f, 101, 121, 0, 1, E.expoIn);
  const scale = settle * (1 - 0.035 * antic) * (1 + 11 * through);
  const rot = tw(f, 0, 100, -3, 0, E.quintOut);
  const fade = tw(f, 113, 120, 1, 0, E.linear);

  // the spark itself
  const pop = tw(f, 0, 10, 0.25, 1, E.backOut);
  const sparkR = (MARK_STROKE / 2) * S * pop * (1 + 0.35 * keys(f, [[0, 1], [4, 1], [14, 0]]));
  const ring = (d: number, grow: number, len: number) => {
    const t = tw(f, d, d + len, 0, 1, E.expoOut);
    return { r: 12 + grow * t, o: (1 - t) * (f >= d ? 1 : 0), w: 5 * (1 - t) + 0.5 };
  };
  const r1 = ring(0, 300, 40);
  const r2 = ring(6, 520, 52);
  const burst = tw(f, 0, 26, 0, 1, E.expoOut);

  return (
    <AbsoluteFill style={{ background: C.night, opacity: fade }}>
      <DotGrid
        color={C.cream}
        opacity={0.07}
        gap={42}
        r={1.5}
        ripples={[
          { x: SPARK_AT.x, y: SPARK_AT.y, at: 1, speed: 30, width: 90, amp: 2.2 },
          { x: 960, y: 540, at: DONE, speed: 34, width: 110, amp: 1.6 },
        ]}
      />
      <AbsoluteFill
        style={{
          transformOrigin: `${ZOOM_AT.x}px ${ZOOM_AT.y}px`,
          transform: `scale(${scale}) rotate(${rot}deg)`,
        }}
      >
        {/* neural web: nodes wire up as the pen passes the nearest point of the mark */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {nodes.map((n, i) => {
            const t = clamp((pen - n.s) / (0.1 * MARK_LEN));
            const tt = E.expoOut(t);
            if (t <= 0) return null;
            const lx = n.ax + (n.x - n.ax) * tt;
            const ly = n.ay + (n.y - n.ay) * tt;
            const lit = 0.18 + 0.5 * flash;
            return (
              <g key={i}>
                <line x1={n.ax} y1={n.ay} x2={lx} y2={ly} stroke={C.cream} strokeOpacity={lit * 0.7} strokeWidth={1.2} />
                {n.links.map((j) => {
                  const m = nodes[j];
                  const tl = E.expoOut(clamp((pen - Math.max(n.s, m.s)) / (0.14 * MARK_LEN)));
                  if (tl <= 0) return null;
                  return (
                    <line
                      key={j}
                      x1={n.x}
                      y1={n.y}
                      x2={n.x + (m.x - n.x) * tl}
                      y2={n.y + (m.y - n.y) * tl}
                      stroke={C.cream}
                      strokeOpacity={lit * 0.45}
                      strokeWidth={1}
                    />
                  );
                })}
                <circle cx={lx} cy={ly} r={n.r * (0.4 + 0.6 * tt) * (1 + 0.8 * flash)} fill={i % 5 === 0 ? C.coral : C.cream} fillOpacity={0.35 + 0.5 * tt} />
              </g>
            );
          })}
        </svg>

        {/* the mark, drawn by a pen with a hot cream tip */}
        <div style={{ position: "absolute", left: OX, top: OY, transform: `scale(${1 + 0.025 * flash})`, transformOrigin: "50% 50%" }}>
          <Mark height={MARK1.height} progress={p} color={strokeCol} />
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark height={MARK1.height} progress={p} start={Math.max(0, p - 0.035)} color={C.cream} stroke={6} opacity={p > 0 && p < 1 ? 0.9 : 0} />
          </div>
          <div style={{ position: "absolute", inset: 0 }}>
            <Mark height={MARK1.height} progress={p} start={p} head={C.cream} headScale={0.55} opacity={p > 0.002 && p < 0.998 ? 1 : 0} />
          </div>
        </div>

        {/* ignition: dot, two shockwaves and a radial burst */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <circle cx={SPARK_AT.x} cy={SPARK_AT.y} r={r1.r} fill="none" stroke={C.coral} strokeWidth={r1.w} opacity={r1.o} />
          <circle cx={SPARK_AT.x} cy={SPARK_AT.y} r={r2.r} fill="none" stroke={C.cream} strokeWidth={r2.w * 0.5} opacity={r2.o * 0.5} />
          {burst < 1
            ? Array.from({ length: 14 }, (_, k) => {
                const a = (k / 14) * Math.PI * 2 + 0.2;
                const d0 = 26 + 150 * burst;
                const d1 = 26 + 210 * burst * (0.75 + 0.5 * rnd(k + 3));
                return (
                  <line
                    key={k}
                    x1={SPARK_AT.x + Math.cos(a) * d0}
                    y1={SPARK_AT.y + Math.sin(a) * d0}
                    x2={SPARK_AT.x + Math.cos(a) * d1}
                    y2={SPARK_AT.y + Math.sin(a) * d1}
                    stroke={k % 3 === 0 ? C.cream : C.coral}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={1 - burst}
                  />
                );
              })
            : null}
          {f < DRAW_START + 8 ? <circle cx={SPARK_AT.x} cy={SPARK_AT.y} r={sparkR} fill={C.coral} /> : null}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
