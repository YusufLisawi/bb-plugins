---
name: voice-guard
description: Recover the user's voice dictations and transcripts saved by Voice Guard with `bb voice-guard`. Use when the user says a dictation or voice prompt failed, got lost, asked them to download it, or asks for "my last recording" or what they said.
---

# Voice Guard

Every dictation the user records in bb is saved to disk before it is
transcribed, then transcribed by Codex with Groq Whisper as a fast backup.
If bb stopped waiting, the transcript still lands next to the audio.

```sh
bb voice-guard last [--json]                 # newest recording + transcript
bb voice-guard list [-n 20] [--json]         # newest first, with status
bb voice-guard show <id> [--json]            # one recording
bb voice-guard transcribe <id|audio-file>    # retry with no time limit
bb voice-guard path                          # folder: ~/.bb/voice-backups by default
```

Files are `<folder>/<YYYY-MM-DD>/<id>.webm` with `<id>.json` (status, service,
errors) and `<id>.txt` (the transcript).

When the user's dictation failed: run `bb voice-guard last`. If it shows
`done`, give them the transcript (or use it as their prompt). If it shows
`failed`, run `bb voice-guard transcribe <id>`. A recording the browser
offered to download and is not in the list never reached the server: bb
refuses recordings over 25 MB (roughly 25+ minutes).
