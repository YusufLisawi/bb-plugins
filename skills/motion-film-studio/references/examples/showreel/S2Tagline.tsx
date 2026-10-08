import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DotGrid } from "../components/Fx";
import { Letters, measure } from "../components/Type";
import { E, keys, mix, rnd, tw } from "../lib/ease";
import { C, FONT } from "../theme";

/**
 * 2.0–4.0 s — "Create a new brain, fast." One word per beat (f120, 150, 180,
 * 210) while a typographic camera re-frames on every word, then pulls back to
 * the finished poster. "fast." slams in italic coral, the lightning strikes and
 * the frame splits along the bolt into the feature section (see Split below).
 */
const SIZE = 206;
const WEIGHT = 800;
const TRACK = -0.045;
const LINE1_Y = 452;
const LINE2_Y = 640;

/** The lightning seam, shaped like the bolt in the mark: steep, a kick right, a long diagonal. */
const BOLT: [number, number][] = [
  [1165, -60],
  [1010, 430],
  [1190, 478],
  [770, 1140],
];
const SPLIT = 228;
const LEN = BOLT.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - BOLT[i][0], p[1] - BOLT[i][1]), 0);
const pts = BOLT.map((p) => `${p[0]}px ${p[1]}px`).join(", ");
const LEFT = `-40px -60px, ${pts}, -40px 1140px`;
const RIGHT = `${[...BOLT].reverse().map((p) => `${p[0]}px ${p[1]}px`).join(", ")}, 1960px -60px, 1960px 1140px`;
// split direction: perpendicular to the seam's overall direction
const NX = 0.951;
const NY = 0.309;

const Bolt: React.FC = () => {
  const f = useCurrentFrame();
  const draw = tw(f, 217, 224, 0, 1, E.expoIn);
  if (draw <= 0) return null;
  const d = BOLT.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const flash = keys(f, [[223, 0], [225, 1], [231, 0]], E.linear);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={d} fill="none" stroke={C.coral} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${LEN * draw} ${LEN * 2}`} />
        <path d={d} fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${LEN * draw} ${LEN * 2}`} />
      </svg>
      <AbsoluteFill style={{ background: C.cream, opacity: flash * 0.16 }} />
    </>
  );
};

type Word = { text: string; x: number; y: number; w: number; at: number };

const layout = (): Word[] => {
  const m = (t: string) => measure(t, SIZE, WEIGHT, TRACK);
  const space = m("a b") - m("ab");
  const w1 = m("Create a new");
  const w2 = m("brain, fast.");
  const x1 = 960 - w1 / 2;
  const x2 = 960 - (w2 + 0.07 * SIZE) / 2;
  return [
    { text: "Create", x: x1, y: LINE1_Y, w: m("Create"), at: 120 },
    { text: "a", x: x1 + m("Create") + space, y: LINE1_Y, w: m("a"), at: 150 },
    { text: "new", x: x1 + m("Create a") + space, y: LINE1_Y, w: m("new"), at: 156 },
    { text: "brain,", x: x2, y: LINE2_Y, w: m("brain,"), at: 180 },
    { text: "fast.", x: x2 + m("brain,") + space + 0.07 * SIZE, y: LINE2_Y, w: m("fast."), at: 210 },
  ];
};

