# The image version (AI stills + motion graphics)

A second cut of an episode built from the **same** script, voice, `shots.tsv`, beats, captions and `mix.wav`. Each shot is a
Codex-generated still moved with motion graphics, in the style of the looma.works reference (instagram.com/p/DeiZwzaoVOH).
Example: `src/episodes/burn3img/TheBurn3Img.tsx` (THE BURN Part 3, 2026-10-23).

## Owner rules (each one came from a rejected first try)
- **Flat 2D only, exactly like our covers** (`art/covers/raw/*-tall.png`) and our What If shorts: round heads, small dot eyes, simple
  shapes, flat colour with soft gradient light. Never 3D or Pixar-like, glossy, realistic anatomy or photographic depth of field.
- **One design per character, in every image.** Mixed detail (one character detailed, the next a stickman) was rejected.
- **Photos and screens must make sense:** when a character looks at a photo or phone, we see its **back**. Its picture is shown
  only in a separate close-up of his hands. A wall screen is seen **over the shoulder**, never with him facing us.
- **The recap polaroids hold generated images too** (the last part's key moments in the same 2D style), still moving a little.

## Pipeline
1. **References:** render frames of each character from the animated episodes (`SCALE=0.5 scripts/stills.sh …` →
   `art/<ep>/ref/`), plus the cover-style sheet.
2. **Brief one Codex art thread** (directed-asset-generation): the style rules above, the world's continuity (who is where, hood
   up or down), crop rules (9:16 from 1024×1536; nothing key in the outer 8%; no faces at 62–74% height where the captions sit),
   no text anywhere, and one line per shot from `shots.tsv`. Split a shot into sub-images when a photo or screen needs back + insert.
3. **Gate:** the character sheet + 3 test shots, then STOP. Check that they're 2D and consistent before the full set. After it
   finishes, review a contact sheet for continuity and send back only the failing shots.
4. `scripts/frames_fit.py <ep> art/<ep>/raw2` → `public/<ep>img/*.jpg` (1280×1920, with pan room) + `manifest.json`.
5. The component: `Still` (push/pan per shot, a soft blur cut-in, shake on hits), `LightLeak` / `Dust`, `CamOverlay` (doorbell or
   CCTV), `StatusBar` (the reference's game HUD: the clock, the door's state, where Mom is), `InfoCard` / `Pointer` / `Circle` /
   `Taps` annotations, a dark rule card (captions hidden for it), and a comment-bait end card. Shots without an image fall
   back to the animated shot.
6. Copy `public/<ep>/mix.wav` to `public/<ep>img/` (render.sh muxes from its slug), then `render.sh`, `qa.py`, deliver, cover.

## What gets an AI still vs. code motion graphics (owner, 2026-10-23)
- **AI stills (Codex, 2D like the covers):** anything with **characters or real places**: faces, rooms, streets, the bridge.
- **Code motion graphics (Remotion, animated):** everything **without characters** that explains, shows or measures, like
  Part 1's globe, map and bridge diagrams. That covers:
  - maps and routes (HOME → BRIDGE → HOSPITAL with a moving dot), the day-line globe
  - "how it works" diagrams: how the burn spreads (lines climbing an arm outline toward the heart), why glass doesn't help
  - rule cards, the Burned types card (silhouettes), the sunset marks on the wall, the radio dial and waveform, the camera-helmet POV UI
  - big animated numbers (a counter that ticks), checklists of supplies being ticked off
  These are drawn, so they can't go wrong the way an AI image can, and they move.
- **A typical rhythm:** a character still (the moment) → a code graphic (the fact or rule) → a still (the reaction). Never 3 stills of talk in a row.
- **Sound makes a still feel alive:** an effect on every move, hit, look and graphic. Footsteps under a walk push, cloth on a turn, a
  whoosh on every card, a ticking clock under countdowns, room tone and a bed in every place, a riser into each reveal and silence
  before the twist. Aim for at least 1.5 cues a second (denser than the animated cut).
- **The HUD:** **countdowns, not progress bars** (UNTIL SUNRISE 5:42, ticking), placed **about 20 % from the top** (y ≈ 380 of 1920),
  clear of the iPhone notch and the TikTok/Instagram top UI.
- **Characters speak:** the narrator carries the story, but key lines get short in-voice quotes inside the narration, and the
  still on screen is the person saying it (a close-up, mouth open, the right expression).

