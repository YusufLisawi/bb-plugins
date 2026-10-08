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
scripts/render_master.sh <Id>-v <slug>          # GPU (angle-egl), concurrency 4
```
The master **streams**: it never holds more than one chunk of sub-frames on disk.
1. **Per chunk of 90 frames** (`CHUNK`): render its 720 sub-frames of `<Id>-v-SS` (8 per frame across a 180° shutter), then `finish.py --consume` averages them in float32 (true motion blur, brand colours exact), adds grain, and deletes each group of sub-frames as soon as its frame is safely written. Peak disk ≈ 2.3 GB of sub-frames + ~2.6 GB of finished frames, instead of ~27 GB for a 35 s film.
2. **Encode:** H.264 High CRF 14, BT.709 tags, AAC 320k, faststart. It always encodes the **whole** contiguous `f0000…` sequence.

Safety built into `render_master.sh` (all learned on 2026-10-08, when queued masters from two projects filled the disk and a retry loop leaked dozens of headless browsers):
- **Disk guard:** a chunk never starts with less than `MIN_FREE_GB` (20) free; the script stops with exit 3 and a message. Re-running resumes.
- **Bounded retries:** `ATTEMPTS` (4) per chunk with falling concurrency, `CHUNK_TIMEOUT` (1800 s) per attempt, then stop. Nothing loops forever.
- **No leaked browsers:** headless Chrome detaches into its own session, so process-group kills miss it. Each master renders with its own TMPDIR (`~/.cache/remotion-tmp/<project>-master-<Comp>/`, holding `owner.pid`); `scripts/reap_browsers.py --dir` kills exactly its browsers after every chunk and on exit, and `--stale` (run at the start of every master and every stills batch) kills browsers and node renders of any master whose owner died (crash, `kill -9`). It reads `/proc/<pid>/cmdline` because `pkill -f` truncates Chrome's long command line.
- **No lock deadlock:** renders don't inherit the GPU lock's file handle, so an orphan can't hold the queue.
- **No stale frames:** a source hash in `<Id>-v-final/.source-hash`; a changed cut clears old frames instead of resuming over them.
- Test on a slice: `CHUNK=8 LIMIT=40 scripts/render_master.sh …`.

Notes:
- **GPU:** `--gl=angle-egl` (the default) renders on the NVIDIA card: about half the CPU load of `--gl=angle`, same speed, pixel-equivalent. Plain `angle` in headless Chrome silently falls back to SwiftShader (`--use-angle=swiftshader-webgl`: CPU) and dropped frames in a test; `vulkan` dropped most frames. Verify with `nvidia-smi` (≈ 700 MiB used by the render).
- Stopping a master: `kill <render_master pid>` (TERM) stops its render and browsers; check `ps -eo args | grep -c '[c]hrome-headless-shell'` is 0.
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

Cleanup is built into the pipeline; this section is the check that it happened.

1. **Sub-frames** are deleted chunk by chunk by `render_master.sh` (`finish.py --consume`). A dead or interrupted master's `out/<Comp>-ss` is resumable by re-running it; `tidy.py` deletes it after 6 h.
2. **Averaged frames** (`out/<Comp>-final`) are needed by QA's glitch scan and by `package.py` (poster, key frames). `package.py` deletes them right after packaging; `tidy.py` deletes leftovers 12 h after a passing QA, or 48 h after the last write.
3. **Shared caches** (bundles in `~/.cache/mfs-bundles`, `~/.cache/remotion-tmp`, Remotion files in RAM-backed `/tmp`) are cleared by `tidy.py --quick` at the start of every master and stills batch, and by the `mfs-tidy.timer` sweep every 30 min.
4. **Verify** before hand-over: no frame folder of a finished film in `out/`, the final video opens, `python3 scripts/tidy.py --apply` frees nothing large. Report a substantial recovery.

Never blanket-delete `out`, `public`, a delivery folder or all PNGs. Keep final videos, audio, source, configs, QA reports, posters, keyframe sheets and review contact sheets.
