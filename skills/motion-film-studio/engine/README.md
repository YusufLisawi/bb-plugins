# Motion films project

Scaffolded by the `motion-film-studio` skill (see its SKILL.md for the full workflow).

```
films/<slug>/                 brief.md, script.txt, film.json, music.plan.json, music.stitch.json, cast.json, deliver.json
public/films/<slug>/          vo/ (lNN.mp3, lNN.words.json, lines.json), cast/, music/, sound.json, mix.wav
public/sfx/                   42-effect library + library.json (kinds, peak alignment) — installed from the asset pack
public/fonts, public/img      DM Sans / DM Mono / TikTok Sans, grain tile (from the asset pack), channel icons
src/remotion/kit/             format (layout, Fit) · fx · type (Kinetic) · ui · camera · cube · lockup · timing · sound · ss
src/remotion/brand/           Mark (pen-stroke logo), Icons
src/remotion/films/           registry.ts + one folder per film (starter/ is a kit demo in all four formats)
film-template/                what new-film.sh copies: brief, script, configs, and code/Film.tsx.tmpl (the blank canvas)
scripts/                      voice · music · sound · mix · stills · render · finish · qa · package
```

| Step | Command |
|---|---|
| new film | `bash $SKILL/scripts/new-film.sh . <slug> <PascalId> v,h` (blank canvas) or `… --from <slug>` (fork a film) |
| preview | `PORT=3151 npx vite` → `/?film=<slug>&format=v` |
| voice | `. scripts/el-env.sh && .venv/bin/python scripts/vo_take.py films/<slug>/script.txt public/films/<slug>/vo --voice uju3wxzG5OhpWcoi3SMy --tempo 1.06` then `split_take.py` |
| music | `music_pieces.py films/<slug>/music.plan.json` → `stitch_music.py films/<slug>/music.stitch.json` |
| stills | `scripts/stills.sh <Id>-v out/review <frames…>` |
| sound + mix | `bun scripts/film_sound.ts src/remotion/films/<slug>/<Id>.tsx > public/films/<slug>/sound.json` → `mix_film.py films/<slug>/film.json --table` |
| master | `scripts/render_master.sh <Id>-v <slug> 5 angle` |
| QA | `qa.py out/<Id>-v.mp4 out/<Id>-v-final films/<slug>/script.txt` |
| deliver | `package.py films/<slug>/deliver.json` |