## Owner notes from THE BURN Part 4 (2026-10-24)
- **Pace:** 2.8–3.0 words a second while speaking (Alex, drama-3, tags kept, speed ≈ 1.07). Faster felt rushed.
- **Clocks are logical:** a countdown ticks in real time and fast-forwards (▶▶ "HOURS LATER") only where the narration says time passes.
- **Monsters are people:** the Burned are normal-sized burned people, vicious, never big ogres.
- **Hits:** at most about 3 "dum" hits per part. Everything else is real foley and room tone.
- **The cold open is code:** the first scene is drawn and animated in code, after the AI still (e.g. `ColdOpen` in `src/episodes/burn4/TheBurn4.tsx`).
- **The CTA:** a theory question about the part's mystery, plus what the next part will reveal ("Part 5 shows what happens to Mom").

## Building a whole season at once (THE LONG NIGHT, GREEN RAIN, DEAD QUIET S1, 2026-10-24)
- **Narration (owner):** Horror Rules (`1625a0fcc6eb4b2695275ab638fc34a0`), drama-3, tags kept, speed **1.1** = ~3.0 words a second
  while speaking. Write **calm, connected sentences** ("so", "but", "because"), not fragments; split long sentences across lines
  only to cut shots (the take is one continuous read, so the split doesn't change the voice).
- **One file per series** (`episodes/_series/<series>/s1.py`): every part's lines with one shot each (`I:` still or `G:` graphic),
  written by `scripts/s1_write.py` into script.tsv, cast.json, shots.json and an art brief. Line ids must be unique and must
  never reuse `open`, `r1`–`r3` or `ask` (a story line called "open" became a second cold open).
- **The engine** (`src/episodes/_s1/engine.tsx`) takes `slug`, `spec.pill`, `spec.kw` (caption colours), weather cold opens
  (`closeup:<look>:snow|rain`, `street:snow|rain`, `door`), a stat pill (`clock.steps`: OUTSIDE −38°C, DAYS OF WATER 2.5,
  LILY'S BODY 34°C), a countdown with `off`, and shared graphics in `gfx.tsx` / `gfx2.tsx`: iso maps of each world, steps,
  bars, thermometer, timer, light/noise radius, layers, CO, rocket stove, ice, the dark sun, distilling, water filter, hand
  signals, humming, flood level, tide. Check new graphics in the `S1Lab` composition before using them.
- **Art at scale:** a cast sheet + 3-shot pilot per series first (approve it), then threads of 2–3 parts each with the sheet and
  pilot as references. **At most 5 Codex threads at once**: each holds 0.5–0.8 GB, and with 13 the machine ran out of RAM and
  earlyoom killed both the Codex servers and a render's ffmpeg. Spawn with `--environment <project checkout>` or they stop after
  switching folders. Finish briefs list only the missing stills (`scripts/s1_finish.py`). Review every part as a labelled
  contact sheet (`scripts/s1_sheet.py`) and approve it (`art/<ep>/raw/.approved`).
- **The queue** (`scripts/s1_run.py`): prep (frames, wrapper, Root, sound design `s1_sound2.py`, mix) → render → QA → deliver
  → cover → R2, one part at a time, only approved parts. Image versions render at **30 fps without motion blur**
  (SAMPLES=1, CRF 18): they're slow pans and pops, and the 4-sample blur cost 2.5× the time. Never edit `render.sh` while it runs
  (bash reads scripts as it goes); the bundle copies all of `public/` (~5 GB), so never overlap two renders on a tight disk.

## Long-form films from a season (16:9, YouTube)
- `scripts/film_build.py <film>` assembles the film from the parts' **own takes and mixes** (cut on the story lines: no recap,
  no PART slam, no question), plus the film's own narration (title, Chapter 1 retold or "the story so far", the outro), chapter
  cards and YouTube chapter timestamps. Same voice, same sound, no plot drift.
- `src/episodes/_film/film.tsx` lays every shot out again in 16:9: a slow full-bleed pan, a framed card over its own blurred
  backdrop, a three-panel strip; graphics in a lit panel; iso maps full frame; older parts (not on the engine) as their original
  film in a frame. Every layout keeps moving (a held still for 5 s reads as a freeze).
- **three.js, a few times per film** (`src/kit/three/scenes.tsx`): Globe (night with the lit Moon / the burning day line / green
  clouds), Terrain (the herd pulled by a siren), SunRing (the ring of shapes, or the dark ring), Sea (the glowing sea).
- Wide Codex art (1536×1024, cropped to 16:9 by `scripts/film_fit.py`): one per chapter card + the scenes the new narration
  needs. Render films at 30 fps (`tools/film_ship.sh`).
