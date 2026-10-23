# Sound: effects, score, mix

The user's taste: **sound effects give life more than music.** Every visible event gets a cue;
the score stays soft under the voice.

## Effects (`episodes/<slug>/sfx.json` → `scripts/sfx.py <slug>`)

> [!IMPORTANT] Reuse first. Generate only when you must.
> The shared library has about 950 sounds from every episode (browse: https://faceless.clipaf.com/story-studio/sounds.html).
> Search it for every cue. Generate a sound only when nothing fits that exact moment, or when it's genuinely new.
> Every generated sound joins the library automatically.

```bash
python3 scripts/find_sfx.py train horn            # name · category · length · loop · prompt
python3 scripts/find_sfx.py rain night --cat ambience -n 20
```
```json
{ "_library": ["impact","whoosh","riser","tick"],
  "rails":   {"lib": "rails"},
  "stinger": {"lib": "stinger--last-train"},
  "bleat":   {"prompt": "a single sheep bleating, close, outdoors", "dur": 1.5,
              "why": "no sheep in the library (find_sfx: sheep, bleat, lamb → 0)"} }
```
- `{"lib": "<library name>"}` downloads that sound from R2. Your cue name can differ from the library name. A name ending
  in `--<episode>` is another take of the same idea.
- `_library` copies generic effects from `~/.local/share/motion-film-studio/sfx/`. These are in the R2 library too.
- A `prompt` entry needs `"why"`. Without one, `sfx.py` refuses it and prints the closest library sounds.
  Try two or three wordings in find_sfx before deciding nothing fits. Trimming, pitching, layering or a different `db` usually beats a new sound.
- For a sound you do generate: describe the source, the space and the distance ("muffled through train windows",
  "close microphone"). Use `dur` 0.5–22 s, and `loop: true` for beds. The prompt becomes the library's search text, so be specific.
- After generating, `sfx.py` runs `r2_sync.py sounds`: it dedupes, files the sound in a folder, adds it to the index and rebuilds
  the gallery's Sounds page. `--no-share` skips this, for throwaway tests only. `sfx.py <slug> --force a,b` regenerates those.

## Cue sheet (`src/episodes/<slug>/sound.ts`)

Cues are written from the SAME beats as the picture (`beats.ts`):
`c(t, sfx, kind, db, {align:"peak", dur, fi, fo, note})`.
kinds: `amb` beds (ducked −5 under speech) · `fx` story sounds · `ui` HUD · `hit` impacts.
Peak-align whooshes, risers, impacts so their loudest moment lands on the beat.
Density: ~0.6 cues/s overall, more in action, near-silence before the twist.
`MUSIC` = [[t, dB], …] automation of the score (e.g. −22 dB under the twist, back up on the end card).

## Score (`episodes/<slug>/music.json` → `scripts/music.py <slug>`)

A composition plan with sections ending on story beats (`until` = absolute seconds; compute
them from lines.json when writing the file). The model honours styles roughly but NOT exact
silence or exact hit times — shape those with the MUSIC automation and SFX hits instead. Check
the loudness per second after generating (the snippet in pitfalls.md) to catch dead sections.

## Mix (`scripts/sound_export.sh <slug> <dir>` → `scripts/mix.py <slug> [--table]`)

Effects are levelled by measurement against the voice (amb −20 dB RMS, fx −9, ui −13, hits at
voice peak −1), the score sits 17 dB under the voice and ducks 7 dB under speech; two-pass
loudnorm to −14 LUFS / −2.2 dBTP target. Then always:
`.venv/bin/python scripts/stt_check.py <slug> public/<slug>/mix.wav` (≥ 0.97, else trim the cue
that masks the voice).

## Cardboard films (reference: `src/episodes/cobra-cardboard/sound.ts`)

- **Papery foley for every paper move**: a `swipe` for every slide/push transition (peak mid-move), a `tape` rip for
  a tape label, `marker` squeaks for hand lettering, a `sticky`/`poster` slap, a `stamp` thump, `pageturn` for a flip,
  `press` when the maker's hand presses a card; the story's own sounds (hiss, clink, flop, squeak, snip).
- **One bed per set** (`bed(a, b, "office")` helper: shot start → end, looped with a crossfade): maker's table hum,
  the place's ambience (bazaar, office, yard at night, street, bank).
- **Density ≈ 0.6 cues/s**: count the NON-bed cues ÷ duration (the cobra film: 48 cues / 71.9 s = 0.67). One sound per
  beat, never one for every small thing that moves — the voice leads.
- **The punchline gets a music drop**: `MUSIC` automation to −16 dB for ~0.8 s around it ("Let them go!"), back up
  after; the last line gets a plucked `outro` hit.
- Check the shared library first (`~/.local/share/motion-film-studio/sfx/library.json`: stamp, pageturn, pageflip,
  scratch, woodblock, zoom, swing, sparkle, tear, pin, paper…). NB library `slide` is a comic slide WHISTLE, not a
  paper slide — generate a papery `swipe` instead.
