# Motion graphics and sound

## The camera (per shot)
- Every shot moves: `z` [from, to] (push in 1.0→1.08, pull out 1.08→1.02), `o` the origin in % (push toward the action),
  optional drift `x` / `y` in frame fractions. Alternate directions cut to cut; push toward faces at emotional beats, pull back
  for reveals. The engine adds a 3% settle on every cut and a decaying shake on each `hits` time.
- Keep shots 1.0–3.5 s; a longer beat needs a card, an fx that moves, or a second picture (see `density-and-plan.md`).
- A push crops: with origin `o` and zoom `z` the visible span is `[o − o/z, o + (100 − o)/z]` %. Use it to keep a flaw or an
  unfinished edge out of frame, never to hide a bug in the final cut (fix the art, `bug-review.md`).

## fx (drawn over a picture, inside its camera layer, so they push and pan with it; x/y/w are fractions of the frame)
Layer 1 (`Stills.tsx`):
| kind | args | use |
|---|---|---|
| `burst` | at, x, y, s | comic impact star + speed lines (crash, punch, bite) — pair it with a `hits` time |
| `jitter` | poly ("x% y%, …"), hits | re-cuts a region of the picture and shakes it (furniture jolting on each blow) |
| `phone` | x, y, w, rot, title, big, sub, failAt, failTitle, failSub | live text on a drawn phone's blank screen (CALLING 911 → NO ANSWER) |
| `counter` | x, y, label, from, to, unit, at, dur | a ticking number pill (WATER 36 → 31 gal; PEOPLE 0 → 200). Screen-space (the camera never crops it) |
| `label` | x, y, text, at | a hand-written note with an arrow ("the only way down") |
| `zzz` · `flash` · `rain` · `snow` · `embers` · `rays` | see Stills.tsx | sleeping, lightning / explosion flash (any colour), weather, sun rays |
| `waves` | x, y | arcs from a speaker / alarm (prefer `ripple`) |
| `prop` | src, x, y, w, at | an AI prop cut-out popping in and bobbing |
| `board` | x, y, w, h, rows [[city, status]…], flip, at, step, rot | a split-flap board: each row's status flips to `flip` one by one |

Layer 2 (`fx2.tsx`, added for FLIGHT DELAYED Part 1 v2; all draw on / pop / type, nothing appears static):
| kind | args | use |
|---|---|---|
| `circle` | x, y, rx, ry, at, to, col, label, lx, ly | a pen ring that draws itself around a thing + an arrow + a typed hand-written label (offset lx/ly from the ring; the label is clamped inside the frame) |
| `arrow` | x1, y1, x2, y2, at, col, label, bend | a curved arrow that draws itself, label typed at its middle |
| `stamp` | x, y, text, sub, at, rot, col, size | a rubber stamp slammed on (overshoot, speckle, ink spatter): WRONG MONEY, CANCELLED |
| `bubble` | x, y, w, text \| glyphs, rows, at, to, then, thenAt, tx, ty | speech / translation bubble with a tail to (tx,ty): typed text, or invented script (`glyphs`) that swaps to `then` ("???") |
| `glyphs` | x, y, w, h, rows, at, dur, col, rot, ink | invented foreign script writing itself onto a BLANK sign (never a real alphabet) |
| `phoneui` | x, y, w, ar, rot, at, time, rows [[icon, text]] | a phone screen on a drawn phone: signal bars crossing out, "No service", offline rows with red ✕ (icons: warn, globe, pin, coin) |
| `pulse` | x, y, w, bpm, bpmTo \| keys [[t, bpm]…], at, to, label, throb | heartbeat / stress meter: ECG sweep + BPM, beating heart, red frame throb above ~125 BPM. One HUD across the film with a `keys` schedule |
| `clock` | x, y, min, minTo, at, dur, label | a time pill (minutes since midnight: 1082 = 6:02 PM) that ticks |
| `tag` | x, y, text, sub, tx, ty, at | a taped name tag with a leader line and a red dot on the person |
| `loupe` | x, y, r, zoom, lx, ly, at | a magnifier: the picture's own pixels at (x,y) zoomed in a ring at (lx,ly), tied to the spot |
| `crack` | x, y, at, len, seed | a spider-web crack spreading across glass |
| `speed` | dir, o, n, at | speed lines streaking (dir −1 left, +1 right) |
| `drops` | x, y, n | sweat drops sliding down a face |
| `ripple` | x, y, dir, spread, n, r0, r1, at, col | sound / shock rings from a point (spread 360 = full rings, 100 = a directed arc: a scream, a PA speaker, a call) |
| `note` | x, y, w, lines [{text, at, strike, col}], rot | a taped paper note whose lines type themselves and get struck out |
| `bars` | x, y, w, title, items [[label, n]] | a small growing bar chart on a paper pill (THE DEAD · SMARTER: day 1, 2, 3) |
| `led` | x, y, at, col, r | a status light that turns on and pulses (badge reader) |
Screen-space by default (not moved by the camera): `counter`, `clock`, `pulse`, `bars`; override with `"fixed": false|true`.
A **HUD** list in plan.json (`{"fx": {...}, "from": a, "to": b}`) lives across several shots and hides behind full-frame cards
(`"onCards": true` on the fx keeps it). Use it for the heartbeat and any counter that spans a cut.

