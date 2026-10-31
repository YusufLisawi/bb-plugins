/**
 * NOBODY CAME · the FLAT 2-D ISLAND MAP (owner, 2026-10-31: no 3-D island anywhere). A clean illustrated island on a flat sea: the coastline, the reef flat, the sand, the green, the hill and the basalt
 * are contours of the same height field the old 3-D island used (ncmaps.terrainH), filled in flat colours. Red pins pop on their anchors, a dashed route draws itself from one stop to the next,
 * labels pop and fill in on the spoken words, and the map eases toward the stop it is on.
 *   { kind: "island2d", opt: { stops: [{ place: "camp", at: 0 }, { place: "hill", at: "high.high+0.1", label: "HIGH GROUND", labelAt: "high.high", labelEnd: "high.ground." }] } }
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { CREAM, INK, RED, YEL, Svg, T, clamp01, ease, lerp, rnd, useWH } from "./draw";
import { FF } from "../flat/fonts";
import { fit1, typedLines, typedN } from "./fit";
import { PLACES, terrainH } from "../three/ncmaps";

export type Island2DOpt = { stops: { place: string; at: number; label?: string; labelAt?: number; labelEnd?: number }[]; focus?: number };
type Pt = [number, number];

const X0 = -8, X1 = 8, Z0 = -5.6, Z1 = 5.6, NX = 256, NZ = 180;
/** the 3-D terrain without its rectangular reef shelf: south of the beach the land simply falls away in a clean shoreline */
const mapH = (x: number, z: number) => (z > 2.4 ? Math.min(terrainH(x, z), terrainH(x, 2.4) - (z - 2.4) * 0.95) : terrainH(x, z));
let GRID: Float32Array | null = null;
const grid = () => {
  if (GRID) return GRID;
  GRID = new Float32Array((NX + 1) * (NZ + 1));
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) GRID[j * (NX + 1) + i] = mapH(X0 + ((X1 - X0) * i) / NX, Z0 + ((Z1 - Z0) * j) / NZ);
  return GRID;
};
/** marching squares: the closed loops of one iso-level, as a list of point lists in map units */
const loops = (level: number): Pt[][] => {
  const g = grid(), at = (i: number, j: number) => g[j * (NX + 1) + i], px = (i: number) => X0 + ((X1 - X0) * i) / NX, pz = (j: number) => Z0 + ((Z1 - Z0) * j) / NZ;
  const segs: [Pt, Pt][] = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1), code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const ip = (v1: number, v2: number) => (level - v1) / (v2 - v1);
    const T_: Pt = [px(i) + ip(a, b) * (px(i + 1) - px(i)), pz(j)], R_: Pt = [px(i + 1), pz(j) + ip(b, c) * (pz(j + 1) - pz(j))], B_: Pt = [px(i) + ip(d, c) * (px(i + 1) - px(i)), pz(j + 1)], L_: Pt = [px(i), pz(j) + ip(a, d) * (pz(j + 1) - pz(j))];
    const mid = (a + b + c + d) / 4 > level;
    const tab: Record<number, [Pt, Pt][]> = { 1: [[L_, T_]], 2: [[T_, R_]], 3: [[L_, R_]], 4: [[R_, B_]], 5: mid ? [[T_, R_], [L_, B_]] : [[L_, T_], [R_, B_]], 6: [[T_, B_]], 7: [[L_, B_]], 8: [[L_, B_]], 9: [[T_, B_]], 10: mid ? [[L_, T_], [R_, B_]] : [[T_, R_], [L_, B_]], 11: [[R_, B_]], 12: [[L_, R_]], 13: [[T_, R_]], 14: [[L_, T_]] };
    for (const sg of tab[code] ?? []) segs.push(sg);
  }
  const key = (p: Pt) => `${Math.round(p[0] * 2000)},${Math.round(p[1] * 2000)}`, adj = new Map<string, number[]>();
  segs.forEach((sg, k) => { for (const p of sg) { const kk = key(p); (adj.get(kk) ?? adj.set(kk, []).get(kk)!).push(k); } });
  const used = new Array(segs.length).fill(false), out: Pt[][] = [];
  for (let k0 = 0; k0 < segs.length; k0++) {
    if (used[k0]) continue;
    used[k0] = true; const pts: Pt[] = [segs[k0][0], segs[k0][1]]; let guard = 0;
    for (;;) {
      const last = pts[pts.length - 1], nxt = (adj.get(key(last)) ?? []).find((q) => !used[q]); if (nxt === undefined || ++guard > 60000) break;
      used[nxt] = true; const sg = segs[nxt]; pts.push(key(sg[0]) === key(last) ? sg[1] : sg[0]);
    }
    if (pts.length > 8) out.push(pts);
  }
  return out;
};
const LEVELS: [number, string, string][] = [[-0.62, "#1a6e94", "#0f4d6e"], [-0.3, "#2b95b9", "#18708f"], [-0.08, "#5fccc4", "#3aa9a6"], [0.04, "#efdca8", "#c9b27a"], [0.3, "#7cb860", "#4f8a3e"], [1.0, "#4f9a52", "#33703a"], [1.95, "#a39a86", "#6b6455"]];
let PATHS: { d: string; fill: string; line: string }[] | null = null;
const KU = 1;   // map units → px is applied by the caller's transform (a scale on the island group)
const paths = () => {
  if (PATHS) return PATHS;
  PATHS = LEVELS.map(([lv, fill, line]) => ({ d: loops(lv).map((pl) => "M" + pl.map((p) => `${(p[0] * KU).toFixed(3)} ${(p[1] * KU).toFixed(3)}`).join("L") + "Z").join(""), fill, line }));
  return PATHS;
};

