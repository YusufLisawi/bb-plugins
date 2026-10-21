<!-- HD-2D format guide (2026-10-21). First episode: hollow (Sonnet 5.5; parent review: approved, grade A−, "beautiful and creepy"). Engine: src/kit/hd2d/ (adapted from lemo-opuscar styles/hd-2d, MIT). The owner's style spec is episodes/hollow/ref/STYLE.md. -->
# Format: HD-2D — pixel sprites in a lit 3-D diorama (vertical survival-rules shorts)

> [!NOTE] Where the code lives
> Engine `src/kit/hd2d/`, the reference episode `src/episodes/hollow/` and its docs `episodes/hollow/{brief,shots}.md` are on branch
> **`ep/hollow`** (worktree `~/Developer/story-studio-wt/hollow`) until the parent merges it. Run `ls ~/Developer/story-studio/src/kit/hd2d`;
> if it is missing, start your worktree from `ep/hollow`. Delivered master: `~/Videos/story-studio/hollow.mp4` (76.1 s, 1080×1920).
> Read first: [format-cardboard.md § 1](format-cardboard.md) (owner content rules: short, very easy English, true), then this file, then
> `episodes/hollow/brief.md` + `shots.md`, then the code in the order of § 5.

## 1 · What it is — and is not

**Hand-made pixel sprites standing like paper cut-outs in a real 3-D miniature** (boxes and cylinders wrapped in pixel textures), lit by practical
lamps that throw real sprite shadows, fogged, shot from a **high 3/4 camera through a tilt-shift lens**, with bloom and a vignette. The look is
"toy world where every lamp matters". The story format that fits it best is the **survival-rules short** (hook → a few RULES shown as actions →
the twist breaks a rule → a question for the comments). Reference: `hollow` (zombie apocalypse, 3 rules, a window that lights up).

Not a voxel game (characters are flat sprites), not a flat 2-D RPG (the set is 3-D with real light), not a photo of a miniature (textures are pixels).
**Sprites step, everything else glides**: drawings change on their own clocks (walk 8 fps, idle 1.4 Hz, crowd gait 4.6–11 Hz); camera, lights,
fog, particles and focus move every output frame. Plain 30 fps render, **no motion blur** (`SAMPLES=1`; blur would ghost the stepped sprites).

## 2 · The look in numbers

