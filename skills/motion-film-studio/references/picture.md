# Picture: the kit, proven motion, and room to go further

This page has three kinds of content:

- **Rules that keep any style clean** (§ Constraints). These are fixed.
- **Values and moves the finished films used** (§ Proven motion values, § Transitions the films used). They're a tested starting point: smooth under the motion blur, readable, on the beat. Tune them to your film's motion language.
- **Ideas no film has used yet** (§ Make it yours). Every new film should bring at least one thing the others don't have.

## The kit (src/remotion/kit)

| Module | Use it for |
|---|---|
| `format` | `useLayout()`: zones for the current format (headline, stage, safe, bug, lockup, `u` scale). `<Fit w h>` fits a design box into the stage. `fitPoint()` maps a design point to the frame. |
| `type` | `<Kinetic words from to …>`: word-rise headlines keyed to the voice. `<Letters>` for wordmark letter rise, `<Typed>` for the typewriter. `measure()` |
| `fx` | `springAt`, `Sheen`, `ShineText`, `Sparkle(s)`, `Burst`, `Ring`, `Impact` (bloom + 2 rings + burst), `Glow`, `Odometer`, `Bokeh`, `Confetti`, `Stamp`, `Grain`, `DotField` |
| `ui` | `Card`, `GlassPanel`, `Bubble`, `Typing`, `AgentDot`, `Person`, `Chip`, `ResultCard`, `Touch`, `Cursor`, `Toast`, `Phone`, `Waiting`, `ChannelGlyph`, `Mono`, `Icon`, `CheckDisc` |
| `people` | `<Face p={PEOPLE.maya} size ring>`: flat illustrated people (skin, hair style, glasses, beard) so "different people" really look different; `<Who p caption>` = face + name + caption; 14 ready-made `PEOPLE` |
| `camera` | `<World cam anchor>`, `swing()`, `worldToScreen()`, `<Flyer pts span>`, `<Lane>` |
| `cube` | `<GlassCube size rx ry glass glow inner sheen>`: a CSS-3D box that turns from black to glass |
| `lockup` | `<Lockup hit tag ctaAt urlAt cta dark>`: the shared end card; `<Bug from to>` |
| `timing` | `makeTiming(lines, words)` → `ws(line, i)`, `we`, `lineEnd`, `nwords`, `said` |
| `sound` | `cue()`, `moments.hit/land/move/ask/answer/cta` |
| `ss` | `makeSS(Film)`: the 8-sub-frame motion-blur master (Root registers it) |
| `lib/ease` | `tw(f, a, b, from, to, ease)`, `keys(f, [[f, v]…])`, `E.*` easings, `mix`, `mixColor`, `clamp`, `rnd` |

Brand pieces: `brand/Mark` (the pen-stroke logo: `progress`, `start`, `head`, `stroke`), `brand/Icons` (Lucide-style: zap, sparkles, send, check, truck, calendar, userPlus, headset, thumbsUp/Down, eye, lock, book, bed, laptop, stethoscope, sun, moon, globe, help, bag, trend, cube…). `lib/path` has Catmull-Rom helpers (`crPath`, `crPoint`, `crLength`) for drawing and moving along smooth curves, and `lib/logo` samples the mark's stroke (`markPoint`, `markSamples`).

The kit is a floor, not a ceiling. Write what your idea needs: CSS 3D, SVG filters, canvas, clip paths and masks all render (use `--gl=angle`). Anything driven by `useCurrentFrame()` is deterministic and motion-blurs correctly. If a new piece is reusable, move it into `kit/`.

## Constraints: fixed in every style

- **Continuous motion only.** Any shake, float or flicker is a low-frequency function of the frame (`sin(f·0.45…1.0)`). Per-frame random jitter becomes a double exposure under the 8-sample blur, and the glitch scan flags it. `rnd(seed)` is for layouts that stay put, not for per-frame motion.
- **Nothing is ever perfectly static,** and nothing hard-cuts. A hold still drifts or pushes (scale +0.03–0.06 over the hold).
- **One focal point at a time.** Things settle before the next beat asks for attention.
- **Legibility:** text inside `L.safe`, headlines above the UI, explicit colours on every dark panel, masks with line-height room (see § Text).
- **No grey mush:** a dark → light change goes through a hidden cut or a bloom, not a slow cross-fade (see § Backgrounds).
- **Everything from the voice:** the frames come from `T.ws()`, and the sound cues come from the same constants.

## Proven motion values (a starting point)

