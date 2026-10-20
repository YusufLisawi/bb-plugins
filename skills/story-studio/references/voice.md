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
- Pace target: 2.8–2.9 words/s while speaking. Faster than 3.1 feels rushed; under 2.6 is the
  "slow, boring" the user hates.
- `--reuse` re-cuts and re-times from the saved raw take (free) — use it to change air.
- `--only id,id` regenerates just those cast lines.

## Verification

`.venv/bin/python scripts/stt_check.py <slug> [file.wav]` (local faster-whisper on the GPU):
accuracy ≥ 0.97 after number/spelling normalisation. Whisper's own timing drifts ~1 s around
cast lines; our word times come from ElevenLabs alignment and were verified against the audio
envelope — trust ours. If a word looks missing, cut that line out (ffmpeg -ss/-to) and transcribe
it alone with `~/.bb/skills/watch-video/scripts/transcribe.sh` before regenerating anything.
