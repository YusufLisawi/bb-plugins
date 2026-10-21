# Format: the "what if" (immersive, sound-led, often no narrator)

> [!NOTE] Not the farm format
> This file is the immersive, narrator-less "what if" (`trench`). The narrated flat-vector format of the farm film
> ("If the zombie apocalypse starts while you're on a farm…", fast cuts on words, any niche) has its own skill:
> `~/Developer/bb-plugins/skills/what-if-shorts/SKILL.md`.

The user on the references: *"this is very nice, it has no speech, just sound effects, and it makes
you live the situation."* (@cloveranimationns water disappears, 4.4 M; @zenithwhatif every human
disappears, 8.5 M). Reference episode: **`trench`** (WHAT IF YOU SANK TO THE BOTTOM OF THE OCEAN?,
70 s): `src/episodes/trench/{timeline.ts, Trench.tsx, sound.ts}`.

## How I think about a what-if

1. **One vantage point the viewer occupies.** A porthole, a window, a cockpit, a phone, your own
   hands. The frame IS the body. Trench: you are inside a sphere looking out of its porthole.
2. **One number that runs the whole film.** DEPTH 0 → 10,935 M; TIME WITHOUT HUMANS 1 SECOND →
   10,000,000 YEARS; WATER RETURNS IN 0:04.935. It counts on screen the whole time, big.
3. **Stages, each with one landmark and one sentence.** 10–13 stages; each stage = the number
   jumps (1.6 s ease) + something appears (a diver, a whale, the Titanic, a snailfish) + one
   elegant line (+ a quieter sub-line). Facts must be real and round.
4. **Secondary gauges make it physical.** Pressure, temperature, light %, missing water km³,
   population — they change with the main number and turn red when it's dangerous.
5. **The end pulls back to scale.** One comparison that reframes everything (Everest fits with
   2,086 m to spare; "a thin red line in the rock"), then a soft end card.

## No narrator — so the sound IS the story

- Write the stage table first (`timeline.ts`: `STAGES [{t, d, line, sub}]`), and drive BOTH the
  picture and `sound.ts` from it.
- Layers: an ambience bed per zone (crossfaded), a signature sound per stage (sonar ping as the
  counter lands), a whoosh/zoom on every jump, a creature/landmark sound, rising danger sounds
  (creaks → hard groans → glass crack), heartbeat in the deep stretch, one big hit at the bottom,
  a "surfacing" roar into the final pull-back.
- `public/<slug>/vo/lines.json` = `[]` and a silent `vo.wav`; `mix.py` detects no voice and levels
  everything against a virtual voice (music sits higher: −8 dB instead of −17). `qa.py` skips the
  speech check.
- Score: ambient sections per zone with a near-silent stretch before the final hit.

## Look

Text: Cormorant Garamond italic (`F.garamond`, `fontStyle: "italic"`) for stage lines, Anton for
the main number, JetBrains Mono for gauges. Colour follows the physics (water colour by depth,
sky by time). Particles always moving in the direction of travel (marine snow streams up as you
sink). The frame (porthole) has weight: bolts, glare, cracks under pressure, a tiny shake when
the hull creaks.

## Ideas that fit

What if you fell into a black hole (time dilation counter) · what if the Sun went out (8 min 20 s
countdown, then temperature) · what if you stood on every planet (gravity/temperature gauges) ·
what if the Moon were 10× closer (tides counter) · what if you didn't sleep for 11 days (hours
awake, symptoms) · what if Earth stopped spinning (km/h → 0).
