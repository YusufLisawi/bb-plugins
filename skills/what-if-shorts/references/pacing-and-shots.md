# Pacing and shots — the cut rhythm, the shot types, captions and HUD

The format's energy comes from the rhythm: a new picture on almost every phrase, every cut on a word, and captions
swapping in step. These numbers were measured on the farm reference (40 shots in 65 s). Apply them to every niche.

## 1 · The rhythm

| Measure | Farm | Rule |
|---|---|---|
| Mean shot | 1.63 s (median 1.51) | 1.4–1.9 s for story engines (survival, experiment), 1.9–2.6 s for build, 2.5–4 s for POV |
| Distribution | 7 shots < 1 s · 21 at 1–2 s · 11 at 2–3 s · 1 ≥ 3 s | most shots 1–2 s; about a quarter 2–3 s (establishing, maps, diagrams, cards); a few < 1 s (punches, inserts, list items) |
| Longest | 3.03 s (farm wide + DAY 1 HUD + 4 pins; 3.22 s in our take) | ≤ 3.4 s, except the end card. A long line with one picture gets an insert or a new angle |
| Cuts per line | punch lines 0–1 · normal 2–3 · lists and montages 4–5 | one cut per list item and per action of a montage line |
| Captions | 55 chunks, ≈ 1.1 s each | a caption change every ≈ 1 s, the picture every ≈ 1.6 s: the eye always has something new |

**Where a cut lands:** at `cut(line, word, frac)`, which is the word's start plus `frac` of the gap to the next word.

- **On the word that names the new picture** (frac 0–0.35, 14 of 37 farm cuts). "First, **water**." → the jugs.
  "**Wichita**" → the city.
- **Mid-gap** (frac 0.35–0.7, 12 cuts) for a continuation (the next action of the same move).
- **Just before the next word** (frac ≥ 0.7, 11 cuts), so the new picture is already there when its word starts. Use
  it at sentence starts: the garage arrives 0.1 s before "First, water."

Never type a time in seconds. If the voice is re-recorded, every cut moves with it.

