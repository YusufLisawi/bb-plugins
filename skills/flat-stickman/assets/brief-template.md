You are the illustrator for a FLAT STICKMAN episode (<slug>). Use your imagegen skill. Work in /home/yusuf/Developer/story-studio.
Every action is its OWN complete illustration with the characters drawn into the scene.

REFERENCES (open at full size before drawing): the style frames ~/Developer/bb-plugins/skills/flat-stickman/assets/reference-frames-crash.jpg
and reference-frames-emu.jpg (or art/olatunde-test/ref/*.png), the cast lineup art/<slug>/raw/00_cast.png once it exists, and the place
images listed below.

OUTPUT: one PNG per picture, EXACTLY <1536x1024 | 1024x1536>, written ONLY to art/<slug>/raw/<NN>_<id>.png. Save each picture the moment it
passes your review. Do not run git, do not touch any other file, never overwrite an existing file.

<paste assets/style-block.md here>

CAST (identical in every picture; name the colours in every line where the character appears):
- <NAME> (<role, age>): <identity piece 1 with hex>, <identity piece 2 with hex>, <one signature prop>; <head/hair cue>; <height vs others>.
- …
PLACES (same framing and props whenever a place returns; a new STATE is an EDIT of the previous image so only the described change happens):
- <place>: art/<slug>/raw/<place>.png: <what is where, light / time of day>.

RULES
- Safe area: 16:9 keep everything important inside x=100..1436, y=110..905; 9:16 keep faces out of 62–74 % of the height.
- One clear action per picture, readable in one second. Name the EXPRESSION in each line (scared = brows up and together, mouth a small
  open oval; determined = brows down, mouth a flat line; worried = brows tilted up in the middle, small frown).
- A crowd has a number ("20+ people, overlapping"); a carry is spelled out ("on his back, her arms around his neck, his hands under her knees").

BUG CHECKLIST (review EVERY picture at full size before you save it; fix until clean):
0. HARD RULE: MAX TWO ARMS AND TWO LEGS PER PERSON, EVERY HAND TRACED TO ITS OWN SHOULDER. Stick limbs cross easily: trace each line from
   its shoulder point to its hand. Two people touching (a carry, a grab, a hug) is where a third arm appears: count each person's arms
   separately, out loud, in your reply.
1. COUNT: one head, two arms, two hands, two legs, two feet per person where visible. No floating hands, no floating heads.
2. FULL BODIES with feet on the ground and a flat contact shadow when standing/running.
3. PROPS face the right way (a phone screen faces its user, or the viewer in a POV); held props are in a hand; wounds stay on the same side.
4. CONTINUITY: faces, identity pieces and colours exactly as 00_cast, in crowds too.
5. STYLE: flat vector, dot eyes, stick limbs, bold character lines vs thin background lines, the DARK muted palette, debris in the place.
   Put it next to the reference frames: if yours is lighter, emptier or softer, redo it.
6. NO TEXT anywhere.
7. REVIEW RULE (owner, mandatory): (a) extra hands, arms or legs; (b) illogical physics: floating objects, impossible poses, wrong
   shadows, props facing the wrong way, things passing through each other; (c) AI slop: melted details, warped faces, garbled
   pseudo-text, mangled fingers, inconsistent style or cast, mushy backgrounds. Regenerate or EDIT until clean.
Reply with the saved paths and ONE line per picture: for EACH person the arms traced (shoulder -> hand), the legs, the expression, props
checked, text none, crop ok.

PICTURES → art/<slug>/raw/<NN>_<id>.png (00_cast first, then story order)
00_cast: every character full-body front view, same scale, side by side on a plain light background, plus a row of six hero head
   expressions (neutral, worried, scared, shocked, determined, relieved). No labels.
01_<id> (refs: …): <WIDE | MEDIUM | EXTREME CLOSE-UP | INSERT (hand + prop) | SPLIT 2/3 panels | THOUGHT BUBBLE>; <place/state>; <who does
   what, where they look, the expression, what they carry, the cast colours>.
