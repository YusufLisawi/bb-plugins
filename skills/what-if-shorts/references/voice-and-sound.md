# Voice and sound

## 1 · The narrator

The format's voice is an energetic young American man who talks fast but clearly, like a friend telling you
something urgent. The farm reference measured ≈ 163 Hz and ≈ 2.9 words/s with short breaths and no long pauses.

**Default narrator:** Fish Audio `drama-3-preview`, **"Alex American Young male"**
(`078eaa5208ca42a1909d2e6fac9c93f7`), chosen from 8 Fish voices on farm: F0 162 Hz vs the reference's 163, the
same energy, STT 1.000.

```json
{ "N": { "provider": "fish", "model": "drama-3-preview", "voice": "078eaa5208ca42a1909d2e6fac9c93f7",
         "name": "Alex American Young male (Fish)", "temperature": 0.7, "top_p": 0.7, "tags": "strip", "speed": 1.0 } }
```

- **No emotion tags** for this narrator (`"tags": "strip"`). Tags make Fish drag (2.35–2.6 w/s measured on other
  films). The energy comes from the writing: short punches, connectors, the turn.
- **Speed:** start at 1.0. If the take's speech pace is under 3.0 w/s or the film runs over 72 s, cut words first,
  then try `"speed": 1.04–1.06`. That is Fish's own prosody speed, not a stretch, and farm shipped at 1.06. Never
  `atempo` or time-stretch.
- **Variety:** for a channel of many films, the same narrator is the brand. Use another voice only for a different
  series, and audition it the same way (`scripts/voice_audition.py`, below).

**Sample 4–6 takes and pick by measurement.** You can't listen, so measure. Fish's prosody changes from take to
take: on farm, 5 takes at speed 1.04–1.08 ran from 60.0 to 64.4 s.

```bash
for n in 1 2 3 4 5; do
  .venv/bin/python scripts/voice.py <slug>
  cp public/<slug>/vo/raw/narrator.wav  public/<slug>/vo/raw/narrator_t$n.wav
  cp public/<slug>/vo/raw/narrator.json public/<slug>/vo/raw/narrator_t$n.json
  python3 ~/Developer/bb-plugins/skills/what-if-shorts/scripts/lint_script.py episodes/<slug>/script.tsv \
      --engine <engine> --lines public/<slug>/vo/lines.json | tail -3        # film length, pace, gaps
done
# copy the chosen take back to narrator.{wav,json}, then:
.venv/bin/python scripts/voice.py <slug> --reuse
.venv/bin/python scripts/stt_check.py <slug>                                  # ≥ 0.98, no spoken tags
```

Pick the take with: film length ≤ 72 s, speech pace 3.0–3.3 w/s, no gap over 1.0 s inside a line, every line start
within ≈ 1 s of the plan (for clones, of the reference), and STT 1.000.

**One seamless take (owner rule).** The narrator's lines are one unbroken piece of the take. The only inserted air
is the script's `+0.6`–`+1.0` hold before the reveal, split at the quietest point between sentences.

## 2 · Other voices (dialogue)

Cast lines (≤ 6 per film) get their own Fish voice, are generated separately with neighbouring context, and are
loudness-matched by `voice.py`. Pick by role. These voices were approved on earlier films:

| Role | Voice | id |
|---|---|---|
| bright, playful woman | Verity | `8d21b053e2804e2a890e1cf62f267b6f` |
| energetic, friendly man | Alex (energetic) | `b5f4515fd395410b9ed3aef6fa51d9a0` |
| serious, deep man | True Crime (M4K) | `0c433181a86b45ea8c730d856525ffb5` |
| calm survival narrator (HD-2D) | Ethan | `536d3a5e000945adb7038665781a4aca` |
| woman, in-world | Laura | `e3cd384158934cc9a01029cd7d278634` |

Never use "adam adam" (`9259a7392c454a1eb6436141abb5a558`). For a new role (a kid, an 81-year-old), audition 3–4 Fish
voices on the character's own lines:
`.venv/bin/python scripts/voice_audition.py <slug> episodes/<slug>/audition-passage.txt fish:<id>:<name> …`
writes `episodes/<slug>/voice-audition.md` (accuracy, pace, pitch range, gaps). Search more with
`GET https://api.fish.audio/model?title=…`. The key is in `~/.config/motion-film-studio/fish.env`; never print it.

ElevenLabs (voices, SFX, music) has had no credits since 2026-10-21, so don't call it until the owner says otherwise.

## 3 · The score (synthesized, from the voice timing)

Copy `episodes/farm/synth_score.py` to `episodes/<slug>/` and re-anchor it. It reads `public/<slug>/vo/lines.json`,
so a re-voiced film re-times its score.

