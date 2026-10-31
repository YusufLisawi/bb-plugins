/**
 * NOBODY CAME · the HOOK card: fast, flat kinetic motion graphics + big centred words, word by word on the voice (owner, 2026-10-31).
 *   - a dark clean background (a soft tint glow, optionally a blurred dark picture), NO 3-D, nothing at the top edge;
 *   - small flat MG icons (a plane, a warning triangle, a splash, an island, a radar circle, croc eyes, a messenger …) that pop / fly / dive in ON their word,
 *     one every ~0.5-0.8 s, each a pure function of time (items: `at` = when it enters, `at2` / `at3` = a second / third beat inside the icon, `outAt` = when it leaves);
 *   - the words in chunks (a chunk = a phrase of 2-6 words), each chunk shown alone, big and bold, centred a little below the middle, each word popping on its own spoken time;
 *     1-2 key words per chunk get a yellow marker swipe (`hi`).
 * Icons are drawn in a 200 × 200 box centred on (0,0); an item places them with x, y (fractions of the frame), s (the box height as a fraction of the frame height).
 */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { CREAM, GRN, INK, RED, YEL, Svg, clamp01, ease, lerp, rnd, useWH } from "./draw";
import { FF } from "../flat/fonts";
import { measure } from "./fit";

export type HookWord = { w: string; at: number; n?: boolean };
export type HookSeg = { at: number; to: [number, number]; rot?: number; dur: number; e?: "out" | "io" | "in" };
export type HookItem = {
  i: string; at: number; x: number; y: number; s?: number;
  a?: "pop" | "none" | "up" | "down" | "left" | "right";   // how it enters (default pop); "none": it is just there at `at` (paths move it)
  path?: HookSeg[];                                         // moves the item from (x, y) with these segments, one after another
  rot?: number; flip?: boolean; outAt?: number; at2?: number; at3?: number;
  pre?: number;                                             // a head start in seconds: the item is already this far into its entrance at `at` (an opener at at = 0 is already moving in frame 0)
  n?: number; n2?: number; label?: string; col?: string;    // icon-specific: numbers, a label, a colour
};
export type HookSpec = { words: HookWord[]; hi?: string[]; items: HookItem[]; tint?: string; bg?: string; y?: number; size?: number };

