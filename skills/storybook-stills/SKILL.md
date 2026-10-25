---
name: storybook-stills
description: "The Story Studio house style (locked 2026-10-25): narrated survival / mystery / crime stories told in the Beanie Survives and Melvin inked-stickman look, where every action is its own AI illustration (Codex imagegen) with the characters drawn in, brought to life by camera moves, hits, place states, code motion graphics (cutaways, phone screens, counters, rule and day cards) and one foley sound per action. Use for any new story video, series part or long-form in ~/Developer/story-studio unless the user asks for another format, and when the user mentions the Beanie / Melvin style, \"version B\", storybook stills or the preferred style."
---

# Storybook Stills: the house style

The owner compared two builds of the same 45 s story on 2026-10-25 and chose this one ("version B is the best, lock it down"):
**every action is its own AI illustration with the characters drawn into the scene**; nothing on the characters moves. The
rival build (AI head/torso parts on code-animated stick limbs, `src/kit/stick/`) lost: the drawn pictures read richer and
never break anatomy or logic. Don't animate characters in this style unless the owner asks.

Reference episode: **Beanie4** (`episodes/beanie4/plan.json`, `src/episodes/beanie4/Beanie4.tsx`, the art in
`art/beanie4/raw/`), live at https://faceless.clipaf.com/story-studio/tests/beanie4-B.mp4. Frames: `assets/reference-frames.jpg`.

## What makes it work

1. **A story that earns every picture.** Second person ("You live on the 30th floor."), a direct question hook, calm connected
   narration at ~3 words a second, practical numbers and named rules, one quiet dread thread. One line ≈ one beat ≈ one picture.
2. **One picture per action, drawn by Codex.** The same cast and places in every picture; a place that changes (barricaded,
   burst open, dawn) is a new STATE drawn by editing the previous image. Logic is checked picture by picture.
3. **Nothing holds still.** Every shot gets its own push or pan and a small settle on the cut; hits shake the frame with an
   impact burst; code motion graphics carry the facts (the 30-floor cutaway, a phone call, counters, day / rule / supplies
   cards, Zzz, flashes, weather, sun rays). A still that sits for more than ~2 s without something moving reads as a freeze.
4. **Sound makes it animated.** One real foley cue per action (crash, door, ring, footsteps on stairs, swing, impact), a bed
   per place (city, wind, stairwell, birds). No "dum" stingers, no beeps on graphics, no music under the hook.

## The pipeline (all in ~/Developer/story-studio)

```bash
python3 scripts/stills_new.py <slug> <Comp> [--vertical]      # scaffold: script.tsv, cast.json, plan.json, art-brief.md, the wrapper
# write episodes/<slug>/script.tsv (references/story-and-plan.md), then the voice:
.venv/bin/python scripts/voice.py <slug>                        # public/<slug>/vo/lines.json (+ word times = the plan's anchors)
# write plan.json + art-brief.md, spawn the Codex art thread(s) (references/art.md), review the pictures
python3 scripts/stills_build.py <slug> --sheet                  # anchors → seconds, crops the art, stills.json, sound.json, mix.wav
python3 scripts/gen_root.py && PUBLIC_ONLY="<slug>" MIN_FREE_GB=4 SAMPLES=1 CRF1=18 scripts/render.sh <Comp> <slug>
.venv/bin/python scripts/qa.py <slug>                           # format · loudness · freezes · speech must PASS
```

The engine is `src/kit/stills/Stills.tsx` (shots, camera, fx, cards). `episodes/stillslab/plan.json` (`StillsLab`) shows
every card and fx type: `assets/cards-and-fx.jpg`.

## Read next, as needed

- `references/look-and-cast.md`: the look, the cast design rules, what AI draws vs what code draws.
- `references/story-and-plan.md`: writing the narration, planning the shots, the plan.json format and anchors.
- `references/art.md`: the Codex brief, cast sheets, place states, review checklist, the crop rules, redo requests.
- `references/motion-and-sound.md`: camera moves, every fx and card (with args), sound cues and beds, the mix.
- `references/build-and-qa.md`: render, QA, upload, gallery, covers, disk and thread limits, known traps.

## Done means

The voice reads every line (qa speech PASS), every picture passed the logic review, no shot holds still (qa: 0 freezes),
every action has its sound and no stingers, and the owner has a playable link (R2) before anything is published.
