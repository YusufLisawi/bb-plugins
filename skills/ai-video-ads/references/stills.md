# Stills (start frames)

The still decides the person, the room, the light and the "camera". Image-to-video keeps all of that, so get the
look right here — it is free or cheap to retry, video is not.

## Models

- **Flow (browser, `google-flow` skill)**: Nano Banana 2.1 / Pro / 2 Lite cost 0 credits on paid Flow plans.
  `flow.py image --model "Nano Banana 2.1" --aspect 9:16 --count 1 -p "..." [--ref img]`.
  Keep prompts compact (~300–400 chars): very long prompts and `--count 2` have both made Flow ignore the
  generate click on some accounts — if "did not accept the generate click", shorten and use `--count 1`.
- **Gemini API** (`scripts/gemini_image.py`): `gemini-nano-banana-2.1` (≈ $0.05 at 2K) or `gemini-3-pro-image`
  (≈ $0.13). 9:16, 2K. Reference images as inline data for consistency.
- Side-by-side test on the same prompt: 2.1 looked more candid / phone-real, Pro more polished and model-like.
  Default to 2.1 for UGC; Pro when you need clean commercial polish or tricky consistency.

## Look recipes (describe, don't name gear)

| Look | Prompt core |
|---|---|
| **Creator daylight** (best performer for UGC) | "creator talking-head frame, phone on a tripod at eye level, bright soft daylight from a big window, airy light home, plants blurred behind, natural, not studio, not stock; waist up" |
| **Car story-time** | "phone resting on the car dashboard at eye level, nobody holding it, daytime soft overcast light, driver's seat, hand on the wheel; chest up" |
| **Home conversation** | "still from a natural home video, bright kitchen/dining room, window light, seen alone from the chest up, looking slightly to the left/right toward someone off camera, never into the camera" |
| **Office / adviser** | "at her desk, headset around the neck, open-plan office softly blurred, ordinary daylight" |

What the owner rejected: polished studio light (looks like an ad photo), dim single-bulb evening light (looks
cheap/sad), and a visible selfie arm (looks fake on generated people). Eye-level propped phone + soft daylight won.

Always add: real skin texture, a specific age, specific clothes, "no text, letters, logos or brand names anywhere".
Never put the product's text, prices or UI in the image — overlay them later.

## Conversations: build the room once

1. Generate speaker A alone, looking slightly to one side toward an off-screen person.
2. Generate speaker B with A's image as reference: "the REVERSE ANGLE of the same moment, camera now on A's side;
   same room, same table, same light (the window is now on the other side), same film look; B alone, looking
   slightly to the other side; A NOT visible." Check eyelines face each other and the background is the *other*
   side of the room (a model happily reuses the same wall — reject that).
3. For a third/fourth person, reference both previous stills and name what is behind them (another wall, a door,
   a framed photo) so they read as the same room.
4. Too wide (face small) → regenerate "medium close-up of the same person, same room, face large in the upper
   third" with the wide still as reference. Don't rely on cropping a 720p video later.

## Consistency of a recurring person

Pass the earlier still as a reference and repeat 3–4 traits (hair, clothes, accessory). Re-using the exact same
start frame across videos keeps a recurring character (e.g. the brand's adviser) recognisable.

## QA every still at full size

Hands (5 fingers, believable grip), devices facing their user, no pseudo-text, eyelines, no extra people or
shoulders, the face where captions will not cover it (keep the lower third calm). Then show the owner.
