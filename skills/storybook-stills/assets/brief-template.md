You are the illustrator for a STORYBOOK STILLS episode (<slug>). Use your imagegen skill. Work in /home/yusuf/Developer/story-studio.
Every action is its OWN complete illustration with the characters DRAWN INTO the scene. Nothing is a cut-out.

OUTPUT: one PNG per picture, EXACTLY <W>x<H>, written ONLY to art/<slug>/raw/<NN>_<id>.png. Save each picture the moment it passes your
review. Do not run git, do not touch any other file, never overwrite a file that already exists in that folder (missing numbers belong to
other threads or to approved pictures). ~10-12 pictures per thread, at most 5 art threads at once.

STYLE (never change it): match art/beanie4/raw/*.png and art/hybrid2/ref/ (the "Beanie Survives" / "Melvin" look): cartoony
storybook illustration, imperfect black ink outlines, soft painted shading, light paper grain, a muted palette with one warm
light source per scene. Characters are the classic cartoon STICKMAN: a big white round head, small black dot eyes, a tiny
mouth (expressions with simple brows and mouth shapes), a thick black outline, thin black stick arms and legs, small round
white hands, simple clothes drawn as flat shapes. NOT 3D, NOT anime, NOT photographic, NOT gory. NO text, letters or numbers
anywhere (signs, screens, papers and plates stay blank: we add every word in code).

CAST (identical in every image; use the reference images listed):
- <NAME>: <hat>, <clothes>, <one signature prop>. References: art/<slug>/cast/<name>_*.png
- …

PLACES (identical framing and contents whenever a place returns; a place in a new STATE is made by EDITING its previous image so
only the described change happens):
- <place>: art/<slug>/raw/<place>_a.png …  (list what is where: windows left, booths at the back, door right, light from the left)

RULES
- <W>x<H> (16:9 episodes: 1536x1024, keep anything important out of the top and bottom 9% (the 16:9 crop) and the outer 6%, i.e. inside
  x=100..1436, y=110..905; 9:16 episodes: 1024x1536, keep faces out of 62–74% of the height).
- LOGIC: feet on the floor; props exist before they are used and stay with whoever took them (a bag taken stays on the back);
  damage stays damaged; light matches the time of day; nothing floating; the character faces what they react to.
- One clear action per picture, readable in one second; the character big enough to read the face.

BUG CHECKLIST (the owner rejected earlier cuts for exactly these; review EVERY picture against it before you save it, fix until clean):
0. HARD RULE: MAX TWO ARMS AND TWO LEGS PER PERSON, EVERY HAND TRACED TO ITS OWN SHOULDER. Before you save, take each person in the picture (also the ones
   who only grab, hug, bite or are bitten) and trace every sleeve from a SHOULDER to its hand: a person has exactly two shoulders, so at most two sleeves
   leave a torso and at most two hands belong to it. A hand that grips someone else must be attached by a visible sleeve to the GRABBER's own shoulder, never
   to the person it grips; a hand you cannot trace is an extra arm and the picture fails. Two people touching (a bite, a grab, a hug, a hand-hold, a carry)
   are the usual place where a third arm appears: after drawing them, count the arms of EACH person separately, out loud, in your reply. A raised or
   wrapped-around arm may disappear behind a head or a body, but it never gets a second copy. No arm hangs off the edge of the frame unless its shoulder is visible.
1. COUNT: every person has exactly ONE head, TWO arms, TWO hands (one per arm), TWO legs, TWO shoes where those parts are visible. No
   duplicated or extra hands, no third arm, no hand floating without an arm (trace every hand to its sleeve), no merged limbs or heads.
2. FULL BODIES: when the action needs legs (leaning, kneeling, running, standing, climbing) the legs and shoes are drawn and touch the
   floor with a contact shadow. Never a torso hanging behind a counter when the story shows the whole person.
3. PROPS FACE THE RIGHT WAY: a phone's screen faces its user (or the viewer in a POV picture); a passport someone is READING has its pages
   turned toward the reader and the viewer sees only its cover; exactly ONE badge hangs from a lanyard; a suitcase handle is in a hand;
   a bandage / scar is always on the same hand / side.
4. CONTINUITY: faces, hair, hats, clothes and colours exactly as in the cast sheet; a dropped prop is gone from later pictures.
5. PLACE LOGIC: the same layout, furniture and light direction whenever a place returns; nobody stands inside a wall.
6. NO TEXT anywhere: signs, screens, boards, badges, passports, banknotes stay BLANK (simple pictograms are allowed).
7. SAFE CROP and 8. READABLE as above.
9. REVIEW RULE (owner, mandatory for every image): REVIEW EVERY GENERATED IMAGE at full size before you save it, for (a) duplicated or extra hands, arms or legs (trace each hand to its own shoulder); (b) illogical physics: floating objects, impossible poses, wrong shadows or light direction, props facing the wrong way, things passing through each other; (c) AI slop: smeared or melted details, warped faces, garbled pseudo-text, mangled fingers, inconsistent style or cast, mushy backgrounds. Regenerate or EDIT until clean, and report per image what you checked.
Reply with the saved paths and ONE line per picture: for EACH person the arms you traced (shoulder -> hand), the legs, props checked, text none, crop ok.
If a picture cannot be made clean, say which and why. (A later FIX message names one file and says "EDIT TARGET: change ONLY …".)

PICTURES → art/<slug>/raw/<NN>_<id>.png   (number them 01…NN in STORY ORDER across all threads; refs name the reference images to attach)
01_<id> (refs: …): <place/state>; <who does what, where they look, the expression, what they carry>. Camera: wide / medium / close-up / POV / insert.
02_<id>: …
Per sentence plan 2-3 pictures: establishing, the action, a close-up or insert (hand, prop, screen, feet), a reaction face, a place STATE.
