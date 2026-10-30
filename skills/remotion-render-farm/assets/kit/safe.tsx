import React, { useId, useMemo } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";

/**
 * Render-safe effects. The browser renderer's default mode (the DOM composer) redraws the page with Canvas 2D and
 * knows only part of CSS: 2D transforms, opacity, linear gradients, borders and radii, plain shadows, plain
 * filters, polygon clips, images and self-contained SVGs. Chrome's capture mode draws real CSS, and draws a
 * <canvas> only when its layout box starts at the page origin (see capture.tsx). Each component builds one effect
 * out of what every renderer draws, so it looks the same in the CLI, on Lambda and in the browser in both modes.
 */

const useSvgId = (prefix: string) => prefix + useId().replace(/[^a-zA-Z0-9]/g, "");

/* ── stacking order ── */

/** A child of ZStack with its stacking order. */
export const Z: React.FC<{ z: number; children: React.ReactNode }> = ({ children }) => <>{children}</>;

/** z-index without z-index (the default mode ignores it): the children are drawn back to front by their `z`. */
export const ZStack: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).map((c, i) => ({ c, i, z: React.isValidElement<{ z?: number }>(c) && typeof c.props.z === "number" ? c.props.z : 0 }));
  items.sort((a, b) => a.z - b.z || a.i - b.i);
  return <>{items.map((x) => x.c)}</>;
};

/** box-shadow rings without spread or inset (the default mode draws neither): a border just outside or inside the parent. */
export const Ring: React.FC<{ width: number; color: string; radius: number; inside?: boolean; offset?: number; dashed?: boolean }> = ({ width, color, radius, inside = false, offset = 0, dashed = false }) => {
  const out = inside ? 0 : width + offset;
  return <div style={{ position: "absolute", inset: -out, borderRadius: inside ? radius : radius + out, border: `${width}px ${dashed ? "dashed" : "solid"} ${color}`, boxSizing: "border-box", pointerEvents: "none" }} />;
};

/* ── gradients as SVG (the default mode only draws linear-gradient) ── */

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** conic-gradient(from <from>deg, colours…) with evenly spaced stops: thin overlapping SVG wedges. */
export const ConicGradient: React.FC<{ size: number; from?: number; colors: string[]; steps?: number }> = ({ size, from = 0, colors, steps = 240 }) => {
  const r = size / 2;
  const cols = colors.map(rgb);
  const at = (t: number) => {
    const x = t * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(x));
    return cols[i].map((v, k) => Math.round(v + (cols[i + 1][k] - v) * (x - i)));
  };
  // CSS conic angles start at 12 o'clock and turn clockwise
  const pt = (deg: number) => `${(r + r * Math.sin((deg * Math.PI) / 180)).toFixed(2)} ${(r - r * Math.cos((deg * Math.PI) / 180)).toFixed(2)}`;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      {Array.from({ length: steps }, (_, k) => {
        const a0 = from + (k * 360) / steps;
        const [R, G, B] = at((k + 0.5) / steps);
        // each wedge reaches 0.8° into the next one, so no hairline seams show between them
        return <path key={k} d={`M${r} ${r}L${pt(a0)}A${r} ${r} 0 0 1 ${pt(a0 + 360 / steps + 0.8)}Z`} fill={`rgb(${R},${G},${B})`} />;
      })}
    </svg>
  );
};

/** radial-gradient() as an SVG: centre and radius in px (work out CSS sizes like farthest-corner first). */
export const RadialFill: React.FC<{ w: number; h: number; cx: number; cy: number; r: number; stops: [number, string][]; shape?: "ellipse" | "rect"; radius?: number }> = ({ w, h, cx, cy, r, stops, shape = "rect", radius = 0 }) => {
  const id = useSvgId("rg");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
          {stops.map(([o, c], k) => (
            <stop key={k} offset={o} stopColor={c} />
          ))}
        </radialGradient>
      </defs>
      {shape === "ellipse" ? <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} /> : <rect width={w} height={h} rx={radius} fill={`url(#${id})`} />}
    </svg>
  );
};

