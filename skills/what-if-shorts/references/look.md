# Look — the flat-vector style bible

## 1 · What it is, and what it is not

**It is:** soft flat shapes with gentle two-stop gradients and no outlines (only thin dark lines on small props). The
light is a hazy overcast or one motivated light per scene. The palette is muted and natural, with one red and one
orange accent. A faint paper grain and a warm vignette sit over everything, foregrounds are blurred like a real lens,
and the characters are simple and readable (round head, dot eyes, brow strokes) but move like real bodies.

**It is not:** anime cel shading, outlines everywhere, neon or purple "corporate flat" gradients, photo textures,
3-D renders, AI images, clip-art people, or static slides.

Everything is SVG drawn by React components in Remotion. The reference frames are `~/Videos/story-studio/farm-qa-sheet.jpg`
(one per shot), so open it before designing a new world.

## 2 · Palette (the kit's values)

**World (`PAL`, `src/kit/flat/scenery.tsx`)**

| Role | Values |
|---|---|
| Sky | top #b7bfb5 → low #e2e3d6, clouds #eceee6 with shade #d3d7cd |
| Grass | #8fb35a, light #9fc169, dark #7aa04a, far #a6bd7c |
| Fields / crops | #b3c77f · yellow #d8cd8a · crop #6c903f / #587a33 |
| Dirt | #c8a368, light #d7b47d, dark #b28d57 |
| Accent red (barn) | #bb3127, side #8e231d, dark #6f1a16, trim #f1ede3 |
| House | #eff0ea, shade #d2d7d1, roof #6b7279, window #4d5d6c |
| Trees | #6c984c, dark #5a8540, highlight #83ad60, trunk #6b4b32 |
| Wood · steel · truck | #8b6142 / #6c4a31 · #a9b2b8 / #7f8a92 · #5a7a90 / #47647a |

