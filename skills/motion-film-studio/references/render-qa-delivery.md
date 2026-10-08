# Review, master render, QA and delivery

## Review (stills), before every master

A still takes seconds; a master takes 25–35 min. Review **every** beat, and do 2–3 rounds.

```bash
scripts/stills.sh <Id>-v out/review 30 90 150 …      # contact sheet at out/review/_sheet.png, then open it
```
Pick frames at: the first word, each headline hand-off (the last frame of the old headline and the first of the new), the drop and its frames +3 and +10, each card as it lands and 10 frames later, each tap, each move's midpoint, the reveal and pull-back, the collapse, the final hit and +20, the CTA, the URL, and the last frame.

**Checklist per sheet:**
- [ ] The sheet delivers the brief's concept and signature move. Put it next to the lookbook sheets: could it be mistaken for an earlier film?
- [ ] Nothing overlaps (headline vs UI, cards vs header, a toast vs a button). Outgoing content never crosses a header.
- [ ] No text is cropped (digits, descenders, masks) and no text falls back to a serif font (the film root must set `fontFamily`).
- [ ] Text contrast holds everywhere: dark panels set `color`, and coral-on-coral uses ink.
- [ ] No empty frames between scenes, and nothing freezes (idle drift is present).
- [ ] The drop has no grey mid-fade, and the final hit is centred and legible.
- [ ] Real UI strings are spelled exactly, the CTA wording is right, and the URL shows.
- [ ] "Different people" look different; industries vary.
- [ ] Diagrams are clean: an orbit or grid, and lines don't cross the logo.
- [ ] Numbers settle on whole values.
- [ ] Every delivered format has been checked (`<Id>-h`, `-sq`, `-p`).

Live check: `PORT=3151 npx vite`, then `/?film=<slug>&format=v`. Expose it with `bb connect expose 3151` when the user is remote. Use `/pinchtab` (never `browser-bridge`) to prove playback advances.

## Master render

```bash
scripts/render_master.sh <Id>-v <slug> 5 angle
```
1. **SS render.** `<Id>-v-SS` renders 8 sub-frames per frame across a 180° shutter, via `scripts/render_resume.sh`. That script restarts from the first missing sub-frame when a browser tab crashes (`Error: Page crashed!` happens on long GPU renders), up to 6 attempts.
2. **finish.py** averages the 8 in float32 (true motion blur, brand colours exact) and adds grain per frame.
3. **Encode:** H.264 High CRF 14, BT.709 tags, AAC 320k, faststart. It always encodes the **whole** contiguous `f0000…` sequence.

Notes:
- `--gl=angle` uses the GPU (RTX 3060). It's about 2× faster than `swangle` (software) and pixel-equivalent. Fall back to `swangle` if angle fails.
- Speed: 3,360 sub-frames in about 3 min for a light scene; heavy 3D glass runs about 300 sub-frames a minute. A 40 s film is 9,600–10,200 sub-frames.
- Keep concurrency ≤ 6, and at most one GPU render at a time.
- **Patching** a range after a fix: render just those sub-frames, `--frames=<first*8>-<(last+1)*8-1>`, into a temporary folder. Move the files into the SS folder, then `finish.py <ss> <final> <first> <last>` to re-average only that range, then `--encode-only` to re-encode the whole film.
- `<Freeze>` clamps to the composition length, so the SS composition must be `D × 8` frames at `fps × 8`. `makeSS` handles it.

## QA gate

```bash
. scripts/el-env.sh && .venv/bin/python scripts/qa.py out/<Id>-v.mp4 out/<Id>-v-final films/<slug>/script.txt
```
| Check | Pass |
|---|---|
| format | the right size, 30 fps, H.264 High, BT.709, AAC ≥ 300k |
| loudness | −14 ± 0.5 LUFS, true peak ≤ −1.5 dBTP |
| glitches | no one-frame spikes. **If one is flagged, look at the frames around it.** A deliberate impact (a stamp slam or a flash) can be accepted and noted in the README. Random jitter or a popping element must be fixed. |
| speech | ≥ 98 % of the script's words are heard in the master's own audio |

Also watch the transitions the scan lists as "largest changes": they should be your intended moves (drops, swipes, dives).

## Delivery

```bash
.venv/bin/python scripts/package.py films/<slug>/deliver.json
```
- The spec comes from `film-template/deliver.json`. It produces the master copy, `poster.png`, `keyframes.png` (a sheet of 10–19 beats), a 720p inline copy and a self-contained player page in `$BB_THREAD_STORAGE/reports/`.
- Keep the page under 5 MB: `inline_crf` 28 and `inline_audio` 112k for 40 s.
- **Folder:** `~/Developer/brainfast/marketing/brainfast-<slug>-<secs>s/`, holding the mp4, poster, key frames and `README.md`. Never commit inside the brainfast repo; the marketing folder stays untracked.
- **README:**
  - YAML front matter (title, status, owner, updated, tags).
  - A master-specs callout (size, fps, duration, codec, loudness).
  - One paragraph on the angle.
  - A script table (time, line, on screen).
  - True-to-product notes (the real strings used).
  - How it was made (voice, music, sound, picture).
  - Checks (STT, glitches, loudness).
  - A content-check callout (illustrative people and numbers, integration-dependent claims).
  - A rebuild block.
- **Remote viewing:** `cd <folder> && python3 -m http.server <port> --bind 127.0.0.1 &`, then `bb connect expose <port>`. Give the `https://…getbb.app/<file>.mp4` link as markdown.
- **Final message:** `::inline-vis{source="thread-storage" file="reports/<page>.html" height=720}`, plus the mp4 link, the remote link, and one or two lines on what the film is.
- **A set of films:** zip them all with `zip -0` (mp4s don't compress) into `marketing/_downloads/` and expose that folder too.
- **Commit** the film project (source, scripts, words.json, mixes). Never push. Save a memory only for durable preferences.

## Mandatory cleanup after QA and packaging

> [!IMPORTANT] Required completion gate
> Temporary numbered frame sequences must be cleaned up after every completed video. The user has explicitly authorized this as routine work. Encoding an MP4 alone does not complete the task: QA, packaging **and cleanup** must finish before handover.

1. Finish the final encode and all QA/repair checks. Generate and save the poster, keyframe/contact sheet, delivery copies and any selected review stills before removing their input frames.
2. Confirm that no active render, encoder, QA process or packaging step needs the frames. Preserve an interrupted render only while actively resuming or diagnosing it.
3. For that film and every completed format, delete the generated numbered supersampled PNGs (such as `s00000.png`), averaged working PNGs (such as `f0000.png`), and numbered frames from superseded patch/retry/alternative-cut directories. Use the actual directories from the render commands, including custom names; do not assume every sequence uses the default suffix.
4. Preserve final videos, narration/music/SFX, original/source images, project source/configs, QA reports, posters, keyframe sheets and deliberately selected review images. Preserve non-frame files sharing a frame directory. Remove a frame directory itself only if it is empty afterward. Never blanket-delete `out`, `public`, a delivery folder or all PNGs in the project.
5. Verify that no bulk numbered frames remain for the completed work and that the final video still exists and opens. Check allocated disk usage/free space and mention substantial space reclaimed in the handover.

The master-render command intentionally leaves `out/<Comp>-ss` and `out/<Comp>-final` for QA and patching. **The agent is responsible for cleaning them after this gate**, including any obsolete patch folders. Source and inputs are sufficient to render again; speculative future editing is not a reason to keep gigabytes of working frames.
