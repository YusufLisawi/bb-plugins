# Voice: casting, v4 tags, the take, verification

## Casting (auditioned by measurement — you can't listen)

| Role | Voice | ElevenLabs id | Why |
|---|---|---|---|
| **Story narrator** | Michael C. Vincent – Suspenseful Story | `n1PvBOwxb8X6m7tahp2h` | 3.03 words/s raw, 5.2 st pitch range, highest energy of 6 auditioned; built for suspense; same actor as the user's approved Brainfast narrator |
| **Explainer / what-if narrator** | Michael C. Vincent (approved) | `uju3wxzG5OhpWcoi3SMy` | 3.11 w/s, 6.0 st range: confident, persuasive |
| Woman, caring (nurse, friend) | Elise | `EST9Ui6982FZPSi7gCHi` | warm, natural |
| Weathered man (sick, scared) | B. Hardscrabble Oxley | `zQzvQBubVkDWYuqJYMFn` | gravelly baritone |
| Old man, commanding | Grampa Werthers | `MKlLqCItoCkvdhrxgtLv` | old, cranky, shouts well |
| Tough man | Adam – Dark and Tough | `IRHApOXLvnW57QJPQH2P` | hero / soldier |
| Young woman, bright | Jessica | `r1KmysJdVYZjJCm4mL3b` | youthful |
| Grounded woman | Juniper | `aMSt68OGf4xUZAnLpTU8` | officer, doctor |
| Deep sinister | Victor – Malevolent | `cPoqAvGWCPfCfyPMwe4z` | villain |

Rejected by the user in the past (never use): Sarah `EXAVITQu4vr4xnSDxMaL` ("slow, boring"),
Liam `bu5eKETbFKC8G702EAU4` ("sounds away from the microphone").

Find more: `GET https://api.elevenlabs.io/v1/shared-voices?search=…&gender=…&age=…&use_cases=characters_animation&sort=cloned_by_count`.
Audition script from motion-film-studio is a good model if you need a new narrator: measure pace
(≥ 2.9 w/s), pitch range (≥ 4 st), accuracy (1.0).

## Two providers: ElevenLabs v4 and Fish Audio

