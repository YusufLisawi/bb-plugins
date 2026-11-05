# Gemini API audio: speech and music (the default route)

`scripts/gemini_audio.py` calls `generativelanguage.googleapis.com/v1beta` with the owner's API key. No browser, no Google
account, no guard (the guard protects the *accounts*; an API key has its own quota). One JSON object on stdout per command.
Checked 2026-11-01 against the docs and with real calls (samples: `~/Developer/story-studio/out/gemini-test/`).

**Key:** `~/.config/google-flow/gemini.env` (`GEMINI_API_KEY=…`, mode 600; the env var of the same name wins). Never print,
log, copy or commit it; the script scrubs it from every error. Plain `urllib`, so no SDK is needed (the official
`google-genai` SDK, `uv run --with google-genai`, sends the same JSON: `speech_metadata` → `speechMetadata`, `voice_name` →
`voiceName`).

```bash
G="python3 <skill-dir>/scripts/gemini_audio.py"
$G tts --voice Arlo --style "Narration, tense and low" --text "It was quiet. <whispers> Then the lights went out." --out a.wav --mp3
$G tts --voice es-es-advisor-2 --lang es --text-file guion.txt --out guion.wav        # long text: chunked and joined
$G tts --speakers '{"Joe":"Arlo","Jane":{"voice":"Kore","style":"tired"}}' --text $'Joe: Hi.\nJane: <sigh> Hi.' --out d.wav
$G music --prompt "dark cinematic tension, low cellos" --instrumental --seconds 30 --out m.mp3
$G voices --language es --gender female --limit 10      |  $G models  |  $G usage
```

## Models (this key)

| Model | Use | Limits | Price (USD) |
|---|---|---|---|
| `gemini-3.8-flash-tts` (**default**) | speech: expressive, 130+ languages, single / dual speaker, voice design, replication | input 8,192 tokens, output 16,384 tokens | 0.50 / 1M text in, 9.00 / 1M audio out (≈ 0.00225 per 10 s) |
| `gemini-3.8-flash-lite-tts` | same API, cheaper, 100+ languages | same | 0.50 in, 6.00 out |
| `gemini-3.1-flash-tts-preview`, `gemini-2.5-*-preview-tts` | older speech | same | 1.00 / 20.00 (3.1) |
| `lyria-3.5` (**default music**) | full songs, verses / chorus / bridge, vocals or instrumental | output 65,536 tokens | 0.08 per song |
| `lyria-3-pro-preview` | same family | | 0.08 per song |
| `lyria-3-clip-preview` | always a 30 s clip | | 0.04 per clip |
| `lyria-realtime-exp` | streaming music (bidi); not wrapped by the script | | not listed |
| `gemini-3.8-live`, `…-native-audio-…` | live conversation (bidi); not wrapped | | |

The 3.8 TTS prices **double on 2027-01-01** (1.00 / 18.00 and 1.00 / 12.00). Audio is 25 tokens per second. Free tier: the TTS
models are free; Lyria is not. `est_cost_usd` in every result is computed from these prices (the bill is the truth);
`gemini_audio.py usage` sums what this script spent per day.

**Rate limits:** the docs list no RPM / TPM / RPD for TTS or Lyria (limits are per project, see aistudio.google.com/rate-limit;
paid tiers are spend caps per 10 minutes: Tier 1 $10, Tier 2 $50, Tier 3 $200). The script retries a 429 **once**, after the
server's `retryDelay` when it is ≤ 90 s, never when the message says per-day; a 5xx once after 4 s; "no audio" (the model
sometimes answers with text tokens, not billed) once. Everything else fails at once as
`{"ok": false, "error": …, "rate_limited": true, "retry_after_s": N}`. Do not loop it yourself.

## Speech

- **Request shape:** `contents[{role:"user", parts:[{text, speechMetadata:{style, speaker}}]}]`,
  `generationConfig{responseModalities:["AUDIO"], speechConfig{voiceConfig | multiSpeakerVoiceConfig, languageCode}}`.
  The answer is `inlineData` `audio/wav` that **already has a RIFF header**: 24 kHz, mono, 16-bit. (Streaming returns headerless
  `audio/l16`; the script wraps it if it ever gets that.) 12–20 s of audio take 4–6 s; 5 min of audio took 40 s.
- **The text is a verbatim transcript.** A style line put in front of the text ("Narration, tense: …") **is read aloud**
  (measured). Direction goes in `--style` (sent as `speechMetadata.style`: "whispering, scared", "tired and amused",
  "storytelling narrator, warm, steady pace"). Don't put age or gender in a style (the voice decides); no long "audio profile".
