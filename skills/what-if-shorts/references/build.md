# Build — making the film in `~/Developer/story-studio`

Work in your worktree (`scripts/new-worktree.sh <slug>` → `~/Developer/story-studio-wt/<slug>`, branch `ep/<slug>`).
The reference implementation is `src/episodes/farm/`, so copy its patterns rather than inventing new ones.

## 1 · An episode's files

```
episodes/<slug>/
  brief.md          concept, 3 scored premises, fact ledger, plants ledger, ending, then the QA and delivery record
  script.tsv        id ⇥ speaker ⇥ text ⇥ air      (N = narrator; air blank = natural, +0.75 = a hold)
  cast.json         voices per speaker (Fish)
  shots.tsv         the shot plan (pacing-and-shots.md § 7)
  synth_score.py    the score (copied from farm, re-anchored)
  synth_sfx.py      sounds no library has (optional)
  sfx_pick.py       copies chosen library / episode sounds into public/<slug>/sfx/
public/<slug>/
  vo/vo.wav, vo/lines.json, vo/raw/   written by scripts/voice.py (the clock of the film)
  sfx/*.mp3, music/score.mp3, sound.json, mix.wav
src/episodes/<slug>/
  <Component>.tsx   the film: picks the shot on frame-snapped time, captions, grain, vignette
  beats.ts          vo, cut(), CUTS (shots), CHUNKS (captions), B (story beats)
  shots*.tsx        the shot components (split into files of ≈ 10 shots: shotsA.tsx …)
  sound.ts          CUES, MUSIC, META from the same beats
```

`python3 ~/Developer/bb-plugins/skills/what-if-shorts/scripts/new_episode.py docs|code …` writes all of this as a starting
point. **Register** episodes with `python3 scripts/gen_root.py` (never edit `src/Root.tsx`); `new_episode.py code`
runs it for you.

## 2 · Timing: `beats.ts`

The voice is the clock. Every time in the film comes from `public/<slug>/vo/lines.json`.

```ts
import { makeVO, type Line } from "../../core/vo";
import lines from "../../../public/<slug>/vo/lines.json";
export const vo = makeVO(lines as Line[]);
/** start of word i of a line + frac·(gap to the next word) */
export const cut = (id: string, i: number, frac = 0) => { /* see farm/beats.ts */ };
export const ws = (id: string, i: number) => vo.L(id).words[i].s;   // word start
export const we = (id: string, i: number) => vo.L(id).words[i].e;   // word end

const LAST = vo.end();
export const CUTS = { kitchen: 0, otsPhone: cut("hook", 9, 0.18), /* … */ barnEyes: LAST + 0.62, endCard: LAST + 1.78 };
export const DUR = LAST + 2.72;
export const SHOTS = /* [{id, t0, t1}] from CUTS in order */;
export const CHUNKS: Chunk[] = [{ id: "hook", a: 0, b: 3, kw: { 2: RED } }, /* … */];
export const B = { phoneBuzz: 0.1, worried: ws("hook", 9) - 0.1, /* every story beat, word-anchored */ };
```

- Word indices are 0-based over the script text split on spaces. Tags are stripped and punctuation stays on the word.
  `lines.json` words match `script.tsv` exactly.
- A beat that isn't on a word is relative to a cut (`CUTS.desk + 0.1`) or to `LAST`. Never a raw second.
- `CHUNKS`: `a`..`b` are the word indices, `kw` colours words by index, `all` colours the whole chunk, and `text`
  overrides the shown words (ellipses, "FIRST: WATER.").

## 3 · The episode component

```tsx
export const Farm: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const t = useT(), tq = useTq();                        // motion time · frame-snapped time (30 fps grid)
  const k = SHOTS.findIndex((s) => tq >= s.t0 && tq < s.t1);
  const shot = SHOTS[k < 0 ? SHOTS.length - 1 : k];      // switch shots on tq: no blended cut frames
  const C = REG[shot.id];
  return (
    <AbsoluteFill style={{ background: "#0d0c0b", overflow: "hidden" }}>
      <C t={t} t0={shot.t0} t1={shot.t1} />
      {shot.id !== "endCard" && <Grain o={0.08} />}
      {shot.id !== "endCard" && <Vignette o={0.4} />}
      <FlatCaptions vo={vo} chunks={CHUNKS} hide={[[B.no - 0.05, CUTS.wichita], [CUTS.barnEyes, DUR + 1]]} />
      {audio ? <Audio src={staticFile("<slug>/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
```