| What | Value |
|---|---|
| Output | 1080×1920, 30 fps, rendered at **2× SSAA** (2160×3840 buffers), tone map ACES, exposure 1.15, shadow maps PCF-soft |
| Texel density | scene textures **24 px/m** (`PPM`), world-space UVs (`worldUV`), `NearestFilter`; sprites **30 px/m** (`SPX = 1/30`) |
| Colour | 3–6 swatch **ramps** picked by brightness through a 4×4 **Bayer dither** (`ramp(cols, dz)`); sprites get a 1 px *selout* outline (`PX.outline`) |
| Sprite size | person 38×52 px (1.3×1.7 m), Marta 42×58, Hollow crowd 30×54, hero Hollow 40×70; hero ≥ 1/10 of the frame height in story shots, **20–30 % in close-ups** (above ≈ 35 % the pixels turn chunky) |
| Light rig per set | one dim shadow-casting key (sun → moon), a hemisphere fill, **practical point lights** (candle, lit window, braziers) with a glow sprite each, a front fill ≈ 2 m before the hero (a sprite lit from behind goes black) |
| Post chain | physical depth of field **and** tilt-shift in one signed circle of confusion → UnrealBloom → vignette/grade/lift → output. No grain |
| Default post | bloom strength 0.55, radius 0.75, threshold 0.85 · vignette `amt` 0.62, `warm` 0.1, `sat` 1.05, `contrast` 0.26, `lift` 0.025 · `finish()` multiplies `sat` by 1.12 |
| Colour logic | one cold ambient key against small warm practicals; fog colour per set; **the hero wears the one saturated colour** nobody else has (Ivy's red scarf), so a 60 px sprite is findable in a wide |
| Dark scenes | must read on a phone: hemisphere ×1.5 + a cool shadow lift (`V.lift`), per-shot exposure 1.3–1.35 for near-black shots; never pure black (warm ink) |
| Type | Cinzel (capitals) + Cormorant Garamond (italic subtitles), both OFL via `@remotion/google-fonts`; UI = one metal (gold) + one paper white on a dark plate |
| Speed | a 76 s film renders in ≈ 80 s (GPU) + ≈ 50 s encode; a stills batch of 5–7 frames ≈ 1–2 min at `SCALE=0.45` |

## 3 · Pipeline at a glance

```bash
cd ~/Developer/story-studio-wt/<name>; df -h ~                               # ≥ 30 GB free
# 0 brief → 1 script.tsv + cast.json → 2 voice (Fish Ethan) → 3 beats.ts → 4 set(s) → 5 cast sprites → 6 film.ts + Overlay.tsx
python3 scripts/gen_root.py                                                  # registers <Id> (must export <Id> and DUR)
SCALE=0.45 scripts/stills.sh <Id> out/r1.jpg 0 3 7.5 12 …                    # stills rounds (queue, locks) — open the sheet with Read
.venv/bin/python episodes/<slug>/synth_sfx.py && .venv/bin/python episodes/<slug>/synth_score.py   # synthesized sound
scripts/sound_export.sh <slug> <Dir> && .venv/bin/python scripts/mix.py <slug> --limit 0.38         # cue sheet → mix.wav (−14 LUFS)
.venv/bin/python scripts/stt_check.py <slug> public/<slug>/mix.wav           # ≥ 0.97 (hollow: 1.000)
SAMPLES=1 CONC=3 CRF1=18 scripts/render.sh <Id> <slug>                       # the master (plain 30 fps, --gl=angle-egl)
.venv/bin/python scripts/qa.py <slug>                                        # NEVER wrap it in flock: it takes the whisper lock itself
scripts/deliver.sh <slug>; scripts/clean.sh <slug>; git commit               # only after the parent's OK if you are a child
```

Checkpoints when you are a child agent (see [delegation.md](delegation.md)): **0** engine stills + voice audition + script · **1** a stills sheet of every
shot + `shots.md` · **2** `qa.py` PASS + the frame-QA fixes (§ 11) → wait for the OK → deliver → clean → final commit → report the hash.

## 4 · The engine (`src/kit/hd2d/`) — the API you will call

| File | Exports you use |
|---|---|
| `px.ts` | `PX` pixel canvas (`set get rect fill ellipse poly line outline done`) · `ramp(cols, dz)` → `(v, x, y) → [r,g,b]` · `hex mixc` · `h2 vn2 fbm mulberry` (deterministic noise) · `texOf(canvas, {mip, repeat})` · texture painters `woodPlanks cobbles rock plaster shingles ground stoneBlocks dirtRoad` · `billboard blob glow radialTex` · `PPM` |
| `kit.ts` | `worldUV(geo, tile)` · `mat(canvas)` (MeshStandard, `userData.tile`) · `mesh(geo, m)` · `box(w,h,d,m)` (base at y = 0) · `mats()` (the stone/plank/plaster/roof/road/grass set) · `house(o)` · `windowQuad(w,h,{k,level})` (`userData.setLevel`) · `crate barrel` · `fire(size,{seed,i})` (6-frame pixel atlas at 10 fps, `userData.update(t,cam,k)`) · `ridge` (distant silhouette) |
| `fx.ts` | `sky({top,mid,hor,sunDir,sunCol,sunI,moonDir,moonI})` (dome + uniforms) · `stars` · `particles(n, fn)` (deterministic, `userData.update(t)`) · `rain` · `beamCard` · `flick flickC` (flame / candle breath multipliers) |
| `sprite.ts` | `makeSprite(def)` → `{ root, frame(name), face(cam, flip), at(x,y,z), anchor(key, name, flip), atlas }` · `atlas` · `ik2` (2-bone IK) · `limb(P, p0, p1, r0, r1, col)` · `SPX` |
| `post.ts` | `makePost(renderer, scene, camera, w, h, {ssaa, taps})` → `{ composer, dof, bloom, vig }` |
| `track.ts` | `track([[t,[a,b,c…]], …])` (monotone cubic, no overshoot) · `seg ss eo ei eio lerp clamp` |
| `HD2DCanvas.tsx` | `createEngine(canvas)` → `{ renderer, camera (fov 32), mkPost(scene), W, H }` · `<HD2DCanvas t create={…}/>` (builds the world **once per tab** behind a `delayRender`, then calls `film.render(t)` every frame) |
| `ui.tsx` | `FONT · ChapterCard · RuleCard · PixelIcon · DialogueBox · Subtitle · TitleCard · Ornament` (§ 7) |

**World rules.** +x right, +y up, metres. A set exports a landmark table (`LM` in `highwall.ts`: wall height, terrace levels, tower, the lit window) —
cameras and staging read **landmarks, never magic numbers**. Everything is a **pure function of `t`**: no state between frames, no `Math.random()`
(use `mulberry(seed)` / `h2`), nothing allocated in `render`. One set per place; two sets can share the engine (the dead-city map beside Highwall:
switch `post.dof.scene = MP.scene` per shot).

**A set's `update(t, cam, opts)`** moves everything alive: sky + fog + hemisphere + key light follow ONE value `D` (dusk 0 → night 1; the sun's warm low
angle swings to the moon, so shadows swing too); every practical has a **level** that drives the pane emissive, the point light (intensity ∝ level^1.3),
its glow sprite (opacity and scale) and `flickC`. Register **every** light in one `lamps` array (windows, lamp posts, braziers, arrow slits) so a
"all lights go out" cascade (`off` time per lamp, a 0.5 s stutter `[1, .2, .75, .1, .4, 0]`) really turns them all off.

