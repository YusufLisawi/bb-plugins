#!/usr/bin/env python3
"""(Re)build public/sfx/library.json by MEASURING every effect in public/sfx:
duration, lead-in silence (the mixer trims it), and where the loudest moment
is after that trim. Effects whose kind is a swell/hit align their PEAK to the
cue frame (a whoosh peaks mid-move, an impact's boom lands on the hit); UI
sounds align their attack.

Usage: .venv/bin/python scripts/sfx_library.py
"""
import glob, json, os, sys
import numpy as np
sys.path.insert(0, "scripts")
from audio import SR, lead_in, load

KIND = {
    "tick": "ui", "pop": "ui", "snap": "ui", "click": "ui", "tap": "ui", "blip": "ui", "ping": "ui", "notif": "ui",
    "send": "ui", "receive": "ui", "toast": "ui", "type": "ui", "keys": "ui", "glitch": "ui", "data": "ui", "spark": "ui",
    "flurry": "ui", "focus": "ui",
    "check": "confirm", "miss": "confirm", "learn": "confirm", "seal": "confirm",
    "whoosh": "sweep", "draw": "sweep", "shimmer": "sweep", "suck": "sweep", "riser": "sweep", "zoom": "sweep",
    "dive": "sweep", "swell": "sweep", "glassify": "sweep",
    "impact": "hit",
    "ring": "phone", "answer": "phone", "buzz": "phone",
    "flip": "prop", "clock": "prop", "sink": "prop", "poweron": "prop",
    "scratch": "prop", "pin": "prop", "paper": "prop", "tear": "prop", "star": "confirm", "chime": "confirm",
    "night": "ambience", "birds": "ambience", "hum": "ambience",
}
ALIGN_PEAK = {"whoosh", "suck", "riser", "zoom", "dive", "swell", "impact", "spark"}
DESC = {
    "scratch": "comedic record-scratch stop", "star": "one star lights (twinkle ding)", "pin": "pushpin into cork", "paper": "paper flutters/falls",
    "chime": "now-serving ding-dong", "tear": "ticket torn off",
    "tick": "crisp digital UI tick", "pop": "soft rounded pop (element appears)", "snap": "magnetic snap (card locks in)",
    "click": "mouse click", "tap": "phone screen tap", "blip": "soft chat blip", "ping": "bright two-tone message ping",
    "notif": "gentle phone notification", "send": "message sent swoosh", "receive": "incoming message pop",
    "toast": "UI toast chime", "type": "laptop typing burst", "keys": "touchscreen typing", "glitch": "digital glitch stutter",
    "data": "data processing blips", "spark": "electric spark ignition", "flurry": "pile of notifications",
    "focus": "lens focus snap", "check": "positive confirmation chime", "miss": "soft negative tone (not found)",
    "learn": "ascending sparkle chime (it learned)", "seal": "lock click + chime", "whoosh": "clean fast whoosh (moves)",
    "draw": "light-trail swoosh (pen draws)", "shimmer": "glassy sparkle sweep", "suck": "reverse whoosh into a hit",
    "riser": "tension riser into a drop", "zoom": "wide airy pull-back", "dive": "forward dive whoosh",
    "swell": "warm cinematic swell", "glassify": "crystalline transformation", "impact": "cinematic boom (drops, final hit)",
    "ring": "incoming call chime", "answer": "call connected", "buzz": "phone vibrating on a table",
    "flip": "shop sign flipping", "clock": "quiet ticking clock", "sink": "muffled sinking thud", "poweron": "device power-on",
    "night": "city night ambience", "birds": "morning birdsong", "hum": "dark electrical hum",
}

def main():
    lib = {}
    for path in sorted(glob.glob("public/sfx/*.mp3")):
        name = os.path.basename(path)[:-4]
        x = load(path)
        li = lead_in(x)
        y = x[li:]
        env = np.abs(y).max(axis=1)
        lib[name] = {
            "file": f"public/sfx/{name}.mp3",
            "kind": KIND.get(name, "ui"),
            "align": "peak" if name in ALIGN_PEAK else "attack",
            "peak_s": round(float(np.argmax(env)) / SR, 3),
            "dur_s": round(len(y) / SR, 3),
            "desc": DESC.get(name, ""),
        }
    json.dump(lib, open("public/sfx/library.json", "w"), indent=1)
    print(f"{len(lib)} effects -> public/sfx/library.json")

if __name__ == "__main__":
    main()
