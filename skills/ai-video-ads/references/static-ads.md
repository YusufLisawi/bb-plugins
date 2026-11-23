# Static ads from a campaign brief

Video and static creatives usually come from the same campaign brief. The rendering mechanics (HTML slide →
headless 2× screenshot → PNG/JPEG, carousel, zip) live in the `meta-static-ads` skill (or the brand's own static
skill). This page is what the brief and the owner's reviews added on top.

## Read the brief as a contract

- **File names are the interface.** Ad tools often assign creatives to ad sets by file name
  (`<adset>-<WxH>.png`). Copy the ad-set codes from the brief exactly; a wrong name is silently ignored. Generate
  the names from the brief's table, not by hand, and list the expected set before rendering.
- **Claims list = allowed words.** Use only the "verified claims"; scan every headline, sub, CTA and on-image text
  (normalised: lower case, accents stripped) against the "forbidden" list, and fail the build on a hit. Typical
  forbidden families in insurance/health/finance: "free", "the best/cheapest", "guaranteed", "no waiting
  period / no health questionnaire", fear or urgency, concrete amounts without approval.
- **Copy verbatim.** When the brief gives the copy, reproduce it exactly (accents, ¿ ¡, capitalisation). If a
  line is too long for the layout, ask; do not rewrite it silently.
- **Third-party logos only when the brief says so.** A comparator may show partner logos only if the brief allows
  it; otherwise none, and never single one out, rank them or attach prices to them. Logos come from official files.
- **Image rules from the brief:** no text on faces, ≤ 6–7 words on the image plus one CTA, official logo in a fixed
  place and size, devices facing their users, no third-party brands in photos, the sector's banned imagery
  (hospitals, accidents, illness, funerals…).
- When a rule seems wrong for conversion, say so and ask; default to following the brief.

## Photos

- Brief the image agent with one line per ad set: who, doing what, where, light, framing, and where the copy
  block will sit (keep that zone calm). Ask for a flat chroma-green screen when a phone UI will be composited in.
- Review every photo at full size: hands, faces, text artefacts, screens. Regenerate failures; don't patch.
- Show photos at or below their native resolution. An upscaled photo looks soft; frame it in a card instead.
- Keep head and shoulders in view; avoid webcam-tight crops cutting at the chin.

## Layout lessons from owner reviews

- **9:16 (stories/reels): the text block goes at the bottom**, above the bottom UI safe zone; the top ~14 % and
  bottom ~20 % are covered by platform UI.
- **Check text contrast on the actual photo**, especially at the edges: a headline that runs onto a busy or light
  part of the photo becomes unreadable. Use a panel, band or gradient under the text.
- Small UI in a hand photo (tiny logos, a floating "pill + button" row) gets rejected. Draw a large, legible
  device in HTML and let its own button be the CTA.
- Six logos in one row are too small; use 3×2 tiles.
- Don't rotate large elements with big box-shadows; headless renders leave a pale rectangle.
- The page avatar next to the ad already shows the brand name; a full wordmark in the creative can repeat it, so
  agree with the owner which logo version goes where.

## Deliver

- Render at 2× and downscale (LANCZOS) to the exact size, sRGB, under the platform's file limit.
- QA: open every file at 100 %, check the names against the expected list, re-run the forbidden-words scan on the
  final text, and look at a contact sheet of the whole set for consistency.
- One zip named after the campaign and format; a public link only after asking, removed once downloaded.
