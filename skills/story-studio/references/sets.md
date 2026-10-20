# Sets: every background is designed in code

> [!IMPORTANT] Owner rule (Oct 2026)
> Story, explainer, what-if and finance episodes are **designed entirely in code** — you are the
> motion designer. **No generated images** (no Codex imagegen, no image APIs) for these formats.
> The ONLY format that uses generated assets is **cardboard** (format-cardboard.md), where a Codex
> imagegen thread makes the craft cut-outs. Code sets are better anyway: they stay on-model,
> they move in true parallax, lights can flicker, dials can turn, windows can open.

## The approach

A set is a React component (`src/episodes/<slug>/sets.tsx`, or `src/kit/sets.tsx` when reusable)
that draws SVG in **world coordinates** (frame centre = 0,0; the frame spans x −540..540,
y −960..960; overdraw to ±1500 for camera moves). Split it into **parallax planes** so `Layer`
can move them at different depths: far (sky, skyline, far wall), mid (the set), near
(foreground props, poles, seat edges).

`src/kit/sets.tsx` helpers:
- `World` — an SVG sized to the world (`<World>…</World>` draws in world px).
- `persp({vp, f})` → `P(x, y, d)` one-point perspective (metres → screen) for aisles,
  corridors, tracks, rooms; `quad(...)` for a projected rectangle. Derive character anchors
  (seat tops, floor lines) from the SAME projection so puppets always sit right.
- `LightPool`, `Haze` (soft fog bands), `Stripe` (hazard bands), `Dots` (deterministic texture).
- Gradients on every large surface (top light → bottom shadow), a darker contact shadow where
  things meet the floor, one warm key + one cool fill per set.

## Look (flat cinematic)

Flat geometric shapes, soft gradients, minimal outlines (1–3 px darker edges only where shapes
overlap), atmospheric depth (far planes lower contrast and blurred by `Layer depth`), practical
lights that glow (lamps, screens, signals). Palette per show: 1 dark base, 1 mid, 1 warm key,
1 accent, 1 danger colour — written once in the episode (`PAL`).

## Rules

- Draw what the shot needs at the size it's seen: a close-up door gets rivets, scuffs, a lever;
  a far wall gets three shapes.
- Windows are **holes** (SVG mask) with the moving world (`OutsideBox`, a skyline) on a Layer
  behind — never a painted window.
- Something alive in every set: a flicker, a needle, a passing light band, rain, motes, a sway.
- Check with stills at 2–3 camera positions per set before adding characters.
- Keep SVG element counts sane (≤ ~1,500 per set): precompute static geometry with `useMemo`
  and animate only the few live parts per frame.
