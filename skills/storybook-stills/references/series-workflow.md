# Building a multi-part series in this style (FLIGHT DELAYED Parts 2-6 workflow, 2026-10-25/26)

The recipe that produced Part 2 (`episodes/flight2`, 66 pictures, 8 cards, 2:58.9) in one working session. Parts differ only in story and places.

## One part, in order
1. **Story** from the bible (`episodes/_series/<series>/season-N.md`): per part the beats, the real rules, the twist inside, the cliffhanger, the plants for later parts.
2. **Script** (`episodes/<slug>/make_script.py`, id / N / text / air). Budget: **~410 words + ≤ 9 s of air = 2:58 with a 4 s tail** (Fish Alex runs 2.56 w/s while speaking). A 516-word draft ran 3:19: cut before voicing.
3. **Voice**: `voice.py <slug>` (one continuous take) → `scripts/trim_take.py <slug>` (every inter-line pause → a 0.25 s breath; keeps `narrator-untrimmed.*`) → `voice.py <slug> --reuse`. Changing only the air column later = `make_script.py` + `voice.py --reuse` (no new TTS), but **every anchor time moves**: re-run `plan.py` + `stills_build.py`, and never reuse peek times from before the re-cut (read them from `public/<slug>/stills.json`).
4. **Gate** before the scenes: a cast thread (sheets of any new character / new look: front, back, in-action; the dead in a new stage) and a places thread (every new place, no people). Review the sheets, then write the scene briefs. Gates of the NEXT part can run while the owner reviews the current one.
5. **Briefs**: `assets/series-brief-header.md` (style, whole cast, places, the bug checklist; `{PART}`/`{TITLE}`) + `episodes/<slug>/brief/part.md` (reference paths, new cast, new places) + one picture list per thread (`a.md` … `e.md`), assembled by `assets/mkbrief.py <N> <letter>` into `/tmp/briefs/`. Picture lines: place + state, who does what, where they look, what they carry, camera, refs. ≤ 5 Codex threads (the audit threads count), 12-14 pictures each, ~25-30 min. Numbers in STORY ORDER; extra inserts get a letter (`24b_`).
6. **Plan** (`plan.py`: a tiny `Plan` class with S / C / snd; a comment per narration line; see `assets/plan-example-p2.py`) and `stills_build.py <slug> --placeholders` while the art draws; the recap ("previously") pictures are SYMLINKS into `art/<slug>/raw/` pointing at the last part's art.
7. **fx coordinates from the real pictures**: `scripts/find_screen.py <png>` (a phone / monitor screen: x, y, w, ar, rot for `phoneapp` / `phoneui`), `scripts/frame_grid.py <slug> <names…>` (the cropped frame with a 10 % grid: read every tag / pip / ring / stamp position), then `scripts/peek.sh` on the real composition (30 s per batch).
8. **Audit**: you at 1000+ px (a 4-up sheet at 800 px is enough for crowds and objects; 2-up at 1100 px for people who touch) AND an independent read-only Codex thread (`--reasoning-level high`, `assets/audit-brief.md`, one thread per ~25 pictures, ~15 min). Zoom (PIL crop ×3-4) on every FAIL / UNSURE before acting: in Part 2 the audit said 6 FAIL + 6 UNSURE of 39, but only two were real (a third sleeve on the fridge crouch, a doubled sleeve under one mitten); four FAILs were "the backpack is not on Leo's back" in pictures where it is off BY DESIGN, so **write the exceptions into the audit brief** (asleep, handing it over, flashback) next time. Real defects go back to the SAME art thread as an EDIT ("change ONLY the box x0,y0,x1,y1; copy the old file to art/<slug>/old/<name>-v1.png first").
9. Build (`stills_build.py`), `check_fx.py`, `sync_audit.py`, `tsc`, the dev player, then tell the owner.