**A sprite** (`makeSprite`): `def = { name, FW, FH, table, draw, anchors?, shadow, emI, capK, blob, blobA }`. `table` is a **pose table of small data
objects**; `draw(P, E, pose, name)` paints one frame into `P` (colour) and `E` (emissive layer: eyes, flames, glowing scarf), `atlas()` packs all frames
into one texture (selout outline added). Each frame of the film: `spr.at(x,y,z).face(cam, flip).frame("idle0")`. `spr.anchor("hand", pose, flip)`
gives the world position of a painted anchor (a rope that follows the hand, a candle flame light). Sprites are lit (Lambert, shadow-casting, with a
light cap so a point light beside one never burns it out).

**Per-frame post knobs** (set by `finish(cs)` at the end of every `render(t)`): `post.dof.focus` (= `cam.position.distanceTo(focusPoint)`), `.aper`, `.maxCoc`,
`.tiltAmt .tiltC .tiltW .tiltF`; `post.bloom.strength/radius/threshold`; `post.vig.uniforms.{amt,fade,warm,contrast,sat,lift,flash}`;
`E.renderer.toneMappingExposure`. CoC (px) = `aper · (1/focus − 1/z)`, clamped to `maxCoc`; the tilt band blurs above (far) and below (near) the sharp
band `[tiltC ± tiltW]`, ramping over `tiltF`, up to `tiltAmt`.

## 5 · Build an episode, step by step (a cheaper model can follow this)

Copy the shape of `src/episodes/hollow/` (`beats.ts · film.ts · <set>.ts · art/ · <Id>.tsx · Overlay.tsx · sound.ts`) and `episodes/hollow/`
(`brief.md script.tsv cast.json takes.py synth_sfx.py synth_score.py shots.md`).

1. **Concept** `episodes/<slug>/brief.md`: 3 premises, pick one. The spine is a table **Rule → plate icon → the hero's action → the payoff**, a twist that
   breaks one rule, a cliff-hanger question, a **lore bible** for the next part. Hook = a paradox in 2 s ("Here, a single candle can kill a whole town."),
   few names, 65–80 s (hollow 76.1 s; the cardboard rule "aim ≤ 72 s" is better still if the story allows), no series bar, no "PART" label (a chapter card ≤ 3 s and an end title card are fine).
2. **Script** `script.tsv` (`id⇥speaker⇥[tag] text⇥air`, ≈ 130 words, 14–17 lines). A rule = its own short line ("Rule two. Stay high. They cannot climb.").
   `+1.6` in the air column = a dramatic hold. One on-screen character may speak once (dialogue box, 3 lines max).
3. **Voice** (§ 9): sample takes, pick by measurement, `voice.py <slug> --reuse --lead 0.05`, `stt_check.py` ≥ 0.97.
4. **`beats.ts`**: `export const vo = makeVO(lines)` from `public/<slug>/vo/lines.json`; `const B = { r1: vo.s("r1"), lightWord: vo.at("light","Light"), … }`,
   `export const DUR = vo.end() + 3.8` (title card). **Every time in the film comes from here**; re-voicing re-times everything.
5. **Set** `<set>.ts` exporting `buildX(E)` → `{ scene, chars, update(t, cam, opts), … }` and `LM`. Build it in layers: terrain/walls → buildings (`house`) →
   props → lamps registry → sky/fog/key/hemi → particles. Render **stills of the set from 3 camera angles before any character** (`src/episodes/hd2d-lab/`
   is a test bench: `createHollow` also returns `renderCam(cs, t)`, which draws any camera state).