const sw = (c: string, w: number) => ({ stroke: c, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" });
const BLUE = "#3b82c4", SKY = "#6cc4f0", ORANGE = "#ff8a2b", SAND = "#ecd7a0", GRASS = "#6fae5a", DGRASS = "#3d8a4b", WATER = "#2d8fc9", DEEP = "#12476b", WHITE = "#f6f3ec", LGREY = "#cfd6de", MGREY = "#8d99a6", DGREY = "#2a3340";

type IconP = { u: number; u2: number; u3: number; t: number; n?: number; n2?: number; label?: string; col?: string };

/* ───────────── the icons (200 × 200 box, centred) ───────────── */
const Flame: React.FC<{ k: number; u: number }> = ({ k, u }) => {
  const fl = 0.85 + 0.15 * Math.sin(u * 40), fl2 = 0.85 + 0.15 * Math.sin(u * 33 + 1);
  return <g transform={`scale(${k})`}>
    <path d={`M0 0 C-14 -10 -16 -${34 * fl} 0 -${60 * fl} C16 -${34 * fl2} 14 -10 0 0 Z`} fill={ORANGE} transform="rotate(90)" />
    <path d={`M0 0 C-7 -6 -8 -${18 * fl2} 0 -${32 * fl2} C8 -${18 * fl} 7 -6 0 0 Z`} fill={YEL} transform="rotate(90)" />
  </g>;
};
/** a jet in side view, nose to the right; `u2` > 0: the engine is out (a flame burst, then a trail of smoke) */
const Plane: React.FC<IconP> = ({ u2, t }) => {
  const out = u2 > 0, burst = out ? clamp01(1 - u2 / 0.5) : 0, shake = out && u2 < 0.4 ? Math.sin(u2 * 90) * 2.2 : 0;
  return <g transform={`translate(${shake} 0)`}>
    {out && Array.from({ length: 7 }, (_, i) => { const p = clamp01((u2 - i * 0.07) / 0.9); if (p <= 0) return null; return <circle key={i} cx={-30 - 150 * p} cy={38 - 16 * p + Math.sin(i * 2) * 5} r={10 + 20 * p} fill={i % 2 ? "#5b6572" : "#3c4551"} opacity={0.85 * (1 - p)} />; })}
    <path d="M-92 -8 L-100 -56 L-72 -56 L-46 -8 Z" fill={BLUE} />
    <path d="M10 -6 L-14 -36 L12 -36 L42 -6 Z" fill="#9fb0c0" />
    <path d="M-98 -10 Q-98 -20 -86 -20 L52 -20 Q92 -18 98 2 Q92 18 52 20 L-86 20 Q-98 20 -98 10 Z" fill={WHITE} />
    <path d="M-98 4 L98 4 Q96 16 52 20 L-86 20 Q-98 20 -98 10 Z" fill={BLUE} opacity={0.0} />
    <rect x={-92} y={5} width={186} height={7} rx={3} fill={BLUE} />
    {Array.from({ length: 13 }, (_, i) => <rect key={i} x={-62 + i * 10.5} y={-9} width={6} height={8} rx={3} fill="#34506b" />)}
    <path d="M70 -4 Q92 -4 96 2 Q92 8 70 8 Z" fill="#34506b" />
    <path d="M-4 10 L-52 64 L-18 64 L40 10 Z" fill={LGREY} />
    <rect x={-34} y={32} width={40} height={18} rx={9} fill={DGREY} /><rect x={-39} y={34} width={9} height={14} rx={4} fill={MGREY} />
    {out && burst > 0 && <g transform="translate(-38 41)"><Flame k={burst * 1.3} u={t} /></g>}
    {!out && <g opacity={0.5}>{[0, 1, 2].map((i) => <line key={i} x1={-120 - ((t * 260 + i * 70) % 90)} y1={-10 + i * 14} x2={-120 - ((t * 260 + i * 70) % 90) - 40} y2={-10 + i * 14} {...sw(WHITE, 5)} opacity={0.5} />)}</g>}
  </g>;
};
const Warn: React.FC<IconP> = ({ u }) => {
  const pu = 1 + 0.07 * Math.sin(u * 16), r = clamp01((u % 0.8) / 0.8);
  return <g>
    <path d="M0 -84 L88 70 L-88 70 Z" fill="none" stroke={RED} strokeWidth={5} opacity={(1 - r) * 0.8} transform={`scale(${1 + r * 0.5})`} />
    <g transform={`scale(${pu})`}><path d="M0 -80 L84 66 L-84 66 Z" fill={YEL} stroke={YEL} strokeWidth={16} strokeLinejoin="round" /><rect x={-9} y={-30} width={18} height={56} rx={9} fill={INK} /><circle cy={46} r={10} fill={INK} /></g>
  </g>;
};
const Splash: React.FC<IconP> = ({ u }) => {
  const rise = ease.out(u / 0.28), fall = clamp01((u - 0.28) / 0.7), h = rise * (1 - fall * 0.9);
  return <g>
    {[0, 1, 2].map((i) => { const p = clamp01((u - i * 0.16) / 0.9); return p > 0 && p < 1 ? <ellipse key={i} cx={0} cy={50} rx={30 + 90 * p} ry={7 + 20 * p} fill="none" stroke={WHITE} strokeWidth={5 * (1 - p) + 1} opacity={0.9 * (1 - p)} /> : null; })}
    <ellipse cx={0} cy={52} rx={70} ry={14} fill={WATER} opacity={0.9} />
    <path d={`M-22 52 Q-18 ${52 - 100 * h} 0 ${52 - 128 * h} Q18 ${52 - 100 * h} 22 52 Z`} fill={SKY} />
    <path d={`M-12 52 Q-9 ${52 - 70 * h} 0 ${52 - 92 * h} Q9 ${52 - 70 * h} 12 52 Z`} fill={WHITE} />
    {[-1, 1].map((sd) => [0, 1, 2].map((i) => <path key={`${sd}${i}`} d={`M${sd * (24 + i * 12)} 52 Q${sd * (46 + i * 22)} ${52 - (70 + i * 6) * h} ${sd * (62 + i * 24)} ${52 - (30 - i * 6) * h * 1.1}`} {...sw(SKY, 11 - i * 2)} opacity={0.95} />))}
    {Array.from({ length: 10 }, (_, i) => { const a = -0.3 - (i / 9) * 2.5, sp = 90 + 60 * rnd(i, 3), x = Math.cos(a) * sp * Math.min(1, u * 2.4), y = 52 + Math.sin(a) * sp * Math.min(1, u * 2.4) + 220 * Math.max(0, u - 0.25) ** 2; return <circle key={i} cx={x} cy={y} r={5 + 4 * rnd(i, 5)} fill={i % 2 ? SKY : WHITE} opacity={clamp01(1.4 - u * 1.3)} />; })}
  </g>;
};
const Island: React.FC<IconP> = ({ u, label }) => {
  const bob = Math.sin(u * 3) * 2;
  return <g transform={`translate(0 ${bob})`}>
    <ellipse cx={0} cy={62} rx={104} ry={22} fill={DEEP} opacity={0.6} /><ellipse cx={0} cy={56} rx={92} ry={22} fill={SAND} />
    <path d="M-72 56 Q-60 -16 -4 -22 Q56 -24 74 56 Z" fill={GRASS} /><path d="M-30 56 Q-22 -4 12 -16 Q46 -16 58 56 Z" fill={DGRASS} />
    <path d="M30 -10 Q26 -40 38 -66" {...sw("#8a6a3c", 8)} /><path d="M38 -66 Q16 -76 6 -58 M38 -66 Q58 -80 74 -62 M38 -66 Q28 -92 8 -92 M38 -66 Q58 -94 72 -88" {...sw(GRN, 8)} />
    {[0, 1].map((i) => <path key={i} d={`M${-84 + i * 90} ${70 + i * 3} q10 -8 20 0 t20 0 t20 0`} {...sw(WHITE, 4)} opacity={0.7} />)}
    {label ? <g transform="translate(0 -104)"><rect x={-84} y={-22} width={168} height={40} rx={8} fill={RED} /><text y={9} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={30} letterSpacing="0.06em" fill={WHITE}>{label}</text></g> : null}
  </g>;
};
const Radar: React.FC<IconP> = ({ u, u2, u3 }) => {
  const rot = u * 220, wrong = clamp01(u3 / 0.25);
  return <g>
    <circle r={84} fill="#ff6a3d" opacity={0.18} /><circle r={84} {...sw("#ff8a5c", 6)} strokeDasharray="14 10" transform={`rotate(${u * 20})`} />
    <circle r={50} {...sw("#ff8a5c", 3)} opacity={0.6} /><line x1={-84} y1={0} x2={84} y2={0} {...sw("#ff8a5c", 2)} opacity={0.5} /><line x1={0} y1={-84} x2={0} y2={84} {...sw("#ff8a5c", 2)} opacity={0.5} />
    <path d="M0 0 L84 0 A84 84 0 0 0 59 -59 Z" fill="#ffb08a" opacity={0.5} transform={`rotate(${rot})`} />
    {u2 > 0 && <g opacity={ease.out(u2 / 0.2)}><text y={-92} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={26} letterSpacing="0.1em" fill="#ffb08a">SEARCH</text></g>}
    {wrong > 0 && <g transform={`scale(${ease.back(wrong)})`}><line x1={-48} y1={-48} x2={48} y2={48} {...sw(RED, 14)} /><line x1={48} y1={-48} x2={-48} y2={48} {...sw(RED, 14)} /></g>}
  </g>;
};
const Chart: React.FC<IconP> = ({ u }) => <g>
  <rect x={-100} y={-70} width={200} height={140} rx={14} fill="#0f4a73" /><rect x={-100} y={-70} width={200} height={140} rx={14} fill="none" stroke="#7ec8ee" strokeWidth={4} opacity={0.7} />
  {[-60, -20, 20, 60].map((x) => <line key={x} x1={x} y1={-66} x2={x} y2={66} {...sw("#7ec8ee", 1.5)} opacity={0.35} />)}{[-30, 10, 40].map((y) => <line key={y} x1={-96} y1={y} x2={96} y2={y} {...sw("#7ec8ee", 1.5)} opacity={0.35} />)}
  <path d="M-96 -34 Q-60 -40 -40 -20 Q-30 -4 -60 4 Q-90 10 -96 -2 Z" fill={SAND} opacity={0.9} /><path d="M-96 40 Q-70 30 -50 46 L-96 66 Z" fill={SAND} opacity={0.9} />
  <g transform={`translate(52 6) scale(${0.9 + 0.05 * Math.sin(u * 5)})`}><ellipse cy={14} rx={26} ry={8} fill={SAND} /><path d="M-18 14 Q-8 -14 4 -12 Q18 -10 20 14 Z" fill={GRASS} /><path d="M6 -12 Q4 -26 12 -34" {...sw("#8a6a3c", 3)} /><path d="M12 -34 Q0 -38 -4 -30 M12 -34 Q24 -40 30 -30" {...sw(GRN, 3.5)} /></g>
</g>;
const Eyes: React.FC<IconP> = ({ u }) => {
  const open = ease.out(u / 0.25), blink = u > 1.2 && (u % 2.4) < 0.12 ? 0.1 : 1;
  return <g>
    <ellipse cy={30} rx={104} ry={30} fill="#0b2a3a" /><ellipse cy={30} rx={104} ry={30} fill="none" stroke="#1f6a8a" strokeWidth={3} />
    {[-1, 1].map((sd) => <g key={sd} transform={`translate(${sd * 42} 0)`}><ellipse rx={30} ry={22 * open * blink} fill="#d6a516" /><ellipse rx={30} ry={22 * open * blink} fill="none" stroke="#7a5a08" strokeWidth={4} /><ellipse rx={6} ry={19 * open * blink} fill="#050403" /><circle cx={-9} cy={-8 * open} r={4.5} fill={WHITE} opacity={open} /></g>)}
    {[0, 1].map((i) => { const p = clamp01((u - 0.2 - i * 0.5) / 1.2); return <ellipse key={i} cy={34} rx={40 + 80 * (p % 1)} ry={8 + 14 * (p % 1)} fill="none" stroke={SKY} strokeWidth={3} opacity={0.6 * (1 - (p % 1)) * (p > 0 ? 1 : 0)} />; })}
  </g>;
};
const Cloud: React.FC<IconP> = ({ u }) => {
  const fl = Math.max(0, Math.sin(u * 17) * Math.sin(u * 5)), bolt = u > 0.25;
  return <g>
    <g transform={`translate(0 ${Math.sin(u * 4) * 3})`}><path d="M-80 20 Q-98 20 -96 0 Q-94 -22 -70 -20 Q-64 -56 -26 -52 Q0 -86 36 -58 Q80 -60 82 -22 Q104 -16 98 8 Q96 26 74 24 Z" fill={fl > 0.5 ? "#7a889c" : "#4a5668"} />
    <path d="M-78 22 Q-92 22 -94 8 L96 8 Q96 24 74 24 Z" fill="#3a4556" opacity={0.7} /></g>
    {bolt && <path d="M6 20 L-22 66 L-2 66 L-14 106 L34 50 L12 50 L26 20 Z" fill={YEL} opacity={0.7 + 0.3 * fl} transform="translate(0 -4)" />}
  </g>;
};
const Messenger: React.FC<IconP> = ({ u, u2 }) => {
  const rays = [0, 1, 2].map((i) => clamp01((u2 - i * 0.22) / 0.9));
  return <g>
    {u2 > 0 && rays.map((p, i) => p > 0 && p < 1 ? <path key={i} d={`M${40 + 34 * p} ${-58 - 10 * p} A${70 + 40 * p} ${70 + 40 * p} 0 0 1 ${40 + 34 * p + 18} ${-58 + 40}`} {...sw(RED, 7)} opacity={1 - p} transform={`rotate(-20 40 -58)`} /> : null)}
    <rect x={-46} y={-84} width={92} height={172} rx={20} fill={DGREY} /><rect x={-40} y={-78} width={80} height={160} rx={16} fill={ORANGE} />
    <rect x={30} y={-102} width={14} height={30} rx={5} fill="#1b1d20" />
    <rect x={-28} y={-62} width={56} height={46} rx={6} fill="#b3c29d" /><rect x={-22} y={-50} width={36} height={6} fill="#1d2a1c" opacity={0.7} /><rect x={-22} y={-38} width={26} height={6} fill="#1d2a1c" opacity={0.7} />
    <circle cy={34} r={26} fill={DGREY} /><circle cy={34} r={20 + (u2 > 0 ? 2 * Math.sin(u2 * 20) : 0)} fill={RED} /><ellipse cx={-6} cy={26} rx={8} ry={4} fill={WHITE} opacity={0.4} />
    <text y={-2} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={24} letterSpacing="0.12em" fill={DGREY} opacity={0.0}>SOS</text>
  </g>;
};
const Boat: React.FC<IconP> = ({ u, u2 }) => {
  const bob = Math.sin(u * 3.4) * 3, glow = u2 > 0 ? 0.5 + 0.5 * Math.sin(u2 * 9) : 0;
  return <g transform={`translate(0 ${bob}) rotate(${Math.sin(u * 2.4) * 1.2})`}>
    {u2 > 0 && <circle cx={-12} cy={-6} r={34 + 4 * glow} fill={YEL} opacity={0.14 + 0.1 * glow} />}
    <path d="M-100 8 L98 8 L70 50 L-84 50 Q-100 40 -100 8 Z" fill="#3b4654" /><path d="M-100 8 L98 8 L94 18 L-100 18 Z" fill="#cfd6de" />
    <path d="M-30 8 L-18 -34 L44 -34 L58 8 Z" fill={WHITE} /><path d="M-8 -26 L38 -26 L46 -6 L-16 -6 Z" fill="#35506b" />
    <rect x={-84} y={-14} width={26} height={22} rx={5} fill="#c8a24a" /><rect x={-78} y={-24} width={14} height={14} rx={4} fill="#7a5a28" />
    <path d="M78 8 L92 -26 L104 -26 L98 8 Z" fill={DGREY} /><rect x={86} y={8} width={20} height={34} rx={5} fill={DGREY} />
    <path d="M-110 56 q18 -10 36 0 t36 0 t36 0 t36 0 t36 0 t36 0" {...sw(SKY, 5)} opacity={0.85} />
  </g>;
};
const Calendar: React.FC<IconP> = ({ u, n, label }) => {
  const flip = ease.back(u / 0.3);
  return <g transform={`scale(${0.9 + 0.1 * flip})`}>
    <rect x={-84} y={-86} width={168} height={172} rx={18} fill={WHITE} /><path d="M-84 -68 Q-84 -86 -66 -86 L66 -86 Q84 -86 84 -68 L84 -34 L-84 -34 Z" fill={RED} />
    {[-48, 48].map((x) => <rect key={x} x={x - 6} y={-102} width={12} height={34} rx={6} fill={DGREY} />)}
    <text y={-48} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={34} letterSpacing="0.2em" fill={WHITE}>{label ?? "DAY"}</text>
    <text y={52} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={130} fill={INK}>{n ?? 1}</text>
  </g>;
};
const Fish: React.FC<IconP> = ({ u }) => {
  const sw2 = Math.sin(u * 8) * 4;
  return <g>
    <path d="M-100 -60 L-100 -10 Q-100 6 -90 10" {...sw(LGREY, 5)} />
    <g transform={`translate(0 ${sw2 * 0.5}) rotate(${sw2 * 0.6})`}>
      <path d="M-78 4 Q-30 -56 38 -22 Q64 -8 72 4 Q64 16 38 28 Q-30 60 -78 4 Z" fill="#c9d4de" /><path d="M-78 4 L-104 -26 L-104 34 Z" fill="#9fb0c0" />
      <path d="M-20 -26 Q0 -50 24 -30 Z" fill="#9fb0c0" /><path d="M-60 6 Q-10 -20 50 4 Q-10 30 -60 6 Z" fill="#e8eef3" opacity={0.7} /><circle cx={44} cy={-2} r={7} fill={INK} /><circle cx={46} cy={-4} r={2.4} fill={WHITE} />
    </g>
  </g>;
};
const Moon: React.FC<IconP> = ({ u }) => <g><circle r={78} fill="#f1efd4" opacity={0.12 + 0.03 * Math.sin(u * 3)} transform="scale(1.35)" /><circle r={74} fill="#f1efd4" /><circle cx={-26} cy={-18} r={14} fill="#d8d6b6" /><circle cx={24} cy={22} r={10} fill="#d8d6b6" /><circle cx={30} cy={-34} r={7} fill="#d8d6b6" /></g>;
const Drop: React.FC<IconP> = ({ u }) => <g transform={`translate(0 ${Math.sin(u * 4) * 4})`}><path d="M0 -84 C-20 -48 -62 -18 -62 24 C-62 62 -34 86 0 86 C34 86 62 62 62 24 C62 -18 20 -48 0 -84 Z" fill={SKY} /><path d="M-30 22 C-30 46 -14 62 6 66" {...sw(WHITE, 9)} opacity={0.85} /></g>;
const Tick: React.FC<IconP> = ({ u }) => <g><circle r={80} fill={GRN} opacity={0.2} transform={`scale(${1 + 0.08 * Math.sin(u * 6)})`} /><circle r={66} fill={GRN} /><path d="M-30 4 L-8 28 L36 -22" {...sw(WHITE, 16)} strokeDasharray="120" strokeDashoffset={120 * (1 - clamp01(u / 0.35))} /></g>;
const Person: React.FC<IconP> = () => <g><circle cy={-52} r={30} fill={WHITE} /><path d="M-52 80 Q-52 0 0 -8 Q52 0 52 80 Z" fill={WHITE} /></g>;
const Lagoon: React.FC<IconP> = ({ u }) => <g>
  <ellipse cy={30} rx={100} ry={44} fill={WATER} /><ellipse cy={30} rx={100} ry={44} fill="none" stroke="#7ec8ee" strokeWidth={4} />
  {[0, 1, 2].map((i) => { const p = ((u * 0.6 + i / 3) % 1); return <ellipse key={i} cy={30} rx={20 + 70 * p} ry={7 + 26 * p} fill="none" stroke={WHITE} strokeWidth={3} opacity={0.7 * (1 - p)} />; })}
  {[-84, -48, 44, 82].map((x, i) => <path key={i} d={`M${x} 6 Q${x + 12} -40 ${x + 26} -6`} {...sw("#5b7a3a", 9)} />)}
</g>;
const Wave: React.FC<IconP> = ({ u }) => <g>{[0, 1, 2].map((i) => <path key={i} d={`M-100 ${-30 + i * 34} q25 -22 50 0 t50 0 t50 0 t50 0`} {...sw(i === 1 ? SKY : WHITE, 9)} opacity={0.9 - i * 0.2} transform={`translate(${Math.sin(u * 3 + i) * 10} 0)`} />)}</g>;
const Plate: React.FC<IconP> = ({ u }) => <g><circle r={72} fill={WHITE} /><circle r={52} fill="#e4e0d6" /><circle r={52} fill="none" stroke="#c9c3b6" strokeWidth={3} />
  <path d="M-98 -64 L-98 60 M-110 -64 L-110 -22 Q-110 -6 -98 -6 Q-86 -6 -86 -22 L-86 -64" {...sw(LGREY, 7)} /><path d="M100 -64 Q86 -30 90 0 L90 60 M100 -64 L100 0 L90 0" {...sw(LGREY, 7)} opacity={0.0 + clamp01(u / 0.3)} /></g>;
const Counter: React.FC<IconP> = ({ u, u2, n, n2, label, col }) => {
  const from = n ?? 0, to = n2 ?? from, v = u2 > 0 ? Math.round(lerp(from, to, ease.io(u2 / 0.7))) : Math.round(lerp(0, from, ease.out(u / 0.8)));
  return <g><text y={26} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={118} fill={col ?? CREAM} stroke={INK} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round">{v}</text>
    {label ? <text y={72} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={32} letterSpacing="0.26em" fill={col ?? CREAM} opacity={0.92}>{label}</text> : null}</g>;
};
const QMark: React.FC<IconP> = ({ u }) => <g transform={`rotate(${Math.sin(u * 7) * 6})`}><circle r={72} fill={YEL} /><text y={46} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={130} fill={INK}>?</text></g>;
const Magnifier: React.FC<IconP> = ({ u }) => <g transform={`rotate(-30) translate(${Math.sin(u * 3) * 6} 0)`}><circle r={56} fill="#9ad8ff" opacity={0.25} /><circle r={56} {...sw(LGREY, 14)} /><line x1={40} y1={40} x2={96} y2={96} {...sw(LGREY, 18)} /></g>;
const Pin: React.FC<IconP> = ({ u, label }) => <g>
  {[0, 1].map((i) => { const p = ((u * 0.9 + i / 2) % 1); return <ellipse key={i} cy={70} rx={20 + 50 * p} ry={7 + 18 * p} fill="none" stroke={RED} strokeWidth={4} opacity={0.8 * (1 - p)} />; })}
  <g transform={`translate(0 ${Math.sin(u * 5) * 3})`}><path d="M0 76 C-50 20 -58 -20 -34 -52 C-14 -78 14 -78 34 -52 C58 -20 50 20 0 76 Z" fill={RED} /><circle cy={-24} r={20} fill={WHITE} /></g>
  {label ? <g transform="translate(0 124)"><rect x={-150} y={-30} width={300} height={46} rx={8} fill={RED} /><text y={5} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={34} letterSpacing="0.08em" fill={WHITE}>{label}</text></g> : null}
</g>;
const Sun: React.FC<IconP> = ({ u }) => <g><circle r={52} fill={YEL} />{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + u * 0.6; return <line key={i} x1={Math.cos(a) * 66} y1={Math.sin(a) * 66} x2={Math.cos(a) * (88 + 6 * Math.sin(u * 6 + i))} y2={Math.sin(a) * (88 + 6 * Math.sin(u * 6 + i))} {...sw(YEL, 9)} />; })}</g>;
const Bolt: React.FC<IconP> = ({ u }) => <g opacity={0.75 + 0.25 * Math.sin(u * 30)}><path d="M14 -90 L-40 8 L-4 8 L-24 90 L44 -14 L8 -14 Z" fill={YEL} /></g>;
const Cross: React.FC<IconP> = ({ u }) => <g transform={`scale(${ease.back(u / 0.25)})`}><line x1={-56} y1={-56} x2={56} y2={56} {...sw(RED, 22)} /><line x1={56} y1={-56} x2={-56} y2={56} {...sw(RED, 22)} /></g>;
const Bandage: React.FC<IconP> = () => <g transform="rotate(-35)"><rect x={-90} y={-26} width={180} height={52} rx={26} fill="#e8cfa0" /><rect x={-26} y={-26} width={52} height={52} fill="#f2dfb8" /><circle cx={-8} cy={-8} r={4} fill="#c9a96a" /><circle cx={8} cy={8} r={4} fill="#c9a96a" /></g>;
const Rope: React.FC<IconP> = ({ u }) => <g>{Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={-80 + i * 20} cy={Math.sin(i * 0.9 + u * 3) * 14} rx={15} ry={9} fill="#d6bd83" stroke="#8a6d3b" strokeWidth={3} transform={`rotate(${20 * Math.sin(i + u * 3)} ${-80 + i * 20} 0)`} />)}</g>;

