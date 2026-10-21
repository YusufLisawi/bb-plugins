# QA — checkpoints, reviews, and every bug the farm film hit

You can't watch the film. You can look at a lot of frames, measure the audio, and scan the master for motion
artefacts, so do all three at every stage.

## 1 · Checkpoints (stop, report, wait)

| CP | When | Report (paths and numbers, not adjectives) |
|---|---|---|
| **0** | the script, voice and cast are done, before any shot | the script + `lint_script.py` output; voice: take N of M, speed, film length, pace, max gap, STT; the model sheet + walk strip; any decision you need (e.g. a shot list that differs from a plan) |
| **1** | a still of every shot exists | the stills sheet (one frame per shot, at its key word); the shot list with the type mix; for a clone, side-by-side pairs with the reference; your known weak spots |
| **2** | `qa.py` passes on the master | the `qa.py` output; the QA sheet (one labelled frame per shot); the motion-test and diff-scan findings; the frame-QA fix log (what was found, what was fixed, what was left and why) |

A parent agent reviews each CP against the reference sheet (`~/Videos/story-studio/farm-qa-sheet.jpg`). It sends a
short numbered list of concrete fixes ("shot 2: the raised arm reads as a pole; make it a sleeve with a bent elbow")
and grades the final film A / B / C with one line on what worked and what didn't.

## 2 · Stills rounds (the main loop while building)

`scripts/stills.sh <Component> out/<slug>-rN.jpg <sec> <sec> …`: pick each shot's first frame, the moment its key
word lands, mid-move, each HUD landing, and the last frame before the cut. That's 25–45 stills a round. Open the
sheet, fix, and re-render only what changed. Expect 2–3 rounds.

**Per-sheet checklist**

- [ ] Frame 0 already shows the hook, in motion, and readable.
- [ ] Every subject is fully inside the frame with ≥ 60 px margins (hands, cap, tail, raised arms included), and the
      caption band never covers a face, an acting hand or the key prop.
- [ ] Characters stand on the floor line (contact shadows), are on-model in every view, and keep the same scale
      across cuts. The head is on top, no hand is flipped, and props sit in closed hands.
- [ ] Each shot visibly changed between its first and last still (camera, parallax, a live element).
- [ ] HUD text ≥ 34 px, inside x 70–1010, and nothing overlaps (two cards, a card and the caption).
- [ ] Captions: the right chunk, the right keyword colours, one line, and hidden on slams and the end card.
- [ ] Sets are full (packed shelves, dense crops, a crowd that reads as a crowd). Sparse reads cheap.
- [ ] The threat is never fully shown before the reveal, and the reveal's plant was on screen earlier.
- [ ] Dark shots: faces readable (rim light), the one light source clearly the brightest thing.

## 3 · Motion test (before the full master)

Render 2 slices of the hardest motion (`FPS=60 scripts/render.sh <Component> <slug> <a> <b>`): the walks and any
character entering a vehicle or doorway, plus the animal acting and the fast HUD. Then scan them. On farm, the slice
caught Jake sliding ≈ 240 px into the truck seat in one blurred frame (a double-eased blend). The fix was walking
in, taking the door handle, and a 0.42 s step-up.

## 4 · Frame-difference scan (every master)

```bash
.venv/bin/python ~/Developer/bb-plugins/skills/what-if-shorts/scripts/diffscan.py out/<slug>.mp4 [--top 60]
```

It prints the biggest frame-to-frame changes relative to their neighbourhood. Every spike must be a planned cut, a
caption swap or an intended flash. Anything else is a hop, a pop or a doubled limb. Check those times on stills. On
farm it found the writing hand jumping back to the margin (a doubled hand), and a CSS 3-D map painting over a graphic.

## 5 · Frame QA (2 passes on the master)

Use the watch-video skill with a harsh critic: GPT-6.1-Sol at ultra, about 80 frames ≤ 0.8 s apart plus every cut.

```bash
S=~/.bb/skills/watch-video/scripts
W=$($S/fetch.sh out/<slug>.mp4)
$S/frames.py "$W" --max 100 --max-gap 0.8 --min-gap 0.4
WATCH_VIDEO_MODEL=gpt-6.1-sol WATCH_VIDEO_EFFORT=ultra $S/delegate.sh "$W" "$(cat out/<slug>-focus.txt)"
# wait for the child without polling; then: $S/collect.sh "$W" <TID>; read timeline.md; $S/cleanup.sh "$W"
```

