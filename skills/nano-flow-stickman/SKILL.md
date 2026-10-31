---
name: nano-flow-stickman
description: "The 'historical stickman video' production workflow from the Planet AI tutorial, run on our own tools: research and a full written production package (topics, fact brief with sources, narration by clip, character identity paragraphs, character reference sheet prompts, a standalone character consistency agent prompt, a scene-image + animation prompt per clip, continuity states), then Nano Banana character sheets and keyframes and Omni/Veo image-to-video clips in Google Flow (flow.py, credits reported), voice, and assembly. Use when the user asks for a stickman history video, an 'Emu War style' video, the Nano Banana + Flow stickman workflow, the instruction sheet / production package, character sheet or consistency-agent prompts for a stickman video, or wants a flat stickman story AI-animated in Flow."
---

# Nano Banana + Flow stickman videos

The workflow of Planet AI's "How to Make Stickman Animation with AI for FREE" (2026-10): an instruction sheet makes a chatbot write
the whole production package; Nano Banana draws the character sheets; a Flow agent with those sheets as references draws and animates
every clip (Omni Flash, 16:9); ElevenLabs reads the narration; CapCut joins it. Their result: the Great Emu War 1932, six ~10 s clips.
The owner asked for it as its own skill on 2026-11-01. The look is the flat-stickman skill (read its `assets/style-block.md`).

**The master instructions are `references/production-sheet.md`** (the owner's sheet, verbatim): follow it for the package. This file
maps each step to our tools and adds what we learned.

## Defaults

English narration, 9:16 (the tutorial rendered 16:9: ask only if the platform is unclear), 60 s = six clips of 10 s editorial time,
flat-stickman look, a separate voice-over, no lip sync, no on-screen text in any generation (labels, dates and maps go in code).
The owner's Flow preferences (google-flow skill): **Omni 1.1 Flash, clips under 5 s unless asked**, so a 10 s editorial clip is
usually two 4–5 s takes cut together (a pose change per take = the sheet's 2–3 beats per clip). Quote before a big spend.

## The steps

1. **Topic** (sheet Step 1): eight specific events with the opening visual, conflict, ending, length, difficulty; recommend one; ask
   "Which topic would you like to make?" and wait. Skip when the user named one. Story-first rule (memory): the story is approved
   before anything is generated.
2. **The written package** (sheet Steps 2–7), in this order and complete, saved to `episodes/<slug>/package.md` in
   ~/Developer/story-studio (use markdown-pro): fact brief with ≥ 2 reliable sources (research with WebSearch; museums, archives,
   scholarly), the storyboard table (clip, absolute time, exact narration 18–24 words / 10 s, visual action, purpose), the cast
   (ID, identity paragraph reused verbatim, hex palette, immutable vs changeable traits), one CHARACTER REFERENCE SHEET PROMPT per
   character, the standalone CHARACTER CONSISTENCY AGENT INSTRUCTIONS block, then per clip: scene-image prompt (150–250 words, the
   START of the clip), animation prompt (200–350 words, 0–2 / 2–5 / 5–8 / 8–10 s beats, final state), sound notes, outgoing continuity
   state. Write the actual prompts, never placeholders. Evidence vs dramatization marked.
3. **Character sheets in Nano Banana** (0 credits on the Pro plan):
   ```bash
   F="python3 ~/Developer/bb-plugins/skills/google-flow/scripts/flow.py"
   $F image --model nano --aspect 16:9 -p "<CHARACTER REFERENCE SHEET PROMPT>" --out art/<slug>/sheets --name S01
   ```
   Review every sheet at full size against the identity paragraph (arms first, the storybook-stills bug checklist): send precise
   correction prompts, regenerate only the failures. Crop a single full-body front view and a portrait from each sheet (PIL) and make
   a Flow character: `$F character create --name S01 --portrait s01_face.png --body s01_body.png --info "<identity paragraph>"`
   (a 4-view sheet as the body risks four copies of the character).
4. **Keyframes** (the scene-image prompts, 0 credits): `$F image --model nano --character S01 --character F01 [--ref place.png] -p
   "<scene-image prompt>" --aspect 9:16 --out art/<slug>/keys --name C01_scene`. Bug-check each keyframe BEFORE spending video credits.
   The Codex art route (flat-stickman brief) is the alternative when the owner wants our usual art control; ask which route if unclear
   (owner rule: images normally come from Codex imagegen; this skill is the Flow route they asked for).
5. **Animate** (credits): one take per keyframe, the keyframe as the start frame (best fidelity; ingredients-only drifted in tests):
   `$F video --start art/<slug>/keys/C01_scene.png -p "<animation prompt, condensed to the take>" --secs 4 --out art/<slug>/clips
   --name C01_video`. Prompt rules (google-flow, tested): open with the style lock ("Flat 2D vector stickman cartoon, exactly the style
   of the start frame"), name each character with 3–4 traits, ONE action per 4 s, one camera move, close with "only these characters,
   exactly two arms and two legs each, no text, no new objects". Preview cheaply with `--res 360p --download none` when unsure. Report
   `credits_spent` to the user. Price (2026-10-31): Omni 720p 4 s = 7, 10 s = 15; Veo Lite 8 s = 10, Fast 20.
   The tutorial's Flow **agent** (one prompt → all clips, the consistency prompt as its instructions) is not driven by flow.py; per-clip
   commands give the same result with credits and failures per shot.
6. **Review the clips**: frames of each take (ffmpeg, `frames.py` from watch-video) against the identity paragraphs and the
   continuity record; regenerate only clips with material problems (`list` first after an unclear error, never loop `video`).
7. **Voice**: the narration lines into `episodes/<slug>/script.tsv` and `.venv/bin/python scripts/voice.py <slug>` (our voices; the
   tutorial used ElevenLabs free voices). Measure each line; a clip's editorial time follows its narration, not the other way round.
8. **Assemble**: trim each take to its beats and lay them under the voice. `scripts/flow_hook.py <spec.json>` already does this for a
   short sequence (trim/speed per shot, voice, ducked clip sound, library sfx, −14 LUFS); for a whole film either extend its spec to
   every clip or put the clips into the storybook-stills plan as video shots, then add the word-by-word captions, the HUD labels and
   dates in code, and the CTA card. Naming: `C01_scene.png`, `C01_video.mp4`, `C01_voice.wav`.
9. **QA and delivery** as in storybook-stills: `qa.py` (format, loudness, freezes, speech), look at frames of the final mp4, upload to
   R2 under a new key, give the owner the link.

## Done means

The package is complete (every clip has both prompts and a continuity state; facts sourced), every sheet and keyframe passed the bug
review, the credits spent were reported, the narration fits the cut, captions/labels are code (spoken words only), and the owner has
a playable link. Status 2026-11-01: written from the tutorial and our flow.py; not yet run end to end, so note anything that breaks
and fix this file.
