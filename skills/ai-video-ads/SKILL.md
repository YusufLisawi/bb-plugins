---
name: ai-video-ads
description: "Make short ad videos with AI-generated people for any brand — UGC to camera, testimonials, explainers, two-person conversations or calls — end to end: concept and script, start-frame stills, image-to-video takes on Google Flow (owner's account in the browser) or the Gemini API (Omni / Nano Banana), cutting by word timings, a Remotion edit with captions and brand graphics, render, QA and delivery. Use for social video ads, Reels/TikTok/Shorts with talking people, remaking or adding variants to such ads, or when choosing Flow vs API for generated footage."
---

# AI video ads with generated people

The work is a pipeline where every stage is checked before money is spent on the next. Video generation is the
expensive, unpredictable step; everything around it (script, stills, cutting, graphics, audio) is cheap and
controllable, so push quality into those stages and treat generated clips as raw footage.

```
brief → concept + script → stills (start frames) → takes (image-to-video, one per speaker)
      → transcribe + cut → edit (Remotion) → mix → render → QA → deliver
```

## Before starting

- Get the brief: product, audience, what may and may not be claimed (prices, guarantees, regulated wording),
  brand kit (logo files, colours, font), language and accent, format (usually 9:16, 1080×1920, 10–30 s).
- Pick the generation route with the owner (see [references/generation.md](references/generation.md)):
  **Flow** = the owner's own account in a browser via the `google-flow` skill (credits included in their plan,
  slower, must keep a human pace); **Gemini API** = fast and scriptable, paid per second, subject to a project
  spend cap. Never switch to a paid route without asking. Never start on an account the owner marked last-resort.
- Related skills: `google-flow` (browser generation), `raw-shot-storyboard` (shot planning, voice auditions,
  animatics), `remotion-render-farm` (fast renders), `watch-video` (break down a reference ad),
  `motion-video-ads` / brand video skills (pure motion graphics, voice-over), `generated-images` (show stills).

## Stage map

| Stage | Decide / produce | Read |
|---|---|---|
| Concept | 2–6 ideas, each with a hook line, angle and audience; owner picks | [references/concepts.md](references/concepts.md) |
| Stills | one start frame per speaker/angle; the look is decided here, not in the video prompt | [references/stills.md](references/stills.md) |
| Takes | image-to-video per speaker; all of a speaker's lines in one take | [references/generation.md](references/generation.md) |
| Edit | word-timed cuts, captions, graphics on spoken words, end card, mix, render | [references/edit-and-render.md](references/edit-and-render.md) |

## Rules that held across every project

- **The voice is the clock.** Transcribe every take with word timings; cut, caption and place graphics from
  those timings. Never eyeball sync.
- **One take per speaker, all their lines in it.** Each generation invents a new voice. Separate clips of the
  same person sound like different people; one continuous take (lines separated by listening pauses that you cut
  out) keeps one voice. For a speaker who needs more than one take, extend the same generation session.
- **One person per shot.** Two-person dialogue = two single-person shots (A/B reverse angles of the same room),
  intercut. Say "nobody else in the frame, no shoulder or hand at any edge" or a stray shoulder appears.
- **Speech starts on frame 1.** Write "from the very first frame she is already speaking"; otherwise models pause,
  cut or move the camera first.
- **Lock the camera in words.** "The camera is static and never moves, zooms or reframes." Describe what the
  camera does, never the gear (a "tripod" gets drawn).
- **Name the accent and what it is not** ("Spanish from Spain, Castilian, never Latin American"; "British, not
  American"). Without it the accent drifts between takes.
- **Check words, not just pictures.** Models drop or swap words (numbers, currencies, the brand name). Compare the
  transcript to the script before editing; regenerate rather than patch audio.
- **Typeset all text yourself.** Never ask an image or video model for captions, logos, prices or UI text.
- **Look at frames.** Contact sheets of every take and of every render; full-size checks of stills. Numbers find
  sync bugs, eyes find layout bugs; you need both.
- **Claims come from the brief.** No invented prices, rankings, guarantees or fear; a testimonial-style actor line
  must not state results the brand cannot prove.
- **Keep the owner in the loop at the expensive steps:** show scripts and stills before generating video; report
  credits or dollars spent after each batch.

## Done means

Finals at the target size and length, each transcribed and matching the script, contact sheet reviewed, mix
loudness checked, delivered as files or a link the owner can open remotely (and the public link removed once
they confirm the download). Temporary frames deleted; sources, prompts and the edit kept so variants are cheap.
