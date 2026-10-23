# The image version (AI stills + motion graphics)

A second cut of an episode built from the **same** script, voice, `shots.tsv`, beats, captions and `mix.wav`. Each shot is a
Codex-generated still moved with motion graphics, in the style of the looma.works reference (instagram.com/p/DeiZwzaoVOH).
Example: `src/episodes/burn3img/TheBurn3Img.tsx` (THE BURN Part 3, 2026-10-23).

## Owner rules (each one came from a rejected first try)
- **Flat 2D only, exactly like our covers** (`art/covers/raw/*-tall.png`) and our What If shorts: round heads, small dot eyes, simple
  shapes, flat colour with soft gradient light. Never 3D or Pixar-like, glossy, realistic anatomy or photographic depth of field.
- **One design per character, in every image.** Mixed detail (one character detailed, the next a stickman) was rejected.
- **Photos and screens must make sense:** when a character looks at a photo or phone, we see its **back**. Its picture is shown
  only in a separate close-up of his hands. A wall screen is seen **over the shoulder**, never with him facing us.
- **The recap polaroids hold generated images too** (the last part's key moments in the same 2D style), still moving a little.

## Pipeline
1. **References:** render frames of each character from the animated episodes (`SCALE=0.5 scripts/stills.sh …` →
   `art/<ep>/ref/`), plus the cover-style sheet.
2. **Brief one Codex art thread** (directed-asset-generation): the style rules above, the world's continuity (who is where, hood
   up or down), crop rules (9:16 from 1024×1536; nothing key in the outer 8%; no faces at 62–74% height where the captions sit),
   no text anywhere, and one line per shot from `shots.tsv`. Split a shot into sub-images when a photo or screen needs back + insert.
3. **Gate:** the character sheet + 3 test shots, then STOP. Check that they're 2D and consistent before the full set. After it
   finishes, review a contact sheet for continuity and send back only the failing shots.
4. `scripts/frames_fit.py <ep> art/<ep>/raw2` → `public/<ep>img/*.jpg` (1280×1920, with pan room) + `manifest.json`.
5. The component: `Still` (push/pan per shot, a soft blur cut-in, shake on hits), `LightLeak` / `Dust`, `CamOverlay` (doorbell or
   CCTV), `StatusBar` (the reference's game HUD: the clock, the door's state, where Mom is), `InfoCard` / `Pointer` / `Circle` /
   `Taps` annotations, a dark rule card (captions hidden for it), and a comment-bait end card. Shots without an image fall
   back to the animated shot.
6. Copy `public/<ep>/mix.wav` to `public/<ep>img/` (render.sh muxes from its slug), then `render.sh`, `qa.py`, deliver, cover.

## What gets an AI still vs. code motion graphics (owner, 2026-10-23)
- **AI stills (Codex, 2D like the covers):** anything with **characters or real places**: faces, rooms, streets, the bridge.
- **Code motion graphics (Remotion, animated):** everything **without characters** that explains, shows or measures, like
  Part 1's globe, map and bridge diagrams. That covers:
  - maps and routes (HOME → BRIDGE → HOSPITAL with a moving dot), the day-line globe
  - "how it works" diagrams: how the burn spreads (lines climbing an arm outline toward the heart), why glass doesn't help
  - rule cards, the Burned types card (silhouettes), the sunset marks on the wall, the radio dial and waveform, the camera-helmet POV UI
  - big animated numbers (a counter that ticks), checklists of supplies being ticked off
  These are drawn, so they can't go wrong the way an AI image can, and they move.
- **A typical rhythm:** a character still (the moment) → a code graphic (the fact or rule) → a still (the reaction). Never 3 stills of talk in a row.
- **Sound makes a still feel alive:** an effect on every move, hit, look and graphic. Footsteps under a walk push, cloth on a turn, a
  whoosh on every card, a ticking clock under countdowns, room tone and a bed in every place, a riser into each reveal and silence
  before the twist. Aim for at least 1.5 cues a second (denser than the animated cut).
- **The HUD:** **countdowns, not progress bars** (UNTIL SUNRISE 5:42, ticking), placed **about 20 % from the top** (y ≈ 380 of 1920),
  clear of the iPhone notch and the TikTok/Instagram top UI.
- **Characters speak:** the narrator carries the story, but key lines get short in-voice quotes inside the narration, and the
  still on screen is the person saying it (a close-up, mouth open, the right expression).
