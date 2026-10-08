# Sound design and the mix

> [!IMPORTANT] Sound design is not optional; music is. The effects are what make a motion film feel alive: every card that lands, every tap, every swipe, every counter tick and every hit gets its sound. Aim for a cue every 1–2 s through the body of the film (the round-3 films had 29–52 cues in ~32 s). With soft or no music the mixer levels effects against the voice (never quieter than voice − 18 dB), so they stay present in the quiet gaps.

Sound is written **in the film's own code**, from the same frame constants the scenes use, so it can never drift from the picture.

## SOUND in the film module

```ts
import { Cue, cue, moments } from "../../kit/sound";
export const SOUND: Cue[] = [
  cue(DROP, "riser", -4, "into the drop"),          // peak-aligned: its loudest moment lands on DROP
  ...moments.hit(DROP, "the drop"),                 // suck → impact → spark → pen draw → light along the stroke
  cue(Q_AT, "send", -3, "customer asks"),
  cue(ANSWER, "receive", -2, "agent answers"),
  ...moments.land(RESULT, "result card"),           // snap + check
  ...moments.hit(HIT, "final hit"),
  ...moments.cta(CTA, URL),                         // pop, sparkle, url blip, tap
];
```
- `cue(frame, sfx, trimDb, note, {kind, align})` names a library effect. `trim` is a dB nudge (−3 = quieter); the `note` shows up in the mix table.
- **Alignment:** swells and hits (`whoosh, suck, riser, zoom, dive, swell, impact, spark`) align their **peak** to the frame you give, so cue a whoosh at the middle of the move and an impact at the hit frame. Everything else aligns its attack.
- **Density:** about 1.5–2.5 cues per second. Every visible event gets one: a message, a card, a tap, a move, a stamp, a counter. Silence is fine only under a held line.
- Export and mix:
```bash
bun scripts/film_sound.ts src/remotion/films/<slug>/<Id>.tsx > public/films/<slug>/sound.json
.venv/bin/python scripts/mix_film.py films/<slug>/film.json --table [--peaks]
```

## Standard pairings

| Event | Cue(s) |
|---|---|
| message sent / received | `send` −3 / `receive` −2 (quieter for background chatter) |
| question arrives on a phone | `ping`, `notif`, `blip` (vary them) |
| card or result lands | `snap` −4 at +2, `check` −6 at +8 (`moments.land`) |
| sparkles / sheen / "in their language" | `shimmer` −8…−10 |
| tap / click | `tap` −1…−2 / `click` −1 |
| typing | `type` (laptop) or `keys` (phone), −4…−5 |
| toast | `toast` −2…−3 |
| wrong answer / not found | `miss` −1 |
| it learned / feedback applied | `learn` 0…−2, `seal` for "for good" |
| scene move / swipe | `whoosh` −5…−8 at the middle of the move |
| pull-back / zoom out | `zoom` −2…−4 at the middle |
| fly-through / dive | `dive` 0 |
| counters rolling | `data` −10 |
| notification pile / wall of chats | `flurry` −8…−12 |
| a doubt drifts / a question hangs | `blip` −10 |
| stamp (HIRED, A+) | `impact` −2 (kind hit) + `flurry` or confetti |
| the drop / final hit | `moments.hit` (suck, impact, spark, draw, shimmer); a `riser` into a drop |
| CTA | `moments.cta` |
| dark ambience / night | `hum` or `night` at 0…+6 (kind ambience sits −20 dB under the bed) |

## Library (42 effects; peak = the loudest moment after lead-in trim)

The files live in the asset pack's `sfx/` (outside the skill), and `new-project.sh` installs them into each project's `public/sfx/`.