6. **Cast** `art/*.ts`: a *Spec* (proportions, ramps) + a *pose table* per character through the person rig (`art/person.ts`, below) → `makeSprite`.
   Render a **model sheet** (every pose) and fix it before staging. Keep the hero's colour unique.
7. **Director** `film.ts` (§ 6): `T` (shot times from `B`), `SHOTS`, one camera function per shot, one `stage` function per shot, `render(t)`.
8. **Overlay** `Overlay.tsx` (§ 7): chapter card, plates, dialogue box, subtitles, title card; times from `B`.
9. **Stills rounds** `SCALE=0.45 scripts/stills.sh <Id> out/rN.jpg …`, 25–30 stills per round: each shot's first frame, the key word, the middle of every
   camera move, every UI landing, the last frame before each cut. Open the sheet with Read; fix; repeat 2–3 rounds. Checklist: [review.md](review.md).
10. **Sound** (§ 8) → **master** → **QA** (§ 11) → deliver.

**Person rig** (`art/person.ts`, 3/4 view facing right; `drawPerson(P,E,pose,spec)` + `drawPersonBack` for the camera behind a wall). Spec: `FW FH hipX hipY
torso neck thigh shin upper fore shW hipW coatLen lean hr hairStyle("bob"|"bun"|"none") skirt belt` + colour ramps `skin hair coat sleeveB pants boots` +
hooks `neckwear held head torsoExtra hush`. Pose (data): `bob crouch lean hipX fA fB (foot targets) hA hB (hand targets) headDx headDy look eyes("open"|"blink"|"closed"|"wide")
mouth(0–3) tail kneel up held("candle"|"rope"|"spear") lit hush toMouth`. Limbs are two-bone IK capsules, so **a new pose is one table entry**.
A new character = copy `IVY`/`MARTA`/`GUARD` in `art/cast.ts`, change the ramps and hooks.

## 6 · Vertical camera grammar (1080×1920)

A camera is a function of `t` returning `{ pos, look, fov, focus, ap, maxCoc, tilt: [centre, halfWidth, feather, amount] }` (helpers `orbit(target, d, yawDeg, pitchDeg)`,
`track(keys)`). **Always look down** on the world (high 3/4) except one deliberate low shot; paths are monotone splines or `lerp`/`eio` of a few keys. Typical values:
wide/tide `ap 35–60, tilt 14–17`; medium `ap 130–160, tilt 8–10`; close-up on ONE subject: focus ON her, `ap 260–420` (the background melts); two subjects at different depths (hero in the foreground, a threat behind): `ap 70–120, maxCoc 16–20, tilt 5–6`, focus between them; macro/candle `ap 260–520`.

| Shot | Use | Hollow example |
|---|---|---|
| Rising crane, focus handed from object to place | the hook: a small thing → its consequence | candle on a sill → the whole town and the tide (0–3.3 s) |
| Straight overhead, tilt band as a strip | a board-game map for lore | the dead city, sleepers flooding a street |
| Low push to a gate / door, foreground crowd | threat at the threshold | the gate, claws at it |
| Medium 3/4 drift on two figures | a rule being given | the belfry, Marta + Ivy + candle |
| Wide dusk, lights popping in waves | a rule's world-wide effect | the lamp cascade on the four bell strokes |
| Follow-cam on the hero | an action = a rule | Ivy climbs the stairs (≤ 25 px/frame!) |
| **The proof shot**: low, looking UP | a rule's claim shown | 7 m of wall vs the Hollow clawing at its foot |
| Tilt-shift extra-wide, band on the crowd | "thousands" | the tide down the valley |
| Close-up of the hero, ≈ 24 % of the frame | a held breath | Ivy in the crenel, scarf over her mouth |
| Over-the-wall look-down | being watched / listened to | one Hollow stops below, looks up |
| Push-in on the lit window | the twist | hooded silhouette raising a lamp |
| Slow pull-back wide, the hero a tiny red mark | the cliff-hanger is about her | the packed crowd under the lit window |

