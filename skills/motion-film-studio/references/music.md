# Music

> [!IMPORTANT] Music is optional and always soft (the user: sound effects give the film more life than music does).
> - **First decide if the film needs music at all.** Many don't: a native TikTok reply, a screen recording, a horror or documentary tone, a talky explainer. Then set `"music": null` in `film.json` and put the effort into the `SOUND` track.
> - **With music**, it sits **very soft** under the voice: `underVoiceDb` 18 (the default; never below 14). The drop and the final hit are where it may rise, briefly.
> - **Never** let the bed cover the sound design: if a tap, whoosh or impact disappears under the music, the music is too loud.

When a film has music, it carries the energy. Two moments must be exact: the **drop**, on the product name at the turn, and the **final hit**, on "Brainfast." at the lockup. Everything else can breathe.

## Pieces, not one long generation

A single Music v2.5 generation from a composition plan puts its sections *about* where you asked, give or take a second. That misses the word. So generate **pieces**, each starting exactly on its own first beat, and place them on frames:

| Piece | Content | Ends |
|---|---|---|
| **A**: intro / problem | minimal, curious or tense, no big kick | on a rising swell, or **stops dead** (a record stop before the drop is a great comic beat) |
| **B**: the drop | "groove drops exactly on the first beat", then build sections (≥ 3 s each) | trimmed at the final hit |
| **C**: the final hit | "one big final hit exactly on the first beat", warm resolve, ring-out | fades with the film |

```bash
. scripts/el-env.sh
.venv/bin/python scripts/music_pieces.py films/<slug>/music.plan.json          # piece-A.mp3, piece-B.mp3, piece-C.mp3
.venv/bin/python scripts/stitch_music.py films/<slug>/music.stitch.json        # → public/films/<slug>/music/bed.wav
```
In `music.stitch.json`, each part is `[file, at_s, src_start_s, src_end_s (0 = to end), fade_in_s, fade_out_s]`:
- A at 0, cut at `DROP/30` with a 0.08 s fade.
- B at `DROP/30`, cut at `(HIT − DROP)/30` with a 0.12 s fade.
- C at `HIT/30` with a 0.5 s tail fade.
- `dur` = the film's length.

To **extend** a piece, lay a second copy that starts earlier in the file with a 0.4 s crossfade: `["A", 10.0, 5.0, 12.6, 0.4, 1.5]`. *No one waits* did exactly this.

Rules: chunks must be ≥ 3000 ms. Generate one request at a time, because the account allows 2 concurrent music requests and they're shared. `music_pieces.py` backs off on 429. Each piece costs one generation; regenerate only the piece that's wrong.

## Prompts that shipped

Every chunk gets the plan's `base` (style, BPM, key, "instrumental", "premium commercial mix", "plenty of space for a voice-over") plus its own `styles`. Negatives always include vocals/lyrics/singing/voice/choir/spoken word/rap/harsh/distorted/lo-fi.

| Vibe (film) | Base | What made it work |
|---|---|---|
| **Bright, upbeat** (*Every business*) | "upbeat modern electro-pop for a product launch", 120 BPM, F major, "big punchy drums", "wide bright synth chords" | intro "playful plucks + finger snaps, no kick"; drop "bright bouncy groove drops exactly on the first beat, punchy claps, shimmering synth hook"; a lighter half-time bridge under "you see every conversation" |
| **Sleek, dark** (*The glass box*) | "polished future-garage tech-pop", 124 BPM, C minor, "shuffling garage drums", "glossy stabs" | intro "dark minimal, deep sub pulse, ticking hi-hat"; drop right after "…a glass box."; a suspense break under "not quite right"; the fuller groove swells back on "sharper". (A deep-house take had a four-on-the-floor kick from bar 1, with no dark intro, and was rejected.) |
| **Warm, human** (*No one waits*) | "warm cinematic piano and strings", 96 BPM, D major | A "intimate felt piano, soft pads, gentle heartbeat pulse, slowly building, ends with a gentle rising swell"; B "uplifting lift on the first beat, warm drums, soaring strings" and then "drums stop, single sustained piano chord"; C "one big warm final hit on the first beat" |
| **Playful, bold** (*The hire*) | "upbeat funk-pop", 112 BPM, E major | A "playful funky groove, slap bass, tight claps, brass stabs, **stops dead at the very end like a record stop**" (lands on "Zero."); B "big funky groove drops on the first beat, horn section, handclaps"; C "one big final brass hit on the first beat" |
| **Launch energy** (*When it doesn't know*) | "modern cinematic pop for a tech product launch", 124 BPM, C major | a one-shot plan with tense intro → drop → break → chorus → build → final hit. It worked, but only after measuring; the pieces approach is more reliable |
| **Lo-fi night** (*The Night Shift*) | "lo-fi felt piano", 90 BPM, D major | intimate, a chord change on "Meet your Brainfast agent", drums when the call is answered |

Those genres are taken. Give a new film its own sound world from its concept. Some directions not tried yet:

- editorial or premium: minimal electronic with marimba and plucked synths, about 118 BPM
- global, many languages: afro-house with shakers and warm pads, about 122 BPM
- retro or playful: nu-disco with strings and slap bass, about 118 BPM
- speed, rapid fire: liquid drum & bass at 174 BPM with a half-time intro
- precise, technical: clean minimal techno with clicks and a rubbery bass, about 126 BPM
- scale, big finish: hybrid orchestral with pulsing synths, about 110 BPM

The mechanics stay the same whatever the genre: pieces that start on their first beat, a drop on the turn, a hit on "Brainfast.", and room for the voice.

## Measure, don't guess (you can't listen)

```bash
ANALYZE_FPS=30 ANALYZE_BPM=112 ANALYZE_MARKS=12.5,34.7 .venv/bin/python scripts/analyze_audio.py out/audio public/films/<slug>/music/*.mp3
```
It prints the tempo, loudness per section, the **biggest bass jumps** (drops and hits land there) and the first and last sound. It writes a spectrogram with the onset curve and the marks overlaid; **open the PNG**. A good drop is a vertical wall of energy exactly at the mark. A good intro is visibly quieter (≥ 8 dB). Check that the final hit rings out rather than stopping abruptly.

## In the mix

`film.json` → `music`:
- `underVoiceDb`: 11. The ducked music sits 11 dB under the voice RMS. Use 13 for a quieter piano bed.
- `hit`: the final-hit frame. The mixer dips the bed 16 dB for the last 0.3 s before it, so the lockup's boom lands like a real hit.
- `offset` / `fadeIn`: start into a file (used for one-shot beds).

The voice ducks the music by −6 dB with a 0.2 s attack and 0.45 s release. Loudness is normalised to −14 LUFS after the sound design is in.
