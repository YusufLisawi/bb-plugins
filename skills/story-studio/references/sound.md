# Sound: effects, score, mix

The user's taste: **sound effects give life more than music.** Every visible event gets a cue;
the score stays soft under the voice.

## Effects (`episodes/<slug>/sfx.json` → `scripts/sfx.py <slug>`)

```json
{ "_library": ["impact","whoosh","riser","suck","heartbeat","glitch","buzz","clock","hum","gasp","crowd","swell","zoom","spark","tick"],
  "rails": {"prompt": "steady rhythmic clickety-clack of train wheels … constant speed", "dur": 12, "loop": true, "influence": 0.6},
  "stinger": {"prompt": "horror film stinger, sudden dissonant orchestral hit with metallic screech, then silence", "dur": 3} }
```
- `_library` copies generic effects from `~/.local/share/motion-film-studio/sfx/` (whooshes,
  impacts, risers, ticks, heartbeat, glitch…).
- Bespoke effects: describe the source, the space and the distance ("muffled through train
  windows", "close microphone"). `dur` 0.5–22 s, `loop: true` for beds.
- Typical bespoke set for a story: 1–2 ambience beds (loop), the setting's signature sound (horn,
  bell, siren), the inciting sound (phones/alarm), crowd/impacts, door slam + lock, a creature
  sound, breath/shiver, a stinger, a title hit, HUD typing, a stamp, a sub-drop to silence.
- `sfx.py <slug> --force a,b` regenerates those.

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
