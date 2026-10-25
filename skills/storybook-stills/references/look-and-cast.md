# The look and the cast

## The look (match it exactly)
- Cartoony storybook illustration: imperfect black ink outlines, soft painted shading, light paper grain, believable perspective.
- Palette: muted; one warm light per scene (lamp, candle, fire, dawn) against blue-grey night or dusty day. Fire and sunrise are
  the only saturated moments.
- Characters: the classic cartoon stickman of Beanie Survives / Melvin: a big white round head, small black dot eyes, a tiny mouth,
  simple brows for expression, a thick outline, thin black stick arms and legs, small round white hands, clothes as flat shapes.
  Heads are big (≈ a third of the figure) so faces read on a phone.
- Never 3D, anime, photographic or gory. No text inside pictures (signs, screens, papers, plates blank): every word is code.
- Grain + vignette are added by the engine on every frame; don't ask the artist for them.

Style references to give every art thread: `art/beanie4/raw/*.png` (our approved pictures), `art/hybrid2/ref/beanie-grid.jpg`
and `plate-apartment.jpg` / `plate-garden.jpg` (the two reference channels).

## The cast
- One signature silhouette each: a hat or hair shape, one clothing colour, one prop (Sam: teal beanie, orange puffer vest over a
  grey hoodie, later a green backpack; Lena: black bob with a red headband, green parka; the zombie: grey-green head, hollow eyes,
  torn undershirt). Distinct colours so two characters never blur together.
- Make a CAST SHEET first for a new series: each character front / side / back, a few expressions, on a flat background
  (`art/hybrid3/raw/head_*.png`, `lhead_*`, `zhead_*` are good references of the level of detail). Every scene brief points at it.
- Keep wardrobe continuity: what a character picks up stays on them until the story puts it down (the bag stayed on Sam's back
  from the moment he took it, and sat beside him at dawn).

## AI draws vs code draws
| AI (Codex, one picture per action) | Code (src/kit/stills) |
|---|---|
| every scene with its characters, props, damage, light | camera push / pan / settle / shake |
| each STATE of a place (normal → barricaded → door cracked) | impact bursts, flashes, Zzz, weather, embers, sun rays |
| close-up inserts (a hand holding a phone, a pipe on the gravel) | all text: phone screens, counters, labels, day / rule / supplies cards |
| prop cut-outs on flat magenta when a prop must pop in by itself | diagrams: the climb cutaway, tallies, floor plans with the crowd flow, the crush gauge, the arms-up pictogram |
| blank phone screens, boards, signs, passports, banknotes | what is on them: phone UI, split-flap board, invented foreign script, the passport page, stamps |
| foreign-language announcements as a sound only | a translation bubble of invented script that turns into "???" |

The hybrid (AI parts on code stick limbs) exists in `src/kit/stick/` and `src/episodes/hybrid4/`. The owner preferred these
drawn pictures: use the hybrid only if asked.
