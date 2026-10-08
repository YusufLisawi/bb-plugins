#!/usr/bin/env python3
"""Music for films #6/#7 built from short pieces (each piece starts exactly on
its first beat), then joined at exact frames by scripts/stitch_music.py — so
the lift and the final hit land on the words, which one long generation won't
guarantee. Usage: . scripts/el-env.sh && .venv/bin/python scripts/music_pieces.py <piece> [...]"""
import json, os, sys, time, urllib.request, urllib.error

NEG = ["vocals", "lyrics", "singing", "voice", "choir", "spoken word", "rap", "harsh", "distorted", "lo-fi"]
def ch(text, ms, styles, base, neg=()):
    return {"text": text, "duration_ms": ms, "positive_styles": base + styles, "negative_styles": NEG + list(neg)}

W = ["warm cinematic piano and strings", "96 BPM", "D major", "instrumental", "premium commercial mix", "emotional", "hopeful", "space for a voice-over"]
H = ["upbeat funk-pop", "112 BPM", "E major", "instrumental", "premium commercial mix", "playful", "punchy", "space for a voice-over"]
PIECES = {
    "wA": ("wait", [ch("[Intro]", 17600, ["intimate felt piano", "soft warm pads", "gentle heartbeat pulse", "slowly building",
                                          "ends with a gentle rising swell"], W, ["drums"])]),
    "wB": ("wait", [ch("[Lift]", 10400, ["uplifting lift starting exactly on the first beat", "warm drums", "soaring strings", "bright piano"], W),
                    ch("[Breath]", 3000, ["drums stop", "single sustained soft piano chord", "quiet suspense"], W, ["drums"])]),
    "wC": ("wait", [ch("[Finale]", 8000, ["one big warm final hit exactly on the first beat", "uplifting resolve", "gentle groove",
                                          "final chord rings out at the very end"], W, ["abrupt ending"])]),
    "hA": ("hire", [ch("[Intro]", 9800, ["playful funky groove from the first beat", "slap bass", "tight claps", "brass stabs",
                                         "stops dead at the very end like a record stop"], H)]),
    "hB": ("hire", [ch("[Drop]", 13800, ["big funky groove drops exactly on the first beat", "horn section", "driving bass", "handclaps"], H),
                    ch("[Build]", 3000, ["snare roll", "rising brass build"], H),
                    ch("[Chorus]", 5000, ["fullest chorus on the first beat", "triumphant horns", "claps"], H)]),
    "hC": ("hire", [ch("[Finale]", 7900, ["one big final brass hit exactly on the first beat", "confident resolve", "light groove",
                                          "final chord rings out at the very end"], H, ["abrupt ending"])]),
}

def compose(name):
    film, chunks = PIECES[name]
    out = f"public/{film}/music/piece-{name}.mp3"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for attempt in range(6):
        req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
                                     data=json.dumps({"composition_plan": {"chunks": chunks}, "model_id": "music_v2_5"}).encode(),
                                     headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json",
                                              "User-Agent": "brainfast-showreel/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                open(out, "wb").write(r.read())
            print(out, flush=True); return
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20 * (attempt + 1)); continue
            print(name, "ERROR", e.code, e.read()[:300].decode(errors="replace"), flush=True); return

if __name__ == "__main__":
    for p in sys.argv[1:] or PIECES:
        compose(p)