It must export `<Component>` with that exact props type and `DUR` (gen_root.py looks for both). Audio only matters in
the Studio preview, since `render.sh` muxes `public/<slug>/mix.wav` itself. Before the mix exists, point it at
`<slug>/vo/vo.wav`.

## 4 · A shot component (the pattern every shot follows)

```tsx
const Coop: React.FC<ShotProps> = ({ t, t0, t1 }) => {
  const u = t - t0;                                                   // seconds into the shot
  const cam = pushCam(t, t0, t1, { x: 540, y: 960, z: 1.0 }, { x: 560, y: 960, z: 1.06 });   // 6 % push
  return (
    <AbsoluteFill style={{ background: "#dfe2d6" }}>
      <Plane cam={cam} d={0.55}>{/* far: sky, tree line */}</Plane>
      <Plane cam={cam} d={0.85}>{/* mid: grass field, the coop, wires */}</Plane>
      <Plane cam={cam} d={1}>{/* action: the hens pecking, the big rooster mid-frame */}</Plane>
      <Plane cam={cam} d={1.3} blur={14}>{/* near: a blurred black hen, bottom-left */}</Plane>
      <Counts />                                                       {/* screen-space HUD: count chips */}
    </AbsoluteFill>
  );
};
```

- The world is frame pixels (x 0–1080, y 0–1920). `Cam {x, y, z}` looks at a world point. `Plane d` scales the
  camera move by depth (parallax), and `blur` is the depth of field.
- Use `pushCam`/`camLerp` with `E.sineInOut` for every move. Continuous things (peck, tail, clouds) are functions of
  `u`, and story beats come from `B`.
- HUD is screen-space (`Screen` or plain absolute elements) and never inside a camera plane.
- Name the shot's ids in a comment banner (`/* ═══ 22 · THE COOP ═══ */`). Each file exports
  `SHOTS_A = { kitchen: Kitchen, … }`.

## 5 · The flat kit (`src/kit/flat/`)

| File | Use |
|---|---|
| `look.tsx` | `Plane` (camera + depth + blur), `Screen`, `Cam`, `camLerp`, `Grain`, `Vignette`, `Haze`, `Wash`, `Light`, `W`/`H` |
| `jake.tsx` | `Jake` / `JakeLit` (rim light), `stand(yaw, expr)`, `mixPose`, `EXPR`, `exprAt`, `mixExpr`, the `J` proportions, `JAKE_COL` |
| `gait.ts` | `jakeWalk(dist, t, {yaw, stride, armAmp, lean, expr, headYaw, x0})`, `jakeIdle(pose, t, seed, amt)`, `blinkAt(t, seed)`, `nudgeHands` |
| `dog.tsx` | `Dog`, `dogStand` / `dogSit` / `dogLie`, `dogWalk(dist, t)`, `mixDog`, `DogPose` (jaw, ears, earFlick, tailWag, headPitch, neckAng, bark, blink) |
| `animals.tsx` | `Chicken` (`HEN_LOOKS`, peck, step, bob), `Cow` (`COW_LOOKS`, graze, chew, tail, ear), `Horse`, `Bird` (fly, flap, hop), `Zombie` (step, turn, eyes, sway) |
| `scenery.tsx` | `PAL`, `Sky`, `Cloud`, `Tree`, `TreeLine`, `Barn` (doors open, inside), `Farmhouse`, `Shed`, `Silo`, `RailFence`, `Pickup` (hinged door, driver), `Coop`, `WireRun`, `GrassField`, `Tractor`, `HayTrailer` |
| `maps.tsx` | `FarmPlan`, `Patchwork`, `Canopy`, `SPOTS`, `MOOD_DAY` / `MOOD_DIM` |
| `hud.tsx` | `Icon`, `OutbreakHud`, `MapPin`, `Countdown`, `WaterCard`, `RuleCard`, `ProcessChips`, `CountChips`, `NoSlam`, `AlmostImpossible`, `YardRings`, `RedTag`, `HomePin`, `SuppliesCard`, `EndCard`, `HUDC` |
| `captions.tsx` | `FlatCaptions` (word-timed one-line chunks, measured widths, keyword colours) |
| `props.tsx` | `PhonePr` (alert screen, glow), `MugPr` (steam), `KeysPr` (swing) |
| `math.ts` | vectors, `ik2`/`fk2`, `smoothPath`, `blobPath`, `roundPoly`, `hull`, `taper`, `vnoise`, `hash1` |
| `fonts.ts` | `FF.cond` (Barlow Condensed), `FF.sans` (Barlow), `FF.handItalic` |

