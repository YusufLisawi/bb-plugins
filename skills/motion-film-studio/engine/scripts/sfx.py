#!/usr/bin/env python3
"""Generate the showreel's sound-design palette with ElevenLabs text-to-sound v2.

Every effect belongs to a visible motion event (spark, stroke draw, pop, check,
impact...). The mix script trims the silence each generation starts with, so
effects land on their frame.

Usage:
  . scripts/el-env.sh
  .venv/bin/python scripts/sfx.py [name ...]      # default: all
"""
import json, os, sys, urllib.request, urllib.error

SFX = {
    "spark":   ("a single crisp electric spark ignition, tiny zap with a bright glassy shimmer tail, clean, close, high quality", 1.0),
    "draw":    ("smooth fast airy light trail swoosh rising in pitch, like a glowing line being drawn across the screen, clean modern motion graphics sound", 1.6),
    "tick":    ("sharp crisp digital UI tick, a single short bright click with a clean strong transient, high quality interface sound, close, no reverb, no noise", 0.5),
    "pop":     ("soft rounded bubble pop, friendly chat message appearing, clean UI sound", 0.5),
    "whoosh":  ("fast clean cinematic whoosh passing by, airy, short, no rumble, modern motion graphics transition", 0.8),
    "impact":  ("deep modern cinematic impact hit with a tight sub boom and a short bright transient, clean trailer style", 2.0),
    "riser":   ("short tension riser, reverse cymbal swell building up and ending abruptly", 2.0),
    "data":    ("rapid soft digital data processing blips and chirps, futuristic computer scanning, subtle and clean", 1.2),
    "check":   ("short bright positive confirmation chime, two quick rising notes, clean UI success sound", 0.7),
    "type":    ("fast soft laptop keyboard typing burst, five quick keystrokes, close and clean", 0.8),
    "glitch":  ("short digital glitch stutter, tight crisp electronic buzz, modern", 0.6),
    "shimmer": ("bright elegant sparkle shimmer sweep, glassy, short, magical but subtle", 1.2),
    "suck":    ("deep reverse whoosh sucking in, smooth, builds and cuts off sharply", 1.0),
    "ring":    ("modern smartphone incoming call chime, soft marimba, two short notes, clean", 1.0),
    "snap":    ("tight satisfying snap click, like a magnetic UI element locking into place", 0.5),
    # film #2 "The Night Shift"
    "clock":   ("soft ticking of a quiet wall clock at night, gentle, intimate, close, steady ticks", 2.5),
    "flip":    ("small wooden hanging shop sign flipping over and knocking gently against a glass door", 0.8),
    "buzz":    ("short smartphone vibration buzz on a wooden table, two quick pulses", 0.6),
    "notif":   ("soft modern smartphone notification ping, single gentle bell tone, clean, pleasant", 0.6),
    "night":   ("quiet calm city night ambience, distant soft crickets, gentle breeze, no traffic, no voices", 10.0),
    "birds":   ("gentle morning birdsong, a few soft chirps, calm sunrise ambience, peaceful", 6.0),
    "swell":   ("soft warm cinematic swell rising, airy and gentle, like morning light filling a room", 2.5),
    "tap":     ("soft phone screen tap, subtle clean click", 0.5),
    "answer":  ("smartphone call connected tone, short soft two-note chime, modern and clean", 0.8),
    # film #3 "When it doesn't know" (SFX_DIR=loop/sfx)
    "ping":    ("bright short modern messaging app notification pop, two quick rising tones, clean, crisp, no reverb", 0.5),
    "blip":    ("soft short chat notification blip, rounded and pleasant, single note, clean UI", 0.5),
    "flurry":  ("rapid overlapping flurry of many different smartphone notification pings piling up fast, chaotic but clean, no voices", 2.0),
    "sink":    ("low muffled sinking thud with a slow descending tone, like something dropping under water, short, dark", 1.4),
    "send":    ("quick message sent swoosh, short airy upward swipe with a tiny pop at the end, clean modern UI", 0.5),
    "receive": ("soft incoming chat message pop with a gentle bubbly tone, clean modern UI", 0.5),
    "miss":    ("soft gentle negative UI tone, two short descending marimba notes, subtle, friendly, not harsh", 0.7),
    "click":   ("crisp close computer mouse click, single, clean, dry", 0.5),
    "toast":   ("soft subtle UI toast notification sliding in, gentle two-note chime, clean", 0.6),
    "learn":   ("magical bright ascending three-note chime with a sparkling glassy shimmer tail, like knowledge being absorbed, clean", 1.3),
    "zoom":    ("smooth wide airy whoosh pulling back and opening up, spacious, cinematic, subtle, no rumble", 1.6),
    "dive":    ("fast powerful forward whoosh diving in, bright airy tail, modern transition", 1.0),
    "keys":    ("fast light smartphone touchscreen typing, soft quick taps, close and clean", 1.2),
    # film #5 "The glass box" (SFX_DIR=glass/sfx)
    "poweron": ("short electronic power-on sound, a soft click followed by a rising low hum, sleek premium device, clean", 1.2),
    "glassify": ("crystalline glass shimmer transformation, bright glassy chime swelling up, magical but clean, premium tech", 1.6),
    "hum":     ("deep low electrical hum drone in a dark room, subtle, mysterious, steady, no melody", 4.0),
    "seal":    ("satisfying mechanical lock click with a short bright confirmation chime, clean modern UI", 0.8),
    "focus":   ("camera lens focus snap, crisp mechanical click with a tiny glassy ring", 0.6),
    # films 26-30 (one-star reviews, case study, playbooks)
    "scratch": ("short comedic vinyl record scratch stop, one quick DJ scratch then silence, clean, close, no music", 0.7),
    "star":    ("single bright magical star twinkle ding, one sparkling bell tone with a tiny glassy tail, clean, short", 0.6),
    "pin":     ("a pushpin pressed firmly into a cork notice board, short soft wooden thunk with a tiny plastic click, close, dry", 0.5),
    "paper":   ("a single sheet of paper fluttering and rustling as it falls, light and airy, close, clean", 0.8),
    "chime":   ("take-a-number counter 'now serving' chime, clean two-tone electronic ding-dong bell, bright, short", 1.0),
    "tear":    ("a small paper ticket quickly torn off a take-a-number dispenser, one short crisp paper tear, close, dry", 0.5),
}

def gen(name):
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY missing")
    text, dur = SFX[name]
    body = {"text": text, "duration_seconds": dur, "prompt_influence": 0.75 if name == "tick" else 0.6,
            "model_id": "eleven_text_to_sound_v2"}
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "User-Agent": "brainfast-showreel/1.0"})
    out = f"public/{os.environ.get('SFX_DIR', 'audio/sfx')}/{name}.mp3"
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            open(out, "wb").write(r.read())
    except urllib.error.HTTPError as e:
        print(name, "ERROR", e.code, e.read()[:400].decode(errors="replace"))
        return
    print(out, f"{os.path.getsize(out)/1024:.0f} KB")

if __name__ == "__main__":
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(int(os.environ.get("SFX_JOBS", "1"))) as ex:
        list(ex.map(gen, sys.argv[1:] or SFX))
