# Density: how many pictures and graphics a beat needs

The owner on the first FLIGHT DELAYED Part 1 cut (22 pictures in 2:42): "very little motion graphics and very few images, so it feels less
immersive and visualized". The v2 cut (same narration, same voice) has **66 pictures + 12 cards in 2:43 = a new picture or card every
2.1 s** (78 fx on 91 % of the picture shots, a heartbeat HUD across 90 s) and reads as a different film. Target numbers for the house style:

| measure | target |
|---|---|
| pictures | one every **2–3 s** (a 160 s film ≈ 60–70 distinct pictures; never reuse a picture except as the CTA background) |
| shot length | 1.0–3.3 s; nothing over ~4 s unless a card or a moving graphic carries it (the board flip, the CTA) |
| motion graphics | on **most** beats: ≥ 70 % of picture shots carry at least one fx; every rule / fact beat gets a card |
| cards | ~1 per 13 s: day, flight, plan (floor plan), gauge, guard, passport, rule ×3, CTA |
| graphics never idle | everything pops / draws on / counts / reveals word by word; nothing static for more than ~1.5 s |
| dead air after a line | none: the breath is ~0.25 s; a hold only where an action, a sound, a diagram or a 2 s highlight needs it (see "No dead air") |

## Picture types to plan per sentence (the vocabulary of "visualized")
A sentence usually gets 2–3 of these in a row, each on the word that names it:
- **establishing** (wide, new place or state) · **medium** (the action) · **close-up / insert** (a hand, the bandage, the lanyard, the badge
  reader, the phone screen from behind, feet in the crush) · **POV** (the phone, the wallet, the hand that grabs you) · **reaction**
  (the face that sees it: Leo's gasp, eyes, the screaming woman) · **object** (the PA speaker, the sign) · **state** (the hall after the
  stampede, the door open / shut) · **cutaway** (a map, a gauge, a diagram: a code card).
- Numbers and counts become counters / tags ("10th in line", "PEOPLE 200", "FLIGHTS UP 2", "NOISE 94 → 31 dB").
- Every rule gets: the rule card → a picture of the wrong way → a diagram card (plan / gauge / guard) → a picture of the right way.

## No dead air: the narration runs straight through
After a line there is only the breath (~0.25 s). A hold is added only where something needs the time:
1. **Air = a hold, and only for a reason.** The air column of `script.tsv` (`+x`) adds x s on top of the breath. Use it for an action, a sound that plays out, a diagram that draws, or a highlight that must hold 2 s. FLIGHT DELAYED v3c2 holds: the fall +0.2, the bite +0.4, the crush +0.3, the lift +0.6, the passport card +0.6, the man getting up +0.4, the escape diagram after rule 1 +1.0 and after rule 3 +0.8, the bandage ring +0.5, the YOU tag +0.4, the loupe +0.6, the Dani line +0.4. Every other line: no air.
2. **Trim the take's own pauses first.** A narrator take has its own pauses of 0.3–0.9 s between sentences, so an empty air column still leaves ~0.6 s of silence. `episodes/flight1v3/join_take.py` trims each pause to `TIGHT` (0.25 s) at its quietest point, with 20 ms fades: speech and text are untouched, so `scripts/voice.py <slug> --reuse` still accepts the take. A new episode needs the same step before its holds are added.
3. **Cards stay up while the narrator talks.** Never hold silence for a card. Move the next picture to a later word of the next line instead: rule 1's flow picture comes on "with", not after "flow.".
4. **Anchor on words, never on offsets.** An anchor like `"rule2a.end+1.35"` was a pause in disguise: without the silence it lands inside the next line. Use the word, e.g. `"rule2b.arms-0.08"`.
5. **Check it.** `stills_build.py` refuses a shot that would start before the one before it (an offset anchor that moved into the next line); `sync_audit.py` lists every card with its time on screen and flags shots under 0.9 s. Fix a flash by moving a cut to a later word, not by adding air.

## Writing the plan as code (episodes/<slug>/plan.py)
200+ lines of JSON by hand is where timing mistakes hide. Write `plan.py` with tiny helpers and a comment per narration line
(see `assets/plan-example-v2.py`, the whole FLIGHT DELAYED Part 1 v2 plan):
```python
S("12_collapse", "falls", z=(1.0, 1.08), o=(50, 60), hits=["falls.falls+0.3"], fx=[{"kind": "clock", ...}])   # picture shot
C({"kind": "gauge", "from": 1, "to": 6.6}, "crush.They-0.1")                                               # card
sound += [{"sfx": "body_fall", "at": "falls.falls+0.1", "db": -3}, ...]; hud += [...]
```
- Cut on the word that names the action (`"bite.bites-0.1"`); 0.05–0.15 s before the word reads as "in sync".
- `stills_build.py` fails loudly when an anchor word is missing or a shot does not start after the previous one: read the message,
  fix the plan (`"line.the#3"` = the third "the").
- `python3 scripts/stills_build.py <slug> --placeholders` builds grey stand-in frames for pictures that do not exist yet, so the
  timing and every graphic can be checked while the art threads are still drawing.
- Read fx coordinates off the real picture: frame_x = art_x / 1536, frame_y = (art_y − 80) / 864 (the film crops 9 % top and bottom),
  or draw a grid: `GRID=1 scripts/peek.sh <slug> <Comp> 12.5,40 0.5 2`.
- Shots longer than ~3.5 s: split the picture (a close-up insert) or add a graphic; shots shorter than ~1 s only for hits and reactions.

## Art numbering and threads
Number pictures `01…NN` in STORY ORDER (not by thread) so the folder reads as the storyboard and a missing number is obvious; split the
list across ≤ 5 Codex threads by place / act (A arrival, B the bite and panic, C the crush, D the door and stairs, E corridor and the
rise), 10–12 pictures each, with the same header (style lock + cast + places + the bug checklist: `bug-review.md`). Reuse a picture from an
earlier cut only after it passes the bug review at 1100 px (11 of the 22 old pictures were reused in FLIGHT DELAYED v2; the ones with the
owner's complaints were redrawn).
