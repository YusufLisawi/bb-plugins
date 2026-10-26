# Motion graphics and sound

## The camera (per shot)
- Every shot moves: `z` [from, to] (push in 1.0→1.08, pull out 1.08→1.02), `o` the origin in % (push toward the action),
  optional drift `x` / `y` in frame fractions. Alternate directions cut to cut; push toward faces at emotional beats, pull back
  for reveals. The engine adds a 3% settle on every cut and a decaying shake on each `hits` time.
- Keep shots 1.0–3.5 s; a longer beat needs a card, an fx that moves, or a second picture (see `density-and-plan.md`).
- A push crops: with origin `o` and zoom `z` the visible span is `[o − o/z, o + (100 − o)/z]` %. Use it to keep a flaw or an
  unfinished edge out of frame, never to hide a bug in the final cut (fix the art, `bug-review.md`).

## Text reveal: word by word, never letter by letter
Every text that appears over time reveals one whole word at a time, the same way everywhere: a `rule` title, `note` lines, `tag` subs, `bubble` and `signtext`, the `flight` / `ago` / `plan` labels, the `cta` question and caption, a `passport` name. The engine is `wordCut(text, k)` in `src/kit/stills/fit.ts` (used by `typedLines`, by `typed` in `draw.tsx`, by the sign and bubble text in `fx2.tsx` and by the CTA question in `cards2.tsx`): a word is shown in full as soon as its first letter would have been typed. Since FLIGHT DELAYED v3c2 there is no typewriter: no letter-by-letter motion and no blinking caret.
- The `cps` / window argument only sets the pace. At 14 characters a second a five-word title lands one word every ~0.25–0.4 s.
- Spoken text takes the narrator's own words as its window (`titleAt: "rule1a.Don't"`, `titleTo: "rule1a.end"`), so each word lands on or just before the word it is. Check it on a frame during the reveal: the words already said are there, the next one is not yet.
- A single word (a name, a city, a Korean sign row without spaces) appears whole on its word. Never split a word across two frames.

## Holds and readability (cards and highlights)
- A card is read while the narrator reads it. It stays on screen for its own words (about words ÷ 2.8 s) plus ~0.3 s, and the next picture is cut on a later word of the next line. Never add silence for a card (see `density-and-plan.md`, "No dead air"). `sync_audit.py` prints a stricter `need` of words ÷ 2.8 + 1 s: say in the notes which bar a film was checked against.
- A highlight (`circle`, `tag`, `loupe`, `path`, `led`) draws on in ~0.7 s and holds ≥ 2 s. When the narration is tight, give that line a hold rather than shortening the highlight.

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
| `board` | x, y, w, h, rows [[city, status]…], flip, at, step, rot, ats [t…], tickAt, tickStep | a split-flap board: each row's status flips to `flip` one by one (`step`), or each row at its own time (`ats`: the narrator's "Cancelled." ×3, two rows per word); from `tickAt` the rows clack one after another until they flip ("flips, line by line") |