- **Tags** (inside the text): the documented syntax is `<angle>`; `[square]` ElevenLabs-style tags also worked in every test, and
  the script converts `[x]` → `<x>` by default (`--tags keep` leaves the text alone, `--tags strip` removes them).
  Tested effects on "Okay. {tag} That is funny. Really funny." (plain = 3.6 s, −16.8 dBFS RMS):

  | Tag | Measured |
  |---|---|
  | `<whispers>` | −10 dB RMS (whispered delivery), +1.2 s |
  | `<laugh>`, `[laughs]` | a laugh, +0.5–1.3 s; `[laugh]` came out as an added spoken "oh" |
  | `<sigh>`, `<sighs>` | a sigh, +1.2–1.5 s; `[sigh]` came out as "uh" |
  | `<gasp>` | a gasp, +1.9 s |
  | `<short pause>` / `<long pause>` | a gap of about 2.5 s / 3 s (not "short"): use commas and full stops for small pauses |
  | `<cough>`, `<cry>`, `<chuckle>` | performed (+1 s, +1 s, +0.2 s) |
  | `[whispering]` | spoke "shh": use `<whispers>` |
  | `[excited]` and other emotion words | never read, but only a loose cue (faster, louder): use `--style` for emotion |

  All 38 tags: argh, breath, cackle, cheer, chuckle(s), cough, cry, exhales, gasp, giggle, groan, growl, grr, grunt, heavy breath,
  hiss, laugh, laughter, long pause, moan, pant, pff, phew, scream, short pause, shout, shriek, sigh(s), sneeze, snicker, snort,
  sob, throat-clearing, tsk, whimper, whispering, whispers, yawn. Use English tags in any language. Capital letters add emphasis;
  avoid sound-effect tags (applause).
- **Styles measured** (same sentence): whispering −34 dB RMS (very quiet); sad 5.9 s and −27 dB (slow, soft); excited 4.0 s;
  angry 3.2 s and −15.8 dB (short, loud). The effect is strong; keep styles to a few words.
- **Voices:** 2,115 in 40 locales (`voices`; cached 7 days): the 30 prebuilt studio voices (Kore "Firm", Puck "Upbeat",
  Charon "Informative", Orus "Firm", Algenib "Gravelly", Sulafat "Warm", …) plus hundreds per language with persona, accent, pitch
  and a description (en-US 217, en-IN 120, en-GB 117, ko 117, ja 115, hi 114, pt-BR 107, ar-EG 92, de-DE 87, es-419 86, fr-FR 81,
  es-ES 22 …). `--voice` accepts a display name (`Arlo`), an id (`en-us-arlo`, `kore`, `es-es-advisor-2`) or a custom `voice_…`
  id. A wrong name fails: "No matching speaker voice found". Custom voices (voice design / replication) exist on this key
  (`voices` lists them with type `replicated`); the `voice_…` path is wired but not tested, and a person's voice clone is only
  for its owner's jobs.
- **Locale voices and `--lang`:** an id like `es-es-advisor-2` exists only in its own locale; the API rejects `languageCode: es` for
  it. The script sends the id's locale (`es-ES`) whatever `--lang` says; display names and the 30 prebuilt voices take any
  language and detect it by themselves. Spanish, Arabic and German were each tested with one line (transcribed back with Whisper:
  Spanish and German word-perfect, Arabic correct). Spanish narration on the Musk text: 797/807 words matched on a 5 min take.
- **Multi-speaker:** up to **2** prebuilt speakers in ONE request (the model hears the exchange; text lines `Joe: …`, optional
  `Joe (whispering): …`, per-speaker default style in the JSON). More than two speakers, or custom voices: one request per turn,
  joined. Tested with 2 and 3 speakers.
- **Long texts:** the hard ceilings are 8,192 input tokens and 16,384 output tokens (= 655 s of audio per request). A single
  4,472-character Spanish request gave 304 s with 99 % of the words in place; the default chunk is **3,000 characters**
  (`--chunk-chars`), cut at paragraph then sentence then comma boundaries (never mid-sentence unless one sentence is longer than a
  chunk). Every chunk gets the same voice, style and language. Chunks are joined by trimming each take's silent head and tail and
  inserting exactly **0.25 s** (`--pause`) with 12 ms fades; a single chunk is saved untouched. The pitch / pace can drift a little
  from chunk to chunk: keep chunks at paragraph breaks and don't change the style between them.
- `--mp3` writes `<out>.mp3`: −16 LUFS (measured), 128 kbps mono, the same chain as `aistudio_tts.py mp3`.

## Music (Lyria)