The focus file (`out/<slug>-focus.txt`) is a harsh-critic brief: "For every frame: anything cut off by the edge or the
caption; text overlapping text; characters floating, sliding or off-model (stretched limbs, a face off the head, two
mouths); props not touching the hand that holds them; heads floating off bodies; smears or stepped copies from fast
moves; black, empty or static frames; wrong-colour keywords. Rank the 10 most visible fixes with timestamps."

Fix everything it finds, then re-render. Pass 2 checks every pass-1 repair and catches regressions. Write the fix
log into `brief.md` (where, defect, fix). Before a 3rd pass, verify the last fixes on master frames.

## 6 · The `qa.py` gate

`.venv/bin/python scripts/qa.py <slug>` checks format (1080×1920, 30 or 60 fps, H.264 High, AAC), loudness
(−14 ± 0.7 LUFS, ≤ −1.5 dBTP), black and frozen stretches (only the planned dip ≤ 1.2 s) and speech (STT ≥ 0.97 on
the master). It writes `out/<slug>-qa.jpg`, so open it. Run it plain: it takes the whisper lock itself, and wrapping it
in `flock` deadlocks.

## 7 · Every bug the farm film hit (symptom → cause → fix)

| Symptom | Cause | Fix |
|---|---|---|
| A raised arm reads as a thin pole | sleeve too thin, no shoulder mass | a deltoid ellipse joins the sleeve to the jacket, `sleeveW` > 1 in close shots, a bent elbow pointing down and out |
| Angry and neutral faces look the same | brows hidden under the cap bill | cap line raised, eyes and brows lowered, thick brow strokes in every view |
| The back of the head reads as a beard | dark fill over the whole back | skin, a thin hair rim at the nape, the cap's strap opening |
| A stiff walk | small arm swing, straight knees | ±25° shoulder swing with a trailing forearm, a 45–64° swing knee, a lean, a 2.7 % bob, the cap lagging 70 ms |
| The dog reads as a borzoi / a seal | the muzzle 30 % too long, the sit as one tilted slab | shorter wedge muzzle; upright chest, round haunch, the hind paw tucked forward |
| A cow's head floats off its body while grazing | the head moved without a neck | a body-frame neck capsule from the shoulder to the head at every graze angle |
| Eyes painted over the barn door's bracing | drawn on top, outside the gap | a figure stands IN the gap, the eyes inside its head, clipped to the gap |
| The caption covers MEDICAL · LOW, the phone, the dog, the cord pull | the subject in the caption band | re-frame each shot so the subject sits above the band (a longer coat covers a seated lap from behind: `hemLen`) |
| The forest reads as a rectangle with hard fog bands | one flat panel | tapered trunks with branches at 4 depths, soft fog layers, an irregular canopy |
| The dog's mouth pokes past its nose | the mouth not refit to the new muzzle | the lip line under the nose, the open mouth inside the muzzle, fangs for the bark |
| Props acting without contact (a phone hovering, a fist beside a key, a cord short of the hand) | props placed at targets, not at the solved hand | attach to the IK's solved hand; fingers close over the key head; the phone overlaps the table and mug |
| Stepped smears on the door, the hand, the rings; a double mouth | moves > 30 px per output frame; a mouth switch between sub-frames | slower sine-eased moves; expressions switch on the output-frame grid |
| "AND WHEN THE POWER GOES OUT…" ran off the frame | estimated caption width | measure with the real font (`measureText`), auto-fit to 940 px |
| The FUEL pin pointed at the pond | the tank drawn on the pond | the tank clear of the water; labels inside the frame |
| The follow line on the end card unreadable | too dim and too late | brighter, in sooner (≥ 0.4 s at full) |
| Jake slid 240 px into the truck seat in one frame | a double-eased pose blend, too little time | he walks in already moving, takes the handle, a 0.42 s step-up, a roomier cab |
| The writing hand jumped back to the margin | a carriage return in one frame | the first line nearly written at the cut, the pen tip as the reveal edge, returns glide 0.22–0.26 s |
| The tilted map painted over the night wash and ALMOST IMPOSSIBLE | a CSS 3-D plane crossing the camera plane | an isolated, clipped 3-D container |
| A sparse farm wide, a thin garage, a tiny rooster | under-dressed sets | scale buildings +30 %, add a shed, pond and machinery; pack shelves; the hero animal 3× bigger, mid-frame |

Left alone on purpose (they match the reference): captions crossing bodies in walk and animal shots, close crops of
big animals, the dark gauge shot, and the end card's 0.9 s hold.
