#!/usr/bin/env python3
"""Compose a film's music as short PIECES (ElevenLabs Music v2.5 composition
plans), then join them on exact frames with scripts/stitch_music.py.

Why pieces: one long generation puts its drop "about" where the plan says —
off by up to a second, which misses the word. A piece that STARTS on its first
beat, placed at the drop frame, lands exactly. Typical film:
    A  intro / problem   (ends with a swell, or stops dead like a record stop)
    B  the drop section  (starts on the first beat: groove drops at 0.0 s)
    C  the final hit     (one big hit on the first beat, resolve, ring-out)

  . scripts/el-env.sh && .venv/bin/python scripts/music_pieces.py films/<id>/music.plan.json [A B …]

plan JSON (see film-template/music.plan.json):
  { "out_dir": "public/films/<id>/music",
    "base": ["upbeat funk-pop", "112 BPM", "E major", "instrumental", …],   applied to every chunk
    "neg":  ["vocals", …],
    "pieces": { "A": [ {"text": "[Intro]", "ms": 9800, "styles": [...], "neg": [...]}, … ], … } }
Chunks must be ≥ 3000 ms. The account allows 2 concurrent music requests
(shared with anything else running) — this script goes one at a time and
retries 429s with back-off. Output: <out_dir>/piece-<name>.mp3
"""
import json, os, sys, time, urllib.error, urllib.request

DEFAULT_NEG = ["vocals", "lyrics", "singing", "voice", "choir", "spoken word", "rap", "harsh", "distorted", "lo-fi"]

def compose(plan, name):
    chunks = []
    for c in plan["pieces"][name]:
        assert c["ms"] >= 3000, f"piece {name}: chunks must be >= 3000 ms"
        chunks.append({"text": c.get("text", "[Section]"), "duration_ms": c["ms"],
                       "positive_styles": plan["base"] + c.get("styles", []),
                       "negative_styles": plan.get("neg", DEFAULT_NEG) + c.get("neg", [])})
    out = os.path.join(plan["out_dir"], f"piece-{name}.mp3")
    os.makedirs(plan["out_dir"], exist_ok=True)
    for attempt in range(6):
        req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
                                     data=json.dumps({"composition_plan": {"chunks": chunks}, "model_id": "music_v2_5"}).encode(),
                                     headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json",
                                              "User-Agent": "motion-film-studio/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                open(out, "wb").write(r.read())
            print(out, flush=True)
            return
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20 * (attempt + 1))
                continue
            print(name, "ERROR", e.code, e.read()[:300].decode(errors="replace"), flush=True)
            return

def main():
    plan = json.load(open(sys.argv[1]))
    for name in sys.argv[2:] or list(plan["pieces"]):
        compose(plan, name)

if __name__ == "__main__":
    main()
