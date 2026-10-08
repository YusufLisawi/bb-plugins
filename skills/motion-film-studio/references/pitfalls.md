# Pitfalls: symptom → cause → fix

Every one of these happened while making the eight films. Read this first when something looks or sounds wrong.

## Picture

| Symptom | Cause | Fix |
|---|---|---|
| A digit or letter's edge is cut off (the user spotted a clock's "6/7") | an `inline-block` mask shrank with negative tracking, or had no line-height room | masked vertical strips with the line height built in (`Odometer`, the `Kinetic` mask padding `0.06em 0.04em 0.2em` with a negative margin) |
| Text renders in a serif font | the film root didn't set `fontFamily`, and a component relied on inheritance | `<AbsoluteFill style={{ fontFamily: FONT }}>` at the film root; kit components set it themselves |
| Black text on a dark glass card (user-spotted) | a text colour inherited from a light context | every dark panel sets `color` explicitly (`GlassPanel` does) |
| Counters "stop at a number that's not a number, like a lag" (user-spotted) | each digit rolled continuously and stopped mid-roll | `Odometer` with carry logic (a digit turns only while the lower digits roll over from 9) and round final values |
| "The dots linking inside the box, make it cleaner" (user-spotted) | random nodes plus spokes crossing the logo, drawn over the mark | an evenly spaced orbit, spokes that stop at the object's edge, the object on top, light travelling along the spokes |
| "Different people" are the same face (another agent's film) | one image prompt reused, or the same seed | four clearly different people (age, gender, ethnicity), checked at thumbnail size |
| A frame goes grey at the drop | a slow dark → cream cross-fade passes through grey | a 4-frame cut hidden inside the `Impact` bloom |
| A flat white or grey flash looks like a glitch | a full-frame solid flash | a radial bloom of light from the impact point (`Impact`) |
| One-frame spikes in the glitch scan | per-frame random jitter (a "shake") double-exposes under the 8-sample blur; a sine shake that starts with a jump (`cos` at t = 0) flags too | continuous low-frequency sine motion that starts at 0 on both axes (`sin`), damped over ≤ 12 frames; skip the shake on a beat that already has a flash or a glow |
| The first frame is empty (a cork board with nothing pinned, a queue with no people) | elements spring in from frame 1, and a spring is invisible at its own start frame | start the hook's springs before 0 (`at = -14`) so frame 0 already shows the scene; the first frame is the thumbnail on most feeds |
| Chat messages overlap the captions, or a hand-tuned scroll drifts off after a re-voice | a top-anchored chat with guessed heights | `kit/chat.tsx`: `WaDay` is bottom-anchored and `LMsg` grows its height in, so older messages glide up by themselves (`rtl` for Arabic) |
| A caption phrase runs on past a quote ("back." Nadia) | the sentence test missed a closing quote | fixed in `phrasesFrom` (`/[.?!,:]["”’')]*$/`) |
| An old headline overlaps the new one | `to` too close to the next `from` | the old headline exits 7–8 frames before the next line's first word |
| The end-card pill says "Build your first agent for free" but the voice says "Try it for free" | `Lockup` defaults to `BRAND.ctaDefault` | pass `cta="Try it for free"` whenever the script's last line uses that wording; check the CTA frame against the script |
| Outgoing chat messages slide over the card header | an unclipped message area | wrap the messages in a clipped div below the header |
| A toast wraps onto two lines | the text is too long for the card | nowrap plus a smaller size, or a wider toast; plan the copy length |
| Static-looking frames and empty space (another agent's film) | elements popped in and then held still in a big empty stage | a camera push or drift on every hold, bigger UI filling the stage, bokeh or dot-field life |
| Doubt marks or effects overlap the headline | positions not checked against the headline zone | keep effects below `L.headline.y + L.headline.h` |
| `<Freeze>` shows the wrong frame or clamps at the end | Freeze clamps to the composition length | SS compositions are `D × 8` long; for story-time warps use a frame hook, not Freeze |
| Colours shift in the motion-blurred master (cream came out grey) | Remotion's CameraMotionBlur stacks 8-bit layers | use the SS composition plus `finish.py` float averaging |
| "Don't show the tool call as code, our target doesn't read code" (user) | `ToolCall` printed a function name and typed arguments | `kit/systems` `SystemCard`: the agent ⇄ the business's own system, one plain sentence, the result as facts |
| A chat list snaps up in one frame (the glitch scan flags it; a smear under motion blur) | rows eased a generous `maxHeight` (420 × quintOut reaches the real height in ~1 frame), and flex items in an overflowing bottom-anchored column shrank | grow each row to its MEASURED height (`wrapLines` + explicit line heights) with `cubicInOut` over 8 frames, `flexShrink: 0` on rows; in top-anchored cards reserve the space and only fade/slide the bubble in; swap two states in one fixed-height slot (crossfade), never unmount one and mount another |
| A card jumps when a placeholder fills in ("what they asked" → "a quote") | the text reflowed to fewer lines | give the bubble a `minHeight` for its largest line count |
| `Page crashed!` at the same sub-frame on every retry (fine as a still, fine at concurrency 1) | per-tab GPU load: a CSS `filter: drop-shadow` on a large scaled SVG plus a 260 px `inset` box-shadow vignette, ×5 tabs (worse while stills render in parallel) | glows and vignettes as `radial-gradient` divs; don't render stills while a master renders; reproduce with a short `--sequence --frames=a-b --concurrency=5` render |
| A shaking or blinking object flags the glitch scan (the ringing phone) | a sine at 2.4 rad/frame is near Nyquist (it flips every frame); lights toggled hard on/off | shakes ≤ ~1 rad/frame; blinks as a steep but continuous ramp (`0.35 + 0.65 * clamp(0.5 + sin(f * 0.45) * 1.6)`) |
| A horror flicker built from `rnd(floor(f / 2))` | random 2-frame drops read as glitches | scripted dips at chosen frames with 3-frame ramps |
| Another brand's film still glows Brainfast coral (bokeh, CTA shadow, sheen) | `rgba(217,87,89,…)` hard-coded in kit pieces | every colour comes from the brand kit: `C.*` for fills, `ACCENT_RGB` for rgba() glows; `brand-preview.sh` + a Starter still with the new kit catch leaks |

## Audio

| Symptom | Cause | Fix |
|---|---|---|
| "The voice is slow, boring and not smooth" | lines generated one by one, slow read, flat voice | one continuous v3 take, tightened pauses, `--tempo 1.06`, an expressive narrator (Michael) |
| "The voice sounds away from the microphone" | the voice's own recording character (Liam) | switch the voice; never argue with this, the user hears it |
| Asked for faster speech, got slower | v3 ignores `voice_settings.speed` | atempo in post (`--tempo`) |
| Expression tags spoken aloud | a malformed tag, or the v2 model | use eleven_v3; `vo_take.py` reports `tags spoken`; fix the tag and regenerate |
| The drop doesn't land on the word | one long music generation drifts by ≈ 1 s | generate pieces that start on their first beat and stitch them on frames |
| A stretch of the bed is nearly silent (a [Build] chunk came out as one held chord decaying to nothing) | the model ignored the chunk's styles | always look at the spectrogram; regenerate the piece with `neg: ["silence", "sustained single chord", "fade out"]`, or combine takes: keep the good part of one, cut to another on a story beat, and gain-match it (write a quieter copy with `audio.write_wav`) so the drop still stands out |
| A music 429 error | the 2-concurrent limit is shared across threads | one request at a time with back-off (`music_pieces.py` does it) |
| SFX generation 400: duration | `duration_seconds` < 0.5 | use ≥ 0.5 |
| The limiter pumps and peaks read −0.x dBFS | a shouted word, or an effect as loud as the voice | `voComp` on the voice bus; peak caps per kind; `--peaks` shows the culprit |
| An effect lands late | it starts with silence, or its loudest moment is late (a whoosh or riser) | the mixer trims lead-in silence; the library aligns the peak for swells and hits |
| Speech-to-text misses a word in the final mix | an effect or music masks it | trim that cue by −3…−6 dB; raise `underVoiceDb` |

## Pipeline

| Symptom | Cause | Fix |
|---|---|---|
| The encoded mp4 is too short (it started mid-film) | encoded from a patch's first frame | `finish.py --encode` now always encodes the whole contiguous sequence and refuses gaps |
| `Error: Page crashed!` part-way through a long render | a GPU tab crash | `render_resume.sh` resumes from the first missing sub-frame |
| "Could not take a screenshot because Google Chrome ran out of memory or disk space", every attempt dies after a few frames | on this machine `/tmp` is **tmpfs (RAM)**; renders or test projects in `/tmp` plus other browsers (a stale headless preview tab took 4.3 GB) exhaust RAM | render into the project's `out/` on disk, delete old sub-frame folders, close stale preview tabs (`pinchtab tab`), check `free -g`; `render_resume.sh` lowers the concurrency automatically on this error |
| The first stills on a fresh project all fail | parallel first runs race on downloading the headless browser | `stills.sh` renders the first frame alone |
| `bun scripts/film_sound.ts` fails with `FontFace is not defined` | the composition loads fonts at import | the script stubs FontFace and document; keep font loading in `loadFonts()` |
| `npx remotion compositions` shows no table | `--log=error` hides it | don't pass `--log` when parsing |
| `new-project.sh` stops with "MISSING (required)" | the asset pack (media kept outside the skill) isn't on this machine | `assets.sh pack` on a machine that has it and `assets.sh unpack` here, or rebuild: `assets.sh fonts`, `assets.sh grain`, and `sfx.py` for the SFX (see the header of `assets.sh`) |
| The skill directory grows past a few MB | media was copied into the skill | move it into the asset pack and `assets.json`; `selftest.sh` fails when the skill reaches 10 MB |
| Typecheck fails after `new-film.sh` | the placeholder timing is missing, or the film isn't registered | new-film writes placeholder timing (the Starter's read) until `split_take.py` writes the film's own, and registers the film in `registry.ts`; check both |
| A new film looks like a sibling of an old one | it was started from an old film's scenes, or designed before looking at what's taken | start from the blank canvas, fill in the brief's concept section first, and check it against films.md § What each film owns |
| Worried the key leaked | — | `scripts/el-env.sh` never prints it; never `echo $ELEVENLABS_API_KEY`, and never paste it into files or memories |

## Collaboration

- Don't hand film work to another agent thread without a strict brief and a review. A delegated pair of films came back well below the bar (static frames, the same face for different people, the rejected voice), and the user asked for them to be remade and not to use that agent again.
- The user reviews on a phone through remote access: always give `bb connect expose` links and the inline player, never localhost.
