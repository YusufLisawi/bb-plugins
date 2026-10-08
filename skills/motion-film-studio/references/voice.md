# Voice

The voice is the clock and the first thing the user judges. Get it right before any picture exists.

## Who speaks

| Role | Voice | ElevenLabs id | Status |
|---|---|---|---|
| **Narrator (default)** | Michael C. Vincent: confident, expressive, pro | `uju3wxzG5OhpWcoi3SMy` | **approved**: "keep using the same voice-over" |
| Narrator | Sarah | `EXAVITQu4vr4xnSDxMaL` | **rejected**: "not engaging… slow and boring, and not smooth" |
| Narrator | Liam | `bu5eKETbFKC8G702EAU4` | **rejected**: "weird voice… sounds like it's away from the microphone" |
| Customer (store) | Alexandra | `kdmDKE6EkgrWrrykO9Qt` | used as a cameo |
| Customer (clinic, older man) | Jim | `GwgxNQwmgtBTVysWUO5t` | used as a cameo |
| Customer (estate) | Eryn | `kdnRe2koJdOK4Ovxn2DI` | used as a cameo |
| Customer (Spanish) | Tony, a native Spanish speaker | `lRf3yb6jZby4fn3q3Q7M` | used as a cameo |
| Customer (impatient) | Aaron | `B6uUx2p7cRgxseOUyP6P` | used as a cameo |

Only change the narrator if the user asks. To find a new one, search the shared library (`GET /v1/shared-voices?search=…&gender=…&sort=cloned_by_count`). Audition by **measurement**, since you can't listen:
```bash
.venv/bin/python scripts/voice_audition.py out/audition <id:name> [<id:name> …] --passage films/<slug>/script.txt
```
It prints the pace (words/s), pitch range (semitone standard deviation), energy (per-word dB standard deviation) and transcription accuracy. Pick a pace ≥ 2.0 raw (≈ 2.8 after the edit), a range ≥ 3.5 st and an accuracy of 0.98 or better. A flat range (< 2.5 st) sounds "boring". Mic distance can't be measured, so prefer voices that are popular for ads (many clones) with "commercial / advertisement / narration" in their description.

## Two voice engines: ElevenLabs (default) or Fish Audio

`vo_take.py` speaks with either engine. The user picks per project or per film ("use Fish Audio, voice id …").

| | ElevenLabs | Fish Audio |
|---|---|---|
| Flag | `--provider elevenlabs` (default) | `--provider fish` (or `export MFS_TTS=fish`) |
| Voice id | ElevenLabs `voice_id` (narrator `uju3wxzG5OhpWcoi3SMy`) | a Fish Audio model id (`reference_id`), from fish.audio or `GET https://api.fish.audio/model?language=en&sort_by=score` |
| Model | `eleven_v3` | `--model s2.1-pro` (default; `s2-pro`, `s1`…) · `--temperature` 0–1 expressiveness |
| Tags | `[excited]`-style v3 tags | bracket tags also work on S2; the "tags spoken" check catches any that get read aloud |
| Key | `ELEVENLABS_API_KEY` | `FISH_API_KEY`, in `~/.config/motion-film-studio/fish.env` (loaded by `el-env.sh`) |
| Timing (both) | `DEEPGRAM_API_KEY` in `~/.config/motion-film-studio/deepgram.env`: Nova-3 per-word timestamps | same |

