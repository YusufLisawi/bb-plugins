# Review: the loop that makes it good

You can't watch the film. You CAN look at stills — so look at a lot of them.

## Stills rounds

`scripts/stills.sh <Id> /tmp/<slug>-rN.jpg 1 4 7.5 12 …` renders those seconds into one contact
sheet (labels = seconds; a failed still prints FAILED with the error). Pick, per shot: its
first frame, the moment the key word lands, the middle of every camera move, the reveal and
its +0.5 s, every RuleCard/HUD landing, the last frame before each cut. 25–30 stills per round.
Open the sheet with Read. Then fix and re-render only the shots you changed.

## Per-sheet checklist

- [ ] The first frame (0 s) already shows the world, in motion, with something to read.
- [ ] Characters are where they should be: feet on floors, seated people ON seats (measure with
      grid.sh), heads above seat backs, nobody floating or cut by the frame edge by accident.
- [ ] Characters are readable on the plate (rim light, contrast); "different people" look different
      (outfit colour, hair/hat, size).
- [ ] Every shot has motion between its first and last still (camera, parallax, a live element).
- [ ] Captions sit in the safe zone, are never covered by HUD, and the keywords colour the right words.
- [ ] HUD cards don't overlap each other or the captions; text inside x 80–1000.
- [ ] Back views have no faces or front details; infected eyes glow; mouths move only on their lines.
- [ ] Windows show a moving world (not a flat colour); chroma keyed cleanly (no green fringe).
- [ ] No black or empty frames except the deliberate dip after the twist.
- [ ] Title card and end card are centred and complete.

## Cardboard extra checks

The framing and staging checklist in [format-cardboard.md](format-cardboard.md) § 9 — frame 0 reads the hook; feet on
floors via `camY`; the caption band (y ≈ 1380–1480) never hides the action; 60 px margins (hands, hats, raised arms);
bent-elbow arms, no stretched reach; held props visible (world px, `upright`); eyes only on measured anchors; boil
tiny; props in the same place across cuts; stamps on top of the cast; faces readable in dark vibes.

## QA gate (master)

`.venv/bin/python scripts/qa.py <slug>`: 1080×1920, 30 fps, H.264 High, AAC; −14 ± 0.7 LUFS;
true peak ≤ −1.5 dBTP; no unintended black/frozen stretches; STT of the master ≥ 0.97. Then
extract 6 frames of the master (qa.py writes `out/<slug>-qa.jpg`) and look at it — motion blur
present, colours intact, captions crisp.
