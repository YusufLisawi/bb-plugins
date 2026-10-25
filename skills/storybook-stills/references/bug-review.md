# The picture bug review (reject on any)

Written after the owner rejected the first FLIGHT DELAYED Part 1 cut (2026-10-25): "duplicated hands, the passport pointed at us while
the flight attendant should be reading it, the guard has no legs shown when he leans to help the man, and many other issues". Every
picture is reviewed against this list BEFORE it goes into a plan; failures go back to Codex with the exact fix. The same list is
pasted into every art brief (`scripts/stills_brief_template.md`) so the artist self-checks first and reports one line per picture.

## The checklist
1. **COUNT**: one head, two arms, two hands (one per arm), two legs, two shoes per person *where those parts are visible*. No
   duplicated or extra hands, no third arm, no hand floating without an arm, no merged limbs or heads. Crowd figures are whole people.
   Two hands that belong to two *different* people near each other (a grip, a hand-hold) are fine: trace each hand to its sleeve.
2. **FULL BODIES**: when the action needs legs (leaning, kneeling, running, standing, climbing) the legs and shoes are drawn and
   touch the floor / stairs with a contact shadow. Never a torso hanging behind a counter when the story shows the whole person (the
   officer who leans over a barrier is drawn from the side with both legs planted).
3. **PROPS FACE THE RIGHT WAY**: a phone screen faces its user (or the viewer in a POV picture); a passport someone is READING has its
   pages turned toward the reader and we see only the cover / back; a badge hangs from its lanyard and exactly ONE badge exists; a
   suitcase handle is in a hand; the bandage stays on the SAME hand (the man's right) in every picture.
4. **CONTINUITY**: faces, hair, hats, clothes and colours exactly as in the cast sheet; the officer's cap stays ON; wardrobe changes only
   when the story says so; a carried prop is gone once it is dropped (Leo's suitcase appears in no picture after the surge).
5. **PLACE LOGIC**: windows on the left, booths at the back, staff door on the right, light from the left; nothing floats; nobody stands
   inside a wall; furniture and framing identical whenever a place returns; a STATE change changes only what the line says.
6. **NO TEXT** anywhere (letters, numbers, pseudo-writing, logos): signs, screens, boards, badges, passports and banknotes stay BLANK;
   every word is code (invented script is a code fx: `glyphs`, `bubble glyphs`).
7. **SAFE CROP**: the film crops the top and bottom 9% and the outer 6%: faces, hands, props and actions inside x=100..1436, y=110..905
   of the 1536×1024 art. Background figures may touch the margins.
8. **READABLE**: one clear action per picture, understood in one second; faces big enough to read on a phone.

## How to run it (fast)
```bash
python3 scripts/art_sheet.py art/<slug>/raw 15_leans 19_arm -o /tmp/p.jpg --cols 1 --w 1100   # 2 per sheet, hands readable
python3 scripts/art_sheet.py art/<slug>/raw 01 02 03 04 --cols 4 --w 480                      # overview (prefixes work)
```
Look at every picture at 1100 px wide (two per sheet): 768 px hides a duplicated finger or a second badge. Write the verdict per picture;
send back only the failures, by name, with the exact fix (move the old file to `art/<slug>/old/` first). For a picture that is *almost*
right, ask Codex to EDIT it ("Image 1 is the EDIT TARGET; change ONLY …") instead of regenerating: a regenerate re-rolls every other bug.

## Known soft spots (accepted, written down so the next review does not re-litigate them)
- Crowd and queue extras are tiny and generic; only principal figures are counted limb by limb.
- Establishing shots may show staffed booths (08_line, 29_flow) where close shots show empty ones: keep a per-place "who is where" note
  in the brief and check it, or ask for the same staffing in every picture of a place.
- A blurred background may drift (a gate lounge behind a corridor window) when the shot is a close-up: harmless, but note it.