```bash
. scripts/el-env.sh
.venv/bin/python scripts/vo_take.py films/<slug>/script.txt public/films/<slug>/vo --provider fish --voice <fish-model-id>
```
- **Word timings** (they drive the picture) come from `scripts/stt.py`, whichever engine spoke: **Deepgram Nova-3** first (true per-word timestamps, the best), then ElevenLabs Scribe, then Fish ASR (segments split per word by length, approximate). `MFS_STT=deepgram|elevenlabs|fish` forces one. QA's speech check uses the same helper.
- Deepgram writes spelled-out words as words ("brainfast dot a I" = 4 tokens, where Scribe gives one "brainfast.ai"), so take `split_take.py --counts` from the words in `take.words.json`, not from memory.
- Everything after the take (`split_take.py`, the mix, QA) is the same for both.
- Fish Audio's own skills are installed for deeper work (voice cloning, voice design, multi-speaker dialogue): `fish-audio-api` and `fish-audio-sdk`.
- Record the voice in the brand kit (`brand.json` → `voice: {"provider": "fish", "id": "…", "name": "…"}`) so every film of that brand uses it.

## One continuous take (never line by line)

Per-line generation sounds stitched and flat. That was the root of the "slow, boring, not smooth" note.
```bash
. scripts/el-env.sh
.venv/bin/python scripts/vo_take.py films/<slug>/script.txt public/films/<slug>/vo --voice uju3wxzG5OhpWcoi3SMy --tempo 1.06
```
1. eleven_v3 reads the **whole** script in one request, with the expression tags inline.
2. Speech-to-text (scribe_v1) proves no tag was spoken and gives word timestamps.
3. Pauses are tightened: after a sentence to 0.34 s, after a comma to 0.14 s, elsewhere ≤ 0.09 s. Cuts land mid-silence with 12 ms crossfades.
4. `--tempo 1.06` speeds the take up with pitch preserved (atempo). **v3 ignores the `speed` voice setting**; 1.15 once produced *longer* audio.
5. The edited take is transcribed again. Those timestamps drive the picture.

Check the printout: `edit … words/s` should be 2.8–3.1, `tags spoken: none`, and the transcript should match the script. Re-generate if a word is wrong. Every take differs; two tries is normal.

## Split into lines and lay them out

```bash
.venv/bin/python scripts/split_take.py public/films/<slug>/vo --counts 5,9,8,12,… --extra 0,0,0.25,0.6,… --start 12
```
- `--counts`: words per line. They must sum to the take's word count, so print the words with indices first.
- `--extra`: seconds of **added air before each line**. Use it to give a scene room (a 0.5–0.8 s breath before the drop line, and before the final "Brainfast.").
- `--start`: the frame where line 1 begins (12 = 0.4 s in; for a customer-voice hook, start the narrator after the cameos).
- Writes `lNN.mp3`, `lNN.words.json` and `lines.json`. The film's `makeTiming(lines, words)` reads them, so re-running re-times the film.

Pick line breaks at sentence ends. One line equals one headline equals one scene beat. Keep the ending as two lines: "Brainfast, create a new brain, fast." and "Build your first agent for free at brainfast.ai."

## Cast lines (customer cameos, other languages)

`films/<slug>/cast.json` → `scripts/cast_lines.py films/<slug>/cast.json public/films/<slug>/cast`. Each line is generated, transcribed (with the right `lang`, e.g. `spa`) and trimmed to 40 ms before the first word, with word timings in the same format. Place them in `film.json` → `cast: [[frame, path], …]` and in the film's timing (`START` table). Four questions in 4–5 s make a strong hook.

## Re-voicing a finished film (keep the picture)

If the user rejects a voice after the film is built (it happened with Liam):
1. Generate a new take of the **same script** with the approved voice.
2. Split it with the same `--counts`, then place each line on its **original** start frame (edit `lines.json`, or split with `--start` and write the old table back). The music drop and the final hit stay locked.
3. Check that each new line ends before the next one starts (print the speech end vs the next start). If a line is too long, shave the `--extra` elsewhere.
4. Re-export the sound, re-mix and re-render. The word-keyed animations follow automatically.

## Checks

- STT of the **final mix** returns the script word for word (`qa.py` does it). The Spanish line may come back in Spanish, which is fine.
- `vo_comp` in the mix keeps loud words (a shouted brand name) from pushing the limiter. See [sound.md](sound.md).