Layer 2 (`fx2.tsx`, added for FLIGHT DELAYED Part 1 v2; all draw on / pop / type, nothing appears static):
| kind | args | use |
|---|---|---|
| `circle` | x, y, rx, ry, at, dur=0.7, hold=2.2, labelAt, col, label, lx, ly | a TEACHING highlight: a pen ring draws on in 0.7 s, its arrow + typed hand-written label follow (`labelAt` = the word), it stays 2.2 s and fades; the label is fitted and clamped inside the visible frame. Use rarely (`pacing-and-sync.md`) |
| `arrow` | x1, y1, x2, y2, at, dur=0.8, hold=2.2, col, label, bend | a curved arrow that draws itself (0.8 s), holds, fades; label typed at its middle |
| `stamp` | x, y, text, sub, at, rot, col, size, maxW | a rubber stamp slammed on (overshoot, speckle, ink spatter): WRONG MONEY, ZOMBIE OUTBREAK; text + sub fitted (2 lines max), box from the measured text, clamped inside the frame |
| `bubble` | x, y, w, text \| glyphs, ko, sub, subAt, rows, at, to, then, thenAt, tx, ty, cps | speech bubble with a tail to (tx,ty): typed text (`ko: true` = Korean font), a translation line `sub` (typed at `subAt`), invented script (`glyphs`), or a swap to `then` ("???"); sized from the largest content it will hold, never grows while typing |
| `glyphs` | x, y, w, h, rows, at, dur, col, rot, ink | invented foreign script writing itself onto a BLANK sign (never a real alphabet) |
| `phoneui` | x, y, w, ar, rot, at, time, rows [[icon, text]] | a phone screen on a drawn phone: signal bars crossing out, "No service", offline rows with red ✕ (icons: warn, globe, pin, coin) |
| `pulse` | x, y, w, bpm, bpmTo \| keys [[t, bpm]…], at, to, label, throb | heartbeat / BPM meter (ECG + beating heart + red frame throb). **Not used in the film since round 2** (the owner: unnecessary); a subtle heartbeat SOUND is the replacement |
| `pips` | items [{x, y, n, at}], to, col | numbered ink dots dropping onto things one after another (counting "ten people ahead", three per word); the last one is red (the man) |
| `signtext` | x, y, w, h, text, ko, at, cps, col, align | REAL text typed into a blank sign / panel of the picture (Korean airport signs: 출구 입국심사 수하물 계단), fitted to the rectangle |
| `clock` | x, y, min, minTo, at, dur, label | a time pill (minutes since midnight: 1082 = 6:02 PM) that ticks |
| `tag` | x, y, text, sub, subAt, sub2, sub2At, tx, ty, at, maxW | a taped name tag with a leader line and a red dot on the person; `sub` types at `subAt`, `sub2` is appended at `sub2At` (LEO · 27 · CHICAGO word by word); text wraps / shrinks in the tag, tag clamped inside the frame |
| `loupe` | x, y, r, zoom, lx, ly, at | a magnifier: the picture's own pixels at (x,y) zoomed in a ring at (lx,ly), tied to the spot |
| `crack` | x, y, at, len, seed | a spider-web crack spreading across glass |
| `speed` | dir, o, n, at | speed lines streaking (dir −1 left, +1 right) |
| `drops` | x, y, n | sweat drops sliding down a face |
| `ripple` | x, y, dir, spread, n, r0, r1, at, col | sound / shock rings from a point (spread 360 = full rings, 100 = a directed arc: a scream, a PA speaker, a call) |
| `note` | x, y, w, lines [{text, at, strike, col}], rot | a taped paper note whose lines type themselves and get struck out |
| `bars` | x, y, w, title, items [[label, n]] | a small growing bar chart on a paper pill (THE DEAD · SMARTER: day 1, 2, 3) |
| `led` | x, y, at, col, r | a status light that turns on and pulses (badge reader) |

