# Formats: one film, any aspect ratio

Films register their formats in `FilmDef.formats`. Root creates `<Id>-v`, `<Id>-h`, `<Id>-sq` and `<Id>-p`, plus an `-SS` master for each. The Starter film renders correctly in all four from one file; open it as the reference.

| Id | Size | Ratio | Where it plays |
|---|---|---|---|
| `v` | 1080 × 1920 | 9:16 | Reels, Stories, TikTok, Shorts, WhatsApp status |
| `h` | 1920 × 1080 | 16:9 | YouTube, website hero, LinkedIn, presentations |
| `sq` | 1080 × 1080 | 1:1 | feed posts |
| `p` | 1080 × 1350 | 4:5 | feed (tallest non-story) |

## The layout zones (`useLayout()`)

| Zone | v (9:16) | h (16:9) | sq (1:1) | p (4:5) |
|---|---|---|---|---|
| `headline` (x, y, w, size) | 80, 250, 920, 92 | 120, 324, 768, 88 | 80, 110, 920, 72 | 80, 150, 920, 80 |
| `stage` (x, y, w, h) | 60, 560, 960, 1200 | 960, 80, 883, 920 | 140, 340, 800, 680 | 90, 440, 900, 830 |
| `safe` | top 120, bottom 300 clear | 80 / 60 margins | 60 all round | 80 top, 120 bottom |
| `bug` | 80, 120, 36 | 120, 72, 34 | 80, 50, 30 | 80, 70, 32 |
| `lockup` (cy, size) | 0.448 H, 158 | 0.40 H, 150 | 0.40 H, 130 | 0.42 H, 140 |

`u` = short side / 1080. Multiply hand-tuned sizes by it (bursts, chips, paddings) when a scene is shared between formats.

**Vertical safe zone:** TikTok and Reels cover the bottom ~300 px with the caption and buttons, and the right ~120 px with icons. Nothing important goes there. The CTA sits at ≈ 0.63 H.

## Rules that make scaling automatic

1. **No magic 1080 / 1920 in a film.** Read positions from `L = useLayout()`: `L.headline`, `L.stage`, `L.cx`, `L.cy`, `L.W`, `L.H`.
2. **Author UI in a design box, then `<Fit>` it.** A chat card at 880 × 1040, a dashboard at 960 × 1200: the same component fills a tall stage in 9:16 and the right half in 16:9. `fitPoint()` gives the screen position of a design point, for sparkles, taps and flyers that live in screen space.
3. **Effects size themselves.** `Sparkle`, `Burst`, `Ring` and `Impact` draw on a frame-sized SVG; pass `scale={L.u}` or sizes × `L.u`.
4. **Headlines take the zone.** `<Kinetic>` without `x/y/size` uses `L.headline`; centre it with `align="center"` (it centres in the frame).
5. **The Lockup is format-aware.** It stacks the mark and wordmark, tagline, CTA and URL around `L.lockup.cy` and scales from `L.lockup.size`.

## Re-compose, never letterbox

A 16:9 cut is not a vertical film with bars:
- **9:16:** the headline sits on top and the stage below. One focal column; stack cards vertically.
- **16:9:** the headline column sits left (40 %) and the stage right (46 %). Put cards side by side, give wide shots (a wall of chats, three phones in a row) more room, and pan horizontally.
- **1:1 / 4:5:** the headline is smaller (72 / 80) and on top, with a compact stage. Cut secondary elements rather than shrinking everything.

When a scene only works in one shape, branch on `L.kind` (`"v" | "h" | "sq" | "p"`) for that scene alone. Examples: a vertical stack of 4 moments against a 2 × 2 grid in 16:9, or a 3 × 4 frame wall in 9:16 against 6 × 2 in 16:9.

## Checking every format

Render stills for each format at the same beats (`scripts/stills.sh <Id>-h …`, `<Id>-sq …`). Then check:
- nothing sits outside `safe`
- headlines don't overlap the stage
- UI text is still ≥ 22 px on screen after `Fit` scales it down (in 1:1 the chat card can get small, so drop a message instead)
- the lockup and CTA fit in the frame

Master each delivered format with its own `render_master.sh <Id>-<fmt> <slug>` (they share the one mix).
