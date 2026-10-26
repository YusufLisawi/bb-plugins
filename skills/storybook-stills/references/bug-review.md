# The picture bug review (reject on any)

Written after the owner rejected the first FLIGHT DELAYED Part 1 cut (2026-10-25): "duplicated hands, the passport pointed at us while
the flight attendant should be reading it, the guard has no legs shown when he leans to help the man, and many other issues". Every
picture is reviewed against this list BEFORE it goes into a plan; failures go back to Codex with the exact fix. The same list is
pasted into every art brief (`scripts/stills_brief_template.md`) so the artist self-checks first and reports one line per picture.

## The checklist
0. **HARD RULE: MAX TWO ARMS AND TWO LEGS PER PERSON, EVERY HAND TRACED TO ITS OWN SHOULDER.** Checked FIRST, on every person, also on the ones
   who only grab, hug, bite or are bitten. Trace each sleeve from a shoulder to its hand: a torso has two shoulders, so at most two sleeves and two
   hands. A hand that grips someone else must connect by a visible sleeve to the GRABBER's own shoulder. Where two people touch (a bite, a grab, a hug,
   a hand-hold, a carry) a third arm is most likely: count each person's arms separately. Real failure (2026-10-25): in the bite picture the officer
   had THREE arms (one pressing the zombie's head, one bitten, and a sleeve hanging off the right edge); we passed it twice because we counted
   *hands*, not *shoulders*. The fix that worked: an exact EDIT request naming the extra sleeve's bounding box and the shoulder every remaining
   sleeve must come from (a far-side arm may pass BEHIND the head: it is allowed to hide, never to duplicate).
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

Second round (same day): the independent Codex audit of all 68 pictures returned 0 FAIL / 5 UNSURE; every UNSURE was the same motif, a white mitten with NO
sleeve next to a carried child's backpack (Leo carries Kit: his far arm is hidden behind her, but the artist drew its hand outside her coat, 37_lift, 50_silence,
51_climb), plus a hanging sleeve that ends in a stump (44_shout) and an orphan hand at a bag (31_barrier). They were fixed by EDIT requests to the owning threads
("remove the loose hand at box x0,y0,x1,y1; the far arm stays hidden behind <person>"). Rule of thumb: **a hand you cannot trace to a sleeve is an extra arm, even
when the story explains it**; an unseen arm is simply not drawn.

9. **COLOUR CLUES** (FLIGHT DELAYED, Part 2 review): a colour that is a plot clue belongs to ONE person (Grace's red coat): no dead person or crowd extra in red / crimson / maroon / burgundy / plum, in any picture (scan with a hue mask, then look: a plum coat reads as red). **TIME OF DAY**: a night scene has a dark window (a sunset behind a 3 a.m. line was found only by the owner); a window that the story covered stays covered in every later picture. Stiffness is a pose: a stiff dead person has locked knees and a dragged foot, never a hand on the rail and a high step.

10. **GROUP PORTRAITS / PHOTOS-IN-PICTURES**: arms around shoulders produce mittens with no sleeve (an extra arm in the audit): pose a group with every hand on its own prop (a helmet under the arm, a hat in both hands), never a hand on a neighbour's shoulder unless its sleeve is visible all the way.
11. **EVERY RECURRING ACCESSORY IN EVERY PICTURE**: Kit's orange lanyard, the helmet's star after the sticker scene: the audits catch a missing lanyard on an exposed chest; list them in the audit brief.

## How to run it (fast)
Two independent passes: (1) you, at 1000+ px, two pictures per sheet, tracing shoulders for every person (the arms audit is the slow part: zoom with a
PIL crop on every grab / hug / carry / bite / crowd-foreground picture); (2) a separate read-only Codex REVIEW thread (`--reasoning-level high`) that
audits all pictures and writes `art/<slug>/review/arms-audit-codex.md` (a table: picture, person, arms traced, verdict, bounding box). Fix every FAIL
and UNSURE, then re-run both on the changed pictures. Never rely on the art thread's own "hands counted" line: it said "officer 2 hands" about a
three-arm picture.
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
