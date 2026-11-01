# Google AI Studio speech generation (Gemini TTS) in the browser: the FALLBACK route

**The default for speech is the Gemini API** (`scripts/gemini_audio.py`, [gemini-api.md](gemini-api.md)): same model, no browser,
no Google-account pacing, multi-speaker, chunking. Use the Playground route below only when the API key is missing or out of
quota, or when a Pro account's own Playground quota is wanted. It runs on one of the four accounts (`--account google1 … google4`
or `auto`, the signed-in one with the most speech room; see [accounts.md](accounts.md)). Tags here are `<angle>`.

`scripts/aistudio_tts.py` drives the Playground at https://aistudio.google.com/generate-speech in the same PinchTab browser
and Google account as `flow.py`. One call = one take. Every browser command goes through `google_guard.py` (one Google
job at a time, human pauses, daily caps, shared cool-down on any warning).

## Model and voices (checked 2026-11-01)

- Model: **Gemini 3.8 Flash TTS** (`gemini-3.8-flash-tts`), the default and only TTS model in the Playground's model
  card. Google's card: "Flagship TTS model for Voice Design and dual-speaker screenplay control. Prompt custom vocal
  personas, direct line-by-line delivery, and add vocal bursts."
- The voice panel says **"Search 2,000+ voices"** across all languages. The Language filter lists English (US), French,
  German, Italian, Korean, Spanish, Japanese, Hindi, Portuguese and Chinese.
- **English (US) = 70 voices**: 37 Masculine, 33 Feminine, 0 Neutral. Two sets:
  - 40 named voices (Arlo, Bodi, Brio, Cleo, Cruz, Daro, Elio, Enya, Enzo, Finn, Fola, Gero, Hali, Jett, Jori, Kira, Knox,
    Koda, Lora, Ludo, Lumi, Mako, Milo, Neno, Nika, Nyla, Olin, Rami, Riko, Rina, Sami, Sola, Tari, Tavi, Tova, Varo, Veda,
    Zali, Zeno, Zuri). Google gives each a two-part description, e.g. "Confident and clear. · Deep pitch".
  - 30 prebuilt Gemini voices (Achernar, Achird, Algenib, Algieba, Alnilam, Aoede, Autonoe, Callirrhoe, Charon, Despina,
    Enceladus, Erinome, Fenrir, Gacrux, Iapetus, Kore, Laomedeia, Leda, Orus, Puck, Pulcherrima, Rasalgethi, Sadachbia,
    Sadaltager, Schedar, Sulafat, Umbriel, Vindemiatrix, Zephyr, Zubenelgenubi). Descriptions are one word, e.g. "Soft · Higher pitch".
- The default speaker is **Fola**. The Playground "Speaker settings" panel has a voice search and filters: Language,
  Gender, Pitch, Style, Use case.

## Emotion control

- **Inline expression tags, in angle brackets**: the editor offers 38 of them: argh, breath, cackle, cheer, chuckle,
  chuckles, cough, cry, exhales, gasp, giggle, groan, growl, grr, grunt, heavy breath, hiss, laugh, laughter, long pause,
  moan, pant, pff, phew, scream, short pause, shout, shriek, sigh, sighs, sneeze, snicker, snort, sob, throat-clearing,
  tsk, whimper, whispering, whispers, yawn. Example from the placeholder: `<gasp> That's a great idea! <laugh>`.
  Square brackets like `[calm]` are NOT tags: the model reads them as text. There is no "calm" tag: emotion comes from the
  words, the punctuation, and the style line.
- **Style**: a free-text box, "Describe the voice style", behind the Style chip. Presets seen: Whisper, Friendly,
  Narration, Promote, Podcast (free text overrides them). Pass it with `--style`.
- Multi-speaker: the Playground has more speaker blocks ("Add speech block"). Not used yet by the script.

## Output

- The page plays the take as a `data:audio/wav;base64,…` URL. The script copies it out in 200 000-character chunks.
- Format measured on the first take: **WAV, 24 000 Hz, mono, 16-bit PCM**, about 47 KB per second.
- A passage of about 45 words is 16–18 s; the generation itself took 20–25 s.
- `speak --mp3` (or `mp3 IN.wav OUT.mp3`) gives a -16 LUFS, 44.1 kHz mono, 128 kbps MP3.

## Loudness (why the chain is not plain loudnorm)

Raw takes measure about -21 LUFS with peaks near -1.4 dBFS. `loudnorm` with TP=-1.5 cannot reach -16 LUFS on them: its
true-peak ceiling stops the gain at about -17 LUFS (even with a 3:1 compressor first). `to_mp3` therefore measures the take
with ffmpeg's ebur128, applies the gain, runs `alimiter=limit=0.84` (about -1.5 dBFS), and corrects the gain up to three
times until the integrated loudness is within 0.15 LU. Result on the Arlo take: -15.9 LUFS on the WAV and -16.3 on the
final MP3 (MP3 encoding moves it a little). Loudness range is kept (about 6 LU).

## Limits and guard

- Shared guard (`google_guard.py`, settings in `~/.config/google-flow/config.json` under `guard`): one Google job at a time
  (flock), a random 20–60 s human pause between `tts` jobs, daily cap **80 tts per local day** (`cap.tts`), and a shared
  cool-down of 120 min after any "unusual activity", quota, rate-limit or "exceeded" text.
- `speak` never retries. A rate-limit message ends the command with `rate_limited: true` and starts the cool-down.
  Do not loop it yourself.
- Quota numbers for the Pro plan are not shown in the UI. Observed limits: see the "Audit run" section below.

## Pitfalls (each one bit during the build)

- The `<audio>` element first holds a short partial data URL and then the whole take. `run_and_wait` waits until the source
  has changed, the duration is at least 0.5 s, and the length is unchanged across two polls. Taking the first `data:` source
  gave a 0.04 s file.
- The voice card is one button whose text is "Name Description · Pitch". A selector click on the name did not select the
  voice; the card click does. Clicks go to the element's centre in viewport coordinates, because selector clicks re-scroll
  the overlay and landed on the neighbouring button (Style instead of Language).
- `fill` with an empty string does not clear the voice search box; the script sets the input's value through the native
  setter and fires an `input` event.
- The language and gender filter triggers are plain buttons whose text reads "English (US) arrow_drop_down".
  The menu items are `[role=menuitem]`.
- New chat is icon-only (`button[aria-label="New chat"]`). It returns to the examples page; the editor comes back through
  the "Create new dialog" card (`.action-card`, text match, because "Create new voice" is a card too).
- The voice panel covers the Run button on the right: the script closes it before the run.
- `Run` is `button` text starting with "Run" (`xpath://button[starts-with(normalize-space(.), "Run")]`).
- Never click "No API key selected" or "Get API key". The Run button works without choosing a key on this account; the
  label is only a label.

## Audit run (English, one take per voice)

The passage used for every voice, with `<whispers>`, `<gasp>` and `<laugh>` inside it:

> It started like any other night, quiet and still. <whispers> Then the lights went out, and the whole house went silent.
> <gasp> Something moved in the hallway. <laugh> But then we laughed, because it was only the cat, and the cat was not
> sorry at all!

Outputs and measurements: `~/Developer/story-studio/out/aistudio-voices/en/` (`voices.json`, `raw/*.wav`, `<voice>.mp3`,
`measure.py`, `run_audit.sh`). See the run notes at the end of this file once the audit is finished.