Also from `src/core/anim`: `useT`, `useTq`, `E.*` easings, `tw`, `keys`, `spring`, `win`, `prog`, `noise`, `fbm`, `rnd`.

**Extending the kit** is expected: a new niche needs new scenery, devices or a cast look. Put reusable parts in
`src/kit/flat/<file>.tsx`, keep their props continuous (numbers you can animate, no booleans that pop), and never
break the farm film (re-render 3 farm stills after a kit change).

## 6 · Characters in code

- **Units:** a character is drawn at a ground point `x, y` (px) with `s` = px per head (wide walk 142, kitchen 255,
  close-up ≈ 600). In rig units y points up and 1 = one head.
- **Facing:** `yaw` 0 is front, +π/2 faces screen-right, π is the back. `headYaw` adds a ¾ face on a profile body.
- **Seated:** start from `stand`, set `hip` to the seat height and the feet forward (`seated()` in `farm/shotsA.tsx`).
- **Hands:** set `handL` / `handR` targets (rig units), and IK bends the elbows (gravity rule). To hold something,
  pass `holdR={(h) => <g>{prop at h.c, angle h.dir}</g>}`. Attach cords and straps to the **solved** hand, not the
  target.
- **Expressions:** `p.expr = exprAt(t, [[t0, "happy"], [B.worried - 0.45, "worried"]])`, plus `p.blink = blinkAt(u, seed)`.
- **The model sheet** (CP0): copy `src/episodes/farm-lab/FarmLab.tsx`. It has a turnaround, expressions, poses, a
  12-frame walk strip and a live walk. Render it with `scripts/stills.sh FarmLab out/<slug>-cp0.jpg 0.5 1.5 2.5`.

## 7 · Rules for the 60 fps motion-blur master

The master averages 4 sub-frames per output frame (240 sub-frames/s blended to 60 fps). That smooths fast limbs, and
it also exposes these mistakes:

| Rule | Why |
|---|---|
| `useT()` for motion; `useTq()` for anything discrete (shot switches, digits, captions, counters) | a discrete change between sub-frames shows both states at once |
| Face-shape switches on the 60 fps grid (`exprAt` does it) | otherwise two mouths show in one frame |
| Fast moves ≤ ≈ 30 px per output frame, sine-eased (a door, a hand, a ring) | faster moves smear into stepped copies |
| CSS 3-D planes (tilted maps) live in an isolated, clipped container | once the near edge passes the camera plane, it paints over later overlays |
| Deterministic randomness only (`rnd(seed)`, `hash1`) | `Math.random` flickers between sub-frames and renders |
| A prop held across a cut stays in the same place | the eye catches jumps at 60 fps |

## 8 · Commands, in order

```bash
SK=~/Developer/bb-plugins/skills/what-if-shorts
.venv/bin/python scripts/voice.py <slug>                       # one take; sample 4–6 takes (voice-and-sound.md § 1)
.venv/bin/python scripts/stt_check.py <slug>                   # ≥ 0.98
scripts/stills.sh <Component> out/<slug>-r1.jpg 0.5 2.4 3.3 …  # a contact sheet at those seconds (queued)
python3 $SK/scripts/compare_ref.py …                           # clones only: ours vs the reference at the same word (clone.md § 5)
.venv/bin/python episodes/<slug>/synth_score.py                # the score
scripts/sound_export.sh <slug> <slug>                          # sound.ts → public/<slug>/sound.json
.venv/bin/python scripts/mix.py <slug>                         # → public/<slug>/mix.wav (−14 LUFS)
.venv/bin/python scripts/stt_check.py <slug> public/<slug>/mix.wav
FPS=60 scripts/render.sh <Component> <slug> 10 16              # a motion-test slice (seconds 10–16)
FPS=60 scripts/render.sh <Component> <slug>                    # the master → out/<slug>.mp4
.venv/bin/python $SK/scripts/diffscan.py out/<slug>.mp4      # every spike must be a cut or an intended flash
.venv/bin/python scripts/qa.py <slug>                          # run it plain (it takes the whisper lock itself)
scripts/deliver.sh <slug> && scripts/clean.sh <slug>
# add the episode (with "niche") to ~/Videos/story-studio/episodes.json and its post info to meta.json, then:
uv run --with boto3 scripts/r2_sync.py videos --delete-local   # → R2, gallery at faceless.clipaf.com/story-studio/index.html
```

The farm master was 15,665 sub-frames: ≈ 6 min of render plus ≈ 2 min of blend and encode on the GPU lock. Only these
scripts render or transcribe. Never call `npx remotion render/still` yourself, and never delete a lock.