## Series continuity worth writing down (the bible's notes + what the pictures need)
- A prop that becomes a plot device later is drawn from its first appearance (the dead officer's ID lanyard in Part 2 pays off as the cliffhanger).
- A rule taught in one part is the setup of the next (rigor mortis "locks a body for two days. Then it wears off." → Part 3's running dead): the card (`stages`) says it, the CTA teaser repeats it ("It doesn't last").
- Time: the first night is Day 1 → 2; a whole day on the roof is one narrated sentence; the fast dead appear at dawn of Day 3.

## Re-voicing one line (no re-roll of the rest)
`python3 episodes/<slug>/make_script.py` (the new text) → `.venv/bin/python scripts/splice_line.py <slug> <line id>` (speaks only that line, cuts the old one out at the middle of its pauses, 30 ms crossfades, levels it) → `scripts/trim_take.py <slug>` → `scripts/voice.py <slug> --reuse`. Longer line = longer film: win the seconds back from the `air` column, never from the cards.

## Owner review of Part 2 (what he caught that the audits did not)
A dead woman in a plum coat (reads as Grace's red coat), a sunset behind a night line, a plot hole (a phone number nobody calls), a stiff dead woman drawn climbing like an athlete. Check colour clues, time of day, loose plot threads and the pose of the dead before the audit, not after.

## Part 3 notes
- Four audit threads of ~12 pictures each (≤ 5 Codex threads in all, art + audit) finished in ~15 min and found: rose / mauve clothing on dead crowd extras (the colour rule needs an explicit line in every audit brief and a hue-mask scan), a missing lanyard, floating mittens in a group photo, letter-like loops on a zipper, writing-like blocks on a tiny bumper plate. Zoom on every flag; fix only the real ones by EDIT to the same art thread.
- Queue the next part's scene threads with a small watcher script that spawns a thread whenever fewer than 5 Codex threads are active (the fix threads of the previous part and the new threads share the limit).
- Two dev players side by side: `scripts/devplayer.sh FlightDelayed3 3124 p3` serves /_player-p3/ next to /_player/.
- Re-voicing: a fresh `voice.py` (no --reuse) re-rolls the WHOLE take; to change one line use `splice_line.py`. trim_take.py takes a fresh take as its new untrimmed source.

## Part 4 notes
- A SEEDED secret (Voss's bite) lives only in pictures: the owner's brief names the seeds (jacket on in the heat, sweat, a flinch and the LEFT sleeve pulled down, a declined first-aid box) and allows at most one neutral narration line; the audit brief lists them as deliberate so they are not reported as defects.
- The audit found real anatomy / continuity bugs in the small details again: a THIRD shoe on a crouching principal (13_dead_closing), backpack straps still worn while the pack stands on the floor, living faces among the dead pursuers (hollow eyes and a grey-green head are what make the dead read), a logo-like emblem on a tiny truck. Principals crouching in a row are where a third leg appears.
- A new picture the plan needs (a countdown beat, a second POV of a phone) is requested from the SAME art thread as one new picture; list every picture the plan uses against `ls art/<slug>/raw` before the build (`stills_build.py` names the missing ones).
- A ring / label only fits a shot that outlasts its 2.2 s hold: a 3 s shot that starts the ring 1.7 s in cannot hold it, so the door that IS the picture got no ring.

## Part 5 notes
- A rescue / mission part is mostly places: draw the gate (6 plates: baggage hall, Arrivals at dawn, the shop front, the staff corridor, the garage at night and the same view in the morning) FIRST; the night / morning pair of one view makes the cliffhanger readable (the barricade, then the cart shoved aside).
- A 'before / after' wound: say in the brief and in the audit brief from which picture the bandage exists (the cut at 35, the cloth in 36-38, gauze after); the audit then checks continuity instead of reporting the forearm.
- The audit brief must say what time of day each range of pictures is (dawn is not night: ten false 'sunset' FAILs in one audit); list the deliberate states (a dusk return, a lamp-lit garage).
- Pictures the plan cannot use (spares) are listed in plan.py's docstring; the art threads over-deliver, and unused rule pictures (40-42) were cheaper than a rewritten script.

## Part 6 notes (the finale)
- The image tool's SAFETY FILTER refuses pictures of someone taping / binding their OWN wrist (read as self-harm): ask for the calm result instead (the roll of tape held loosely beside a padded, loosely taped forearm), never the act.
- A night-vision video inside the film = the normal picture drawn dark + `cctv` fx with `tint` (a cold blue for a phone, green for building cameras); ask the artist for the DARK picture from the camera's own angle (a shelf, a corner) and a pane that shows night, not a sunset (35_voss_frozen_frame).
- Cards that teach in a list (THE SIGNS: fever, sweating, confusion, sleepwalking; RESTRAIN KINDLY: wrists, padding, not the neck, warm fingers) are `steps` cards with code pictograms typed on the narrator's words; the pictures between them show the rule being applied.
- A season finale ends on a place with nobody in it (the empty chair, the cut tape, the open hangar, the footprints): three unpeopled inserts in a row are cheap to audit and read at once.
- Disk: six parts of art + public jpgs + ~1.1 GB of Codex's own generated_images copies filled the disk (12 GB free to 1.4 GB over the session): check `df` before each art wave; the exact byte copies of finals in ~/.codex/generated_images can be deleted (hash-match against art/), the webpack cache in node_modules/.cache regenerates.
- Season-long colour / body continuity worth a table in the bible: whose LEFT forearm carries what (Voss: the veined bite; Min-jun: the gauze); the audit brief names both.
