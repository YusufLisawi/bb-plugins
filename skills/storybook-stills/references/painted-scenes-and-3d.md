# Painted 2.5-D scenes, 3-D maps and rule-card pictograms (NOBODY CAME, 2026-10-31)

The owner's verdict on the first NOBODY CAME cut: story, pacing, rules and stills were strong, but the scenes drawn ENTIRELY in code (the jet, the sea, the island) "look like clip-art next to the
painted pictures, and they open the film". The fix that worked: **Codex paints the layers, code only moves them.**

## 1. The painted-layer pipeline
1. **Layer briefs** (`assets/layers-header.md` + a list per thread: skies, seas, cloud banks, the aircraft side / 3-4 / rear, the island planes, foam, debris): every image is ONE depth plane painted in the
   storybook look on flat **#FF00FF** (opaque layers marked OPAQUE), wider and deeper than visible (the program shifts layers by up to 60 px), tileable ones wrap row for row, NEUTRAL light for anything the program
   re-lights. Same review rule as every art brief (items 9a-c) + a KEYING check (flat magenta, no magenta inside). 3 threads (skies/sea/clouds, aircraft, island) finish in ~20 min.
2. **Key them**: `assets/layer_key.py` (→ `scripts/layer_key.py`): magenta → alpha with edge decontamination, writes `public/nc-layers/<name>.png|jpg` + `meta.json` (bbox, and for the jet the regular row of cabin windows
   whose centre is really dark: a window hidden by the wing is not lit). `plate_*` and `sky_/sea_/isl_deep` layers are opaque JPGs.
3. **Compose in code** (`src/kit/island25d/painted.ts`, `pscenes.ts`, `pbeach.ts`): art coordinates 1536 × 1024, `place()` sets the transform of one layer (parallax factor 0 = sky … 1 = foreground, dolly camera
   `{x, y, z}`, every layer drawn 8 % large), `layer()` / `drift()` (tileable cloud banks) / `slices()` (row slices with a horizontal offset per row: water swell and shimmer, **palm sway bent from the foot**) /
   `seaWide()` (mirrored side tiles) / `mound()` (a distant island faded at both ends so it is a mound, not a rectangle) / `jet()` (the painted jet, windows lit by code, flickering out nose → tail, nav lights,
   engine glow, clipped at the water line).
4. **Light**: layers are neutral; `LOOKS` (night, predawn, dawn, day, golden, sunset, dusk, storm, moon, cloudnight) multiply + lift + haze them into **cached tinted copies**, and a transition cross-fades two looks
   (never per-frame pixel work). Skies are separate paintings cross-faded by time of day.
5. **Particles over the paint** (`sea.ts`, `land.ts`, `sky.ts`): spray banks (behind AND in front of the subject), foam, ripples, flames, smoke, embers, rain, lightning (also lifts the cloud layers and the storm cell
   from inside with an additive pass), bubbles + oil sheen where the tail sinks. Keep the front spray ≤ 0.15 alpha or the subject blows out.
6. **Plates as scenes**: an approved place plate (opaque picture) + row-slice water + mist + a ripple ring + one drawn element is a whole scene (`plagoon`: the lagoon at dusk, two eyes opening on the surface).
7. Scene layers load asynchronously: `Scene25D` calls `delayRender` until `loadLayers()` finishes. **A render / peek bundle must contain `public/nc-layers`** (`scripts/peek.sh` copies it; `PUBLIC_ONLY="nc2 nc-layers"`).

Lessons: noise-lit sprite clouds beat blob clouds but painted layers beat both; a shot's camera anchors must start at the shot's own start (`"at": "cabin.on-0.1"`, not 0: a camera keyed to film second 0 was 70 % through
its move when the shot began); stills at ≥ 800 px show 90 % of the problems, one peek of 8 frames (35 s) per iteration.

## 2. The 3-D maps (`src/kit/three/ncmaps.tsx`, three.js via @remotion/three)
- **FlightMap3D**: real Natural Earth 1:10m land (`scripts/nc_coast.py` → `coast.json`, simplified with shapely, public domain) painted onto ONE canvas texture (deep-blue depth gradient, blurred land copies for the shelf glow,
  sand-rimmed green land, graticule, speckle, edge vignette). Labels are HTML on the spoken word (`labels[].at/end`), the planned route is dashes, the flown line DRAWS ITSELF (tube grown from the event times), a storm is
  70 soft sprites in a swirl with an additive flash sprite, the transponder is an icon + rings that blink out, Part 2 mode shows the search area vs the real crash island. Camera `shots` eased between key poses.
- **Island3D**: terrain height field + a per-pixel painted texture (depth colours, hill-shading baked from the north-west, speckle), a deep sea plane with ripple lines, clustered two-tone trees, mangroves, markers;
  the camera flies between named places (`PLACES`: overview, beach, tail, camp, lagoon, spring, hill, north) on anchors, labels typed on the narrator's words. Capture mode needs `gl={CAPTURE_GL}`, `<FinishFrame/>`, `<Warmup/>`
  (`src/kit/three/capture.tsx`, copied from the render-farm skill kit); build textures / geometry in `useMemo`.

## 3. Rule cards with pictograms (`src/kit/stills/rulepics.tsx`)
The rule text is ~1.6x bigger than the first FLIGHT DELAYED cards and each card carries a small animated, inked pictogram (`"pic": "brace" | "vest" | "rip" | "fuel" | "triage" | "shade" | "fire" | "sea" | "rain" | "birds" |
"boil" | "cover" | "croc"`): a pure function of the seconds since the card began (a red X lands inside the plane, a pot boils with a clock sweeping one minute, the tarp slides over the stack). Keep titles short (≤ 6 words).

## 4. Process lessons of the NOBODY CAME build
- A story change mid-build (the owner's rewrite: 737 / 138 aboard / 52 on the beach, a crowd, gradual introductions; then "the tail is GONE after it slides off the reef") is applied by EDIT requests to the threads that drew
  the affected pictures and plates (originals → `art/<slug>/old/<name>-v2tail.png`); re-brief the cast gate BEFORE spawning anything if the bible changed under you.
- Dialogue: `voice.py` already supports cast lines (Fish voices per speaker in `cast.json`, `fx: radio` for a PA); the `say` fx shows a character's line as a bubble, words on the voice line; the `caption` fx shows big
  hook / question words across the narrator's phrase. Theo (Fish) reads 2.19 w/s at speed 1.0: set `speed: 1.14`. Cut one line from an approved take with `scripts/drop_line.py`.
- Independent audits (`assets/nc-audit-brief.md`, `mkaudit.py`): put the deliberate states (blanket mounds, tail still present before sunset, who must NEVER appear alive) in the brief; false alarms were reflections of an orange life vest read as fire.
- Sound: `mix.py` normalises each sound, so plan dB values are relative (beds -4/-6, hits -1…-3, foley -2…-8); ElevenLabs sound effects (`"engine": "elevenlabs"`) made every new bed and foley in one 25-sound run (~3 min).
