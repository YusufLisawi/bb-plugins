# Voice Guard

bb's voice input, made hard to lose.

- **Saved first.** Every recording is written to `~/.bb/voice-backups/<day>/`
  before any network call, with a `.json` status file and, once ready, a
  `.txt` transcript. Old days are deleted after 30 days (setting).
- **Codex, then Groq.** Codex transcribes first. Groq Whisper (large v3 turbo)
  starts after 3 seconds, at once if Codex fails, and immediately for
  recordings over 1.5 MB, since bb gives a voice service about 10 seconds.
  The first transcript wins.
- **Never wasted.** If bb gives up, transcription continues and the text is
  saved. `bb voice-guard last` prints it.

Select it with `bb settings ai-services set voice guarded --plugin voice-guard`.
Set the key with `bb plugin config voice-guard set groqApiKey <key>`.

Limit: bb itself refuses recordings over 25 MB before any service sees them.