| Element | What the films used |
|---|---|
| **Word rise** (headline) | `tw(at−3, at+12, E.expoOut)`: translateY 135 % → 0, rotate 6° → 0, weight +180 → base. Masked with padding for descenders. Accent words take the accent colour; `shineAt` runs a highlight through them once the line lands. |
| **Headline exit** | 7–8 frames `E.expoIn`, −50 px, fade. The next headline's first word starts after the exit ends. |
| **Card / bubble pop** | `springAt(f, at, 30, 14, 170–190)`, scale 0.6 → 1 from the corner it grows from, opacity `clamp(s·2)`. |
| **Big entrance** (window, phone) | `springAt(…, 15–17, 120–150, 0.7–0.8)` from off-frame (translateY 1300–1900 px) or scale 0.55 → 1. |
| **Result card lands** | a spring from the side (±1100 px, rotate ±6° → ±1.2°), a CheckDisc drawing over 10 frames, `Sheen` at +3 for 16–18 frames, `Sparkles` at +6. |
| **Tap** | `Touch`: a ring closes over 8 frames, then a coral ripple over 18 frames. The pressed element scales `keys([[at−3,1],[at,0.92],[at+7,1]])`. |
| **Typing** | `Typed` or char slices at ≈ 1 char per frame (≈ 2 for fast replies), with the caret blinking every 8 frames. |
| **Sheen** | 18–24 frames `E.cubicInOut`, a 38 % band at 18°. White on light cards; coral (`217,87,89`) on the dark-glass CTA. |
| **Sparkles** | 4 per element, staggered 0/3/6/8 frames, 20-frame life, sized 30–50. Coral on cream, white or gold on colour. |
| **Drop / final hit** | `Impact` (a bloom of light, not a flat flash; rings of r 1000 and 760; a 20-ray burst), the pen draws the `Mark` in 20 frames `E.cubicInOut` with a cream head, a flash at +19…+34, then light runs along the stroke from +24/30 to +46/56. |
| **Counters** | `Odometer` with the carry logic: it settles on whole numbers, never mid-roll. Use round final values. |
| **Stamp** | `Stamp`: scale 2.6 → 0.92 → 1 over 10 frames, with a short impact shake (≤ 12 frames). Coral stamps multiply into the paper. |
| **Celebration** | `Confetti` from the stamp point, a 60-frame life, deterministic. |

A different motion language changes these on purpose. A calm, premium film might use longer eases (`E.cubicInOut` over 20–30 frames) and no rotation. A playful one might use bouncier springs (damping 9–11) and overshoot. A graphic, editorial one might use hard `E.expoInOut` slides on a grid. Keep one language per film.

## Transitions the films used

Each of these belongs to a film now. Reuse one when it serves the idea, but give every new film at least one transition of its own.