**Rules measured on this film.** Hero ≥ 1/10 of the frame height whenever she is the subject (a final wide may be tiny on purpose). Keep **60 px margins**
for anything standing (nobody cut by a frame edge: Marta was, twice). **Safe zones**: plates top y 150–382, dialogue box y 1330–≈ 1620, subtitle band y 1384–1630 (two lines);
the action lives between y 400 and 1300. **Focus between the subjects** (hero in the foreground + threat behind: focus ≈ midway, `ap ≤ 70–120`), otherwise the
hero is a blur. **Fast moves strobe** without motion blur: follow-cams ≤ ≈ 25 px per frame (measure it, § 11); cut instead of whipping. **Never copy a
stepped value (stairs) into the camera**; the camera follows a smooth slope and only the sprite's feet step. Cameras must stay outside solids (a roof or
wall fills the frame with one flat colour). Per-shot post overrides are normal: macro candle (bloom ↓, threshold ↑, exposure ↓, halo ↓ for the first 2 s),
near-black shots (exposure 1.3–1.35, `lift` 0.035), the lit-window shot (bloom 0.3, threshold 1.0).

**Per frame, in this order** (`render(t)` in `film.ts`): `hideAll()` → `setCam(cs)` → `resetPost()` → `stage[shot](t)` (`put(char, x, y, z, frame, flip)` for the cast
of THIS shot only; frames chosen on stepped clocks: `step(t, 8) % 4` for a walk) → `SET.update(t, cam, {focus, fogK, …})` → per-shot post overrides → `finish(cs)`.

## 7 · UI: the survival-rule plates (`ui.tsx`, all functions of `t`, DOM over the canvas)

| Component | Use |
|---|---|
| `RuleCard t a b n lines icon y? broken?` | **The rule plate**: gold-bordered ink plate (900×232) with a 20×20 pixel icon (`flame` struck through, `high` tower + arrow, `hush` mouth struck through), `RULE II`, the rule in two lines (52 px). Top of the frame (`y` 150) |
| `DialogueBox t a b voiceA voiceB who role text out?` | one on-screen character, a name plate on the top edge, text **typed over 92 % of her voice**, blinking caret; `top` 1330 |
| `Subtitle t a b text y?` | narration: italic serif 64 px, one voice line at a time, dark band + hard outline, 31-char wrap, bottom (`y` 1450; move to the top, e.g. 330, when the action is at the bottom) |
| `ChapterCard t a b label name` | `CHAPTER I · The Last Light`, ≤ 3 s, right after the hook |
| `TitleCard t a title tag sub? top? shade?` | the end card; `top` 290 + `shade="top"` puts the text in the empty sky and darkens only the top, so the cliff-hanger picture stays visible |