**Holds:** one 0.6–1.0 s pause before the final reveal line (`+0.75` in the script's air column), under a near-silent
score. That is the only deliberate air in the film.

## 2 · Shot types (the `type` column of `shots.tsv`)

| Type | What it is | Farm examples | Share (survival) |
|---|---|---|---|
| `acting` | the hero does what the line says, the full figure in a set | kitchen, the walks, the truck, the tub, the generator, the gate, the porch | 30–40 % |
| `closeup` | head and shoulders, one emotion change (brows lead) | worried close-up, "done" (eyes shut), shock, the dog's growl | 8–12 % (≥ 2) |
| `ots` | over the shoulder / POV: what the hero sees, his dark back in the foreground | the alert phone, the barn doors ajar | 1–3 shots |
| `insert` | hand plus prop at prop scale, with the action finished in the shot | the key in the ignition, the padlock, the writing hand, a jug set down, the gauge needle | 10–15 % (≥ 3) |
| `map` | top-down or perspective map with pins, rings, arrows, dots; it zooms or tilts | farm wide + pins, the island, the satellite zoom, the Wichita swarm, the noise rings, the tilted map, the safe zone | 15–20 % (≥ 3) |
| `diagram` | a cross-section, cutaway or chart that shows a CAUSE | the well section with process chips | ≥ 1 (build: the anchor cutaway, ≥ 4) |
| `card` | a HUD card as the subject | the SUPPLIES card | 1–2 |
| `slam` | a full-frame word graphic; the caption hides | NO. · ALMOST IMPOSSIBLE | 2–4 per film |
| `threat` | the danger, never fully shown: silhouettes, fog, eye glow, a smoking skyline | the road to Wichita, the forest, the barn eyes | 5–8 % |
| `inventory` | one item of a spoken list, each with a counter chip | the coop, the cows, the horse, the dog and the bird | one per item |
| `journey` | ladder engines: one continuous camera move through stages | — | ladders only |
| `end` | the end card | PART 2 | 1 |

`lint_script.py --shots` checks the mix for the engine.

## 3 · Inside a shot

- **Composition:** the subject lives in the upper 60 % of the frame. The caption band (y ≈ 1150–1320) must never
  cover a face, an acting hand or the prop that matters. For acting shots, put the floor line at y ≈ 1130–1160 so the
  caption sits on the floor (the kitchen: floor 1160, caption 1236). On walks and wide animal shots the caption may
  cross a body, as in the reference, but never a face.
- **Safe zones:** HUD inside x 70–1010. Top HUD at y 100–330. Keep key things out of the TikTok UI: the right edge
  (x > 960, y 900–1500) and the bottom (y > 1600).
- **Depth planes** (`Plane d`):

  | Plane | d | blur | What |
  |---|---|---|---|
  | far | 0.5–0.6 | 0 (haze instead) | sky, clouds, tree line, skyline |
  | mid | 0.8–0.9 | 0 | buildings, the set's back walls, fences |
  | action | 1.0 | 0 | characters, the props they use |
  | near | 1.1–1.3 | 10–16 px | **the signature:** a blurred prop or animal in a bottom corner (bread and juice in the kitchen, a hen in the coop, a cow in the pasture) |

- **Camera:** every shot moves.
  - A push-in of 2–7 % over the shot (z 1.0 → 1.07), sine-eased in and out.
  - Walks track the subject at 20–40 px/s.
  - Maps zoom (1.0 → 1.3), pull out to a patchwork, or tilt in CSS 3-D (in an isolated, clipped container).
  - Never a static frame, never a whip pan, no handheld shake except one impact.
- **A live element in every shot:** idle breathing and blinks, tail flicks, steam, drifting clouds, a flicker, dust,
  a pulsing phone glow.
- **One light motif per scene:** window light, the phone's glow, the alert's red pulse, a light shaft through a door,
  dawn behind the barn.
- **Transitions:** hard cuts only, switched on frame-snapped time (`useTq`), so no blended cut frames appear in the
  motion-blur master. Two exceptions: a cut to black under the last sting before the end card, and in-shot slams.

## 4 · Graphic devices (the HUD language)

All are in `src/kit/flat/hud.tsx` unless marked *(build it)*. Put a new one in the kit, not in the episode, and
style it like its neighbours: rounded off-white or dark card, soft drop shadow, condensed bold title, a red or
orange pill, small grey icons.

| Device | Kit | Lands on | Rules |
|---|---|---|---|
| Event tag + DAY N + clock pill | `OutbreakHud` | the reframe line's first word | drops in from the top (0.3 s), lifts away when the pins start |
| Map pins (icon + label) | `MapPin` | the word that names each one | pop with a spring, one per word, 4–5 max |
| Countdown pill "29:44 LEFT" | `Countdown` | the clock line | ticks visibly fast; urgency turns it red |
| Counter card + green "+30" chip | `WaterCard` | the amount word | counts up with ticks; the chip pops on the add |
| Rule card | `RuleCard` | the rule's key word | RULE #N red pill, ≤ 6-word title, red underline, 2 icons; holds ≈ 1.5 s |
| Process chips A › B › C › D | `ProcessChips` | each chip's word | light orange in turn; all grey on the failure |
| Count chips (stacking) | `CountChips` | each number word | the earlier chip shrinks into a stack above the new one |
| Big correction word | `NoSlam` | "No," | 3-D red word, 1.2× scale, a slam sting; captions hidden |
| Danger phrase | `AlmostImpossible` | the stakes word | small question + big red phrase on a darkened frame |
| Distance rings | `YardRings` | each distance word | dashed rings ripple out, with labels (50 YD / 100 YD / 200 YD) |
| Map tag / home pin | `RedTag`, `HomePin` | the place word | red tag for danger, white pin for home |
| Supplies card | `SuppliesCard` | "counting everything" | rows tick in (≤ 0.6 s total); one red row is the next part's plant |
| End card | `EndCard` | after the last word + 1.78 s | PART N, thin red rule, teaser in red, a faint follow line |
| Nameplate | *(build it)* | the character's entrance | NAME · AGE big, one-line fact small, lower-left |
| Checklist | *(build it)* | each item's word | ticks one per word; leave the plant unticked |
| Tip pill / Mistake header | *(build it)* | the rule word | "TIP: LIGHT AWAY FROM YOUR BODY" top pill · "MISTAKE #N" big red |
| Polaroid recap | *(build it)* | the recap words | a frame of the earlier part, tilted, PART N label, a quote under it |
| Time-skip pill | *(build it)* | each time jump | WITHOUT [X] · **+1 DAY**, top-left |
| Ladder counter + leader labels | *(build it)* | each stage | a giant number with a unit-switching readout; a thin leader line + label per landmark |
| Spec card | *(build it)* | the number word | big orange number + small caps label (15 LB · 2×4 MISSILE) |
| Comment bubble | *(build it)* | the callback line | a comment with a heart and a like count |

**Motion:** a device lands on its word. It springs in (scale 0.85 → 1 with a light overshoot, ≈ 0.25 s), stays
still while read, and lifts or fades out (≈ 0.2 s) when its job is done. Never show two cards fighting for the same
area. Card text is ≥ 34 px, and titles are ≤ 6 words.

## 5 · Captions (exact spec; `FlatCaptions` in `src/kit/flat/captions.tsx`)

- **Type:** Barlow Condensed 800, 86 px (auto-fits one line in 940 px), tracking 0.025 em, white fill, a dark
  outline (#1d1813, 0.12 em) and a soft drop shadow. Centred at **y = 1236**, one line, always.
- **Chunks:** 2–5 words (6 at most), split at punctuation. Never end a chunk on the / a / to / of / and / your.
  A chunk swaps in on its first word (−0.05 s) with a 3-frame fade and a scale settle (0.97 → 1), holds ≤ 0.9 s
  after its last word, and two chunks never show at once.
- **Keyword colours:** **orange #f5a623** for the key fact, noun or number (about every second chunk), and
  **red #e8372c** for danger and negation (ZOMBIE, NOT, NO). The turn and the reveal chunks are **all red** ("ONE
  PROBLEM.", "INSIDE THE BARN.").
- **Speakers:** the narrator is white. Character 1 is teal (#5fd3c6) and character 2 lavender (#c7b8ff), with the
  whole chunk coloured. Off-screen and phone voices are italic.
- **Hidden** on slams, on the final threat shot and on the end card, and whenever the picture is a card that already
  says the words (the `hide` ranges in the episode component).
- **Where colours come from:** `new_episode.py code` colours numbers (plus their unit), danger words, places said once,
  the turn chunk ("ONE PROBLEM.") and the reveal chunk. It can't know your key fact, so mark it in `script.tsv`'s 5th
  column `kw` (comma list; `!word` red, `!!word` the whole chunk red), or edit `CHUNKS` in `beats.ts`. Review every chunk.
- **Text overrides:** an ellipsis for suspense ("PLACES TO SURVIVE…", "HE HAS A GENERATOR…"), a colon for priority
  ("FIRST: WATER."), and numbers as digits ("30 MINUTES").

## 6 · The graphic slams

Each film has 2–4 full-frame graphic beats where the caption hides, a big word takes over and a sting hits. Space
them at about 25 %, 70 % and 95 % of the film:

1. **the correction:** "NO." (farm: 17.2 s of 65.3, 26 %)
2. **the stakes:** "STAYING QUIET? / ALMOST IMPOSSIBLE" (47.8 s, 73 %)
3. **the twist:** the all-red reveal caption, the glowing eyes, the end card (61–65 s, 94–100 %)

## 7 · Writing `shots.tsv` (the shot plan)

Tab-separated, one row per shot, in film order:

```
id	line	word	frac	type	what	devices
kitchen	hook	0	0	acting	Jake eats cereal at the kitchen table, phone buzzing; the dog lies at his feet; slow push	phone glow
otsPhone	hook	9	0.18	ots	from behind Jake: the red EMERGENCY ALERT on his phone, red glow on the kitchen	alert screen
farmWide	hook	14	0.89	map	high wide of the farm, push-in	OutbreakHud@best:0, MapPin×4@best:6/9/10/12
…
barnEyes	END	0.62		threat	two glowing eyes in the dark gap, one slow blink	captions hidden
endCard	END	1.78		end	PART 2 · SOMETHING IS IN THE BARN · FOLLOW TO SURVIVE DAY 1	EndCard
```

- `line` + `word` (0-based) + `frac` define the cut. The first row always starts at 0 s. Rows after the last word
  use `line = END` and `word = seconds after the last word ends`.
- `type` comes from § 2, and `what` is one sentence: subject, action, camera, light.
- `devices` lists what lands and on which word (`Device@line:word`).
- `lint_script.py … --shots` estimates every shot's length (or measures it with `--lines` after the voice) and
  checks the rhythm and the shot mix. `new_episode.py code` turns the plan into `beats.ts` plus one placeholder
  shot each.
