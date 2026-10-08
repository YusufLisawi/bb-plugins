#!/usr/bin/env python3
"""Mix a film from its spec — voice + ducked music + frame-locked sound design.

  .venv/bin/python scripts/mix_film.py films/<id>/film.json [--table] [--peaks]

film.json (see film-template/film.json):
  fps, durationInFrames, out
  vo:     {"dir": "public/films/<id>/vo"}           uses lines.json + lNN.mp3 written by split_take.py
  cast:   [[frame, "public/films/<id>/cast/c1.mp3"], …]   optional extra voices (customers…)
  music:  {"file": …, "offset": s, "fadeIn": s, "underVoiceDb": 18, "hit": frame | null}  or null
          null → no music (voice + sound design only). underVoiceDb: how far the bed sits
          under the voice; default 18 = soft (the old 11 was loud; ≥ 16 recommended)
          hit → a 16 dB drop-out in the last 0.3 s before that frame so the final hit lands
  sound:  "public/films/<id>/sound.json"            exported by scripts/film_sound.ts
  duck, voComp, fadeOut                             optional overrides

Each SOUND cue names a library effect; its kind (level target) and peak/attack
alignment come from public/sfx/library.json unless the cue overrides them.
Writes the mix WAV and prints loudness (target −14 LUFS, ≤ −1.5 dBTP).
"""
import json, os, sys
sys.path.insert(0, "scripts")
import mix_vo

def build(spec):
    fps = spec["fps"]
    lib = json.load(open("public/sfx/library.json"))
    vo_dir = spec["vo"]["dir"]
    lines = json.load(open(os.path.join(vo_dir, "lines.json")))
    vo = [[f, os.path.join(vo_dir, f"{k}.mp3")] for k, f in lines.items()]
    vo += [list(c) for c in spec.get("cast", [])]
    sfx = []
    if spec.get("sound"):
        for c in json.load(open(spec["sound"]))["sound"]:
            e = lib[c["sfx"]]
            align = c.get("align") or e["align"]
            at = c["at"] - (e["peak_s"] * fps if align == "peak" else 0)
            sfx.append([round(max(0, at), 2), e["file"], c.get("kind") or e["kind"], c.get("trim", 0), c.get("note", c["sfx"])])
    m = spec.get("music") or {}
    cue = {
        "fps": fps,
        "durationInFrames": spec["durationInFrames"],
        "out": spec["out"],
        "music": m.get("file"),
        "musicOffset": m.get("offset", 0),
        "musicFadeIn": m.get("fadeIn", 0),
        "music_under_voice_db": m.get("underVoiceDb", 18.0),
        "duck": spec.get("duck", {"under_db": -6.0, "attack": 0.2, "release": 0.45}),
        "vo_comp": spec.get("voComp", {"above_rms_db": 9.0, "ratio": 3.0}),
        "vo": vo,
        "sfx": sorted(sfx),
    }
    total_s = spec["durationInFrames"] / fps
    cue["fadeOut"] = spec.get("fadeOut", [total_s - 1.2, total_s])
    if m.get("hit"):
        h = m["hit"] / fps
        cue["music_env"] = [[0, 0], [h - 0.62, 0], [h - 0.3, -16], [h - 0.02, -16], [h, 0]]
    return cue

def main():
    spec = json.load(open(sys.argv[1]))
    cue = build(spec)
    json.dump(cue, open(os.path.splitext(spec["out"])[0] + ".cues.json", "w"), indent=1)
    mix_vo.run(cue, show_table="--table" in sys.argv, show_peaks="--peaks" in sys.argv)

if __name__ == "__main__":
    main()