| Layer | Farm recipe | Re-anchor |
|---|---|---|
| Drone | D1 + D2 sub sines with slow swells, all film long | keep |
| Pads | filtered detuned saws, one chord per act: tension (D F A) → the b2 rub on danger (D E♭ A) → lighter on the animals → hope on counting (D F A C) → the twist (D E♭) | the `B` dict: one key per act start (line ids) |
| Felt pulse | soft low thumps every 0.79 s while things happen, 0.62 s with a tick on the countdown | the busy stretches |
| Stings | a hit on each slam, a 1.2–1.4 s swell-up before the 2nd and 3rd | the slam words |
| The drop | gain 0.12 between the end of the turn line and the reveal line | the turn and reveal line ids |
| End | a low rumble into the eyes, a dark ringing chord under the end card | `END + 0.62`, `END + 1.78` |

Levels: `mix.py` sits the score about 17 dB under the voice and ducks it 7 dB more under speech. Shape it with the
`MUSIC` automation in `sound.ts` (`[t, dB]` pairs): a lift on maps and slams, −4 dB in the drop, −6 at the end.
Ladder and POV films are sound-led, so bring the music up 6–8 dB there.

## 4 · Foley: a cue for every visible event

`src/episodes/<slug>/sound.ts`, written from the SAME beats as the picture:

```ts
const c = (t: number, sfx: string, kind: Cue["kind"], db = 0, more: Partial<Cue> = {}): Cue => ({ t, sfx, kind, db, ...more });
const bed = (a: number, b: number, sfx: string, db = 0, note = "", fi = 0.3, fo = 0.4): Cue => c(a, sfx, "amb", db, { dur: b - a, fi, fo, note });
export const CUES: Cue[] = [
  bed(0, S.farmWide, "kitchen", -2, "kitchen: the fridge hum", 0.0),       // one bed per set, crossfaded
  c(0.05, "buzz", "fx", -2, { note: "the phone buzzes on the table" }),   // every action
  c(B.pinWater, "pop", "ui", 0, { note: "WATER" }),                       // every HUD landing
  c(ws("barn", 5) + 0.05, "title_hit", "hit", -8, { note: "INSIDE THE BARN." }),
];
export const MUSIC: [number, number][] = [[0, 9], /* … */];
export const META = { duration: DUR, slug: "<slug>" };
```

| Kind | What | Typical sources |
|---|---|---|
| `amb` beds | one per set (kitchen hum, farm by day, night wind, dark room, street with sirens) | other episodes' beds |
| `fx` actions | steps on grass or dirt, paws, doors, taps, engines, keys, chains, pen, animal sounds | `public/farm/sfx/` (barks, clucks, moos, gate creak and clank, cord pull, starter, keys jingle, padlock …) |
| `ui` HUD | `pop` / `pop2` per pin, `tick` per digit, `stamp` for tags, `impact` for big numbers, `swipe` when the HUD leaves, `click` for checks | `~/.local/share/motion-film-studio/sfx/` |
| `hit` | slams and the reveal: `title_hit`, `silence_hit`, `stinger` | farm and other episodes |

- **Density:** farm has 158 cues (26 beds + 132 fx / ui / hits = 2.0 per second). Aim for at least 1.2 per second.
- **Search the R2 sound library first.** 948 unique sounds from every episode, deduped and sorted into 13 folders
  (ambience, ui-and-graphics, transitions, impacts, music-stings, people, animals, household, vehicles-and-machines,
  nature-and-water, paper-and-craft, horror, misc). The index is `public/_sfx_index.json` in story-studio, also at
  https://faceless.clipaf.com/story-studio/sfx/index.json, as `{name, category, url, prompt, dur, loop, episodes}`.
  A name with `--<episode>` is a different take of the same idea. Search the names and prompts, then
  `curl -so public/<slug>/sfx/<name>.mp3 <url>`. Generate only what isn't there, then run
  `uv run --with boto3 scripts/r2_sync.py sounds` so the next episode can reuse it. Music scores are in `story-studio/music/<episode>/`.
- **Sources, in order:** copy what exists (`episodes/farm/sfx_pick.py` pattern: the shared library
  `~/.local/share/motion-film-studio/sfx/` + other episodes' `public/<ep>/sfx/`). Synthesize what's missing
  (`episodes/farm/synth_sfx.py`: source-filter animals, modal metal and wood, each checked by measured duration,
  peak and centroid, because you can't listen).
- The voice stays on top: fx at −2 to −12 dB, ui ticks quiet (−4 to −10), beds low.

## 5 · The mix

```bash
scripts/sound_export.sh <slug> <slug>                 # sound.ts → public/<slug>/sound.json ("158 cues · 65.3 s")
.venv/bin/python scripts/mix.py <slug>                # voice + cues + score → public/<slug>/mix.wav
.venv/bin/python scripts/stt_check.py <slug> public/<slug>/mix.wav    # ≥ 0.98 on the MIX (sound mustn't mask words)
```

Targets: −14 LUFS (±0.7), ≤ −1.5 dBTP. Farm: −14.1 LUFS, −2.2 dBTP, STT on the mix 185 / 185. Commit
`public/<slug>/{mix.wav, sfx/, music/, vo/}`.