**HUD (`HUDC`, `hud.tsx`):** ink #24211d · paper #f3f0e8 (shade #e2ddd1) · red #d93a2e · orange #f2a428 · green #3f9a55 ·
blue #3b86c9 · grey #8a8579 · dark pill #2c2925.
**Captions:** white, outline #1d1813, keywords orange #f5a623 and red #e8372c.
**Map moods (`maps.tsx`):** `MOOD_DAY` (grass #9fc074, fields #c3d89a / #88ae5c, water #86b8df) and `MOOD_DIM` for night
or danger (grass #5d6b37, water #5c7488).

Per frame, use one red accent (the barn, the alert, danger) and one orange accent (the key fact). Everything else is
a desaturated natural. New worlds keep the same rule: pick 5–7 naturals plus the same red and orange.

## 3 · Light, haze, grain, vignette (numbers from the farm)

| Element | Setting |
|---|---|
| Grain | `<Grain o={0.08}/>` over every shot except the end card |
| Vignette | `<Vignette o={0.4}/>` warm (52,36,22), `0.6` on dark slams and the final eyes |
| Haze | `<Haze y={horizon} h={500} o={0.5}/>` on every exterior horizon |
| Motivated light | `<Light>` screen-space radial: phone glow `255,70,50` o 0.5 · window `255,250,235` o 0.25 · dawn `255,214,140` o 0.55 |
| Grades | `<Wash>`: warm interior `#ffcf8a` soft-light 0.06–0.12 · alert red `#ff3b2f` soft-light 0.12 · night `#1c1d22` 0.12–0.16 · dark map `#0e140d` 0.72 |
| Rim light | `JakeLit rim={{ col: <light colour>, dx/dy toward the light, o: 0.6–0.85 }}` whenever a character stands in coloured or dark light |
| Depth of field | near plane blur 10–16 px (most used: 14), mid and action planes sharp, far planes hazed instead of blurred |

## 4 · Moods

| Mood | Look | Farm shots |
|---|---|---|
| Overcast day | the default: soft sky, haze, no hard shadows, soft contact shadows | yard, coop, cows, gate |
| Warm interior | cream walls, wood, warm wash, window light | kitchen, desk |
| Alert | the phone's red glow on faces and walls, pulsing with the buzz | the over-the-shoulder alert |
| Dark interior + one shaft | near-black room, one warm light shaft through a door, a rim on the figure | the shed, the barn |
| Cold fog | blue-grey layers at 4 depths, tapered trunks, glowing white eyes | the forest |
| Night map | `MOOD_DIM`, dense dark canopy, the one danger source the brightest thing | noise rings, the tilted map |
| Dawn | a warm glow from behind the subject, long soft light | the porch |
| Danger red | a red soft-light wash plus a darker vignette | (sequels: "red light only") |

## 5 · Characters

**Proportions (head = 1 unit, `J` in `jake.tsx`):** about 3.5 heads tall. Torso 1.0, thigh and shin 0.56 each,
upper arm 0.50, forearm 0.47, mitten hand radius 0.108. All limbs are two-bone IK with fixed bone lengths, so they
never stretch.

**Face:** dot eyes on a sphere, so a ¾ turn really turns, with a tiny glint. Short dark **brow strokes carry every
emotion.** The mouth is a small line (smile, flat, wavy-worried, or "O"). No nose, no ears. The cap bill turns with
the head.

**Expressions (`EXPR`):** calm · happy · content (eyes shut, smiling) · angry · determined · worried · done (eyes
shut, flat) · shock (wide eyes, O mouth) · flat. Key them on beat words with
`exprAt(t, [[time, "name"], …])`, which blends over 0.18 s and switches on the 60 fps grid.

**Acting rules:**

- Every line, the character DOES the verb of the line: eats, lifts the phone, walks, turns the tap, pulls the cord,
  locks the gate, sips coffee.
- Emotion changes land on the beat word, and the brows move first.
- Blinks every ≈ 3 s (`blinkAt`). Idle breathing (`jakeIdle`) whenever he stands.
- Walks are distance-driven (`jakeWalk(dist, t)`): planted feet, heel-off, hip and head bob, a counter-twist, and the
  cap lagging a hair behind. Animals walk the same way (`dogWalk`).
- **Owner rules:** the head is drawn last (top layer). Hands are never mirrored. A held prop goes in `holdR` /
  `holdL`, so the fingers close over it. There is always a contact shadow, and the scale stays the same across cuts
  in one scene.

**New cast (the kit's current limit).** The rig is one person: `Jake` with the `JAKE_COL` palette and always the cap.
A new character means extending the rig first. Add a `look` prop with the palette, headwear (cap / none / hood /
helmet) and hair (short / bun / long / grey / bald), plus a height scale. Then render a model sheet at CP0 (the
`src/episodes/farm-lab/FarmLab.tsx` pattern: front, ¾, side and back views, the expressions, and a walk strip) and get
it approved before any shot uses the character. Design rules:

- **Distinct silhouettes:** the hat-or-hair shape, height and outfit colour must tell characters apart in one glance.
- **One signature colour per person,** used in their caption colour too (Jake: olive cap and brown jacket).
- **Varied skin tones and ages** (the channel's high-rise cast: a young Black man, an 81-year-old neighbour, a little
  girl in a yellow raincoat).
- **Kids** are ≈ 2.7 heads tall with a bigger head. **Older people** have a slight stoop (lean ≈ 0.12), a slower
  stride (×0.7) and a cane.

**Animals (`animals.tsx`, `dog.tsx`):** the border collie rig (stand / sit / lie / walk, a hinged jaw for barks,
ears, tail), chickens (5 looks, peck), cows (graze, chew, tail), a horse, a bird (land, flap, fly), and a zombie.
Animals act on their words too: the dog barks on "barks", and the bird flies off.

## 6 · Threats

Show less than you could. Dark blue-black silhouettes with thin limbs and **glowing white eyes with a soft halo**,
half lost in fog. On maps they're dots streaming in. The final reveal is eyes in a dark gap with one slow blink. No
gore, no full monster close-ups.

## 7 · Sets, props, diagrams, maps

- **Sets** are layered planes. Each material is 2–3 flat tones (base, shade, highlight) and a two-stop gradient.
  Repeating detail (planks, tiles, crop rows, shelves) is simple stripes with seeded irregularity. Fill shelves and
  rooms, because sparse reads cheap (a CP1 fix on farm: "pack the garage shelves").
- **Perspective:** one-point for interiors (floor lines converge) and a ground plane for exteriors (the road narrows
  to the horizon). Characters' feet sit on the measured floor line.
- **Cutaways / diagrams:** soil brown with strata, pipes, and flow drawn as a dashed line that moves along its path.
  Each part is labelled in small caps, and the chips light in order.
- **Maps:**
  - Top-down patches (fields), tree canopies as overlapping circles (`Canopy`), roads and pins.
  - The dim mood for night or danger.
  - Satellite zoom-outs as a patchwork (`Patchwork`).
  - Tilted 3-D maps through CSS perspective in an isolated, clipped container.

## 8 · New worlds for other niches

Build each world once, in the kit (`src/kit/flat/<world>.tsx`), with the same palette rules.

| World | Recipe |
|---|---|
| City / high-rise | a night skyline of blocks with lit windows (warm and cool mix) and haze; a building section (floors, the elevator shaft, pumps); a one-point hallway with doors and a red exit-sign glow |
| Home interiors | the farm kitchen, bathroom, garage and desk exist in the farm shots; lift them into the kit when reused |
| Space | navy → black gradient; stars as dots in 3 sizes, a few twinkling; planets as flat discs with a two-tone terminator and a thin rim glow; the Earth's limb with cloud blobs; labels with leader lines |
| Micro (cells, atoms) | soft blobs (`blobPath`), translucent layers, a scale bar; electron clouds as radial gradients |
| Sea / beach | water bands by depth, foam lines, a flat sun disc, the rip current as a darker channel |
| History | flat stone and wood tones, costumes through the `look` palette, parchment date cards |
| **Powers-of-ten journey** (ladders) | nested scenes, each drawn at its own scale; camera zoom `z(t) = z0·e^(kt)` for a constant feel; at each 10× handoff the next scene fades in over 0.3 s, matched in scale; the counter is screen-space. Not built yet: write `src/kit/flat/journey.tsx` (a stage list `[{scale, draw, label}]`) and check stills at every handoff |

## 9 · What makes it look cheap (CP1 rejects these)

Outlines on everything · pure black shadows · pure white backgrounds · neon gradients · text under 34 px · a crowded
HUD · static shots · characters floating (no contact shadow) · props not touching hands · a scale jump between cuts ·
noodle arms · a face sliding off the head in ¾ · hard pops (no spring) · every shot at the same zoom · sparse, empty sets.