## cards (full frame; `{"card": {...}, "at": …}`)
| kind | args | look |
|---|---|---|
| `day` | text, sub, clock [from, to?] | "DAY 1" on charcoal, optional ticking time pill (chapter break) |
| `rule` | n, title, text | RULE 1 · Don't fight the flow. (on notebook paper) |
| `ledger` | title, rows [[label, value]], note | SUPPLIES · DAY 5: Water 36 gal … (the note in red) |
| `tally` | title, items [[label, n]], note | bars over time (IN THE HALLWAY 1 · 2 · 4 · 9) |
| `climb` | floors, from, label, them | the tower cutaway: your dot climbs, theirs crawl |
| `prop` | src, bg | one AI prop, big, squash-and-bob, over a blurred picture |
| `flight` | flight, status, time, from, to, skip | a plane flies a dotted arc from HOME to a "?" country and a boarding pass lands (FLIGHT 218 · LANDED · 6:02 PM) |
| `plan` | title, floor, walls, boxes, crowd, paths, marks, texts, skip | a floor plan from above: walls (glass = blue), booths, a CROWD of dots streaming to a point, drawn-on arrows / dashed routes with typed labels, marks (you, ✕, door, exit) that can TRAVEL along a path (`mv`). Rule 1 "cut across the flow" and rule 3 "two ways out" are both this card (`skip` restarts it mid-animation on the second use) |
| `gauge` | from, to, note | people per m²: a square metre filling with top-down people + a gauge needle swinging FREE → TIGHT → PACKED → CRUSH (red frame) |
| `guard` | title, note | the arms-up pictogram: crowds push in from both sides, an air-pocket ring around the chest, a breathing lung, a green tick |
| `passport` | name, stamp, stampSub | an open passport: photo, the name typed in, a rubber stamp (use a TRUE stamp: Leo never reached the booth → NOT STAMPED) |
| `cta` | question, hi, options, comment, partAt, part, title, hook, img, bg, followAt, follow | the end card; see `cta-end-card.md` |
See them all: `episodes/stillslab/plan.json` (layer 1) and `episodes/fx2lab/plan.json` (layer 2): `assets/cards-and-fx-v2.jpg`.
New graphics go into `src/kit/stills/` (`fx2.tsx`, `cards2.tsx`, helpers in `draw.tsx`: `Draw` / `DashDraw` draw-on strokes, `ring`,
`arrowPath`, `Glyphs`, `typed`, `PaperLines`, `Tape`) so every episode can use them. Pure functions of time; sizes in fractions of the short side.

## Sound (plan.json "sound")
- `{"sfx": name, "at": anchor, "db": -8}` one cue per action; `{"amb": name, "from": a, "to": b, "db": -14, "fi", "fo"}` a bed per place;
  `{"sfx": …, "ui": true}` a soft UI tick (never ducked; −10 dB or lower; only on end-card pops and stamps, never on every graphic).
  Levels that worked: hits −2…−4, actions −6…−10, small foley −8…−12, beds −2…−6 (mix.py already puts beds 20 dB under the voice).
- **Library first**: `python3 scripts/find_sfx.py <words>` (~950 sounds; crash, door_bang, phone_buzz, dial, stairs_up, run, swing,
  impact, thud, rustle, breath, groan, night_city, heartbeat, stamp--cobra-effect, counter (split-flap), gasp, crowd_gasp, grab, coat
  (paper), pop). The build fetches them into public/<slug>/sfx/.
- **New sounds**: `scripts/sfx.py <slug> --no-share` reads `episodes/<slug>/sfx.json` and generates on the LOCAL GPU model (Woosh, ~1 s
  per clip, mono, ≤ 5 s; the owner chose it on 2026-10-25). Its weights are non-commercial: fine for the owner's test cuts, ask before a
  monetized release; `--no-share` keeps them out of the shared library. Every entry needs a `"why"` (no library sound fits).
  - Prompts: one concrete physical action, the surface and the room ("a fingertip tapping twice on a hard tile floor, tiny dry taps").
  - **Check every clip** (the local model is hit and miss): `ffmpeg -i x.mp3 -af volumedetect` and a 50 ms RMS envelope. Transients
    (finger taps, shoe scuffs, footsteps, a push bar) often come out 40+ dB down or as an almost silent file (a corrupt clip once).
    Regenerate with another `"seed"` (4 seeds per prompt, keep the one with the best peak minus median) and pass `--force name`.
  - Beds: 5-s loops (`loop: true`); the mixer crossfades them. A bed per place, quiet.
- Owner rules: no "dum" hits or stingers, nothing loud in the hook, no beeps / whooshes on every graphic. Real foley only, at the moment
  of the action (a rubber stamp thump on a stamp graphic is foley; a "ding" on a counter is not). Music is optional and soft.
- Sync a sound to a graphic's rhythm in code: the heartbeat cues are computed from the SAME BPM schedule as the HUD's ECG
  (`beat_times()` in `episodes/flight1v2/plan.py` mirrors `bpmAt()` in fx2.tsx), so every thump lands on a peak of the drawn trace.
- `scripts/mix.py <slug>` (run by the build) ducks beds under the voice and masters to −14 LUFS; `--table` prints every cue's gain.
