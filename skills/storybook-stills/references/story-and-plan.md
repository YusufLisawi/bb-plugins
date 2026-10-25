# The story and the shot plan

## Writing (episodes/<slug>/script.tsv)
`id <TAB> N <TAB> text <TAB> air` — one line per beat; the id becomes an anchor in the plan (keep them short and unique:
`sleep`, `crash`, `call`). Line-level `+0.4` in the air column adds a pause after it.
- **Hook first, no title card:** a direct question or situation a stranger understands in one second ("Could you really survive
  the dead?", "It's Friday, 3 in the morning, and you have six days left before the outbreak"). Never a teaser cut from later.
- **Second person, present tense**, calm and connected ("so", "but", "then"), at ~3 words a second (Horror Rules, Fish
  drama-3, speed 1.1: the default in stills_new.py). Short sentences carry the tension; no fragments in a row.
- **The engine of Beanie Survives:** practical numbers (40 gallons in the tub, a gallon a day, 11 days of food or 25 rationed),
  named rules ("Siege rule 1. Noise is a dinner bell."), and one quiet horror thread under the practical one (the neighbour
  "standing very straight now" outside the door). Every rule is real; every rule is tested on screen.
- **Story first:** for a series, the owner approves the story before any build (who's who, the secret, every cliffhanger, the
  ending). Escapes and fixes are the real technique, step by step.

## Planning the pictures
- One picture per action: a new picture when something HAPPENS or the place changes, not on every sentence. A 45 s film had 16
  pictures + 1 card; a 10-minute film needs ~80–120 pictures and ~10–20 cards.
- Plan place STATES deliberately: the moment a state swaps (on a sound) is the "animation" (barricade jolts, door bursts, bridge
  collapses, room goes dark, dawn).
- Put the facts in cards and cutaways, not in pictures: rule cards, day cards, supplies ledgers, tallies, the climb cutaway.
- Check logic before writing the brief: where everyone is, what they carry, what is broken, what time it is, where the light is.

## plan.json
```json
{ "slug": "beanie4", "size": "16:9", "art": "art/beanie4/raw", "tail": 2.1,
  "shots": [
    {"img": "01_sleep", "at": 0, "z": [1.0, 1.08], "o": [45, 70], "fx": [{"kind": "zzz", "x": 0.33, "y": 0.56}]},
    {"img": "02_wake", "at": "crash", "hits": ["crash.crash"], "fx": [{"kind": "burst", "at": "crash.crash", "x": 0.85, "y": 0.35}]},
    {"card": {"kind": "climb", "floors": 30, "them": "them, slow"}, "at": "floors"} ],
  "sound": [ {"amb": "night_city", "from": 0, "to": "run.and", "db": -16}, {"sfx": "crash", "at": "crash.crash", "db": -2} ] }
```
- A shot runs from its `at` to the next shot's `at`; `img` = a picture name in the art folder (no extension), or `card` = a
  full-frame card (see motion-and-sound.md). `z` [start, end] zoom, `o` [x%, y%] zoom origin, optional `x` / `y` drift in
  fractions of the frame; leave them out and the build cycles varied presets.
- **Anchors** (any `at`, `failAt`, `from`, `to`, every `hits` entry): seconds, `"line"` (its first word), `"line.end"`,
  `"line.word"` (first match, case/punctuation ignored), `"line.word#2"`, `"end"`, plus an offset `"+0.3"` / `"-0.2"`.
  Cut pictures on the word that names the action ("swing.pipe-0.08"); land hits on the word itself.
- fx coordinates are fractions of the frame (0..1), so read them off the picture (x across, y down).
- The full worked example is `assets/plan-example.json` (Beanie4).
