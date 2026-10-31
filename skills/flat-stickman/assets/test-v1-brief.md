You are the illustrator for a STYLE TEST (slug: olatunde-test). Use your imagegen skill. Work in /home/yusuf/Developer/story-studio.
The owner wants a NEW look for our narrated story videos, copied from two reference videos. Your job: draw pictures in THAT look, as close to the
reference frames as you can, so the owner can compare them side by side with the references and with our current house style.

REFERENCE FRAMES (open and study ALL of them at full size before drawing anything; they are the style target):
- art/olatunde-test/ref/x_*.png   (a second-person survival story: a plane crash in the snow; hero = red beanie + red scarf; Mara = teal coat)
- art/olatunde-test/ref/emu_*.png (a history video, the Great Emu War 1932: soldiers, farmer, emus, wheat field)
OUR CURRENT HOUSE STYLE (for the comparison pictures only; you are NOT drawing in this style, you are redrawing these same moments in the new one):
- art/flight1v2/raw/04_seat.png, 06_phone.png, 13_booth.png, 25_surge.png, 41_run_door.png, 08_line.png and the cast sheet art/flight1v2/raw/_cast.png

OUTPUT: one PNG per picture, EXACTLY 1536x1024, written ONLY to art/olatunde-test/raw/<NN>_<id>.png. Save each picture the moment it passes your
review. Do not run git, do not touch any other file, never overwrite an existing file.

THE NEW STYLE (lock it; this is what we are testing — describe what you see in the refs and match it):
- Clean flat 2D vector cartoon. Flat colour fills, NO painterly shading, NO paper grain or texture, NO gradients except a soft flat sky band,
  NO glow or dramatic lighting, NOT 3D, NOT anime. Looks like a clean animated YouTube explainer cartoon.
