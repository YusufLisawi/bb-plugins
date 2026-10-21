# Clone mode — a reference video, shot for shot

How `farm` was made: the same story, script, shots, cut words, captions, HUD and end card, redrawn in code and made
smoother. A 1:1 clone copies another creator's script and staging. Say so in `brief.md`, and leave the decision to
publish it to the owner. Originals use the same pipeline without this file.

## 1 · Watch it yourself

The owner asked for this on farm ("watch this by yourself, not Luna"), because a clone needs your own eyes on the
frames.

```bash
S=~/.bb/skills/watch-video/scripts
W=$($S/fetch.sh "<url>" ~/Videos/refs/<slug>)            # keep the reference: compare_ref.py needs it
$S/transcribe.sh "$W" en                                  # transcript.json has word times
ffmpeg -v error -i "$W"/video.mp4 -vf "fps=2,scale=270:-1,tile=8x6" "$W"/sheet_%02d.jpg   # 2 fps contact sheets
ffmpeg -v error -i "$W"/video.mp4 -vf "scale=144:-1,select='gt(scene,0.12)',metadata=print:file=-" -an -f null - \
  | grep pts_time                                        # cut times (0.12 found 41 for farm's 40 shots)
```

Look at every sheet. Note the look (palette, light, depth of field), the character design (proportions, face,
outfit), the HUD wording, the caption chunks and keyword colours, the voice (pace, pitch) and the music bed. Write
`episodes/<slug>/reference.md` with the look, the sound, the verbatim script with line start times, and the end card.

## 2 · The shot list comes from the video, not from memory

On farm, the parent's hand-written table slipped one row from shot 5 onward and missed 5 elements (a cows shot, the
1 HORSE chip, a caption chunk, the MEDICAL · LOW row, a map chip). The builder caught it by reading the video frame by
frame. Do it that way from the start:

```bash
python3 ~/Developer/bb-plugins/skills/what-if-shorts/scripts/ref_cuts.py "$W"/video.mp4 "$W"/transcript.json \
    episodes/<slug>/script.tsv > episodes/<slug>/shots.tsv
```

`ref_cuts.py` detects the cuts and maps each one to `(line, word, frac)` of YOUR script. On the farm reference it found
all 40 shots and put 34 of the builder's 37 hand-measured cuts on the exact same word. The reference words are
aligned to the script words, and `frac` is how far the cut sits between that word and the next. Your film then cuts
on the same words at the same fractions, even though your voice take has different seconds. Fill in `type`, `what`
and `devices` for every row by looking at the frame after each cut. Keep `shots.md` as the human-readable table.

## 3 · The voice matches the narrator by measurement

Audition 6–8 Fish voices reading the reference's first 3 lines. Measure pace (the seconds for those lines vs the
reference's) and pitch (YIN F0 median vs the reference's). On farm: 8 voices, and "Alex American Young male" won at
162 vs 163 Hz. Then sample takes ([voice-and-sound.md](voice-and-sound.md) § 1) and pick the take whose line starts
land within ≈ 1 s of the reference's. Add the reference's holds (farm: 0.75 s before the reveal, against the
reference's 1.0 s).

## 4 · CP0 compares the cast to the reference

Put the model sheet next to reference frames of the same character (face, brows, cap, proportions, walk) and fix the
differences before building shots. Farm CP0 fixed 6: brows, the back of the head, the walk, the dog's muzzle, the
dog's sit, and the far legs.

## 5 · CP1 compares every shot

```bash
SCALE=0.3 scripts/stills.sh <Component> out/<slug>-cp1.jpg <one second per shot, at its key word>
.venv/bin/python ~/Developer/bb-plugins/skills/what-if-shorts/scripts/compare_ref.py out/<slug>-cp1.jpg 0.3 out/<slug>-pairs.jpg \
    --ref ~/Videos/refs/<slug>/video.mp4 --refwords ~/Videos/refs/<slug>/transcript.json \
    --lines public/<slug>/vo/lines.json <the same seconds>
```

Each pair shows the reference at the same spoken word next to ours. Fix whatever is sparser, smaller, flatter or
missing. Farm CP1 had 13 fixes: denser sets, the missing pin, the city silhouette, packed shelves, a 3× rooster, a
real pen hand, the dawn glow, the barn doors ajar, glowing eyes, the chain around the post.

## 6 · What "better than the reference" means

Keep the same story, words, shot order, cut words, caption chunks and colours, HUD wording and end card. Improve
these:

- **Rigs instead of drawings:** IK limbs, planted feet, a real walk, brows that act, and hands that grip.
- **Animals that act on their words**, and props that touch their hands.
- **Every shot moving:** parallax, push-ins, live elements.
- **60 fps motion blur.** The reference is 30 fps.
- **A cue for every action:** farm had 2.0 cues per second.

Approved restaging is fine when the reference's version can't work physically (farm: a believable phone reach, and
stepping up into the truck instead of a cross-fade). Note each one in `brief.md`.

## 7 · Keep the reference

Keep `~/Videos/refs/<slug>/` (≈ 30 MB: the video, its transcript, the sheets) until the clone is delivered. Delete
bulk frame folders as soon as you've read them, then run `scripts/clean.sh <slug>` after delivery.
