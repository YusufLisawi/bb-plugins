# Format: cardboard cinema (the ONLY format with generated assets)

Reference: @cardboard_cinema *Why beavers can't stop building* (15.3 M views): photoreal
corrugated-cardboard dioramas lit by a practical bulb, cut-out beaver puppets with googly eyes,
tissue-paper water, felt, masking tape, hand-lettered signs; shallow depth of field; stop-motion
holds; a calm, curious narrator; a gag reveal; a hand-written "LIKE AND FOLLOW".

> [!IMPORTANT] Owner rule: this format, and only this one, uses a **Codex bb thread with its
> `imagegen` skill** for the craft assets ("with a GPT sub-agent to create the assets that you can
> use to animate"). You never call image APIs yourself; you brief, review, key and animate.

## Assets to brief (one Codex thread, numbered list, absolute paths under public/<slug>/art/)

1. **Sets** (portrait 2:3, no characters, no text except blank cards): each diorama as a photo of a
   real tabletop model — cardboard walls with visible corrugation, warm bulb light, shallow DOF.
2. **Characters as cut-out PARTS on flat #00FF00** (so you can rig them): body, head, each arm,
   tail — separately, same scale, flat front view, card edges visible, NO eyes (eyes are code).
   2–3 extra head/arm variants for expressions/gestures.
3. **Props** on #00FF00: signs (blank board — lettering is code in a marker font), tools, the gag object.
Key with `scripts/key.py`, look at every file on a contact sheet, redo only bad ones.

## Animating "stop-motion" in code

- **Step time**: quantise motion to 12 fps (`const ts = Math.floor(t * 12) / 12`) for character
  and camera moves; keep the bulb flicker and dust continuous. That is the stop-motion feel.
- **Boil**: a ±1.5 px offset and ±0.6° rotation per step (deterministic `rnd(step)`), applied to
  every cut-out.
- **Rig**: parts pinned at joints (rotate arms/tail/head around pivot points), a squash on landing.
- **Googly eyes in code**: white circles with a black pupil that LAGS behind head motion with a
  damped spring (it's what makes them funny).
- **Lighting**: one warm `Glow` from the bulb, a soft contact shadow under every cut-out (offset
  down-right), a vignette, slight DOF blur on far layers.
- **Captions**: small clean white sans with a soft shadow, lower third (they're understated here),
  hand-lettered signs via a marker font for diegetic text.
- **Voice**: calm curious narrator (Jon `MFZUKuGQUsGJPQjTS4wC` or Michael approved), 2.6–2.8 w/s.
- **Sound**: paper/cardboard foley for every move (rustle, tap, slide), tissue water, a gentle
  music-box or plucked score.