export const HOOK_ICONS: Record<string, React.FC<IconP>> = { plane: Plane, warn: Warn, splash: Splash, island: Island, radar: Radar, chart: Chart, eyes: Eyes, cloud: Cloud, messenger: Messenger, boat: Boat, calendar: Calendar, fish: Fish, moon: Moon, drop: Drop, tick: Tick, person: Person, lagoon: Lagoon, wave: Wave, plate: Plate, counter: Counter, qmark: QMark, magnifier: Magnifier, pin: Pin, sun: Sun, bolt: Bolt, cross: Cross, bandage: Bandage, rope: Rope };

/* ───────────── the words ───────────── */
const norm = (w: string) => w.toUpperCase().replace(/[^A-Z0-9']/g, "");
type Chunk = { a: number; b: number };
const chunksOf = (words: HookWord[]): Chunk[] => {
  const out: Chunk[] = []; let a = 0;
  words.forEach((w, i) => { if (i > a && w.n) { out.push({ a, b: i }); a = i; } });
  out.push({ a, b: words.length }); return out;
};
const HookWords: React.FC<{ spec: HookSpec; t: number; end: number }> = ({ spec, t, end }) => {
  const [W, H] = useWH(), words = spec.words, ch = chunksOf(words);
  const hiSet = new Set<number>();
  for (const ph of spec.hi ?? []) { const tk = ph.split(/\s+/).map(norm); for (let i = 0; i + tk.length <= words.length; i++) if (tk.every((x, j) => norm(words[i + j].w) === x)) tk.forEach((_, j) => hiSet.add(i + j)); }
  // the chunk on screen: the last one that has started (its first word's time has come)
  let ci = 0; ch.forEach((c, i) => { if (t >= words[c.a].at - 0.02) ci = i; });
  if (t < words[0].at - 0.02) return null;
  const c = ch[ci], next = ch[ci + 1], lastAt = words[c.b - 1].at;
  const off = next ? clamp01((t - Math.max(lastAt + 0.5, words[next.a].at - 0.14)) / 0.12) : clamp01((t - (end - 0.14)) / 0.14);
  const base = (spec.size ?? 0.15) * H, font = { family: FF.cond as string, weight: 800, size: base, ls: 0.02 };
  const text = words.slice(c.a, c.b).map((w) => w.w.toUpperCase()).join(" ");
  const maxW = W * 0.88, all = text.split(" ");
  let lines = [text];
  if (measure(text, font) > maxW && all.length > 1) {   // two balanced lines: the split that makes the wider line narrowest (no orphan words)
    let best = 1, bw = 1e9;
    for (let k = 1; k < all.length; k++) { const w2 = Math.max(measure(all.slice(0, k).join(" "), font), measure(all.slice(k).join(" "), font)); if (w2 < bw) { bw = w2; best = k; } }
    lines = [all.slice(0, best).join(" "), all.slice(best).join(" ")];
  }
  const widest = Math.max(...lines.map((l) => measure(l, font))), size = base * Math.min(1, maxW / widest), ff = { ...font, size }, f = { lines, lh: size * 1.04 };
  const y0 = (spec.y ?? 0.77) * H - ((f.lines.length - 1) * f.lh) / 2;
  let wi = c.a;
  return <g opacity={1 - off} transform={`translate(0 ${off * 14})`}>
    {f.lines.map((ln, li) => {
      const toks = ln.split(" "), full = measure(ln, ff), x0 = W / 2 - full / 2, cy = y0 + li * f.lh;
      return <g key={li}>{toks.map((tk, j) => {
        const idx = wi + j, w = words[idx]; if (!w || t < w.at) return null;
        const pre = j ? measure(toks.slice(0, j).join(" ") + " ", ff) : 0, ww = measure(tk, ff), cx = x0 + pre + ww / 2;
        const k = ease.back((t - w.at) / 0.2), op = clamp01((t - w.at) / 0.07), hi = hiSet.has(idx), mk = ease.out((t - w.at) / 0.24);
        const sp = measure(" ", ff), nextHi = hiSet.has(idx + 1) && j + 1 < toks.length;
        return <g key={j} opacity={op} transform={`translate(${cx} ${cy + (1 - ease.out((t - w.at) / 0.2)) * 22}) scale(${Math.max(0.001, 0.55 + 0.45 * k)})`}>
          {hi && <rect x={-ww / 2 - size * 0.1} y={-size * 0.8} width={(ww + size * 0.2 + (nextHi ? sp : 0)) * mk} height={size * 0.98} rx={size * 0.06} fill={YEL} transform="skewX(-6)" />}
          <text x={0} y={size * 0.34 - size * 0.18} textAnchor="middle" fontFamily={FF.cond} fontWeight={800} fontSize={size} letterSpacing="0.02em" fill={hi ? INK : CREAM} stroke={hi ? "none" : INK} strokeWidth={size * 0.15} paintOrder="stroke" strokeLinejoin="round">{tk}</text>
        </g>;
      })}{(() => { wi += toks.length; return null; })()}</g>;
    })}
  </g>;
};

/* ───────────── the card ───────────── */
const segPos = (it: HookItem, t: number): { x: number; y: number; rot: number } => {
  let x = it.x, y = it.y, rot = it.rot ?? 0;
  for (const g of it.path ?? []) {
    const p = clamp01((t - g.at) / g.dur), e = g.e === "in" ? p * p * p : g.e === "io" ? ease.io(p) : ease.out(p);
    if (t < g.at) break;
    x = lerp(x, g.to[0], e); y = lerp(y, g.to[1], e); rot = lerp(rot, g.rot ?? rot, e);
    if (p < 1) break;
  }
  return { x, y, rot };
};
const STAGE_DY = 0.04;   // the icon stage sits a little lower than the plans' y so nothing touches the top edge
const ICON_K = 1.3;   // every icon is drawn this much larger than its `s` (the plans were laid out with s as a fraction of the frame height)
export const HookCard: React.FC<{ c: HookSpec; t: number; s: { t0: number; t1: number }; slug: string }> = ({ c, t, s, slug }) => {
  const [W, H] = useWH(), m = H, glow = c.tint ?? "#ff8a5c", fadeEnd = clamp01((s.t1 - t) / 0.12);
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1c3048 0%, #0f1c2c 55%, #070d15 100%)" }}>
    {c.bg && <Img src={staticFile(`${slug}/${c.bg}.jpg`)} style={{ position: "absolute", inset: 0, width: W, height: H, objectFit: "cover", filter: "blur(26px) brightness(0.26) saturate(1.1)", transform: "scale(1.12)" }} />}
    <Svg defs={<radialGradient id="hkGlow"><stop offset="0" stopColor={glow} stopOpacity="0.22" /><stop offset="1" stopColor={glow} stopOpacity="0" /></radialGradient>}>
      <ellipse cx={W * 0.5} cy={H * 0.34} rx={W * 0.42} ry={H * 0.34} fill="url(#hkGlow)" />
      <g opacity={fadeEnd}>
        {c.items.map((it, k) => {
          if (t < it.at) return null;
          const u = t - it.at + (it.pre ?? 0), u2 = it.at2 === undefined ? -1 : t - it.at2, u3 = it.at3 === undefined ? -1 : t - it.at3;
          const Ic = HOOK_ICONS[it.i]; if (!Ic) return null;
          const a = it.a ?? "pop", k0 = a === "pop" ? ease.back(u / 0.3) : a === "none" ? 1 : ease.out(u / 0.35);
          const { x, y, rot } = segPos(it, t), sc = (it.s ?? 0.24) * ICON_K * m / 200 * (a === "pop" ? Math.max(0.001, k0) : 1);
          const dx = a === "left" ? -(1 - k0) * W * 0.2 : a === "right" ? (1 - k0) * W * 0.2 : 0, dy = a === "up" ? (1 - k0) * H * 0.12 : a === "down" ? -(1 - k0) * H * 0.12 : 0;
          const o = (it.outAt !== undefined ? 1 - clamp01((t - it.outAt) / 0.14) : 1) * (a === "pop" ? 1 : clamp01(u / 0.1));
          if (o <= 0.002) return null;
          const idle = it.path ? 0 : Math.sin(u * 2.4 + k) * 0.006 * H;
          return <g key={k} opacity={o} transform={`translate(${x * W + dx} ${(y + STAGE_DY) * H + dy + idle}) rotate(${rot}) scale(${(it.flip ? -1 : 1) * sc} ${sc})`}><Ic u={u} u2={u2} u3={u3} t={t} n={it.n} n2={it.n2} label={it.label} col={it.col} /></g>;
        })}
        <HookWords spec={c} t={t} end={s.t1} />
      </g>
    </Svg>
  </AbsoluteFill>;
};
void GRN;
