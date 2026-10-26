# The art (Codex imagegen)

Images are generated only by Codex BB threads with the imagegen skill (never image APIs directly).

```bash
bb thread spawn --project proj_kax9max22t --parent-self --provider codex --model gpt-6-luna --reasoning-level max --environment env_nji25bvwcj \
  --title "Art · <slug> pictures 1–20" --prompt-file /tmp/briefs/<slug>-a.md
```
- **Owner rule (2026-10-26, ALL image generation, covers included):** every art thread is spawned with `--model gpt-6-luna --reasoning-level max`, and its brief makes it REVIEW EVERY GENERATED IMAGE at full size before saving (extra hands/arms/legs traced to shoulders; illogical physics: floating objects, impossible poses, wrong shadows or light, props facing the wrong way, things passing through each other; AI slop: smeared/melted details, warped faces, garbled pseudo-text, mangled fingers, inconsistent style or cast, mushy backgrounds), regenerating or editing until clean and reporting per image what it checked (item 9 of the brief templates).
- Use the project checkout environment (`env_nji25bvwcj`), not a worktree, so files land in the main checkout and no 1.5 GB
  worktree is left behind. At most 5 Codex threads at once (each holds 0.5–0.8 GB of RAM).
- ~10–12 pictures per thread for a dense film (60–70 pictures = 5–6 threads, ~25 min each in parallel). Split by place or by act so
  continuity stays inside one thread; give every thread the SAME header (style, cast, places, bug checklist).
- Start from `assets/brief-template.md` (the style block, cast, places, rules, one line per picture). Every picture line says:
  the place and its state, who does what, where they look, the expression, what they carry.

## Order of work
1. **Cast sheet** for a new series (front / side / back + expressions per character) and the **key places** (each state made by
   editing the previous image). Review these before any scene: everything else copies them.
2. **Scenes**, referencing the cast sheet and the place images by path.
3. **Review** each batch as a contact sheet (`python3 scripts/stills_build.py <slug> --sheet --no-mix` or ffmpeg tile) and send
   back only the failures, by name, with the exact fix (move the old file to `art/<slug>/old/` first).

## Review checklist (reject on any): the full version with the failure stories is `bug-review.md`
- Same faces, hats, clothes and colours as the cast sheet; same character count; no extra hands or limbs.
- A returning place has the same framing and furniture; a state change changed ONLY what the line says (we rejected a room_a
  whose window moved and whose couch became an armchair).
- Logic: feet on the ground, carried props still carried, damage persists, the prop exists before it is used (the pipe lies on
  the roof before he swings it), light matches the time, the character faces what they react to.
- No text, letters or numbers; no gore; nothing important in the crop zones.
- One readable action; the face big enough to read on a phone.

## Extra pictures for a hook / a fix pass
A hook may need 1–3 NEW pictures (the zombie close-up with hollow eyes and a reaching bandaged hand; the hero walking out of arrivals). One small Codex thread,
header + the same checklist; the first version of a "zombie" read as a worried man: say what makes a face read in 2 seconds (hollow solid-black eye ovals, heavy
down-slanting brows, a slack open mouth, tilted head, arms stiffly forward) and send it back as an EDIT if it does not.

## Fixing one picture
Send the exact fix to the SAME art thread that drew it (`bb thread tell <thread> --message-file fix.md`; it keeps the style context):
name the file, say "EDIT TARGET: change ONLY <the stray hand at about x=270..420, y=500..690 of the 1536×1024 picture>", say what must
be there instead, and ask it to back the old file up to `art/<slug>/old/<name>-v1.png` first. Regenerating re-rolls every other flaw.
Measure where a flaw sits with `python3 scripts/art_sheet.py` (tile coordinates ×1.536 = art pixels) or a PIL crop.

## Crop and sizes
- 16:9 episodes: ask for 1536×1024; the build crops to 1920×1080 by cutting ~9% from the top and the bottom. Frame fraction of an
  art point: `frame_x = art_x / 1536`, `frame_y = (art_y − 80) / 864`: use it to place fx.
- 9:16 episodes: ask for 1024×1536; the build crops to 1080×1920 (left/right trim). Keep faces out of 62–74% height if captions
  are added.
- Prop cut-outs for `prop` fx or cards: the prop alone on flat magenta #FF00FF, then
  `.venv/bin/python scripts/parts_key.py <art dir> <public dir>` (prop_* files are each cropped to themselves).
