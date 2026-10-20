---
title: Illustrated drama — the house style (BLACK SKY, LOW TIDE)
---

# Illustrated drama (the default story format since 2026-10-20)

The user's verdict on the first 12 episodes: good, but the characters were stiff puppets, the
top series bar was "very bad", some premises were too niche, and the voice sounded cut. This
format answers all of it. References: `src/episodes/black-sky` (solar storm, 114 s) and
`src/episodes/low-tide` (tsunami, 98 s).

> [!IMPORTANT] The owner's rules
> - **No series bar, no show name, no "PART 1" labels** anywhere on screen.
> - **Easy English.** Short sentences, everyday words ("the fumes have no smell", not "carbon monoxide is odourless").
> - **Relatable situations** — things that happen to anyone: a blackout at home, a beach day. Not niche jobs.
> - **Plausible + useful:** a real threat ("it already happened in 1859 / 2004") and real survival rules.
> - **Hook** = a second-person rule with a curiosity gap ("If the sea ever runs away from the beach… don't go and look. Run.").
> - **CTA** = a question people want to answer ("30 hours, one bag — what goes in first?", "Comment RUN or LOOK, tag who you'd drag up that hill").
> - Characters with **relatable faces** and **believable bodies** (the Actor rig below), plus **isometric / 3-D-map inserts**.

## Story recipe (how both were written)

1. Pick a threat that is real and could hit anyone soon. Write down the 3–4 official survival rules
   (NOAA/ITIC for tsunamis, NASA/utility guidance for solar storms) and check every fact.
2. One family/neighbour pair, named in the first 15 s. Each rule is **shown as something the hero
   does** (fills the bathtub, grabs cash, leaves the car) and then **paid off** later (Rosa asks
   for water on day two; the second wave).
3. Rules appear as `TipCard` (RULE n) on top of an **isometric explainer** (how water needs pumps,
   how roads jam, which building to climb) — the "how it works" moment people screenshot.
4. A twist line from the narrator in near silence ("The Sun wasn't done." / "He went back for the car.").
5. CTA over a calm final image with the choice drawn as big buttons/items.
6. Script ≈ 250–290 words, narrator + 2–3 cast voices (see voice.md). 95–115 s.

## The Actor rig (`src/kit/actor/`)

A real 3-D skeleton projected to 2-D, so a character can be shown front, ¾, profile or back and
**limbs never stretch**. Units: 1 = one head. Man ≈ 5.8 heads, teen 5.5, child 4.3.

| File | What |
|---|---|
| `math3.ts` | vectors, rotations, `ik2` two-bone IK, `project(view, p)`, hull, smooth paths, `capsule()` |
| `rig.ts` | `BUILDS` (man, dad, woman, teen, oldwoman, child), `Pose` (all numbers → `lerpPose`), `POSE0`, `solve()`, faces `EXPR` + `face("worried", {...})`, `over(pose, partial, w)` |
| `gait.ts` | `gait(build, "walk"|"run"|"sprint"|"sneak", phase, speed, t)` planted feet + hip bob + arm swing + counter-twist; `idle()`; `period()`; `blink()` |
| `acts.ts` | `talk(pose, env, t, t0, t1)` lip sync from the voice envelope · `alive()` blinks/saccades · `exprKeys()` · `holdPhone` `reach` `bang` `crouch` `cough` · `handAt()`/`headAt()` to attach props |
| `head.tsx` | 3-D head (ring model), features mapped on the surface, 3-D nose, hair/beard as surface regions traced by marching squares |
| `Actor.tsx` | `<Actor build look pose x y s yaw tilt uid t light/>` draws everything, depth-sorted, cel-shaded, rim light |
| `look.ts` / `cast.ts` | `Look` (skin, hair style, clothes) + `Light` (`lightMix({...})`); the cast: ELI, ROSA, MARCO, MILA, THEO, DAD |

Recipe for a character in a shot:
```tsx
let p = gait(MAN, "walk", dist / (speed * period("walk", speed, MAN)), speed, t);   // or idle(MAN, t, seed)
p = holdPhone(MAN, p, w);                    // actions blend by weight
p = exprKeys(p, t, [[t0, "calm"], [beat, "worried"]]);
p = talk(p, env, t, vo.s("line"), vo.e("line"));   // only for on-screen speakers
p = alive(p, t, seed);
<Actor uid="s3eli" build={MAN} look={ELI} pose={p} x={x} y={groundY} s={150} yaw={Math.PI/2} t={t} light={DAY} />
```
- `x, y` = the point between the feet (ground), `s` = px per head. Close-up: s 500–560 with
  the feet far below frame (y ≈ 2500). **A child is 4.3 heads**: put Theo's ground ~1.5·s higher
  than an adult's or his face drops out of frame.
- `yaw`: 0 faces camera, ±π/2 profile, π back. `tilt` > 0 = camera above (0.6 for map shots).
- `hp` > 0 nods DOWN, `hy` turns the head, `lean` bends the torso forward.
- Distance-driven phase (`dist / stride`) keeps feet planted; never drive phase by time alone when the actor moves.
- Lip sync: `scripts/envelope.py <slug>` → `public/<slug>/vo/env.json` (run after voice.py).

Model sheet: `src/episodes/actor-lab/ActorLab.tsx` (turnaround, expressions, cast lineup, gait strips).
Fast iteration without Remotion: `bun .cache/snap.tsx out.svg '{lookOverrides}' yaw WHO expr "viewBox"`
then rasterize with cairosvg (`.cache/ras.py`) — seconds per look.

## Drama graphics (`src/kit/drama.tsx`) and iso (`src/kit/iso.tsx`)

`Chapter` (time/place stamp) · `TipCard` (RULE n, paper card, icon, NO edge stripe) · `BigClock`
countdown · `Post` (social post) · `Callout` (label + leader line) · `Headline` · `Icon` · `Finish`.
Iso: `isoP`, `IsoBox` (+children), `IsoTile`, `IsoWindows`, `IsoCyl`, `IsoPipe` (flowing dashes),
`IsoLabel`. Paint back to front (sort cells by x + y). `IsoTown` in low-tide/shotsB.tsx is a
reusable terraced town with flood water, jams, walkers and a second wave.

## Shot grammar

- 18–22 shots per ~100 s; cut on the word (`vo.at`), every shot has a camera move (`keys`).
- Alternate: character scene → iso explainer → close-up → wide. Close-ups for every cast line.
- Night = indigo + one strong colour (aurora); light the actors with `lightMix` (key, rim, ambient).
- Captions: Inter 800, y 1250, `gapEm: 0.3`, hidden on the CTA.
- Review with stills every 3–5 shots; then a 5 s slice render to check motion; then the master.
