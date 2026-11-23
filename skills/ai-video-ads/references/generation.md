# Generating the takes (image-to-video)

## Choosing the route

| Route | How | Cost (seen Nov 2026) | Good for | Limits |
|---|---|---|---|---|
| **Google Flow** (owner's account, browser) | `google-flow` skill: `flow.py video --model "Omni 1.2 Flash" --res 720p --aspect 9:16 --start still.jpg -p "..." --account <acct>` | Omni 1.2: 30 credits / clip at 720p (10 s), 10 at 360p; images 0 | most work; included in the plan | human pace; daily caps; "unusual activity" blocks; UI changes break automation |
| **Gemini API** | `scripts/omni.py` (single take), `scripts/omni_chain.py` (same voice across turns) | Omni 1.2 Flash ≈ $0.07/s at 720p, up to 15 s/clip | speed, scripting, 15 s takes, multi-turn voice continuity | paid; project monthly spend cap (429 "spending cap") |
| Higgsfield (Seedance) | `higgsfield-api` skill | ≈ $0.21/s at 480p | alternative look | audio references are only hints, not played back |

Always quote before spending (`flow.py price ...` / estimate seconds × rate) and report the spend after.

## Flow etiquette (protects the owner's account)

- One job at a time; let the guard's pauses run; a few minutes between video jobs. No retry loops: after an unclear
  error run `flow.py list` first — the job may be rendering (a "failed" flag at low % can be a misread).
- On "We noticed some unusual activity": stop the whole batch, rest that account (the guard does 120 min), and ask
  the owner before using another account. Never use stealth, fingerprint spoofing or proxy rotation to evade it.
- Respect the owner's account order (which to start on, which is last resort). Ask which account an unfamiliar
  name refers to rather than guessing.
- New-account or new-UI dialogs (onboarding, privacy notice, per-upload "rights to use this image"): acknowledging
  terms on the owner's account needs their OK the first time; never tick marketing/research opt-ins.
- A PinchTab tab that becomes "unresponsive" after a long render: close that tab (PinchTab `/close`) and retry;
  the job keeps rendering in Flow and can be downloaded by tile index (`flow.py download <index>`). Download by
  index when an image and a video share a title.
- Omni 1.2 has no length option in the panel and inherits the last length set on Omni 1.1 (one account gave 6 s).
  The skill now sets 10 s on 1.1 first; still check `duration` in the result.

## Prompt template (one speaker, one take)

```
[Who + where, matching the still]. From the very first frame she is already speaking, [tone], in the natural
voice of a [age]-year-old [nationality] [woman/man], [accent] (never [wrong accent]), natural native pace, words
flowing together. She says exactly [N] lines, in this order, with real listening pauses between them:
1) "[line 1]"
2) Then she listens for about two seconds, [reaction], and says: "[line 2]"
3) ...
[Eyeline: looks slightly to the right toward X / straight into the camera.] The camera is static and never moves,
zooms or reframes; framing, room and light stay exactly as in the start frame. Single-person shot: nobody else
ever appears at any edge. Natural blinking, small natural movements, restrained real expressions, no exaggerated
acting. [Ambient] sound only. No music, no text, no subtitles, no other voices.
```

- Dialogue: one take per speaker with all their lines and 2–2.5 s listening pauses → cut and intercut in the edit.
  This is the single biggest quality win (one consistent voice per person).
- UGC to camera: one take with the whole script, "talks straight into the camera like a casual video".
- Fit the clip length: Flow Omni 1.2 = 10 s (≈ 28 words); API Omni 1.2 up to 15 s.
- Reaction beats (a laugh, a shrug, picking up a cup) make generated people feel real — script them.

## One voice across several takes (API only)

Omni does not take audio references. Keep a voice by extending the same session: first call with `store: true`,
next calls with `previous_interaction_id` and the same voice description; each turn continues the same video, so
the speaker sounds the same. `scripts/omni_chain.py` does this.

- **30 s ceiling.** An extension fails once the video so far is longer than 30 s ("Videos longer than 30s are not
  supported for extension"). Plan ~10 s turns, at most 4 per chain (~40 s). For a longer script start a second
  chain from the same still with the identical voice description, and split at a sentence where the edit cuts
  away (a product screen or a full-screen card) so a slight voice change is not heard on the face.
- **Seams repeat or garble words.** A turn often re-says the end of the previous one or slurs its first word.
  Don't fix this by hand: align all turns to the script and keep the latest clean occurrence of each word
  (edit-and-render.md §1).
- Write each turn as "Continuing, she says: ..." plus the same voice + camera lock text every time. Re-voicing with TTS and time-warping words onto the
lips was tried and rejected (choppy, stretched words).

## After every take

`scripts/stt.py take.mp4` → compare to the script (missing words, wrong numbers, stutters, out-of-order lines).
Make a contact sheet (`ffmpeg -i take.mp4 -vf "fps=0.5,scale=200:-1,tile=5x1" -frames:v 1 sheet.png`) and look:
camera still, nobody extra, eyeline right, hands OK. A stutter or a repeated word can be cut; a wrong claim, wrong
accent or broken face means regenerate. Move downloads out of `/tmp` at once (quota'd tmpfs loses files).