export const S2Tagline: React.FC = () => {
  const f = useCurrentFrame();
  const words = layout();
  const [create, , neu, brain, fast] = words;
  const cx = (w: Word) => w.x + w.w / 2;

  // camera keyframes: focus x / y / scale, moving just ahead of each beat
  const K = (vals: [number, number][]) => keys(f, vals, E.expoInOut);
  // "Create" alone → "Create a new" → the poster's left half as "brain," lands →
  // punch in on "fast." → pull back to the whole poster
  const MID = (LINE1_Y + LINE2_Y) / 2;
  const fx = K([
    [112, cx(create)],
    [140, cx(create)],
    [148, (create.x + neu.x + neu.w) / 2],
    [174, (create.x + neu.x + neu.w) / 2],
    [181, 960],
    [204, 960],
    [210, cx(fast)],
    [215, cx(fast)],
    [228, 960],
  ]);
  const fy = K([
    [112, LINE1_Y],
    [174, LINE1_Y],
    [181, MID],
    [204, MID],
    [210, LINE2_Y],
    [215, LINE2_Y],
    [228, MID],
  ]);
  const zoom =
    f < 136
      ? keys(f, [[112, 3.2], [136, 2.2]], E.expoOut)
      : K([
          [140, 2.2],
          [148, 1.25],
          [174, 1.22],
          [181, 1.42],
          [204, 1.46],
          [210, 1.66],
          [215, 1.64],
          [228, 1.3],
        ]);
  // never static: a slow push under every move
  const drift = 1 + 0.05 * tw(f, 112, 244, 0, 1, E.linear);

  // impact shake on "fast."
  const shakeAmt = keys(f, [[210, 0], [211, 1], [222, 0]], E.linear) * 9;
  const sx = (rnd(f * 3.1) - 0.5) * shakeAmt;
  const sy = (rnd(f * 7.7) - 0.5) * shakeAmt;

  const fastIn = tw(f, 210, 220, 0, 1, E.expoOut);
  const dot = tw(f, 216, 230, 0, 1, E.backOut);

  const wordStyle: React.CSSProperties = {
    position: "absolute",
    fontSize: SIZE,
    fontWeight: WEIGHT,
    letterSpacing: `${TRACK}em`,
    lineHeight: 1,
    whiteSpace: "pre",
    transform: "translateY(-50%)",
  };

  const scene = (
    <AbsoluteFill style={{ background: C.night }}>
      <DotGrid color={C.cream} opacity={0.05} gap={42} r={1.5} ripples={[{ x: 960, y: 540, at: 120, speed: 40, width: 120, amp: 1.4 }, { x: 1300, y: 640, at: 210, speed: 44, width: 100, amp: 1.8 }]} />
      <AbsoluteFill
        style={{
          transform: `translate(${960 + sx}px, ${540 + sy}px) scale(${zoom * drift}) translate(${-fx}px, ${-fy}px)`,
          transformOrigin: "0 0",
          fontFamily: FONT,
          color: C.cream,
        }}
      >
        <div style={{ ...wordStyle, left: create.x, top: create.y }}>
          <Letters text="Create" start={116} stagger={1.4} dur={20} />
        </div>
        <div style={{ ...wordStyle, left: words[1].x, top: words[1].y }}>
          <Letters text="a" start={146} dur={18} />
        </div>
        <div style={{ ...wordStyle, left: neu.x, top: neu.y }}>
          <Letters text="new" start={150} stagger={1.6} dur={18} />
        </div>
        <div style={{ ...wordStyle, left: brain.x, top: brain.y }}>
          <Letters
            text="brain,"
            start={177}
            stagger={2}
            dur={22}
            letter={(i, t) => ({ fontWeight: Math.round(mix(260, WEIGHT, E.cubicInOut(Math.min(1, t * 1.15)))) })}
          />
        </div>
        <div
          style={{
            ...wordStyle,
            left: fast.x,
            top: fast.y,
            color: C.coral,
            fontStyle: "italic",
            opacity: Math.min(1, fastIn * 3),
            transform: `translateY(-50%) scale(${mix(1.9, 1, fastIn)})`,
            transformOrigin: "30% 50%",
          }}
        >
          fast<span style={{ display: "inline-block", transform: `scale(${dot})`, transformOrigin: "50% 80%" }}>.</span>
        </div>
      </AbsoluteFill>
      <Bolt />
    </AbsoluteFill>
  );

  if (f < SPLIT) return scene;
  // the frame splits along the bolt; each half carries half of the stroke
  const t = tw(f, SPLIT, SPLIT + 15, 0, 1, E.expoIn);
  const d = 1500 * t;
  const piece = (poly: string, dir: 1 | -1) => (
    <AbsoluteFill
      style={{
        clipPath: `polygon(${poly})`,
        transform: `translate(${dir * NX * d}px, ${dir * NY * d}px) rotate(${dir * 5 * t}deg)`,
        transformOrigin: "50% 50%",
      }}
    >
      {scene}
    </AbsoluteFill>
  );
  return (
    <>
      {piece(LEFT, -1)}
      {piece(RIGHT, 1)}
    </>
  );
};