const PINS: Record<string, Pt> = Object.fromEntries(Object.entries(PLACES).filter(([k]) => k !== "overview").map(([k, v]) => [k, [v.mark[0], v.mark[2]] as Pt]));
PINS.camp = [-4.6, 1.5]; PINS.hill = [0.8, -0.8]; PINS.north = [0.4, -3.9]; PINS.lagoon = [4.0, 1.9]; PINS.spring = [-1.1, -1.8]; PINS.beach = [-0.5, 2.9];

export const Island2DCard: React.FC<{ c: Island2DOpt; t: number; s: { t0: number; t1: number } }> = ({ c, t, s }) => {
  const [W, H] = useWH(), K = H * 0.07, cx = W * 0.5, cy = H * 0.5, P = paths(), stops = c.stops;
  const sp = (pl: string): Pt => { const p = PINS[pl] ?? [0, 0]; return [cx + p[0] * K, cy + p[1] * K]; };
  // which stop we are on, and the eased focus + zoom
  const A = (st: Island2DOpt["stops"][number]) => Math.max(st.at, s.t0);   // the first stop (at 0) pops when the card begins
  let i0 = 0; stops.forEach((st, i) => { if (t >= A(st)) i0 = i; });
  const i1 = Math.min(i0 + 1, stops.length - 1), fly = i1 === i0 ? 0 : ease.io((t - (A(stops[i1]) - 1.2)) / 1.2), a = sp(stops[i0].place), b = sp(stops[i1].place);
  const fx = lerp(a[0], b[0], clamp01(fly)), fy = lerp(a[1], b[1], clamp01(fly)), prog = clamp01((t - s.t0) / Math.max(1, s.t1 - s.t0));
  const zoom = 1.05 + 0.2 * ease.io(prog) + 0.06 * (c.focus ?? 0), focX = lerp(cx, fx, 0.5), focY = lerp(cy, fy, 0.5);
  const fadeIn = clamp01((t - s.t0) / 0.18), fadeOut = clamp01((s.t1 - t) / 0.12);
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #124a6e 0%, #0b3250 60%, #061d31 100%)" }}>
    <Svg>
      <g opacity={fadeIn * fadeOut}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-focX} ${-focY})`}>
          {Array.from({ length: 26 }, (_, k) => { const x = rnd(k, 1) * W * 1.2 - W * 0.1, y = rnd(k, 2) * H * 1.2 - H * 0.1, dx = ((t * 14 + rnd(k, 3) * 300) % 300) - 150; return <path key={k} d={`M${x + dx} ${y} q10 -7 20 0 t20 0`} fill="none" stroke="#7ec8ee" strokeWidth={3} strokeLinecap="round" opacity={0.18} />; })}
          <g transform={`translate(${cx} ${cy}) scale(${K})`}>
            {P.map((p, k) => <path key={k} d={p.d} fill={p.fill} stroke={p.line} strokeWidth={0.05} fillRule="evenodd" strokeLinejoin="round" />)}
            {Array.from({ length: 140 }, (_, k) => { const x = X0 + 0.5 + rnd(k, 7) * (X1 - X0 - 1), z = Z0 + 0.5 + rnd(k, 8) * (Z1 - Z0 - 1), h = mapH(x, z); if (h < 0.34 || h > 1.5) return null; return <g key={k}><circle cx={x} cy={z} r={0.14 + 0.08 * rnd(k, 9)} fill="#2f7a3f" /><circle cx={x - 0.03} cy={z - 0.04} r={0.08} fill="#4fa04e" /></g>; })}
          </g>
          {stops.map((st, k) => {
            if (t < A(st)) return null;
            const [x, y] = sp(st.place), u = t - A(st), pk = ease.back(u / 0.3), prev = k > 0 ? sp(stops[k - 1].place) : null, dd = prev ? Math.hypot(x - prev[0], y - prev[1]) : 0;
            // the route is a row of dots along a curve (no SVG mask: a mask drops the whole frame to the browser renderer's fallback mode and loses the sea gradient)
            const route = prev ? (() => { const mx = (prev[0] + x) / 2, my = (prev[1] + y) / 2, nx = -(y - prev[1]) / dd, ny = (x - prev[0]) / dd, bend = dd * 0.16, cxq = mx + nx * bend, cyq = my + ny * bend;
              return (u: number) => [(1 - u) * (1 - u) * prev[0] + 2 * (1 - u) * u * cxq + u * u * x, (1 - u) * (1 - u) * prev[1] + 2 * (1 - u) * u * cyq + u * u * y] as Pt; })() : null;
            const pp = prev ? ease.io((t - (A(st) - 1.2)) / 1.1) : 1, hasLabel = st.label !== undefined, la = st.labelAt ?? st.at, lk = ease.back((t - la) / 0.28), lf = 38;
            const lab = hasLabel ? fit1(st.label!, { family: FF.cond as string, weight: 800, size: lf, ls: 0.1 }, W * 0.3) : null;
            const shown = lab ? typedLines([lab.text], typedN(st.label!.length, t, la, st.labelEnd, 14))[0] : "";
            return <g key={k}>
              {route && pp > 0 && Array.from({ length: Math.max(6, Math.round(dd / 26)) }, (_, k) => { const nd = Math.max(6, Math.round(dd / 26)), f = (k + 0.5) / nd; if (f > pp) return null; const [dx, dy] = route(f); return <circle key={`d${k}`} cx={dx} cy={dy} r={5} fill={CREAM} stroke={INK} strokeWidth={1.5} />; })}
              <g transform={`translate(${x} ${y}) scale(${Math.max(0.001, pk)})`}>
                {[0, 1].map((r) => { const p = ((u * 0.9 + r / 2) % 1); return <ellipse key={r} cy={4} rx={14 + 40 * p} ry={5 + 14 * p} fill="none" stroke={RED} strokeWidth={4} opacity={0.8 * (1 - p)} />; })}
                <path d="M0 4 C-30 -28 -34 -52 -20 -70 C-8 -84 8 -84 20 -70 C34 -52 30 -28 0 4 Z" transform="translate(0 -4)" fill={RED} stroke={INK} strokeWidth={3} /><circle cy={-66} r={11} fill={CREAM} />
              </g>
              {lab && lk > 0 && <g transform={`translate(${x} ${y - 120}) scale(${Math.max(0.001, lk)})`}><rect x={-lab.w / 2 - 22} y={-34} width={lab.w + 44} height={60} rx={12} fill={CREAM} stroke={INK} strokeWidth={5} />{T(0, 8, lab.size, shown, INK, 800, "middle", "0.1em")}</g>}
            </g>;
          })}
        </g>
      </g>
    </Svg>
  </AbsoluteFill>;
};
void YEL;
