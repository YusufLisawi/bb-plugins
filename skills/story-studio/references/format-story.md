# Format: the story pilot ("Part 1" of a show)

What the user loves (from the references): `@apocalyptic_shorts` *Season 1 of the farm* (3.1 M
views), `@creepyvids27` *What if you could never die / IQ 10× higher* ("I like this style very
much"), `@survivenight1` lighthouse, `@trytosurvive84` ice age. What they asked for on top:
**"much better, like an actual TV show, part 1 of a show, clean illustrations and animations, a
persuasive storyteller voice — not slow, not too fast — so we can make many like it."**

## How I think about a pilot (the thought process, in order)

1. **Pick a setting with a built-in rule.** The best openers are a place + a counter-intuitive
   instruction: "If the outbreak starts while you're on a **night train**, **don't get off at the
   next station**." The setting must explain *why* the instruction is true in one line ("a moving
   train is the safest place on Earth… as long as it keeps moving"). That last clause plants the
   ending.
2. **Name one hero and put them in the setting at a specific time.** "11:40 PM. Leo is on the
   last train out of the city. Carriage four. Half asleep." A time stamp + a place label on screen
   makes it feel like a show.
3. **Three rules, each paid off by an event.** The rule is spoken *as the event happens*, not as a
   lecture: Rule 1 lands as the crowd hits the platform; Rule 2 lands on the man who won't stop
   shaking; Rule 3 lands as the door locks. Each rule gets a `RuleCard` slam + stamp sound.
4. **One real, surprising fact.** Viewers share facts. The Last Train's is the **dead man's
   switch** (if the driver lets go, the train stops). Show it as a tiny diagram, then use it as
   the twist mechanism.
5. **Plant → payoff.** Every twist must be fair: "as long as it keeps moving" (hook) → "the train
   is slowing down" → the switch → "He just wasn't the driver anymore."
6. **Dialogue, sparingly.** 2–4 short lines by other characters, each in its own voice: a caring
   question ("Sir? Are you okay?"), a confession ("It bit me. On the platform."), an order
   ("Everyone! Front carriages! Now!"). They make it a scene instead of narration.
7. **Countdown pressure.** Put the stakes on screen as numbers (NEXT CITY 40:00 vs HE TURNS ≈
   10:00). The viewer does the math with the hero.
8. **The twist is the last spoken line, then silence.** Stinger → black → end card with the next
   part's title ("PART 2 · THE DEAD MAN'S SWITCH") → "Follow, so the train doesn't leave without
   you." (a CTA that stays in the story's world).

## Script rules

- 220–260 words (85–100 s at ~2.85 words/s). Sentences of 3–12 words. Fragments are good:
  "Carriage four. Half asleep." "Nobody moves."
- Narrator = "N" (story voice). One v4 tag per line, following the arc:
  `[low, urgent]` hook · `[intrigued]` the why · `[ominous, quiet]` the plant ·
  `[calm, storytelling]` setup · `[tense]` events · `[firm]` rules · `[hushed]`/`[whispering]`
  before reveals · `[grim]` stakes · `[dramatic, slow]` the twist · `[quiet, intriguing]` CTA.
- Air after lines (4th column): 0.15–0.4 normal; 0.6–1.2 before a scene change or a big
  sound; 1.6–2.4 for the title card and after the twist.
- Write numbers as words ("Eleven forty p.m.", "Forty minutes") — v4 reads them right.
- Speakers' lines are short (≤ 8 words). Mark cast lines with their speaker key from cast.json.

## Shot grammar (what each beat looks like)

| Beat | Shot | Devices |
|---|---|---|
| Hook (0–9 s) | exterior establishing: the setting in motion against the danger (city burning on the horizon); camera tracks + pulls back | a pin label ("SAFEST PLACE ON EARTH"), foreground parallax (poles), motes |
| Plant + title | push down a vanishing line (tracks into fog, a red signal) → `TitleCard` with chromatic flicker → dip | title_hit + riser |
| Setup | interior wide → close on the hero (heads above seat backs, `Above`) | `Stamp` (time + place), `SeriesBar` from here on |
| Inciting event | close-up insert (phone alert) → wide reaction (every phone glows red) | buzz, alert, breath |
| World turns | POV through a window (city districts blacking out one by one) | glitch per district |
| Rule beats | the event shot + `RuleCard` | stamp, crowd, bangs |
| Stakes | hero close-up + `Timers` | heartbeat, clock |
| Escalation | characters move (walk/run cycles), a door slams (shake), something behind glass | door_slam, lock, growl, flicker |
| Fact | `SwitchDiagram`-style mini diagram over a blurred plate | tick, spark |
| Twist | push into a small window → the reveal (head turns, infected eyes) | riser → stinger → black |
| End card | `EndCard` NEXT · PART 2 · title · FOLLOW | title_hit, tick |

## Making a series

Keep the show's identity in one place: the title, the palette (`PAL`), the caption keywords,
the cast's outfits (`OUTFITS`), the series bar. Part 2 starts with a 3-second "Previously" (the
twist frame) and keeps the same plates where the story stays. New shows = new setting, new
plates, new palette accent, same grammar.

## Story ideas that fit the format (pick, or invent better)

- **The 13th Floor** — a blackout traps you in a high-rise elevator with a stranger (rules of
  elevators: they don't free-fall; the emergency phone; why you don't pry the doors).
- **The Night Ferry** — fog, a ferry that stops mid-crossing, the radio goes silent.
- **3:07 AM** (crime) — someone is in the house; rules of a home intrusion; the call you make.
- **The Last Signal** (survival) — a hiker at 2 % battery, a storm, footsteps that match yours.
- **The Fake Taxi** (crime) — a late rideshare takes a wrong turn; child locks; the plate rule.
- **Deep Shift** — a miner's lift fails 1,000 m down; air math; the tapping in the wall.
- **Whiteout** — an ice-age week counted down from a weather app; the bunker; the knock.
