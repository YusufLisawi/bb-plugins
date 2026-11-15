# Edit, mix, render, QA, deliver

Use a Remotion project (or extend the brand's existing one). The edit is data-driven: one file describes every
creative, and both the picture (Remotion) and the sound (mixer) read it, so they cannot drift.

## 1. Shots from takes

For each take keep a word-timed transcript (`scripts/stt.py`). Define shots as ranges of a take:

```json
{ "A1": {"file": "takes/mama.mp4", "who": "Madre", "ranges": [[0.54, 3.56]]},
  "B2": {"file": "takes/hija.mp4", "who": "Hija",  "ranges": [[0.12, 0.82], [1.12, 2.86]]} }
```

- Start ~0.08–0.1 s before the first word, end ~0.16 s after the last. Cut pauses > ~0.4 s inside a line, and cut
  stutters/repeats ("qué, qué") by splitting the range. Keep a deliberate dramatic pause.
- Speech-to-text sometimes stretches a word across a silence; confirm boundaries with
  `ffmpeg -i take.mp4 -af silencedetect=n=-35dB:d=0.25 -f null -` and fix the timing by hand.
- `who` is explicit, never inferred from file names.
- Build each shot as a 1080×1920 @ 30 fps JPEG frame sequence + a sample-exact WAV + its words re-timed to the
  shot. Voice chain: high-pass ~85 Hz, gentle presence EQ, light compression, −16 LUFS. **Never pitch-shift voices.**

## 2. The edit file (per creative)

```python
E["X1"] = dict(title="X1 · Name", segs=[seg("A1", 0), seg("B1", 91), ...],
               vo=[dict(id="end_line", at=end + 14)],          # optional brand voice-over (e.g. on the end card)
               music=dict(id="bed", at=end - 12, vol=0.14, fade=30),
               marks=dict(end=end, url=fw("B2", at_b2, "brand")),  # frames where words are spoken
               sfx=[dict(id="pop", at=m["url"], vol=0.3)], total=end + 100)
```

Helpers: `fw(shot, at, word)` = absolute frame of a word inside a placed shot; `w(vo, word, at)` = the same for a
voice-over line. Every graphic, chip, logo or sound effect is anchored to a word frame.

## 3. Graphics patterns (components)

- **Captions**: 2–4 words per group, current word highlighted, placed in the lower third away from faces; hide them
  under full-screen cards.
- **Hook title** (first ~2.5 s): the hook line as a bold tilted stamp, short enough for one line.
- **Chips** landing on spoken words (list items, features) with a tick and a soft sound.
- **URL pill** typing in when the URL is said; **logo strip** of partners when they are mentioned.
- **End card** (2.5–3.5 s): brand headline, one CTA button, URL, legal line if required. Wipe in; set
  `clipPath: none` once the wipe ends (rounded clip corners leave black edges).
- **Native videos**: no logo, no music until the end card. **Clear ads**: logo top-left from frame 0.
- Logo on footage: white with a soft shadow (and a faint top gradient); colour logo only on light backgrounds.
- Light punch-in (zoom 1.1–1.3 on the face) when a still came out wide; never on a whole film.

## 4. Mix

One pre-mixed WAV per creative (many `<Audio>` tags freeze the player): dialogue bus, voice-over, music bed that
enters late and ducks under voices, effects with their leading silence trimmed (no whooshes; soft pops/ticks on
real events, 0.2–0.4 volume). Target −14 LUFS integrated, −1.5 dBTP. Pad the mix by one frame (the farm joins
N−1 frames otherwise).

## 5. Render

- `farm preview <project> <Comp>` (540p) → contact sheet → fix → `farm render <project> <Comp>` (1080p).
  If a remote machine stalls, `farm render ... --on this:3`. Long renders: run in the background.
- Before a long render, render stills at the first and last frame of every animated element (negative counters
  and off-by-one frames crash late).

## 6. QA

- `ffprobe` size/duration; `scripts/stt.py final.mp4` must read as the script (captions are not proof of audio).
- Contact sheet of 10–12 frames across the timeline: hook visible in the first second, captions clear of faces,
  graphics land on their words, end card complete.
- Watch one full playback when possible; listen for accent and level jumps between speakers.

## 7. Deliver

Name files `<brand>-<id>-<slug>.mp4`. For remote owners: upload to the team's object storage (signed upload,
public read link) or `bb connect expose <port>` behind a Range-capable static server; one zip for a batch.
Tell the owner the link is public and remove it after they confirm the download. Never email without an explicit go.