Layer 2, added for FLIGHT DELAYED Part 2 (`fx2.tsx`):
| kind | args | use |
|---|---|---|
| `phoneapp` | app `dial` / `download` / `map` / `translate`, x, y, w, ar, rot, at, … | an app on a drawn phone's BLANK screen (measure the screen with `scripts/find_screen.py`). `dial`: `digits` typed at `cps`, then `callAt` → a calling screen. `download`: `rows [{label, at, to}]` bars fill between the narrator's words, the Wi-Fi icon dies at `dieAt` (with `rows: []` a big Wi-Fi icon + `label` typed at `labelAt`). `map`: a street map + terminal, a dot and a route that draws at `routeAt`, `label` at `labelAt`. `translate`: a camera view of Korean `ko` + the English `en` typed at `enAt`, `label` at `labelAt`. Several shots can carry the SAME download fx (progress is a function of time): the phone just has to sit at the same place |
| `cctv` | at, to, tint, time, timeAt | a security-camera look over the WHOLE picture, screen-space: grayscale + green (blend modes), scanlines, noise, a rolling band, corner brackets, a pulsing red dot, an optional typed time. Draw the picture clean from a high corner (normal colours); the code makes it footage |
| `kicker` | text, at, to, x, y | a small screen-space pill whose words type: PREVIOUSLY (the recap's first three pictures) |
| `pips` | + `r` | the dot radius (fraction of the short side; 0.016 for nine small bottles in a row) |
Cards added: `stages` (title, titleAt, n, stiff, stiffAt, label, labelAt, offAt: a week of boxes, the first ones fill with stiff figures "RIGOR MORTIS / TWO DAYS", then they wear off and the rest ask "?"); `ledger` rows may carry `ats` (one anchor per row) and `noteAt`; CTA option icons `door` (barricade), `up` (climb) and `plane` (hide under a plane) next to `stairs` / `run`. `deadline` (n, nAt, label, labelAt, tickAt: a big red number with its word typed under it and day boxes that cross off one by one: the season's clock, "FOUR DAYS" only when the narrator says it); `phoneapp` also has app `chat` (msgs [{text, at, side: them|me}]: bubbles that type on their words); `steps` (items [{label, at, icon: pull|aim|squeeze|sweep}], title, titleAt): the fire-extinguisher sign, four paper panels with code pictograms that pop and type their word on the narrator's words (Part 3, "Pull the pin. Aim at his face. Squeeze. Sweep."); the card holds until the narrator has finished AND ~1.5 s longer (give the last word air).

Screen-space by default (not moved by the camera): `counter`, `clock`, `pulse`, `bars`, `cctv`, `kicker`; override with `"fixed": false|true`.
A **HUD** list in plan.json (`{"fx": {...}, "from": a, "to": b}`) lives across several shots and hides behind full-frame cards
(`"onCards": true` on the fx keeps it). Use it for a counter that spans a cut (NOISE 94 → 31 dB); **not for a heartbeat meter** (removed in round 2).

## cards (full frame; `{"card": {...}, "at": …}`)
| kind | args | look |
|---|---|---|
| `day` | text, sub, subAt, clock [from, to?], clockAt | "DAY 1" on charcoal, optional ticking time pill (chapter break); title fitted to one line. Not used in v3 (unspoken) |
| `rule` | n, title, text?, textFirst, nAt, titleAt, titleTo, textAt, textTo | RULE 1 · Don't fight the flow. on notebook paper: the number pops on "Rule", the title REVEALS word by word from `titleAt` to `titleTo` (the first and last word of the phrase), optional small text above (`textFirst`) or below it; title ≤ 2 lines, text ≤ 3, all fitted |
| `ledger` | title, rows [[label, value]], note | SUPPLIES · DAY 5: Water 36 gal … (the note in red) |
| `tally` | title, items [[label, n]], note | bars over time (IN THE HALLWAY 1 · 2 · 4 · 9) |
| `climb` | floors, from, label, them | the tower cutaway: your dot climbs, theirs crawl |
| `prop` | src, bg | one AI prop, big, squash-and-bob, over a blurred picture |
| `flight` | fromLabel, toLabel, sub, fromAt, flyAt, toAt, subAt | two pins on paper and a plane on a dotted arc: CHICAGO → SEOUL · SOUTH KOREA, each label typed on its word, the plane lands exactly on `toAt` (the destination word) |
| `ago` | text, sub, minutes, spinAt, typeAt, subAt | the rewind: a clock whose hands spin BACKWARD with the words typed under it (20 MINUTES AGO / SEOUL, SOUTH KOREA); layout from the content, never below the frame |
| `plan` | title, floor, walls, boxes, crowd, paths, marks, texts, skip | a floor plan from above: walls (glass = blue), booths, a CROWD of dots streaming to a point, drawn-on arrows / dashed routes with typed labels, marks (you, ✕, door, exit) that can TRAVEL along a path (`mv`). Rule 1 "cut across the flow" and rule 3 "two ways out" are both this card (`skip` restarts it mid-animation on the second use) |
| `gauge` | from, to, sweep, bare, zones, zoneAt, title, note | people per m²: a square metre filling with top-down people + a needle swinging FREE → TIGHT → PACKED → CRUSH (red frame). `bare: true` = only the zone words you list (`zones: ["CRUSH"]` typed at `zoneAt`) |
| `guard` | bare, armsLabel, armsAt, breatheLabel, breatheAt, title, note | the arms-up pictogram: crowds push in from both sides, an air-pocket ring, a breathing lung, a green tick. `bare: true` = only ARMS UP / BREATHE typed on their words |
| `passport` | name, nameAt, bare, stamp, stampSub | an open passport: photo, the name typed on its word; `bare: true` = no field labels, no stamp; a stamp only when TRUE (Leo never reached the booth → NOT STAMPED) |
| `cta` | question, hi, questionAt, questionTo, options, comment, partAt, part, title, titleAt, partSub, partSubAt, hook?, img, bg, followAt, follow | the end card; see `cta-end-card.md` (v3: the question reveals word by word from "Would" to "exit?", the options pop on "hidden" / "run", the polaroid caption reveals the narrator's "in a country that isn't yours") |

**Every card drifts slowly while it holds** (engine `cardDrift`: ≈ 16 px/s up, 3 % ease, centred on the middle of the hold; the CTA / climb / prop opt out): without it a rule card waiting for the narrator is a frozen frame (qa.py freeze ≥ 1.5 s) and feels dead.
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
- A subtle heartbeat under one tense beat is fine: `{"sfx": "heartbeat", "at": "bite.bites+0.2", "db": -16}` every 0.9 s for 5 beats (v3: under the bite and under the man getting up). No meter, no
  sound computed from a drawn trace any more.
- `scripts/mix.py <slug>` (run by the build) ducks beds under the voice and masters to −14 LUFS; `--table` prints every cue's gain.
