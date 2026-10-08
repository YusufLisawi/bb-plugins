/** Smooth paths through points (centripetal-free, uniform Catmull–Rom → cubic Bézier). */
export type Pt = { x: number; y: number };

const seg = (p: Pt[], i: number) => {
  const p0 = p[Math.max(0, i - 1)];
  const p1 = p[i];
  const p2 = p[i + 1];
  const p3 = p[Math.min(p.length - 1, i + 2)];
  const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
  const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
  return [p1, c1, c2, p2] as const;
};

/** SVG path data through all points. */
export const crPath = (p: Pt[]) => {
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [, c1, c2, b] = seg(p, i);
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
  }
  return d;
};

const bez = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
};

/** Point at parameter t (0–1, each segment gets an equal share of t). */
export const crPoint = (p: Pt[], t: number): Pt => {
  const n = p.length - 1;
  const k = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
  const lt = Math.max(0, Math.min(1, t * n - k));
  const [a, b, c, d] = seg(p, k);
  return bez(a, b, c, d, lt);
};

/** Approximate length of the whole path (for dash-draw animations). */
export const crLength = (p: Pt[], steps = 120) => {
  let len = 0;
  let prev = crPoint(p, 0);
  for (let i = 1; i <= steps; i++) {
    const q = crPoint(p, i / steps);
    len += Math.hypot(q.x - prev.x, q.y - prev.y);
    prev = q;
  }
  return len;
};
