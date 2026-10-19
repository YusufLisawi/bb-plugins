---
name: watch-video
description: Watch a video from a link or file and report what it shows and says. Downloads from almost any platform (YouTube, TikTok, Instagram, X, Vimeo, Facebook, direct .mp4 and more) with yt-dlp, transcribes on the local GPU with faster-whisper large-v3-turbo using word timestamps, picks frames on scene changes, and hands every frame to a cheap GPT Luna 6 subagent that describes each one in detail. The result is a timeline of speech and visuals, and all media is deleted afterwards. Use whenever the user shares a video link or file and wants it watched, summarized, transcribed, described, reviewed, broken down shot by shot, or compared, including ads, reels, tutorials, talks, competitor videos and screen recordings, or asks "what's in this video" or "what does it say".
---

# Watch a video

You can't play video. This skill turns a video into two things you can read:
a **transcript with timestamps** and a **description of each frame**, written
by a cheaper model so your own context stays small. They are merged into one
`timeline.md`.

Scripts are in `scripts/`, next to this file. Use `S=<this skill dir>/scripts`.

## 0. One-time setup (per machine)

```bash
$S/setup.sh
```

This is idempotent. It installs or updates yt-dlp in `~/.local/bin`, installs
uv, and builds a Python 3.12 venv in `~/.local/share/watch-video/venv` with
faster-whisper and the CUDA 12 cuBLAS/cuDNN wheels. The Whisper model
(`large-v3-turbo`, about 1.6 GB) downloads the first time you transcribe. It
needs ffmpeg and should print `CUDA devices: 1` or more.

## 1. Fetch

```bash
W=$($S/fetch.sh "<url or local path>")   # prints the work dir
```

- The work dir is `$BB_THREAD_STORAGE/watch-video/<timestamp>/`, or `/tmp/...`
  outside BB. It holds `video.mp4`, `info.json` (title, uploader, description,
  duration) and `probe.json`.
- Downloads are capped at 1080p. Playlists are off, so only the linked video is
  fetched.
- Login-gated or private posts (some Instagram, Facebook, private X): retry with
  `YTDLP_COOKIES_BROWSER=chrome $S/fetch.sh ...` (or `firefox`), but **ask the
  user first**, because this reads their browser cookies.
- If yt-dlp fails with an extractor error, run `$S/setup.sh` (it updates
  yt-dlp) and try again once.
- For a local file, the work dir gets a symlink to it, never a copy. Cleanup
  never touches the original.

## 2. Transcribe and pick frames

Run both commands together:

```bash
$S/transcribe.sh "$W" [lang]     # lang optional: es, en... auto-detected if omitted
$S/frames.py "$W"                # optional: --max 100 --scene 0.3 --min-gap 1 --max-gap <s>
```

- `transcript.txt` has one line per sentence, in the form
  `[00:04.8 → 00:13.7] text`. `transcript.json` adds word-level timestamps.
  Use those when exact timing matters, for example for subtitle sync or an ad
  hook in the first 3 seconds.
- Expect about 3 s for a short clip and around 1 minute per hour of audio on
  the RTX 3060. With no GPU it falls back to CPU, which is slower.
- `frames.py` keeps a frame on every scene cut. It also keeps a heartbeat frame
  every `duration/40` seconds (2 to 15 s), never more than one per second, and
  no more than 100 in total. Frames are saved at 1024 px wide as
  `frames/f0007_t01m12.4s.jpg`. For a long talking-head video, `--max 40` is
  enough. For a fast-cut 30 s ad, keep the defaults.

If the video has no speech, the transcript is empty. That's fine, so continue.

## 3. Delegate the frames (don't view them yourself)

If you are a frontier or expensive model (Opus, Sonnet, GPT‑4/5/6 Sol, etc.),
**do not open the frames.** A GPT Luna 6 child thread at medium reasoning views
every frame and writes the descriptions. Only view frames yourself if you
already are a Luna-class model, or the user explicitly asks you to. Even then,
open just one or two to check a specific detail.

Write focus questions tailored to what the user asked. The child answers them
on every frame and in its summary, so be specific. For example:

- An ad review: "Hook in the first 3 s? Every text overlay verbatim. Is the
  logo or product shown, and when? The CTA and when it appears. Faces and
  emotions. Pacing."
- A tutorial: "Which app or screen is shown at each step, which buttons are
  clicked, any code or commands visible verbatim."
- A competitor video: "Brand, offer, prices, claims, the people's
  demographics, setting, production quality."

```bash
TID=$($S/delegate.sh "$W" "<your focus questions>")
```

This spawns a Codex thread (`gpt-6-luna`, `medium`) that is a child of the
current thread, in the same environment. You can override it with
`WATCH_VIDEO_MODEL` or `WATCH_VIDEO_EFFORT`. Tell the user the child thread is
running as `@thread:<TID>`. Then wait for its completion **without polling**.
Either end your turn and resume when bb reports that the child finished, or
run one `bb thread wait "$TID" --timeout 30m` in the background. Never use a
loop of status checks.

When it is done:

```bash
$S/collect.sh "$W" "$TID"     # saves frames.md and builds timeline.md
```

If the child's output has no `## [mm:ss.s]` blocks (it stopped early or wrote
prose), message it once with `bb thread tell "$TID"` asking for the missing
frames in the required format, then collect again.

## 4. Read and answer

Read `timeline.md`. It interleaves `## [time] frame` blocks with
`🗣 [start–end] speech` lines, and starts with the child's summary. That is your
view of the video, so answer the user's question from it and cite timestamps.
Don't paste the whole timeline. If a detail is missing, ask the same child a
follow-up with `bb thread tell` instead of opening frames.

## 5. Clean up (always)

```bash
$S/cleanup.sh "$W"         # removes the video, frames and probe; keeps transcript.*, frames.md, timeline.md, info.json
$S/cleanup.sh "$W" --all   # removes the whole work dir
```

Run the default cleanup as soon as you have answered. The text files are a few
KB and allow follow-up questions without downloading again. Use `--all` when
the user is done with the video, or when the video is private or sensitive.
Never leave `video.*` or `frames/` behind.

## Notes

- Several videos: give each its own `fetch.sh` work dir. Run fetch, transcribe
  and frames for all of them, then one `delegate.sh` per video. The children
  can run in parallel because each one only reads its own work dir.
- Long videos (over 20 min): use `frames.py --max 60`, and give focus questions
  that point the child at what matters.
- Audio only (podcast, voice note): skip `frames.py` and delegation, and read
  `transcript.txt` directly.