- **Swipe** (next person, next day): the old scene translates ±100 % in 14–18 frames `E.expoIn`, and the new one springs in from the opposite side.
- **Swipe through time** (*No one waits*): four full-frame "moments" side by side; `pos` sums `tw(V_AT[i]−8, V_AT[i]+8, E.expoInOut)`.
- **Pan across a world** (*When it doesn't know*): customer phone → agent → team phone, 22–24 frames `E.expoInOut`, with a `swing()` scale dip of about 12 %.
- **Pull-back reveal** (*When it doesn't know*, *Every business*): 40–45 frames `E.cubicInOut` from one card out to the whole wall or system, then counters.
- **Lift one out** (*Every business*, feedback): an item flies from its tile to centre (`E.expoInOut`, 14 frames) while the wall dims under a 72 % cream veil. It drops back when done.
- **Open from a row** (*The glass box*): the conversation card grows out of its list row with an animated `clipPath: inset(… round …)`.
- **Dive / fly through** (*The glass box*): scale ×6–8 with `E.expoIn` through the front of a glass cube, fading on the last 8 frames.
- **Collapse into the mark** (most endings): the scene scales to 0.02–0.15 into the lockup centre over 14–16 frames `E.expoIn`. The `Impact` and the pen-drawn mark follow on the hit. Other ways into the end card work too, as long as the hit lands on "Brainfast."
- **Mark → avatar** (*Every business*): the big mark shrinks onto the chat card's avatar, a coral disc grows under it, and the card opens with `clipPath: circle()` from the avatar.

## Make it yours: ideas no film has used yet

Starting points, not a menu. Combine them, or ignore them for something better.

**Worlds and materials**
- Paper craft: folds, cut-outs, layered card with real drop shadows, a pop-up book.
- Print: risograph grain, halftone, two-colour overprint, misregistration that settles into place.
- Blueprint or technical drawing: the agent drawn as a machine with callouts that animate in.
- Isometric diorama: a tiny city of businesses, with lights coming on as they're answered.
- Editorial: magazine spreads, giant cropped type, pull quotes, a page that turns.
- Signage and transit: a route map where every stop is a channel, a departures board flipping to "ANSWERED".
- Receipts and tickets: a receipt printer that prints each result, a ticket queue counting down to zero.
- Weather and radar: a map of question storms clearing as the agent sweeps across time zones.

**Camera**
- An infinite zoom: each scene lives inside a detail of the previous one (a pixel of the avatar, the dot on an "i").
- Rack focus: layers of depth with blur that shifts between the customer, the agent and the team.
- A native 9:16 scroll: the camera scrolls a feed that never ends, and each post is a proof.
- An orbit around a 3D stack of cards, or a dolly along a long timeline of the day.
- A portal: the next scene seen through a counter of the wordmark, or through the mark's stroke.

**Transitions**
- A wipe that follows the mark's pen stroke (`markPoint` in `lib/logo` samples it).
- A match cut on shape: a chat bubble becomes a sun, a notification dot becomes a planet.
- The headline word becomes the next scene's object: "booked" folds into a calendar tile.
- Ink bleed or a light sweep that "develops" the next scene like a photo.
- A split screen whose halves slide together into one.

**Type**
- Words as objects that stack, fall, or get stamped onto the UI.
- Type on a path along the mark or a route line.
- Variable-weight rhythm: the weight pulses with the music's beat.
- Giant background type that slowly crosses the frame as a texture.

**Proof and data**
- A world map with a pin lighting per city and per language.
- An inbox counting down to zero, or a waiting-time graph collapsing flat.
- A leaderboard, a live ticker, a heat map of the hours that are now covered.

**Rhythm**
- Cut a rapid proof montage exactly on the music's beats (the BPM is in the music plan).
- A beat of near-silence right before the turn: only a riser, the picture holding its breath.

## Building a proof scene (the part that sells)

However the film looks, a proof needs these to land:

1. **A real conversation.** Customer on one side (filled bubble in the business colour), agent on the other (white bubble plus brand avatar). Messages pop on the voice. `Typing` shows before the answer.
2. **The result.** A card that shows what happened: a delivery tracker filling up, the appointment moved (a FRI 10:30 date tile), a new lead with chips (Budget ✓, Added to CRM), a teammate joining with full context. This beats any bubble.
3. **Real strings.** Take the product's own wording: toasts, buttons, empty states, stall messages. See [brand-brainfast.md](brand-brainfast.md).
4. **Deterministic layout.** Use explicit line breaks (`lines={["…", "…"]}`), nowrap, fixed row heights, and a clipped scroll area below the header.

One card morphing across businesses is one way to show breadth (*Every business*): the header rolls (translateY ±100 %) with a tint wash, old messages exit upward inside a clipped area, and the composer's colour follows the business. A grid, a map or a montage are others.

## Backgrounds the films used

| Vibe | Stage |
|---|---|
| Bright | cream `#FAF9F5` with 4 slow colour orbs (the businesses' colours, 13–16 % opacity), a drifting dot field and a little bokeh |
| Dark / glass | `radial-gradient(#1B191F → #0D0C0F)`, a coral bloom that wakes on the drop, drifting motes, and a faint perspective grid at the bottom |
| Human / time | a full-frame sky per moment (night blues, pre-dawn violet, sunset orange), a skyline silhouette with lit windows, a moon or sun, and a city/time pill |
| Playful | coral poster wall (`radial #E0676A → #D95759 → #B94346`), paper `#F6F0E4` with halftone dots, pushpins, ink |
| Night → day | a sky that shifts across the film (*The Night Shift*) |

Yours can be anything the concept needs, within the brand's palette ([brand-brainfast.md](brand-brainfast.md)). Accent colours per business are fine; coral stays the brand's own colour.

Keep a dark → cream switch to a **4-frame cut hidden in the Impact bloom**. A slow cross-fade passes through a dull grey that reads as a mistake.

## Layering order (bottom → top)

stage → scenes (worlds, UI) → screen-space flyers and effects → headlines (`Kinetic`) → bug → grain → audio. Headlines sit above UI. Give them a calm band: a cream gradient veil at the top when a busy wall fills the frame, or fade the wall under the headline zone.

## Text

- **Headline:** the layout gives the size (92 in 9:16). 2–3 lines of ≤ 24 characters, letter-spacing −0.045em, weight 700 by default. The accent is coral; on dark scenes use a coral light or a light cream. The headline style can change with the film's look, but it always stays big, short and on the voice.
- **UI text:** ≥ 26 px in the design box, and 22 px for mono metadata.
- **Dark panels set `color` explicitly.** A black-on-glass correction card was a user-spotted bug.
- **Crop checks:** masks need line-height room (`padding: 0.06em … 0.2em` with a negative margin). A clock digit got cropped once.
- **Contrast:** coral text on coral backgrounds needs `hi={C.ink}`; cream on cream needs ink.

## Diagrams that stay clean

The user called a busy web of dots and lines "not clean". For "knowledge", "network" or "team" diagrams:
- Put nodes on a clean geometric orbit (an ellipse or grid) with even spacing.
- Spokes stop at the edge of the central object; they never cross the logo.
- The central object (the glass cube or mark) sits above the lines.
- The animation is light *travelling* along the spokes plus a ring that draws, not lines popping everywhere.