- Endpoint: `POST /v1beta/interactions` with `response_format {type:"audio", mime_type:"audio/mp3" | "audio/wav"}` (`audio/mpeg` is
  rejected). MP3: 44.1 kHz stereo, WAV: 48 kHz stereo 16-bit. The answer has an audio block and a text block with section
  markers (`[[A0]] [[B1]] [[C2]]`; returned as `structure`). All audio carries an inaudible SynthID watermark. Single-turn (no
  edits); results vary between calls; prompts are safety-filtered (no artist voices or copyrighted lyrics).
- **Duration is loose.** Measured: `lyria-3.5` with "30-second" → 62 s; "2-minute" → 122 s; timestamps up to 0:30 → 60 s; up to
  1:30 → 117 s; the clip model always 30.8 s. So `--seconds N` does this: ≤ 30 picks the clip model (half the price), longer is
  asked for in the prompt, and a result longer than N + 1.5 s is **cut to N with a fade-out** (`--no-trim` keeps it;
  `duration_generated` vs `duration` shows both). For an exact length on a long piece, ask a bit long and let the cut do it.
- **Prompting:** be specific about instruments, tempo, key, mood and structure; write the prompt in the lyrics' language; give
  structure as `[0:00 - 0:10] Intro: …` lines or `[Verse]`, `[Chorus]`, `[Bridge]` tags; keep custom lyrics apart from the musical
  direction; for no vocals say "Instrumental only, no vocals" (`--instrumental` adds it). A reply of `<instrumental>` in the text block
  confirms it.
- Image input (up to 10 images with the text) exists in the API; not wrapped.

## Video: Gemini Omni 1.1 Flash (paid fallback when Flow is blocked; ask the owner first)

The same Omni model as in Flow, on this API key, outside the Flow account sessions (no guard, no "unusual activity" blocks).
Tested 2026-11-05 for the segurodedecesos.com ads.

- **Endpoint:** `POST /v1beta/interactions`, model `gemini-omni-1.1-flash`, header `x-goog-api-key`. Image-to-video:
  `input: [{type:"image", data:<base64>, mime_type:"image/jpeg"}, {type:"text", text:"…"}]`,
  `response_format: {type:"video", aspect_ratio:"9:16", resolution:"720p"}` (also `360p`, `1080p`/`4k` upscaled),
  `background:false, store:false, stream:false` for one synchronous call (~30 s for a 4–6 s clip). The video comes back in
  `steps[].content[]` (`type:"video"`, base64 `data`, or `uri` for large files); `output_video` is SDK-only.
- **Say it in the prompt:** "the attached image is the exact first frame", "a single continuous shot, no scene cuts" (Omni
  otherwise cuts between shots), the duration ("a 6-second video"), the line in quotes, and the voice (see below).
- **Price:** ≈ **$0.10 per second at 720p** (5,792 output tokens per second at $17.50 / 1M; input and thinking are cents).
  A 4 s take ≈ $0.40, 6 s ≈ $0.60. 17 takes for one ad set cost ≈ $9: make **one take per clip** and retake only failures.
- **One voice across lines = one session.** Each separate call invents a new voice (and sometimes a Latin American accent).
  The API has no voice or audio reference ("uploading audio references is unsupported", "voice editing is not supported"),
  but the voice carries over when you **extend the same generated video**: turn 1 with `store:true`, then
  `previous_interaction_id: <turn-1 id>` and `input: "Extend this video by 6 seconds … with exactly the same voice, accent and
  tone as before, and says: '…'"` (an image can be added to an extension for the next shot). Each turn returns the whole
  video so far; an extension bills only its new seconds. Cut the lines apart in the edit. Describe the voice identically in
  every turn, e.g. "a warm, smooth, gentle female voice from Madrid, Spain, about 38, soft mid-low pitch, native Castilian
  Spanish (Spain) pronunciation with the Castilian 'z/c' (θ) as in 'precio', 'decesos'; never a Latin American accent".
  A speaker check (ElevenLabs STT `diarize=true`) on the cut confirmed one voice across all three lines.
- **Do not paste another TTS voice onto generated lips.** Re-voicing Omni clips with ElevenLabs and time-warping words onto the
  mouth sounded cut and slowed ("abajo" stretched 1.8× to fill a pause where she points). Without a real lip-sync model,
  on-camera speech should come from the video model itself; ElevenLabs stays for voice-over where no lips move.
- Transcribe every take: Omni sometimes stutters ("ase-aseguradoras") or repeats a phrase; cut at a point you have checked
  by transcribing the joined audio.

## Sources

ai.google.dev/gemini-api/docs/speech-generation, /music-generation, /pricing, /rate-limits (2026-11-01); the model list and token
limits come from `GET /v1beta/models` on this key.