`cast.json` picks the engine per role. **Fish Audio `drama-3-preview` is the default for EVERY format now** (owner,
2026-10-21: ElevenLabs is out of credits; do not call any ElevenLabs endpoint, including sound effects and music,
until the owner says it's topped up. For sound use the shared library `~/.local/share/motion-film-studio/sfx/` and
other episodes' `public/<slug>/sfx/`).

> [!WARNING] Never use the Fish voice "adam adam" (`9259a7392c454a1eb6436141abb5a558`). The owner: "it's bad and too
> common". It narrates cobra-cardboard and mall; don't reuse it.

Approved Fish voices (all `drama-3-preview`, speed 1.0, measured in the episodes' `voice-audition.md`):

| Role | Voice | id | Used in · why |
|---|---|---|---|
| Bright, playful explainer / fun facts | **Verity** | `8d21b053e2804e2a890e1cf62f267b6f` | tickle, octopus · 2.78–2.85 w/s after stripping tags, liveliest pitch |
| Energetic, friendly storyteller | **Alex** | `b5f4515fd395410b9ed3aef6fa51d9a0` | icecream, emu · 2.70–2.89 w/s, comic timing |
| Serious true crime | **True Crime (M4K)** | `0c433181a86b45ea8c730d856525ffb5` | heather · 2.82 w/s, deep, wide range |

Audition 2–3 Fish voices per film anyway (variety across the channel is good): `GET https://api.fish.audio/model?title=…`.
Tip from four films: emotion tags in the narrator take make Fish drag (2.35–2.6 w/s); strip them and sample 4–6 takes.

```json
{ "N": { "provider": "fish", "model": "drama-3-preview", "voice": "8d21b053e2804e2a890e1cf62f267b6f",
         "name": "Verity (Fish)", "temperature": 0.7, "top_p": 0.7 } }
```

How Fish works in `scripts/voice.py` (same seamless rules as below):
- The narrator is ONE take (`/v1/tts`, WAV, `model` header, `reference_id` = the voice) at **speed 1.0** (no `speed`
  key; owner rule). Fish returns no timestamps: word times come from **local faster-whisper** (large-v3-turbo, GPU,
  under the whisper lock) aligned to the script words (`scripts/align.py`: difflib on the words, then each word's
  edges refined on the audio energy — pauses ≥ 120 ms split, voicing trimmed). Never pass Whisper a prompt (it
  garbled a take). The take's tail is trimmed after the last script word (one voice invented a "thank you").
- Key: `~/.config/motion-film-studio/fish.env` (`FISH_API_KEY`); never print it. API notes:
  `~/.agents/skills/fish-audio-api/SKILL.md`.
- **Prosody varies per take.** Sample 4–6 takes and pick by measurement: after each fresh `voice.py <slug>` copy
  `public/<slug>/vo/raw/narrator.{wav,json}` to `narrator_tN.*`; choose the take whose film length is ≤ 72 s and pace
  2.7–3.0 w/s; copy it back and run `voice.py <slug> --reuse`. Commas instead of "…" tighten a slow take; never
  time-stretch.
- Tags: Fish reads `[intrigued]`, `[amused, low]`, `[ominous]` … like v4 (one per line); stt_check flags spoken tags.
- New narrator? `.venv/bin/python scripts/voice_audition.py <slug> episodes/<slug>/audition-passage.txt
  fish:<voice id>:<name> el:<voice id>:<name> …` reads the SAME passage (a real stretch of your script, tags
  included) with each candidate and writes the measured table (accuracy, pace, YIN pitch range, loudness dynamics,
  max gap, issues) to `episodes/<slug>/voice-audition.md`. Audition 3–4 Fish voices and 2 ElevenLabs ones on two
  passages; you can't listen — pick by measurement.

## The take — seamless (owner rule: "it should feel smooth")

The user heard the old pipeline as "cut, slowed, paused". Causes: each narrator line was cut out
of the take and re-spaced with designed gaps (breaths lost, rhythm broken) and `atempo` stretched
it. Now:
- The narrator's lines stay **one unbroken piece of the take** (natural breaths and pauses).
  The take is split only where a cast line goes in, or at an explicit hold, at the **quietest
  point between sentences**, with 40 ms equal-power crossfades.
- Air column in script.tsv: **blank** between narrator lines (natural timing); a number = gap
  after a cast line / before one; **`+0.8`** = an extra dramatic hold inserted at that point.
- Speed: cast.json `"speed": 1.04` → ElevenLabs' own `voice_settings.speed`. Never atempo.
- Cast lines get `previous_text`/`next_text` context and are loudness-matched to the narrator.
- `"fx": "radio"` / `"phone"` in cast.json colours a voice (radio broadcast in black-sky).

## The take (details)

- `scripts/voice.py <slug>` reads the narrator's lines as **one continuous v4 take** (flow and
  emotion carry across lines) with `/with-timestamps`, cuts each line on its words, generates each
  cast line separately, applies `tempo` (atempo, pitch kept; narrator 1.04), and lays everything
  on one timeline with the air from the script. Output: `public/<slug>/vo/vo.wav` + `lines.json`.
- v4 tags: one per line, qualifiers inside one bracket: `[ominous, quiet]`. Tags are never spoken
  (stt_check reports it). Don't put tags mid-sentence.
- Pace target: 2.8–2.9 words/s while speaking (cardboard, with its very short lines: 2.7–3.0). Faster than 3.1
  feels rushed; under 2.6 is the "slow, boring" the user hates.
- `--reuse` re-cuts and re-times from the saved raw take (free) — use it to change air.
- `--only id,id` regenerates just those cast lines.

## Verification

`.venv/bin/python scripts/stt_check.py <slug> [file.wav]` (local faster-whisper on the GPU):
accuracy ≥ 0.97 after number/spelling normalisation. Whisper's own timing drifts ~1 s around
cast lines; our word times come from ElevenLabs alignment and were verified against the audio
envelope — trust ours. If a word looks missing, cut that line out (ffmpeg -ss/-to) and transcribe
it alone with `~/.bb/skills/watch-video/scripts/transcribe.sh` before regenerating anything.
