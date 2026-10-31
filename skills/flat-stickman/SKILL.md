---
name: flat-stickman
description: "A second Story Studio picture style (added 2026-11-01): the flat-vector stickman look of Olatunde AI's second-person survival POV ('You wake up. And you can't feel your legs.') and the Planet AI history videos (the Great Emu War): round pale heads, dot eyes, eyebrow strokes, thin stick bodies with only identity pieces drawn (a red beanie and scarf, a teal coat, a khaki uniform), flat muted backgrounds, extreme close-ups, hand+prop inserts, split screens, thought bubbles and handwritten labels. Use when the user asks for the flat stickman / Olatunde / Emu War / 'new stickman' style, for a story video or series in this look, or to redraw an existing episode in it. It swaps the LOOK and the camera grammar into the storybook-stills pipeline (story, voice, plan, fx, sound, QA stay the same); for an AI-animated version through Nano Banana and Google Flow see the nano-flow-stickman skill."
---

# Flat Stickman: the second picture style

The owner asked for this look on 2026-11-01 ("I want to create this as a new style of our videos"), after two references:
- **Olatunde AI, "Second person survival POV"** (X, 2:00): a plane crash in the snow, a hero with a red beanie and red scarf, Mara the
  nurse in a teal coat; a cut every 1.5–3 s; a cliffhanger, "Would you trust…? Tell me in the comments", FOLLOW FOR DAY 2.
  Frames: `assets/reference-frames-crash.jpg`.
- **Planet AI, "How to Make Stickman Animation with AI"** (YouTube): its result is the Great Emu War 1932 (soldiers, a farmer, emus,
  wheat). Frames: `assets/reference-frames-emu.jpg`. Its workflow (ChatGPT sheet → Nano Banana → Flow agent → ElevenLabs → CapCut) is
  the `nano-flow-stickman` skill.

The STORY format is the same as ours (second person, a direct hook, practical numbers, a cliffhanger, the CTA). Only the pictures and
the camera grammar change. **Build it with the storybook-stills skill** (`stills_new.py`, `voice.py`, `plan.py`, `stills_build.py`, fx,
cards, sound, `sync_audit.py`, `qa.py`) and use this skill for the art briefs and the shot list. Whether the pictures stay still
(camera moves, our default) or get animated (Flow, see `nano-flow-stickman`) is the owner's call per episode; never animate unasked.

## The look (paste `assets/style-block.md` into every art brief)

| | Flat stickman (this skill) | Storybook stills (house style B) |
|---|---|---|
| Rendering | flat vector fills, no texture, no paper grain, no painted light | ink + soft painted shading, paper grain, one warm light |
| Palette | muted, desaturated, DARK enough: slate/teal-grey snow and night, sand and flat orange sunsets; 1–2 accent colours (the identity pieces) | warm golden-hour, rich |
| Heads | big circle, pale warm off-white (#EEF0E2), bold even outline, 2 solid dot eyes, eyebrow strokes carry the emotion, a one-line mouth; no nose, ears or hair unless it is an identity cue | white blob head, more face detail |
| Bodies | THIN single stick lines; torso, arms and legs are lines with angular elbows/knees, small line hands, tiny feet. Clothes ONLY as compact flat identity pieces over the stick (beanie + scarf; a coat; a uniform) | full clothed bodies |
| Lines | character outlines BOLDER than background lines | uniform ink |
| Backgrounds | simple flat shapes, lots of debris/props to tell the place, flat darker shadow shapes, a flat sky band | detailed, lit |

## The camera grammar (what makes it feel like the reference)

Plan these into `plan.py` on top of the usual density rules (a picture every 2–3 s):
- **Tiny-figure wides**: the hero small in a big landscape (the wreck on the slope, the field with emus); the HUD sits in that empty sky.
- **Extreme close-ups**: the round head fills a third to half of the frame (draw the neck stick and the scarf/collar leaving the frame:
  a bare floating head is a bug).
- **Inserts of hands on props**: a line hand holding the flare gun, the phone at 4 %, the radio, the map with a red circle.
- **Split screens**: two or three panels with a thin dark divider (carry her / leave her; the pilot / the plane; Mara / you / the phone).
  Draw them as ONE picture so the panels share the palette.
- **Thought bubbles** (a family at a table) and **handwritten labels with an arrow** ("MARA, NURSE"): the bubble is drawn in the art,
  the label is code (a `label` / arrow fx in the hand font), because the art has no text.
- **Body-part cutaways**: the stick legs with yellow pins-and-needles sparks, a shaking hand (motion lines drawn in).
- **Big top-left HUD**: "−20°C / SUNSET 2:00", "90 MIN" in bold sans, spoken words only (our rule: on-screen text = what is said).
- Captions: one bold word or two at the bottom, white with a dark edge, word by word (`wordCut`).
- Warm flash / orange-tinted frames on the reveal beats (a code colour overlay, not a new picture).

## Art (Codex, the owner's rules apply unchanged)

Codex imagegen threads, `--model gpt-6-luna --reasoning-level max`, ≤ 5 threads, ≤ 12 pictures each, the full-size self-review and the
arms-first bug checklist (storybook-stills `references/art.md`, `references/bug-review.md`). Start every brief from
`assets/brief-template.md` (the style block, cast, places, checklist and the shot types above already in it). Order: the cast lineup
first (`00_cast`: every character full-body front view + a row of six hero expressions on a plain light background), review it, then
the scenes with `00_cast` as the reference. 16:9 = 1536×1024, 9:16 = 1024×1536, crop rules as in storybook-stills.

## What the first test taught (2026-11-01, `art/olatunde-test/`, 11 pictures, `assets/test-v1-codex.jpg`)

The look transfers: Codex hits the round heads, dot eyes, stick limbs and flat fills, and with stick bodies there are fewer anatomy
bugs than in the painted style (0 extra limbs in 11). Compare `assets/compare-ref-vs-codex.jpg` and `assets/compare-house-vs-flat.jpg`.
Codex's default drifts, and the brief must push against it:
1. **Too light and too empty.** It goes pastel blue-grey and bare; the reference is darker and more contrasty with debris everywhere.
   The style block now demands the dark slate/teal base, a second flat shadow tone and props/debris in every place.
2. **Wrong emotion in action beats**: all three people smiled while fleeing (09_run_door). Every picture line names the expression
   ("scared: brows up and together, mouth a small open oval").
3. **Outfit drift in crowds**: Kit got a green jacket in the surge. Name the cast colours in every crowd line and check them.
4. **Floating heads in close-ups**: say "the neck stick and the collar/scarf leave the bottom of the frame".
5. **A "crowd" of six reads as a jog**: give a number ("20+ people, overlapping").
6. Piggyback became shoulder-ride: spell out the carry ("on his back, her arms around his neck, his hands under her knees").

## Read next

- `assets/style-block.md`: the paste-in style + negative block.
- `assets/brief-template.md`: a full art brief for this look.
- `assets/test-v1-brief.md`: the brief of the first test (what produced `test-v1-codex.jpg`).
- The storybook-stills skill for everything that is not the picture: story, voice, plan, fx, sound, CTA, QA, upload.
- The nano-flow-stickman skill for the Nano Banana + Google Flow route (AI-animated clips, history videos).