/** repeating-linear-gradient(<angle>deg, a 0 <size>px, b <size>px <period>px) as solid SVG bands (no `b`: transparent). */
export const Stripes: React.FC<{ w: number; h: number; angle: number; a: string; b?: string; size: number; period: number; radius?: number }> = ({ w, h, angle, a, b, size, period, radius = 0 }) => {
  const id = useSvgId("st");
  const t = (angle * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  // the CSS gradient line: through the centre, as long as the box's projection on it
  const L = Math.abs(w * dx) + Math.abs(h * dy);
  const sx = w / 2 - (L / 2) * dx;
  const sy = h / 2 - (L / 2) * dy;
  const big = w + h;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <clipPath id={id}>
          <rect width={w} height={h} rx={radius} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {b ? <rect width={w} height={h} fill={b} /> : null}
        <g transform={`translate(${sx} ${sy}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}>
          {Array.from({ length: Math.ceil(L / period) + 2 }, (_, k) => (
            <rect key={k} x={(k - 1) * period} y={-big} width={size} height={2 * big} fill={a} />
          ))}
        </g>
      </g>
    </svg>
  );
};

/* ── glass ── */

/** backdrop-filter: blur() as a copy: the backdrop drawn again inside the panel, blurred and clipped to it. */
export const Glass: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  blur: number;
  saturate?: number;
  backdrop: React.ReactNode;
  backdropSize: [number, number];
  panel?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, radius, blur, saturate = 1, backdrop, backdropSize, panel, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: radius, overflow: "hidden", clipPath: `inset(0 round ${radius}px)` }}>
    <div style={{ position: "absolute", left: -x, top: -y, width: backdropSize[0], height: backdropSize[1], filter: `blur(${blur}px)${saturate !== 1 ? ` saturate(${saturate})` : ""}` }}>{backdrop}</div>
    <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxSizing: "border-box", ...panel }}>{children}</div>
  </div>
);

/* ── text ── */

/** writing-mode: vertical-rl for Latin text: the line turned 90° clockwise, its box placed where the column would be. */
export const VerticalText: React.FC<{ x: number; y: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, transformOrigin: "0 0", transform: "rotate(90deg) translateY(-100%)", whiteSpace: "nowrap", ...style }}>{children}</div>
);

/* ── 3D without CSS perspective ── */

export type V3 = [number, number, number];
const rad = (d: number) => (d * Math.PI) / 180;
/** CSS rotateX(deg) on a point (y down, z towards the viewer). */
export const rotX = (deg: number) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return ([x, y, z]: V3): V3 => [x, c * y - s * z, s * y + c * z];
};
/** CSS rotateY(deg) on a point. */
export const rotY = (deg: number) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return ([x, y, z]: V3): V3 => [c * x + s * z, y, -s * x + c * z];
};
/** CSS perspective: d px from the screen; a point z px towards the viewer scales by d / (d − z) about the origin. */
export const perspective =
  (d: number, ox: number, oy: number) =>
  ([x, y, z]: V3): [number, number] => [ox + (x * d) / (d - z), oy + (y * d) / (d - z)];

/**
 * Draws a flat layer (w × h) through any smooth mapping to the screen, a 3D perspective for one: the layer is cut
 * into an n × n grid of triangles, and each triangle is a copy of the layer with an affine matrix and a polygon
 * clip. Every renderer draws those, so perspective survives where CSS perspective doesn't. Edges are exact;
 * inside, the picture is exact at the grid points and close in between (finer n, closer).
 */
export const Warp: React.FC<{ w: number; h: number; n?: number; map: (u: number, v: number) => [number, number]; opacity?: number; children: React.ReactNode }> = ({ w, h, n = 2, map, opacity = 1, children }) => {
  const tris: [number, number][][] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const u0 = (w * i) / n;
      const u1 = (w * (i + 1)) / n;
      const v0 = (h * j) / n;
      const v1 = (h * (j + 1)) / n;
      tris.push(
        [
          [u0, v0],
          [u1, v0],
          [u0, v1],
        ],
        [
          [u1, v0],
          [u1, v1],
          [u0, v1],
        ],
      );
    }
  return (
    // 1 × 1, not 0 × 0: the default mode skips zero-size elements, and their opacity with them
    <div style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity }}>
      {tris.map((s, k) => {
        const [A, B, C] = s.map(([u, v]) => map(u, v));
        const e1 = [s[1][0] - s[0][0], s[1][1] - s[0][1]];
        const e2 = [s[2][0] - s[0][0], s[2][1] - s[0][1]];
        const f1 = [B[0] - A[0], B[1] - A[1]];
        const f2 = [C[0] - A[0], C[1] - A[1]];
        const det = e1[0] * e2[1] - e2[0] * e1[1];
        const a = (f1[0] * e2[1] - f2[0] * e1[1]) / det;
        const c = (f2[0] * e1[0] - f1[0] * e2[0]) / det;
        const b = (f1[1] * e2[1] - f2[1] * e1[1]) / det;
        const d = (f2[1] * e1[0] - f1[1] * e2[0]) / det;
        const e = A[0] - (a * s[0][0] + c * s[0][1]);
        const f = A[1] - (b * s[0][0] + d * s[0][1]);
        // the clip reaches 0.75 px past the shared edges so neighbours overlap (no hairline seams), never past the layer
        const mx = (s[0][0] + s[1][0] + s[2][0]) / 3;
        const my = (s[0][1] + s[1][1] + s[2][1]) / 3;
        const poly = s
          .map(([u, v]) => {
            const l = Math.hypot(u - mx, v - my) || 1;
            return `${Math.min(w, Math.max(0, u + ((u - mx) / l) * 0.75)).toFixed(2)}px ${Math.min(h, Math.max(0, v + ((v - my) / l) * 0.75)).toFixed(2)}px`;
          })
          .join(", ");
        return (
          <div key={k} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "0 0", transform: `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`, clipPath: `polygon(${poly})` }}>
            {children}
          </div>
        );
      })}
    </div>
  );
};

/* ── canvas and video ── */

/** A canvas drawing every renderer captures wherever it sits: drawn on a detached canvas and shown as an image
 *  (in Chrome's capture mode a <canvas> in the page is drawn only at the page origin, see capture.tsx). */
export const CanvasImage: React.FC<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D) => void; deps: React.DependencyList; style?: React.CSSProperties }> = ({ width, height, draw, deps, style }) => {
  const src = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    draw(ctx);
    return c.toDataURL("image/png");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, ...deps]);
  return src ? <Img src={src} style={{ position: "absolute", left: 0, top: 0, width, height, ...style }} /> : null;
};

/** A video as numbered JPEG frames (ffmpeg -i clip.mp4 dir/%04d.jpg): plain images, so every renderer draws it. */
export const FrameSequence: React.FC<{ dir: string; frames: number; style?: React.CSSProperties }> = ({ dir, frames, style }) => {
  const f = useCurrentFrame();
  const n = 1 + Math.max(0, Math.min(frames - 1, f));
  return <Img src={staticFile(`${dir}/${String(n).padStart(4, "0")}.jpg`)} style={style} />;
};
