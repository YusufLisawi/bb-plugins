# The art (Codex imagegen)

Images are generated only by Codex BB threads with the imagegen skill (never image APIs directly).

```bash
bb thread spawn --project proj_kax9max22t --parent-self --provider codex --environment env_nji25bvwcj \
  --title "Art · <slug> pictures 1–20" --prompt-file /tmp/briefs/<slug>-a.md
```
- Use the project checkout environment (`env_nji25bvwcj`), not a worktree, so files land in the main checkout and no 1.5 GB
  worktree is left behind. At most 5 Codex threads at once (each holds 0.5–0.8 GB of RAM).
- ~16–20 pictures per thread. Split a long film by place or by act so continuity stays inside one thread.
- Start from `assets/brief-template.md` (the style block, cast, places, rules, one line per picture). Every picture line says:
  the place and its state, who does what, where they look, the expression, what they carry.

## Order of work
1. **Cast sheet** for a new series (front / side / back + expressions per character) and the **key places** (each state made by
   editing the previous image). Review these before any scene: everything else copies them.
2. **Scenes**, referencing the cast sheet and the place images by path.
3. **Review** each batch as a contact sheet (`python3 scripts/stills_build.py <slug> --sheet --no-mix` or ffmpeg tile) and send
   back only the failures, by name, with the exact fix (move the old file to `art/<slug>/old/` first).

## Review checklist (reject on any)
- Same faces, hats, clothes and colours as the cast sheet; same character count; no extra hands or limbs.
- A returning place has the same framing and furniture; a state change changed ONLY what the line says (we rejected a room_a
  whose window moved and whose couch became an armchair).
- Logic: feet on the ground, carried props still carried, damage persists, the prop exists before it is used (the pipe lies on
  the roof before he swings it), light matches the time, the character faces what they react to.
- No text, letters or numbers; no gore; nothing important in the crop zones.
- One readable action; the face big enough to read on a phone.

## Crop and sizes
- 16:9 episodes: ask for 1536×1024; the build crops to 1920×1080 by cutting ~9% from the top and the bottom.
- 9:16 episodes: ask for 1024×1536; the build crops to 1080×1920 (left/right trim). Keep faces out of 62–74% height if captions
  are added.
- Prop cut-outs for `prop` fx or cards: the prop alone on flat magenta #FF00FF, then
  `.venv/bin/python scripts/parts_key.py <art dir> <public dir>` (prop_* files are each cropped to themselves).
