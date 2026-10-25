---
name: storybook-stills
description: "The Story Studio house style (locked 2026-10-25): narrated survival / mystery / crime stories told in the Beanie Survives and Melvin inked-stickman look, where every action is its own AI illustration (Codex imagegen) with the characters drawn in, brought to life by camera moves, hits, place states, code motion graphics (cutaways, floor plans, phone screens, counters, heartbeat HUD, stamps, rule and day cards, an animated CTA end card) and one foley sound per action. Use for any new story video, series part or long-form in ~/Developer/story-studio unless the user asks for another format, and when the user mentions the Beanie / Melvin style, \"version B\", storybook stills or the preferred style."
---

# Storybook Stills: the house style

The owner compared two builds of the same 45 s story on 2026-10-25 and chose this one ("version B is the best, lock it down"):
**every action is its own AI illustration with the characters drawn into the scene**; nothing on the characters moves. The
rival build (AI head/torso parts on code-animated stick limbs, `src/kit/stick/`) lost: the drawn pictures read richer and
never break anatomy or logic. Don't animate characters in this style unless the owner asks.

Reference episodes: **Beanie4** (45 s, `episodes/beanie4/plan.json`, live at https://faceless.clipaf.com/story-studio/tests/beanie4-B.mp4)
and **FLIGHT DELAYED Part 1 v2** (the dense, bug-free, 2:43 film with the full graphics vocabulary and the CTA end card: `episodes/flight1v2/`,
https://faceless.clipaf.com/story-studio/tests/flight-delayed-p1-v2.mp4). Frames: `assets/reference-frames.jpg`, `assets/flight1v2-frames.jpg`.
The owner's verdict on the first FLIGHT DELAYED cut (22 pictures, few graphics, art bugs, plain end) is why the next sections exist.

## What makes it work

1. **A story that earns every picture.** Second person ("You live on the 30th floor."), a direct question hook, calm connected
   narration at ~3 words a second, practical numbers and named rules, one quiet dread thread. One line ≈ one beat ≈ 2–3 pictures.
2. **DENSITY: a new picture every 2–3 s, graphics on most beats** (≥ 70 % of picture shots carry an fx; a card every ~13 s). 22 pictures
   in 2:42 felt "less immersive and visualized"; 66 pictures + 12 cards in 2:43 did not. Per sentence: establishing · the action · a
   close-up / POV insert · a reaction face · a place STATE, plus a diagram or counter for every number and rule (`references/density-and-plan.md`).
3. **ZERO ART BUGS.** Every picture is reviewed at 1000+ px against the checklist (counts of hands / arms / legs, full bodies where the pose
   needs legs, props facing the right way, continuity, no text, safe crop) BEFORE it goes into a plan; failures go back to Codex with an exact
   EDIT request (`references/bug-review.md`). The same checklist is pasted into every art brief.
4. **One picture per action, drawn by Codex.** The same cast and places in every picture; a place that changes (barricaded,
   burst open, dawn) is a new STATE drawn by editing the previous image.
5. **Nothing holds still.** Every shot gets its own push or pan and a small settle on the cut; hits shake the frame with an impact burst;
   code motion graphics carry the facts and the feelings (rings and arrows that draw themselves, a phone with No service, a translation
   bubble, a crowd-flow floor plan, the crush gauge, a heartbeat HUD, rubber stamps, a magnifier, a split-flap board). A graphic that sits
   for more than ~1.5 s without moving reads as a freeze.
6. **Sound makes it animated.** One real foley cue per action (crash, door, ring, footsteps, swing, impact), a bed per place. No "dum"
   stingers, no beeps on graphics, no music under the hook. New sounds from the local GPU model, library first.
7. **A real end card.** Series parts end on a code-animated CTA (the cliffhanger question typed big, two answers to comment, the next
   part's polaroid and hook, FOLLOW): `references/cta-end-card.md`.

## The pipeline (all in ~/Developer/story-studio)

```bash
python3 scripts/stills_new.py <slug> <Comp> [--vertical]      # scaffold: script.tsv, cast.json, plan.json, art-brief.md, the wrapper
# write episodes/<slug>/script.tsv (references/story-and-plan.md), then the voice:
.venv/bin/python scripts/voice.py <slug>                        # public/<slug>/vo/lines.json (+ word times = the plan's anchors)
# write the Codex briefs (assets/brief-template.md: header + ≤ 12 pictures per thread), spawn ≤ 5 art threads (references/art.md)
# write episodes/<slug>/plan.py (assets/plan-example-v2.py) → plan.json; python3 scripts/stills_build.py <slug> --placeholders  # timing before the art is done
python3 scripts/art_sheet.py art/<slug>/raw <names> --cols 1 --w 1000   # review every picture (references/bug-review.md), send fixes back
scripts/peek.sh <slug> <Comp> 12.5,40,95 0.5 3                  # stills of the real composition (GRID=1 for fx coordinates)
python3 scripts/stills_build.py <slug> --sheet                  # anchors → seconds, crops the art, stills.json, sound.json, mix.wav
python3 scripts/gen_root.py && PUBLIC_ONLY="<slug>" MIN_FREE_GB=4 SAMPLES=1 CRF1=18 CONC=4 scripts/render.sh <Comp> <slug>
.venv/bin/python scripts/qa.py <slug>                           # format · loudness · freezes · speech must PASS; then LOOK at frames of the final mp4
```

The engine is `src/kit/stills/` (`Stills.tsx` shots + camera + layer-1 fx / cards, `fx2.tsx` + `cards2.tsx` + `draw.tsx` layer 2).
`episodes/stillslab/plan.json` (`StillsLab`) and `episodes/fx2lab/plan.json` (`Fx2Lab`) show every card and fx type:
`assets/cards-and-fx.jpg`, `assets/cards-and-fx-v2.jpg`.

## Read next, as needed

- `references/look-and-cast.md`: the look, the cast design rules, what AI draws vs what code draws.
- `references/story-and-plan.md`: writing the narration, planning the shots, the plan.json format and anchors.
- `references/density-and-plan.md`: how many pictures and graphics a beat needs, picture types, plan.py, art numbering.
- `references/art.md`: the Codex brief, cast sheets, place states, the crop rules, fixing one picture.
- `references/bug-review.md`: the picture bug checklist (what the owner rejected) and how to run it.
- `references/motion-and-sound.md`: camera moves, every fx and card (with args), the HUD, sound cues and beds, local sounds, the mix.
- `references/cta-end-card.md`: the animated end card and its plan entry.
- `references/build-and-qa.md`: render, peek, QA, upload, gallery, covers, disk and thread limits, known traps.

## Done means

The voice reads every line (qa speech PASS), every picture passed the bug review, graphics sit on most beats and nothing holds still
(qa: 0 freezes), every action has its sound and no stingers, the series part ends on the CTA card, frames of the FINAL mp4 were
looked at, and the owner has a playable link (R2) before anything is published.