**Timing grammar (the owner liked it):** the plate appears **when the rule is spoken** (`a = vo.s(id) − 0.05`), stays through its proof (`b = vo.e(id) + 0.95`; it fades over its last
0.4 s), and is **closed on a hard cut** (never lingering over the next shot); one plate per rule, never a sticker. The twist **cracks the broken rule's plate** (`broken` 0→1 over 0.7 s
at the key word; the same plate re-appears 0.15 s before). The dialogue box opens 0.25 s before the voice and closes on the cut after it. Narration lines that a plate already says
get no subtitle. New icon = a 20×20 string table in `ICONS` + a case in the type union. Hold ≥ max(1.8 s, speech + 0.6 s). Never put UI over the hero or over the lit window (a title
card once sat on the hero's scarf).

## 8 · Sound — synthesized only (no ElevenLabs, no samples, no CC-BY music, so no credit line)

Everything is **numpy/scipy** (copy `episodes/hollow/synth_sfx.py` and `synth_score.py`; 43 sfx + a chamber score already exist in `public/hollow/sfx|music` — copy the files you
reuse into `public/<slug>/sfx/`). Write mono 48 kHz mp3 192k. We cannot listen, so every sound is a physical model **checked by measurement**:

- **bell** = additive partials (hum / prime / tierce / quint / nominal) with beating decays + a clang transient · **groan** = glottal pulse train with falling pitch, vibrato, two formants and a
  rough 25 Hz amplitude modulation · **crowd** = many soft shuffles + distant groans · **wind** = band-passed noise with slow gusts · **claws / pounds / thud**, **heart**, **boom**
  (sub drop + noise), **creak**, **snuff**, **lamp_on** (a warm pop + hum), **plate / chime** (the UI), **footsteps** per surface.
- **Score** = detuned-saw string pad, cello ostinato, Karplus-Strong plucks, formant choir, taiko, glass tones, sub drone — **cut to the story**: anchors read from `lines.json`
  (the same words `beats.ts` uses). Shape of the night: warm dusk → the bell → **silence on the key word** → rising ostinato → the tide (huge pad) → near-silence + one thin tone while the hero
  holds her breath → a warm WRONG major chord on the twist → tremolo + accelerating taiko → a choir hit and a roll into the boom → a thin unresolved pad on the question.
- **Cue sheet** `sound.ts` (`CUES`, `MUSIC` dB automation, `META`): `c(t, sfx, kind, db, {align, dur, fi, fo, pan, note})`, kinds `amb` beds · `fx` · `ui` · `hit`; times from `B`.
  hollow has 98 cues (71 fx, 19 beds, 6 UI, 2 hits) ≈ 1.0 non-bed cue/s — denser than the other formats' 0.6 because of steps, heartbeats and the lamp waves. A cue on every visible event: lamps popping with the strokes, the plate, the dialogue chime, each step, the heartbeat.
- `scripts/sound_export.sh <slug> <Dir>` → `public/<slug>/sound.json` → `scripts/mix.py <slug> --limit 0.38` (levels each kind by measurement against the voice; the limiter is needed for a sparse,
  hot mix to reach −14 LUFS inside the −1.5 dBTP gate; hollow: −14.16 LUFS, −2.09 dBTP) → `stt_check.py <slug> public/<slug>/mix.wav`. On-screen voices are low-passed at ~7 kHz (cast.json `"fx": "world"`).
- `scipy.signal.butter` with an **array** cutoff builds a band-pass, not a low-pass (brass in the score came out wrong); keep cutoffs scalar.

## 9 · Voice — Fish Ethan

Fish Audio `drama-3-preview`, speed 1.0, narrator **Ethan `536d3a5e000945adb7038665781a4aca`** (the owner's pick for this format). Never "adam adam"; no ElevenLabs call of any kind (credits out). Key in
`~/.config/motion-film-studio/fish.env`, never printed. `cast.json`: `"N": {provider fish, model drama-3-preview, voice <id>, temperature 0.7, top_p 0.7, "tags": "strip"}`.
Ethan runs ≈ 2.65 w/s, drags after every emotion tag and may leave a **≈ 1.2 s dropout** mid-sentence: so **strip the tags** and **sample 8–12 takes** of the whole narrator text
(`.venv/bin/python episodes/<slug>/takes.py 12 --strip`: writes `public/<slug>/vo/raw/narrator_tK.*` and prints film length, pace, the longest gap *inside* a sentence and gaps > 0.6 s). Pick the
take with the fastest pace and **0.00 s in-sentence gap** (hollow: t8, 2.72 w/s, voice 54.6 s for the narrator), copy it to `narrator.wav/.json`, then
`.venv/bin/python scripts/voice.py <slug> --reuse --lead 0.05` and `stt_check.py <slug>`. Word times come from local faster-whisper aligned to the script (never pass Whisper a prompt).
A second on-screen voice (Marta = Laura `e3cd384158934cc9a01029cd7d278634`): audition 2–3 Fish voices on her real line (`episodes/hollow/marta_takes.py`), choose by pace and gaps, `"fx": "world"`.
Record the measured table in `episodes/<slug>/voice-audition.md`. Voice details: [voice.md](voice.md).

## 10 · The Hollow sprites and the horde

`art/hollowfolk.ts` draws the sleepers: hunched, grey-pale, arms too long (hands to the shins, claw fingers), slack jaw with a row of teeth, dark sockets with **pale glowing eyes on the
emissive layer** (so bloom takes them), rags with ribs. Pose = `{ view: "front"|"side"|"back", gait: 0..3, run, claw: 0|1, tw: 0|1|2 (head twitch), tilt, up (head thrown back), reach, hop }`;
`drawHollow(P,E,pose,K)` scales everything by `K` (crowd 1.0 on 30×54, hero 1.3 on 40×70, same pixel density). Every shamble frame has 2-frame **twitch** variants that the horde swaps in
for ≈ 0.1 s at random moments (the "jerky" read the owner asked for); the hero twitches on a script.

`horde.ts`: `makeHorde(atlas, N, seed, { clawN, claw0, clawT, path, u0, u0run, nearU })` → **3,200 instanced billboards** whose positions are **closed-form functions of time** along a Catmull-Rom path
(`PATH`) with a lane, speed and gait phase per sleeper; ≈ 1 in 12 is a runner. The view (front / side / back) is picked per instance from its heading vs the camera. `update(t, cam, opts)` options:
`shift, turn { t0, lampX, wallZ, depth, spreadX, spread, speedK }` (every sleeper waits a short reaction delay, then turns toward the lamp and heads for the wall), `hideBefore, minU, sb (spherical
billboard blend for top-down), wideFar, wideNear, scaleK, timeScale`. 230 "clawers" grow over time at the wall foot (the Rule II proof). The horde is **the tide in wides, faces in close shots** — keep it
a tide; only the hero Hollow gets a close-up.

## 11 · Render, QA, deliver

- **Only** `scripts/stills.sh`, `render.sh`, `qa.py`, `deliver.sh`, `clean.sh` render or transcribe (shared GPU/CPU/whisper locks). `SAMPLES=1 CONC=3 CRF1=18 scripts/render.sh <Id> <slug>` (`--gl=angle-egl`; ≈ 80 s render +
  50 s encode, 109 MB for 76 s). `df -h ~` > 30 GB first; no frame folders; `clean.sh <slug>` at the end.
- **QA loop (all of it; each step found something on hollow):**
  1. `qa.py <slug>` PASS (format, loudness, black/frozen picture, speech) — run it plain.
  2. **watch-video** (`fetch.sh`, `transcribe.sh` under `flock /tmp/story-studio-whisper.lock`, `frames.py --max 72 --max-gap 1.2`, `delegate.sh` with a harsh-critic focus: cut-off/overlapping text, crops, floating sprites,
     glitches, caption collisions, "rank the 10 fixes"). The child's per-frame notes are **lossy** (it called 52 px plates small and flagged a pop as late): treat them as pointers and **verify every claim on a
     contact sheet of the real frames** before changing anything.
  3. **Frame-difference scan** (below) — finds what sampled frames cannot: hops, pops, strobing.
  4. Re-render, re-run 1 and 3, look at a before/after sheet of the fixed frames.

```python
# diffscan.py <master.mp4>: mean |Δ| between consecutive frames (216×384 gray); spikes must be shot cuts or intended flashes
import subprocess, sys, numpy as np
W, H = 216, 384
raw = subprocess.run(["ffmpeg","-loglevel","error","-i",sys.argv[1],"-vf",f"scale={W}:{H},format=gray","-f","rawvideo","-"],capture_output=True).stdout
a = np.frombuffer(raw[:len(raw)//(W*H)*W*H], np.uint8).reshape(-1,H,W).astype(np.float32)
d = np.abs(np.diff(a, axis=0)).mean(axis=(1,2)); base = np.array([np.median(d[max(0,i-6):i+7]) for i in range(len(d))])
for i in sorted(np.argsort(-d/np.maximum(base,.15))[:60]): print(f"t={(i+1)/30:6.2f}s diff={d[i]:6.2f} x{d[i]/max(base[i],.15):5.1f}")
```

  Spikes at your cuts and your flashes are fine. **A spike every 0.2–0.5 s inside one shot is a bug** (hollow: the stairs camera hopped 0.4 m at every riser because it copied Ivy's stepped height). To measure a pan,
  brute-force the best (dx, dy) shift between two consecutive frames of a textured band: aim for ≤ 25 px/frame at 1080 wide (hollow's stairs went from 40 to 22).
- Deliver: `scripts/deliver.sh <slug>` (→ `~/Videos/story-studio/` master + 720p + poster + sheet) → `scripts/clean.sh <slug>` → `episodes/<slug>/brief.md` (delivery record, lore bible, QA record) → commit.

## 12 · Pitfalls we hit (symptom → cause → fix)

| Symptom | Cause | Fix |
|---|---|---|
| Black rectangle behind a sprite's head | `P.rect(x,y,w,h, fn)` was given a function; `rect` takes a colour | gradients via `P.fill`, `P.ellipse(…, fn)`, `P.poly(…, fn)` or a loop |
| A frame that is one flat colour (blue shingles, a wall) | the camera sat on/inside a roof or wall (gatehouse) | cameras ≥ 2 m outside every solid; move x/y; check each camera with a still |
| The hero hidden behind a wall or a prop | geometry on the sight line (listener behind the wall; plaza props) | stage per shot; open a crenel (drop a merlon), move props off the line, raise the camera |
| A sprite vanishes in the dark (arms raised against black pines) | dark sprite on a dark backdrop | keep the action where light falls, add a fill, give the key colour an emissive layer (`glowRed`) |
| A "lights out" cascade leaves lights on (braziers, arrow slits) | those lights were not in the `lamps` registry | register every practical in one array; the cascade iterates it |
| The gate's door looks bent | a half-cylinder used as an arch | extruded `THREE.Shape` arch |
| The lit window looked like a "?" / a pasted glyph, then a black block before it lit | a quad off the facade's window grid, drawn opaque while unlit | put it **in the facade's own window grid** (same cell, 2 panes + mullion), hide it unlit; for a hero window use a framed window, open shutters, a hooded silhouette sprite, calm bloom |
| The hero is a chunky blob / a blur | sprite > 35 % of the frame; or foreground out of focus | close-ups 20–30 %; focus between subjects, `ap ≤ 70–120`, tilt amount ≤ 6 on close-ups |
| The scarf over the mouth read as blood | a big red ellipse over the whole lower face | a narrow band across the mouth with a darker fold, scarf tail continuing from the neck |
| The candle in frame 0 (the poster) was a white blob | bloom + halo + exposure at macro range | per-shot: bloom 0.2, threshold 1.25, exposure 0.86, halo ×0.35 for the first 2 s, ease back as the camera pulls out |
| Near-black shots unreadable on a phone | too little ambient | exposure 1.3–1.35 and `V.lift` 0.035 for that shot; check the sheet at phone size |
| Title text on top of the hero and the lit window | centred title over the final wide | text block in the empty sky (`top` 290), a gradient veil dark only behind the text, text 48 px+ for the CTA |
| A plate or dialogue box lingered over the next shot | `b` set after the cut | close UI 0.0–0.2 s before the cut (fade 0.22–0.4 s) |
| The follow-cam strobes | pan 40+ px/frame without blur | ≤ 25 px/frame; shorter move, wider framing, or cut |
| The camera hops at stair risers (periodic spikes in the diff scan) | camera height copied from the sprite's stepped height | camera on a smooth slope; the sprite's riser eased over 0.1 s (`stairYe` / `stairYc` in `film.ts`) |
| An unlit lamp is a black cube beside the hero | near-black base colour on an emissive prop | unlit props need a mid-tone base colour |
| Marta cut by the frame edge (two shots) | cast placed for another camera | check every shot's cast against 60 px margins |
| Stepped sprites ghost | motion blur | `SAMPLES=1` (plain 30 fps) |
| TypeScript error TS7016 on the vendored three import | untyped JS | `// @ts-ignore` above the import (done in `HD2DCanvas.tsx`) |
| First frame black / timeout in `delayRender` | world build > 180 s or a failing texture painter | one film per canvas (singleton), small textures, look at the console of a still |
| `qa.py` hangs forever | you wrapped it in `flock …whisper.lock` and it takes that lock itself | run it plain; kill the two PIDs by number (`pkill -f` kills your own shell) |
| Ethan leaves a 1.2 s hole | his known dropout | strip tags, sample 8–12 takes, pick 0.00 s in-sentence gap (§ 9) |
| Child threads describe plates as "small" or misread timing | lossy frame notes | verify on contact sheets (§ 11) |

## 13 · Licenses, credit, scope

The engine is adapted from **lemo-opuscar `styles/hd-2d/demo`** (MIT, © 2026 LemoLab) and three.js r170 (MIT, vendored in `src/kit/hd2d/vendor/`): the notices stay in every adapted file and in
`src/kit/hd2d/LICENSE-lemo-hd2d`. Only **engine code** was used: never copy their story, characters, places, shots, music or credit line, never name the reference games in a film. Sprites, sets, textures and
icons are drawn procedurally in this repo (no generated images); fonts OFL; sound synthesized. Put "sources & licenses" in the episode's `brief.md`.

## 14 · Definition of done

- [ ] Hook in 2 s, ≤ 80 s, very easy English, one rule per action, a twist that breaks a rule, a CTA question; no series bar / "PART" label.
- [ ] Every time from `beats.ts`; STT of the mix ≥ 0.97; −14 LUFS, ≤ −1.5 dBTP; `qa.py` PASS.
- [ ] Frame 0 is crisp (it is the poster); hero ≥ 1/10 of the frame in story shots and ≤ 35 % in close-ups; the one saturated colour is the hero's.
- [ ] No text over the hero or the key light; UI closes on cuts; dark shots readable at phone size; no black/flat frames.
- [ ] Frame-QA done (watch-video verified on sheets + the diff scan); fixes re-rendered; before/after sheet looked at.
- [ ] Delivered, cleaned (`df -h ~`), `brief.md` has the delivery record, the lore bible and the sources; committed on the branch (not merged unless told).
