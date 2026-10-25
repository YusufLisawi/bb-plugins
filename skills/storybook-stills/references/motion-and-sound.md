# Motion graphics and sound

## The camera (per shot)
- Every shot moves: `z` [from, to] (push in 1.0→1.08, pull out 1.08→1.02), `o` the origin in % (push toward the action),
  optional drift `x` / `y` in frame fractions. Alternate directions cut to cut; push toward faces at emotional beats, pull back
  for reveals. The engine adds a 3% settle on every cut and a decaying shake on each `hits` time.
- Keep shots 1.2–5 s; a longer beat needs a card, an fx that moves, or a second picture.

## fx (drawn over a picture; x/y/w are fractions of the frame)
| kind | args | use |
|---|---|---|
| `burst` | at, x, y, s | comic impact star + speed lines (crash, punch, door) — pair it with a `hits` time |
| `jitter` | poly ("x% y%, …"), hits | re-cuts a region of the picture and shakes it (furniture jolting on each blow) |
| `phone` | x, y, w, rot, title, big, sub, failAt, failTitle, failSub | live text on a drawn phone's blank screen (CALLING 911 → NO ANSWER) |
| `counter` | x, y, label, from, to, unit | a ticking number pill (WATER 36 → 31 gal) |
| `label` | x, y, text, at | a hand-written note with an arrow ("the only way down") |
| `zzz` | x, y | sleeping |
| `flash` | at, col | explosion / lightning flash |
| `rain` · `snow` · `embers` | o | weather over the picture |
| `rays` | x, y | sunrise / god rays from a point |
| `prop` | src, x, y, w, at | an AI prop cut-out popping in and bobbing (public path, e.g. `<slug>/parts/prop_radio.png`) |

## cards (full frame; `{"card": {...}, "at": …}`)
| kind | args | look |
|---|---|---|
| `day` | text, sub | "DAY 3" on charcoal (chapter break) |
| `rule` | n, title, text | SIEGE RULE 1 · Noise is a dinner bell. (on notebook paper) |
| `ledger` | title, rows [[label, value]], note | SUPPLIES · DAY 5: Water 36 gal … (the note in red) |
| `tally` | title, items [[label, n]], note | bars over time (IN THE HALLWAY 1 · 2 · 4 · 9) |
| `climb` | floors, from, label, them | the tower cutaway: your dot climbs, theirs crawl ("them, slow") |
| `prop` | src, bg | one AI prop, big, squash-and-bob, over a blurred picture |
See them all: `episodes/stillslab/plan.json` → `assets/cards-and-fx.jpg`. New graphics go into `src/kit/stills/Stills.tsx`
(FxView / CardView) so every episode can use them.

## Sound (plan.json "sound")
- `{"sfx": name, "at": anchor, "db": -8}` one cue per action; `{"amb": name, "from": a, "to": b, "db": -14, "fi", "fo"}` a bed
  per place. Levels that worked: hits −2…−4, actions −6…−10, small foley −12, beds −12…−18.
- **Library first**: `python3 scripts/find_sfx.py <words>` (~950 sounds; names like crash, door_bang, phone_ring, dial,
  phone_lock, stairs_up, run, swing, impact, thud, rustle, breath, zombie_groan, night_city, nightwind, shaft_wind, birds,
  heartbeat, snore). The build fetches them into public/<slug>/sfx/.
- New sounds: `scripts/sfx.py <slug>` with `"engine": "elevenlabs"` (the ElevenLabs key returned 401 on 2026-10-25: renew it).
  Do NOT ship sounds from the local Woosh model (`scripts/local-sfx`): its weights are noncommercial.
- Owner rules: no "dum" hits or stingers, nothing loud in the hook, no beeps/whooshes on every graphic. Real foley only, at
  the moment of the action. Music is optional and soft; the references use none.
- `scripts/mix.py <slug>` (run by the build) ducks beds under the voice and masters to −14 LUFS.