- CHARACTERS: a big perfectly round head with a pale warm off-white fill (about #EEF0E2) and an even, bold black outline; two small SOLID BLACK
  DOT eyes set apart; short straight eyebrow strokes that carry the emotion; a tiny one-line mouth; NO nose, NO ears, NO hair unless it is an
  identity cue. The body is a THIN single black STICK line: stick torso, stick arms and stick legs with clean angular bends at elbows and knees,
  small simple line hands (a little loop or 3 short finger strokes) and tiny line feet. Clothing is drawn ONLY as compact flat identity pieces
  (a beanie, a scarf, a coat or a uniform drawn as a simple flat shape over the stick body), exactly like the refs: the red-beanie hero is a stick
  body with only a beanie and a scarf; Mara wears a teal coat with stick legs below; the soldiers wear flat khaki uniforms.
- Character outlines are BOLDER than background lines. Backgrounds are flat vector shapes with thinner, lighter outlines, a MUTED, desaturated
  palette (cool blue-greys / slate for snow and night, warm sand/orange for sunsets and fields) and only one or two accent colours per scene
  (the identity colours). Simple, uncluttered, readable.
- CAMERA like the refs: wide shots with small figures in a big landscape, medium shots, and EXTREME CLOSE-UPS where the round head fills a third
  of the frame, insert shots of hands holding a prop, and SPLIT-SCREEN panels separated by a thin dark vertical line.
- NO text, letters or numbers anywhere (screens, signs, papers stay blank; we add every word in code). Simple pictograms are OK.

CAST FOR THE FLIGHT DELAYED REDRAWS (same identity cues as our series, translated into the new style):
- LEO (hero, 27): mustard-yellow knit beanie (#D9A21B) with a folded brim, a plain grey hoodie (#8C9096) drawn as one compact flat shape over the
  stick torso (hood down), stick legs, small white sneaker shapes. Dot eyes, worried-careful brows.
- DANI (flight attendant, 29): dark hair in a neat bun (simple black shape), a navy uniform jacket + skirt as flat shapes (#1F2A4A), a small red
  neck scarf (#C8302C), stick legs, small dark shoes.
- KIT (girl, 9): smaller (head 80% of an adult's, body shorter), two short pigtails, a yellow jacket (#F2C21B), an ORANGE lanyard with a small
  pouch, a pink backpack.
- THE MAN IN THE GREY SUIT (the first infected): grey suit as a flat shape, loose dark tie, a white bandage on his RIGHT hand; pale, sick face
  (droopy brows, open mouth, sweat drop).
- AN OFFICER at the passport booth: dark blue uniform, peaked cap.
- Crowd people: same round-head stick style, muted coats; nobody duplicates Leo's beanie.

PICTURES → art/olatunde-test/raw/<NN>_<id>.png  (16:9; keep anything important inside x=100..1436, y=110..905: the top/bottom 9% get cropped)
00_cast: a clean character lineup on a plain light background: LEO, DANI, KIT, the GREY-SUIT MAN, the OFFICER, full body front view, same
   scale, standing side by side with space between them, plus a row of six Leo head expressions (neutral, worried, scared, shocked, determined,
   relieved) below. No labels.
-- A. FIDELITY: re-stage two reference beats as a new picture of your own (NOT a copy of the frame), to prove we hit the look:
01_wake: a torn-open plane cabin in the snow, a passenger seat with ripped cushions; the red-beanie, red-scarf stick hero sits slumped in it,
   dazed, looking at his own legs; snow falls through the torn roof; cold slate palette; medium shot. (Ref x_001.)
02_choice: a split screen with one thin dark vertical divider: LEFT the hero carrying Mara (teal coat, black ponytail) piggyback up a snowy slope
   in falling snow; RIGHT the hero walking away alone toward a thin smoke column in a valley; an orange sunset sky. (Ref x_058.)
-- B. FLIGHT DELAYED in the new style (same moment and composition idea as our house picture named in brackets, redrawn in the new look):
03_seat [04_seat]: Leo in an airplane window seat, seatbelt on, looking out of the oval window at an airport at sunset; calm-tired face. Medium.
04_phone [06_phone]: POV insert: Leo's hand (grey hoodie sleeve, stick wrist, simple hand) holds a phone toward the viewer, the screen blank pale
   grey with only a crossed-out signal pictogram; the arrivals hall soft behind it.
05_line [08_line]: wide: the passport-control hall, a long queue between belt barriers, booths at the back, Leo small in the line with a carry-on
   suitcase (handle in his hand), the grey-suit man two places ahead of him holding his bandaged right hand.
06_collapse [13_booth]: medium: at a passport booth the grey-suit man collapses sideways, knees buckling; the officer half-rises behind the
   booth glass, startled; Leo two steps behind, frozen, eyes wide. Count every arm.
07_surge [25_surge]: wide: the crowd panics and runs toward the camera-left exit, people with suitcases, a dropped bag in the foreground; Leo in
   the middle, pressed, arms up at his chest. Every person: one head, two arms, two legs.
08_closeup: EXTREME CLOSE-UP of Leo's face filling the right third of the frame (beanie, eyes, a sweat drop), the blurred-flat hall behind,
   like the ref close-ups (x_037 / x_079).
09_run_door [41_run_door]: Leo runs carrying Kit on his back (her arms around his neck), toward Dani who holds a grey staff door open and beckons;
   a stairwell behind the door. COUNT ARMS: Leo 2, Kit 2, Dani 2.
10_split: split screen like ref x_058: LEFT the empty arrivals hall with a red coat lying on the floor; RIGHT Kit looking up at Leo, worried.

BUG CHECKLIST (the owner rejected earlier cuts for exactly these; review EVERY picture at full size before you save it, fix until clean):
0. HARD RULE: MAX TWO ARMS AND TWO LEGS PER PERSON, EVERY HAND TRACED TO ITS OWN SHOULDER. With stick limbs this is easy to get wrong where lines
   cross: trace each stick arm from its shoulder point to its hand. Two people touching (a carry, a grab) is where a third arm appears: count the
   arms of EACH person separately, out loud, in your reply.
1. COUNT: one head, two arms, two hands, two legs, two feet per person where visible. No floating hands, no merged limbs.
2. FULL BODIES with feet on the ground and a small flat contact shadow when standing/running.
3. PROPS face the right way (a phone screen faces its user, or the viewer in a POV); a suitcase handle is in a hand; the bandage is on the RIGHT hand.
4. CONTINUITY: identical faces, beanie, hoodie, colours in every picture, same as 00_cast.
5. STYLE: flat vector, dot eyes, stick limbs, bold character outlines vs thin background lines, muted palette — compare to the refs side by side.
6. NO TEXT anywhere.
7. REVIEW RULE (owner, mandatory): review every generated image at full size for (a) extra hands, arms or legs; (b) illogical physics: floating
   objects, impossible poses, wrong shadows, props facing the wrong way, things passing through each other; (c) AI slop: melted details, warped
   faces, garbled pseudo-text, mangled fingers, inconsistent style or cast, mushy backgrounds. Regenerate or EDIT until clean.
Do 00_cast first and use it as the reference image for every later picture.
Reply with the saved paths and ONE line per picture: for EACH person the arms you traced (shoulder -> hand), the legs, props checked, text none,
crop ok, and one sentence on how close it is to the reference look and what differs.