| Name | Kind | Align | Length | What it is |
|---|---|---|---|---|
| `birds` | ambience | attack | 5.896s | morning birdsong |
| `hum` | ambience | attack | 4.0s | dark electrical hum |
| `night` | ambience | attack | 10.0s | city night ambience |
| `check` | confirm | attack | 0.68s | positive confirmation chime |
| `learn` | confirm | attack | 1.28s | ascending sparkle chime (it learned) |
| `miss` | confirm | attack | 0.68s | soft negative tone (not found) |
| `seal` | confirm | attack | 0.8s | lock click + chime |
| `impact` | hit | peak @0.329s | 2.0s | cinematic boom (drops, final hit) |
| `answer` | phone | attack | 0.8s | call connected |
| `buzz` | phone | attack | 0.6s | phone vibrating on a table |
| `ring` | phone | attack | 1.0s | incoming call chime |
| `clock` | prop | attack | 2.373s | quiet ticking clock |
| `flip` | prop | attack | 0.8s | shop sign flipping |
| `poweron` | prop | attack | 1.2s | device power-on |
| `sink` | prop | attack | 1.36s | muffled sinking thud |
| `dive` | sweep | peak @0.113s | 1.0s | forward dive whoosh |
| `draw` | sweep | attack | 1.6s | light-trail swoosh (pen draws) |
| `glassify` | sweep | attack | 1.6s | crystalline transformation |
| `riser` | sweep | peak @1.284s | 1.591s | tension riser into a drop |
| `shimmer` | sweep | attack | 1.2s | glassy sparkle sweep |
| `suck` | sweep | peak @0.447s | 1.0s | reverse whoosh into a hit |
| `swell` | sweep | peak @1.116s | 2.48s | warm cinematic swell |
| `whoosh` | sweep | peak @0.142s | 0.8s | clean fast whoosh (moves) |
| `zoom` | sweep | peak @0.405s | 1.59s | wide airy pull-back |
| `blip` | ui | attack | 0.48s | soft chat blip |
| `click` | ui | attack | 0.48s | mouse click |
| `data` | ui | attack | 1.2s | data processing blips |
| `flurry` | ui | attack | 2.0s | pile of notifications |
| `focus` | ui | attack | 0.595s | lens focus snap |
| `glitch` | ui | attack | 0.6s | digital glitch stutter |
| `keys` | ui | attack | 1.2s | touchscreen typing |
| `notif` | ui | attack | 0.6s | gentle phone notification |
| `ping` | ui | attack | 0.48s | bright two-tone message ping |
| `pop` | ui | attack | 0.48s | soft rounded pop (element appears) |
| `receive` | ui | attack | 0.48s | incoming message pop |
| `send` | ui | attack | 0.48s | message sent swoosh |
| `snap` | ui | attack | 0.48s | magnetic snap (card locks in) |
| `spark` | ui | peak @0.119s | 1.0s | electric spark ignition |
| `tap` | ui | attack | 0.366s | phone screen tap |
| `tick` | ui | attack | 0.48s | crisp digital UI tick |
| `toast` | ui | attack | 0.6s | UI toast chime |
| `type` | ui | attack | 0.796s | laptop typing burst |

New effects: add a prompt to `scripts/sfx.py` (ElevenLabs text-to-sound v2; `duration_seconds` must be ≥ 0.5; up to 5 concurrent). In a project, run `. scripts/el-env.sh && SFX_DIR=sfx .venv/bin/python scripts/sfx.py <name>`, then `.venv/bin/python scripts/sfx_library.py` to re-measure, then `bash $SKILL/scripts/assets.sh adopt-sfx .` to save the new effect into the asset pack and `assets.json` (never into the skill). Add the name to the `Sfx` type in `kit/sound.ts`, in the project and in `$SKILL/engine`.

## How the mix works (scripts/mix_vo.py, driven by mix_film.py)

1. **Voice:** every line (and each cast line) is loudness-matched to the median speech RMS. Gentle peak compression on the voice bus (`voComp`: 3:1 above RMS + 9 dB) stops a shouted brand name from triggering the limiter.
2. **Music:** gain is set so the ducked bed sits `underVoiceDb` (11) below the voice. It ducks −6 dB under speech with a 0.2 s attack and 0.45 s release, smoothed. `hit` adds the pre-hit drop-out, and the tail fades.
3. **Effects:** each is trimmed of lead-in silence, placed on its (aligned) frame, and levelled **by measurement** against the bed at that moment: ui −10 dB, confirm −9, phone −9, sweep −12, prop −9, ambience −20, hit −4. Peaks are capped under the voice's peaks (ui/confirm −9 dB, sweep −7, hit −4).
4. **Master:** normalise to −14 LUFS, then a look-ahead limiter with a −2.0 dBFS ceiling gives ≤ −1.5 dBTP. The printout shows loudness and limiter reduction; ≤ 2.5 dB of reduction is healthy. `--peaks` lists where the limiter works and who is loud there. `--table` lists every cue with its gain.

`mix_film.py` also writes `<mix>.cues.json`, the resolved cue sheet, for debugging.

## You can't listen, so verify

- **Speech-to-text of the mix** (`qa.py` on the master) must return the script word for word. That proves no effect or music masks the voice.
- **Loudness:** −14 ± 0.5 LUFS, true peak ≤ −1.5 dBTP.
- **Spot checks:** `--peaks` shows the top 8 loudest blocks. If an effect dominates one (sfx within 3 dB of the voice), trim it.
