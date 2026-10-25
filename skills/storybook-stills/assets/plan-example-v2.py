#!/usr/bin/env python3
"""FLIGHT DELAYED · Part 1 v2: the shot plan, written as code so every beat is commented. `python3 episodes/flight1v2/plan.py`
writes episodes/flight1v2/plan.json, which scripts/stills_build.py turns into public/flight1v2/stills.json (anchors → seconds).

Anchors: "line.word" = the first word with that spelling in the narration line (see public/flight1v2/vo/lines.json), "#2" = the second
one, "+0.3"/"-0.1" offsets, "end" = the end of the film. fx x/y are fractions of the 16:9 frame (x across, y down); a picture is
1536x1024 art cropped to 1920x1080 (9% off the top and bottom): frame_x = art_x/1536, frame_y = (art_y - 80)/864.
"""
import json
from pathlib import Path


import math
_L = {l["id"]: l for l in json.load(open(Path(__file__).resolve().parents[2] / "public/flight1v2/vo/lines.json"))}
def T(a):
    """an anchor → seconds (the same rules as scripts/stills_build.py)"""
    import re
    if isinstance(a, (int, float)): return float(a)
    m = re.match(r"^([^+\-]+?)([+\-][0-9.]+)?$", a.strip()); base, off = m.group(1), float(m.group(2) or 0)
    lid, _, word = base.partition("."); ws = _L[lid]["words"]
    if not word: return ws[0]["s"] + off
    if word == "end": return ws[-1]["e"] + off
    w, _, nth = word.partition("#"); norm = lambda x: re.sub(r"[^a-z0-9']", "", x.lower())
    return [x for x in ws if norm(x["w"]) == norm(w)][int(nth or 1) - 1]["s"] + off
def bpm_at(tau, keys):
    """the BPM schedule of the pulse HUD (piecewise, eased between keys): the same maths as bpmAt() in src/kit/stills/fx2.tsx"""
    io = lambda p: (lambda q: 4 * q ** 3 if q < 0.5 else 1 - (-2 * q + 2) ** 3 / 2)(min(1, max(0, p)))
    if tau <= keys[0][0]: return keys[0][1]
    for (t0, b0), (t1, b1) in zip(keys, keys[1:]):
        if tau <= t1: return b0 + (b1 - b0) * io((tau - t0) / (t1 - t0))
    return keys[-1][1]
def beat_times(keys, t0, t1, at):
    """times of the ECG's R peaks (phase k + 0.33) between t0 and t1 for the schedule `keys` (the HUD starts at `at`): the heartbeat sound lands on them"""
    ph, x, out, step = 0.0, at - 6, [], 0.02
    while x < t1:
        new = ph + bpm_at(x + step / 2, keys) / 60 * step
        k0, k1 = math.floor(ph - 0.33), math.floor(new - 0.33)
        if k1 > k0: out.append(x + step * ((k1 + 0.33 - ph) / (new - ph)))
        ph, x = new, x + step
    return [round(t, 3) for t in out if t >= t0]

shots, sound, hud = [], [], []
def S(img, at, z=(1.0, 1.06), o=(50, 50), fx=None, hits=None, x=None, y=None):
    d = {"img": img, "at": at, "z": list(z), "o": list(o)}
    if fx: d["fx"] = fx
    if hits: d["hits"] = hits
    if x: d["x"] = list(x)
    if y: d["y"] = list(y)
    shots.append(d)
def C(card, at, hits=None):
    d = {"card": card, "at": at}
    if hits: d["hits"] = hits
    shots.append(d)

# ───────────────────────── HOOK: "What if the dead got smarter every day, and you were trapped in a building made of glass?"
S("01_hook", 0, z=(1.0, 1.1), o=(45, 60), fx=[{"kind": "bars", "x": 0.185, "y": 0.27, "w": 0.27, "title": "THE DEAD · SMARTER", "items": [["DAY 1", 1], ["DAY 2", 2], ["DAY 3", 4]], "at": "hook.dead"}])
S("02_glass", "hook.and-0.05", z=(1.0, 1.12), o=(38, 40), fx=[{"kind": "crack", "x": 0.30, "y": 0.34, "at": "hook.glass-0.05", "len": 0.62}])
C({"kind": "day", "text": "DAY 1", "sub": "ARRIVALS", "clock": [1080, 1082]}, "hook.end+0.65")

# ───────────────────────── LAND: "You land at six in the evening, in a country you've never been to. You don't speak a word of the language."
S("03_touchdown", "land", z=(1.12, 1.0), o=(46, 66), hits=["land.land+0.12"], fx=[{"kind": "counter", "x": 0.8, "y": 0.13, "label": "SPEED", "from": 250, "to": 40, "unit": " km/h", "at": "land", "dur": 1.0}])
S("04_seat", "land.evening-0.05", z=(1.0, 1.08), o=(58, 25), fx=[{"kind": "circle", "x": 0.58, "y": 0.17, "rx": 0.11, "ry": 0.15, "at": "land.country-0.2", "label": "a new country", "lx": -0.14, "ly": 0.3}])
C({"kind": "flight", "flight": "218", "time": "6:02 PM"}, "land.country+0.2")
S("05_sign", "land.You#2-0.1", z=(1.0, 1.07), o=(60, 25), fx=[
    {"kind": "glyphs", "x": 0.478, "y": 0.0857, "w": 0.305, "h": 0.339, "rows": 4, "at": "land.speak-0.1", "dur": 1.6},
    {"kind": "bubble", "x": 0.2, "y": 0.28, "w": 0.15, "text": "?", "at": "land.language-0.1", "tx": 0.277, "ty": 0.5}])

# ───────────────────────── QUEUE: "Your phone has no signal, your wallet has the wrong money, and the passport line is two hundred people long."
S("06_phone", "queue-0.2", z=(1.0, 1.06), o=(55, 50), fx=[{"kind": "phoneui", "x": 0.542, "y": 0.509, "w": 0.2, "ar": 1.88, "rot": -3, "at": "queue.phone-0.3", "time": "6:04"}])
S("07_wallet", "queue.your#2-0.1", z=(1.0, 1.07), o=(60, 40), fx=[
    {"kind": "circle", "x": 0.61, "y": 0.36, "rx": 0.2, "ry": 0.19, "at": "queue.wallet", "col": "#7fd08a"},
    {"kind": "stamp", "x": 0.47, "y": 0.2, "text": "WRONG MONEY", "sub": "NOT ACCEPTED HERE", "at": "queue.wrong", "rot": -7}])
S("08_line", "queue.and-0.1", z=(1.0, 1.22), o=(32, 72), fx=[
    {"kind": "tag", "x": 0.14, "y": 0.5, "text": "YOU", "tx": 0.325, "ty": 0.735, "at": "queue.passport"},
    {"kind": "counter", "x": 0.5, "y": 0.1, "label": "PEOPLE", "from": 0, "to": 200, "at": "queue.two", "dur": 1.5},
    {"kind": "clock", "x": 0.795, "y": 0.085, "min": 1089, "at": "queue.passport"}])

# ───────────────────────── SUIT: "Ten people ahead, a man in a grey suit is sweating, and scratching a bandage on his hand."
S("09_ten", "suit-1.0", z=(1.0, 1.1), o=(62, 48), fx=[
    {"kind": "counter", "x": 0.17, "y": 0.14, "label": "AHEAD", "from": 0, "to": 10, "at": "suit", "dur": 0.9},
    {"kind": "circle", "x": 0.79, "y": 0.475, "rx": 0.075, "ry": 0.105, "at": "suit.ahead", "label": "10th in line", "lx": -0.1, "ly": -0.22}])
S("10_sweat", "suit.man-0.1", z=(1.0, 1.1), o=(50, 30), fx=[{"kind": "drops", "x": 0.455, "y": 0.3, "n": 5}, {"kind": "drops", "x": 0.57, "y": 0.2, "n": 3}])
S("11_bandage", "suit.and-0.05", z=(1.0, 1.12), o=(50, 55), fx=[{"kind": "circle", "x": 0.46, "y": 0.3, "rx": 0.13, "ry": 0.17, "at": "suit.bandage-0.1", "label": "bandage", "lx": 0.2, "ly": -0.1}])

# ───────────────────────── FALLS: "Then he falls. Right in front of the officer's booth."
S("12_collapse", "falls", z=(1.0, 1.08), o=(50, 60), hits=["falls.falls+0.3"], fx=[{"kind": "clock", "x": 0.795, "y": 0.085, "min": 1101, "at": "falls"}])
S("13_booth", "falls.Right-0.5", z=(1.08, 1.0), o=(55, 55), fx=[{"kind": "circle", "x": 0.53, "y": 0.5, "rx": 0.2, "ry": 0.19, "at": "falls.officer's", "label": "the officer's booth", "lx": 0.0, "ly": -0.33}])
S("14_gasp", "falls.booth", z=(1.0, 1.1), o=(50, 45), fx=[{"kind": "drops", "x": 0.4, "y": 0.2, "n": 3}])

# ───────────────────────── LEANS: "The officer leans over the barrier to help him."
S("15_leans", "leans", z=(1.0, 1.1), o=(70, 55), fx=[{"kind": "circle", "x": 0.73, "y": 0.6, "rx": 0.1, "ry": 0.1, "at": "leans.barrier-0.1", "label": "barrier", "lx": 0.13, "ly": 0.1}])
S("16_reach", "leans.help-0.1", z=(1.0, 1.12), o=(48, 55))

# ───────────────────────── BITE: "And the man bites him. Through the sleeve, deep into the arm."
S("17_lunge", "bite", z=(1.0, 1.12), o=(57, 65), hits=["bite.man+0.25"], fx=[{"kind": "burst", "at": "bite.man+0.25", "x": 0.57, "y": 0.655, "s": 0.5}])
S("18_bite", "bite.bites-0.1", z=(1.12, 1.0), o=(50, 65), hits=["bite.bites"], fx=[{"kind": "burst", "at": "bite.bites", "x": 0.446, "y": 0.653, "s": 0.8}, {"kind": "flash", "at": "bite.bites", "col": "#ff3b30"}])
S("19_arm", "bite.deep-0.5", z=(1.0, 1.1), o=(72, 60), fx=[{"kind": "circle", "x": 0.73, "y": 0.62, "rx": 0.07, "ry": 0.09, "at": "bite.arm-0.1", "col": "#ff6a5a", "label": "bitten", "lx": -0.18, "ly": -0.1}])

# ───────────────────────── SCREAM: "Someone screams. An announcement booms from the ceiling, in a language you don't understand."
S("20_scream", "scream", z=(1.0, 1.1), o=(52, 40), hits=["scream.screams-0.05"], fx=[{"kind": "ripple", "x": 0.345, "y": 0.42, "dir": 180, "spread": 100, "n": 3, "r0": 0.03, "r1": 0.2, "at": "scream.screams-0.1"}, {"kind": "ripple", "x": 0.7, "y": 0.42, "dir": 0, "spread": 100, "n": 3, "r0": 0.03, "r1": 0.2, "at": "scream.screams-0.1"}])
S("21_speaker", "scream.An-0.05", z=(1.0, 1.1), o=(50, 30), fx=[
    {"kind": "ripple", "x": 0.5, "y": 0.43, "dir": 90, "spread": 110, "n": 4, "r0": 0.03, "r1": 0.26, "at": "scream.announcement-0.1"},
    {"kind": "bubble", "x": 0.5, "y": 0.66, "w": 0.2, "glyphs": True, "rows": 2, "at": "scream.announcement", "to": "scream.in-0.1", "tx": 0.5, "ty": 0.4}])
S("22_confused", "scream.in-0.1", z=(1.0, 1.08), o=(48, 25), fx=[
    {"kind": "bubble", "x": 0.2, "y": 0.2, "w": 0.18, "glyphs": True, "rows": 2, "at": "scream.in", "then": "???", "thenAt": "scream.understand", "tx": 0.43, "ty": 0.23}])

# ───────────────────────── WATCH: "So you stop listening to the words, and you watch the crowd instead."
S("23_eyes", "watch", z=(1.0, 1.1), o=(63, 66), fx=[{"kind": "note", "x": 0.47, "y": 0.8, "w": 0.34, "rot": -2, "lines": [{"text": "STOP LISTENING TO THE WORDS", "at": "watch.stop", "strike": "watch.words,+0.2"}, {"text": "WATCH THE CROWD", "at": "watch.watch", "col": "#b3261e"}]}])
S("24_turn", "watch.and", z=(1.0, 1.14), o=(60, 60), fx=[
    {"kind": "arrow", "x1": 0.8, "y1": 0.32, "x2": 0.22, "y2": 0.42, "at": "watch.crowd-0.2", "label": "EVERYONE FACES THE EXIT", "bend": 0.1},
    {"kind": "tag", "x": 0.86, "y": 0.66, "text": "YOU", "tx": 0.685, "ty": 0.515, "at": "watch.and+0.1"}])

# ───────────────────────── CRUSH: "Two hundred people turn and push for the same exit. In a panic, people rarely die from what's behind them. They die in the crush."
S("25_surge", "crush", z=(1.0, 1.1), o=(60, 60), hits=["crush.push"], fx=[
    {"kind": "speed", "dir": -1, "at": "crush.turn", "o": 0.28},
    {"kind": "counter", "x": 0.5, "y": 0.1, "label": "PEOPLE", "from": 0, "to": 200, "at": "crush", "dur": 1.3},
    {"kind": "circle", "x": 0.514, "y": 0.74, "rx": 0.09, "ry": 0.1, "at": "crush.push-0.2", "col": "#ffd23f", "label": "drop the bag", "lx": -0.14, "ly": 0.12}])
S("26_exit", "crush.exit-0.3", z=(1.0, 1.1), o=(25, 65), hits=["crush.exit"], fx=[{"kind": "circle", "x": 0.44, "y": 0.6, "rx": 0.27, "ry": 0.2, "at": "crush.exit-0.2", "col": "#ff6a5a", "label": "ONE EXIT", "lx": -0.1, "ly": -0.3}])
S("27_feet", "crush.In", z=(1.0, 1.1), o=(50, 70), hits=["crush.panic,+0.6"])
S("28_pinned", "crush.die-0.2", z=(1.0, 1.12), o=(50, 62), fx=[{"kind": "circle", "x": 0.5, "y": 0.66, "rx": 0.13, "ry": 0.09, "at": "crush.die", "col": "#ff6a5a", "label": "arms pinned", "lx": 0.0, "ly": 0.2}])
C({"kind": "gauge", "from": 1, "to": 6.6}, "crush.They-0.1")

# ───────────────────────── RULE 1: "Rule one. Don't fight the flow. Move with it, and slowly cut across it, toward the edge."
C({"kind": "rule", "n": "RULE 1", "title": "Don't fight the flow.", "text": "Move with it, and cut across it toward the edge."}, "rule1")
PLAN_FLOW = {"kind": "plan", "title": "THE HALL · FROM ABOVE", "floor": [0.12, 0.2, 0.76, 0.7],
    "walls": [{"pts": [[0.12, 0.2], [0.88, 0.2], [0.88, 0.9], [0.12, 0.9]], "w": 12},
              {"pts": [[0.12, 0.2], [0.12, 0.64]], "glass": True, "w": 12}, {"pts": [[0.12, 0.86], [0.12, 0.9]], "glass": True, "w": 12}],
    "boxes": [{"x": 0.3 + i * 0.07, "y": 0.2, "w": 0.06, "h": 0.07, "fill": "#cfc3a3", "at": 0.2 + i * 0.06} for i in range(6)] + [{"x": 0.78, "y": 0.66, "w": 0.045, "h": 0.09, "fill": "#a39c8b", "at": 0.5, "label": ""}],
    "crowd": [{"n": 64, "from": [0.22, 0.3, 0.55, 0.32], "to": [0.12, 0.75], "at": 0.3, "speed": 0.2}],
    "marks": [{"kind": "exit", "x": 0.12, "y": 0.75, "at": 0.4, "col": "#58b368", "label": "MAIN EXIT", "lx": 0.2, "ly": 0.0},
              {"kind": "door", "x": 0.88, "y": 0.72, "at": 0.5, "col": "#d9a72b"},
              {"kind": "you", "x": 0.66, "y": 0.42, "at": 0.6, "label": "YOU", "lx": 0.0, "ly": -0.075,
               "mv": {"pts": [[0.66, 0.42], [0.55, 0.46], [0.5, 0.5], [0.62, 0.62], [0.74, 0.72], [0.78, 0.82]], "t0": 1.4, "t1": 4.7}}],
    "paths": [{"pts": [[0.62, 0.36], [0.4, 0.4], [0.2, 0.55], [0.15, 0.72]], "col": "#5b7aa8", "at": 0.5, "dur": 0.9, "arrow": True, "w": 10, "label": "THE FLOW", "lx": 0.02, "ly": -0.07},
              {"pts": [[0.5, 0.52], [0.66, 0.62], [0.78, 0.76]], "col": "#e8372c", "at": 3.1, "dur": 1.2, "arrow": True, "w": 10, "label": "cut across, slowly", "lx": 0.12, "ly": -0.02}],
    "texts": [{"x": 0.5, "y": 0.15, "text": "PASSPORT BOOTHS", "at": 0.5, "size": 0.026}, {"x": 0.865, "y": 0.64, "text": "PILLAR", "at": 0.6, "size": 0.02, "anchor": "end"},
              {"x": 0.865, "y": 0.8, "text": "STAFF DOOR", "at": 0.6, "size": 0.02, "anchor": "end"}]}
C(PLAN_FLOW, "rule1.Don't+0.1")
S("29_flow", "rule1.Move", z=(1.0, 1.08), o=(54, 45), fx=[{"kind": "arrow", "x1": 0.9, "y1": 0.2, "x2": 0.55, "y2": 0.2, "at": "rule1.Move+0.1", "label": "go with it"}], hits=None)
C(dict(PLAN_FLOW, skip=1.55), "rule1.and")
S("30_edge", "rule1.toward+0.33", z=(1.0, 1.1), o=(66, 50), fx=[{"kind": "circle", "x": 0.79, "y": 0.72, "rx": 0.09, "ry": 0.09, "at": "rule1.edge-0.1", "col": "#7fd08a", "label": "the edge", "lx": -0.06, "ly": 0.17}])

# ───────────────────────── RULE 2: "Rule two. Stay off the walls and the barriers, and keep your arms up in front of your chest, so you can breathe."
C({"kind": "rule", "n": "RULE 2", "title": "Stay off walls and barriers.", "text": "Arms up in front of your chest, so you can breathe."}, "rule2")
S("31_barrier", "rule2.Stay-0.03", z=(1.0, 1.1), o=(30, 65), fx=[
    {"kind": "arrow", "x1": 0.3, "y1": 0.2, "x2": 0.13, "y2": 0.4, "at": "rule2.walls-0.1", "col": "#ff6a5a", "label": "walls", "bend": 0.15},
    {"kind": "arrow", "x1": 0.62, "y1": 0.9, "x2": 0.4, "y2": 0.8, "at": "rule2.barriers-0.1", "col": "#ff6a5a", "label": "barriers", "bend": -0.12}])
S("32_guard", "rule2.and#2-0.1", z=(1.0, 1.08), o=(50, 62), fx=[
    {"kind": "circle", "x": 0.51, "y": 0.6, "rx": 0.22, "ry": 0.09, "at": "rule2.arms-0.1", "col": "#7fd08a", "label": "arms up", "lx": -0.3, "ly": 0.22},
    {"kind": "circle", "x": 0.5, "y": 0.86, "rx": 0.2, "ry": 0.09, "at": "rule2.chest,-0.1", "col": "#7fd08a", "label": "space to breathe", "lx": 0.25, "ly": -0.1}])
C({"kind": "guard"}, "rule2.so-0.05")

# ───────────────────────── GIRL: "At the edge, a little girl is standing alone, with an orange lanyard around her neck, calling for someone."
S("33_kit", "girl", z=(1.0, 1.14), o=(60, 65), fx=[{"kind": "circle", "x": 0.6, "y": 0.66, "rx": 0.1, "ry": 0.2, "at": "girl.alone,-0.1", "label": "alone", "lx": -0.18, "ly": 0.0}])
S("34_lanyard", "girl.with-0.05", z=(1.0, 1.1), o=(54, 65), fx=[{"kind": "circle", "x": 0.54, "y": 0.66, "rx": 0.09, "ry": 0.12, "at": "girl.lanyard-0.2", "label": "orange lanyard", "lx": -0.23, "ly": -0.02}])
S("35_calls", "girl.calling-0.15", z=(1.0, 1.1), o=(53, 36), fx=[{"kind": "ripple", "x": 0.36, "y": 0.41, "dir": 180, "spread": 90, "n": 4, "r0": 0.04, "r1": 0.34, "at": "girl.calling"}, {"kind": "ripple", "x": 0.72, "y": 0.41, "dir": 0, "spread": 90, "n": 3, "r0": 0.03, "r1": 0.2, "at": "girl.calling"}])

# ───────────────────────── GRAB: "You don't think. You pick her up."
S("36_sprint", "grab", z=(1.0, 1.1), o=(55, 60), fx=[{"kind": "speed", "dir": -1, "o": 0.3, "at": "grab"}])
S("37_lift", "grab.pick-0.15", z=(1.08, 1.0), o=(50, 60), hits=["grab.pick"], fx=[{"kind": "burst", "at": "grab.pick", "x": 0.5, "y": 0.85, "s": 0.45}])
S("38_hug", "grab.up+0.33", z=(1.0, 1.08), o=(50, 50))   # the heartbeat HUD carries this beat

# ───────────────────────── DANI: "And a hand grabs your arm. A flight attendant, from your own plane. She swipes her badge at a grey door with a staircase on it."
S("39_grabarm", "dani.grabs-0.05", z=(1.0, 1.08), o=(62, 62), hits=["dani.grabs"], fx=[{"kind": "burst", "at": "dani.grabs", "x": 0.64, "y": 0.62, "s": 0.4}])
S("40_dani", "dani.A#2-0.15", z=(1.0, 1.08), o=(55, 50), fx=[{"kind": "tag", "x": 0.21, "y": 0.62, "text": "DANI", "sub": "flight attendant", "tx": 0.52, "ty": 0.55, "at": "dani.attendant,-0.1"}])
S("41_run_door", "dani.plane+0.5", z=(1.0, 1.1), o=(80, 50), x=(0.01, -0.02), fx=[{"kind": "speed", "dir": 1, "o": 0.4, "n": 14, "at": "dani.plane+0.5"}])
S("42_swipe", "dani.badge-0.15", z=(1.0, 1.1), o=(60, 45), fx=[{"kind": "led", "x": 0.673, "y": 0.266, "at": "dani.badge+0.2", "r": 0.011}, {"kind": "circle", "x": 0.673, "y": 0.28, "rx": 0.05, "at": "dani.badge", "col": "#7fd08a", "label": "badge reader", "lx": -0.3, "ly": -0.12}])
S("43_door_open", "dani.door+0.2", z=(1.0, 1.1), o=(52, 30), fx=[{"kind": "circle", "x": 0.526, "y": 0.12, "rx": 0.075, "ry": 0.06, "at": "dani.staircase", "label": "stairs", "lx": -0.12, "ly": 0.1}])

# ───────────────────────── SAYS: "Staff only, she says, in your language. This way. Now."
S("44_shout", "says", z=(1.05, 1.0), o=(60, 45), fx=[{"kind": "bubble", "x": 0.28, "y": 0.22, "w": 0.2, "text": "Staff only.", "at": "says.Staff", "tx": 0.54, "ty": 0.44}])
S("45_beckon", "says.This-0.1", z=(1.0, 1.07), o=(50, 40), fx=[{"kind": "bubble", "x": 0.25, "y": 0.2, "w": 0.24, "text": "This way. Now.", "at": "says.This", "tx": 0.46, "ty": 0.3}])

# ───────────────────────── RULE 3: "Rule three. When everyone runs for the main exit, look for the door nobody sees. Staff doors, service stairs, the exit behind the counter."
C({"kind": "rule", "n": "RULE 3", "title": "Find the door nobody sees.", "text": "Staff doors, service stairs, the exit behind the counter."}, "rule3")
S("46_main_exit", "rule3.When", z=(1.0, 1.1), o=(25, 65), fx=[{"kind": "circle", "x": 0.2, "y": 0.66, "rx": 0.2, "ry": 0.2, "at": "rule3.everyone", "col": "#ff6a5a", "label": "everyone", "lx": 0.0, "ly": -0.3}])
S("47_door_plain", "rule3.look-0.03", z=(1.0, 1.08), o=(72, 52), fx=[{"kind": "circle", "x": 0.75, "y": 0.5, "rx": 0.11, "ry": 0.27, "at": "rule3.door-0.1", "col": "#7fd08a", "label": "nobody looks here", "lx": -0.28, "ly": -0.05}])
PLAN_ROUTE = {"kind": "plan", "title": "TWO WAYS OUT", "floor": [0.12, 0.2, 0.76, 0.7],
    "walls": [{"pts": [[0.12, 0.2], [0.88, 0.2], [0.88, 0.9], [0.12, 0.9]], "w": 12}, {"pts": [[0.12, 0.2], [0.12, 0.64]], "glass": True, "w": 12}, {"pts": [[0.12, 0.86], [0.12, 0.9]], "glass": True, "w": 12},
              {"pts": [[0.88, 0.2], [0.88, 0.56]], "w": 12}],
    "boxes": [{"x": 0.3 + i * 0.07, "y": 0.2, "w": 0.06, "h": 0.07, "fill": "#cfc3a3", "at": 0.1 + i * 0.04} for i in range(6)] + [{"x": 0.9, "y": 0.58, "w": 0.075, "h": 0.28, "fill": "#e2d8bd", "at": 0.3, "label": ""}],
    "crowd": [{"n": 70, "from": [0.2, 0.3, 0.5, 0.45], "to": [0.12, 0.75], "at": 0.2, "speed": 0.22}],
    "marks": [{"kind": "exit", "x": 0.12, "y": 0.75, "at": 0.3, "col": "#58b368"}, {"kind": "x", "x": 0.2, "y": 0.75, "at": 0.9}, {"kind": "door", "x": 0.88, "y": 0.68, "at": 0.5, "col": "#d9a72b"},
              {"kind": "you", "x": 0.66, "y": 0.5, "at": 0.4, "label": "YOU", "lx": 0.0, "ly": -0.075, "mv": {"pts": [[0.66, 0.5], [0.8, 0.6], [0.88, 0.68], [0.94, 0.7], [0.94, 0.5]], "t0": 1.1, "t1": 2.4}}],
    "paths": [{"pts": [[0.66, 0.5], [0.8, 0.6], [0.88, 0.68], [0.94, 0.7], [0.94, 0.45]], "col": "#e8372c", "at": 0.9, "dur": 1.2, "dash": True, "arrow": True, "w": 9, "label": "STAFF DOOR → STAIRS", "lx": -0.06, "ly": -0.12}],
    "texts": [{"x": 0.22, "y": 0.62, "text": "EVERYONE", "at": 0.7, "size": 0.026, "col": "#b3261e"}, {"x": 0.5, "y": 0.15, "text": "PASSPORT BOOTHS", "at": 0.3, "size": 0.026},
              {"x": 0.94, "y": 0.93, "text": "SERVICE STAIRS", "at": 1.8, "size": 0.02, "anchor": "end"}]}
C(PLAN_ROUTE, "rule3.Staff-0.15")
S("48_counter", "rule3.the#3-0.05", z=(1.0, 1.08), o=(55, 52), fx=[{"kind": "circle", "x": 0.6, "y": 0.5, "rx": 0.13, "ry": 0.16, "at": "rule3.behind", "col": "#7fd08a", "label": "behind the counter", "lx": 0.0, "ly": -0.3}])

# ───────────────────────── QUIET: "The door clicks shut behind you, and the screaming goes quiet. Two flights up, into a dark crew corridor."
S("49_shut", "quiet", z=(1.0, 1.08), o=(50, 50), hits=["quiet.clicks"])
S("50_silence", "quiet.and", z=(1.0, 1.06), o=(50, 50))
S("51_climb", "quiet.Two-0.1", z=(1.0, 1.1), o=(35, 40), fx=[{"kind": "counter", "x": 0.82, "y": 0.13, "label": "FLIGHTS UP", "from": 0, "to": 2, "at": "quiet.Two", "dur": 1.0}])
S("52_corridor", "quiet.into+0.2", z=(1.0, 1.1), o=(50, 55), fx=[{"kind": "clock", "x": 0.795, "y": 0.085, "min": 1107, "at": "quiet.corridor-0.3"}])

# ───────────────────────── NAMES: "Her name is Dani. The girl is Kit, nine, travelling alone. Dani reads your name off your passport. Leo."
S("53_dani_intro", "names", z=(1.0, 1.1), o=(46, 45), fx=[{"kind": "tag", "x": 0.78, "y": 0.3, "text": "DANI", "sub": "cabin crew", "tx": 0.47, "ty": 0.46, "at": "names.Dani,"}])
S("54_kit_badge", "names.The-0.06", z=(1.0, 1.1), o=(46, 40), fx=[
    {"kind": "tag", "x": 0.2, "y": 0.28, "text": "KIT", "sub": "9 · travelling alone", "tx": 0.455, "ty": 0.2, "at": "names.Kit,"},
    {"kind": "circle", "x": 0.46, "y": 0.58, "rx": 0.05, "ry": 0.05, "at": "names.alone", "col": "#ffb35a"}])
S("55_passport", "names.Dani#2-0.05", z=(1.0, 1.08), o=(42, 40), fx=[{"kind": "circle", "x": 0.385, "y": 0.36, "rx": 0.07, "ry": 0.06, "at": "names.passport-0.2", "label": "your passport", "lx": 0.24, "ly": -0.05}])
C({"kind": "passport", "name": "LEO", "stamp": "NOT STAMPED", "stampSub": "NEVER REACHED THE BOOTH"}, "names.Leo-0.33")

# ───────────────────────── WINDOW + BOARD: "From the corridor window, you can see the whole hall below. The arrivals board flips, line by line. Cancelled. Cancelled. Cancelled."
S("56_window", "window", z=(1.0, 1.08), o=(60, 55), fx=[{"kind": "arrow", "x1": 0.5, "y1": 0.14, "x2": 0.82, "y2": 0.5, "at": "window.hall-0.3", "label": "the whole hall", "bend": 0.12}])
S("57_below", "window.you+0.15", z=(1.0, 1.1), o=(60, 45), fx=[{"kind": "loupe", "x": 0.67, "y": 0.46, "r": 0.17, "zoom": 3.4, "lx": 0.3, "ly": 0.58, "at": "window.hall-0.1"}])
BOARD = {"kind": "board", "x": 0.135, "y": 0.33, "w": 0.78, "h": 0.42, "rows": [["LISBON", "LANDED"], ["DUBAI", "ON TIME"], ["OSLO", "ON TIME"], ["TOKYO", "DELAYED"], ["MADRID", "ON TIME"], ["CAIRO", "ON TIME"]],
         "flip": "CANCELLED", "at": "board.flips", "step": 0.4, "rot": -1.5}
S("58_board", "board", z=(1.02, 1.07), o=(50, 50), fx=[BOARD, {"kind": "clock", "x": 0.795, "y": 0.085, "min": 1121, "at": "board"},
    {"kind": "stamp", "x": 0.5, "y": 0.22, "text": "CANCELLED", "at": "board.Cancelled", "rot": -5, "size": 0.09},
    {"kind": "stamp", "x": 0.74, "y": 0.84, "text": "CANCELLED", "at": "board.Cancelled#2", "rot": 6, "size": 0.09}])
S("59_grim", "board.Cancelled#2-0.14", z=(1.0, 1.1), o=(48, 52), fx=[{"kind": "stamp", "x": 0.78, "y": 0.3, "text": "CANCELLED", "sub": "ALL FLIGHTS", "at": "board.Cancelled#3", "rot": -8, "size": 0.085}])

# ───────────────────────── OFFICER: "The officer is sitting against his booth, holding his arm."
S("60_officer", "officer", z=(1.0, 1.1), o=(66, 55), fx=[{"kind": "circle", "x": 0.69, "y": 0.56, "rx": 0.1, "ry": 0.16, "at": "officer.officer", "col": "#ff6a5a", "label": "the officer", "lx": -0.06, "ly": -0.3}])
S("61_arm", "officer.holding-0.02", z=(1.0, 1.1), o=(52, 64), fx=[{"kind": "circle", "x": 0.53, "y": 0.64, "rx": 0.1, "ry": 0.08, "at": "officer.arm-0.1", "col": "#ff6a5a", "label": "the bite", "lx": 0.2, "ly": -0.05}])

# ───────────────────────── UP: "And the man in the grey suit, the one who fell, slowly gets up."
S("62_twitch", "up", z=(1.0, 1.1), o=(62, 56), fx=[{"kind": "circle", "x": 0.62, "y": 0.58, "rx": 0.16, "ry": 0.12, "at": "up.suit,+0.1", "col": "#ff6a5a", "label": "it moves", "lx": -0.16, "ly": -0.2}])
S("63_allfours", "up.the#3+0.1", z=(1.0, 1.1), o=(54, 60), fx=[{"kind": "circle", "x": 0.51, "y": 0.6, "rx": 0.09, "ry": 0.12, "at": "up.the#3+0.2", "col": "#ff6a5a", "label": "the one who fell", "lx": -0.2, "ly": -0.22}])
S("64_rises", "up.slowly+0.1", z=(1.02, 1.12), o=(52, 45))

# ───────────────────────── CTA: the question, two answers to comment, the PART 2 teaser, FOLLOW
C({"kind": "cta", "question": ["WOULD YOU HIDE UPSTAIRS", "OR RUN FOR THE EXIT?"], "hi": ["HIDE", "RUN"],
   "options": [{"n": "1", "label": "HIDE", "sub": "WAIT IT OUT UPSTAIRS", "icon": "stairs", "at": "ask.hidden-0.1"}, {"n": "2", "label": "RUN", "sub": "TAKE THE EXIT", "icon": "run", "at": "ask.run-0.1"}],
   "comment": "Comment 1 or 2", "commentAt": "ask.exit+0.3", "partAt": "ask.Part-0.1", "part": "PART 2", "title": "STRANDED",
   "hook": ["The doors are locked.", "The phones are dead.", "And they are getting smarter."], "hookAt": "ask.Part+0.9", "img": "66_teaser", "bg": "65_horror", "followAt": "ask.end+0.1", "follow": "FOLLOW FOR PART 2"}, "ask")

# ───────────────────────── HUD: your heartbeat, one continuous meter from the fall to the CTA (it hides behind full-frame cards)
BPM = [(T("falls.falls"), 74), (T("crush"), 108), (T("crush.They-0.1"), 146), (T("rule1"), 142), (T("girl"), 146), (T("grab"), 156), (T("dani.grabs"), 162),
       (T("quiet.clicks"), 158), (T("quiet.and") + 1.5, 108), (T("names"), 92), (T("board.Cancelled"), 104), (T("officer"), 98), (T("up.suit"), 112), (T("up.slowly"), 160), (T("ask"), 164)]
hud += [{"fx": {"kind": "counter", "x": 0.82, "y": 0.13, "label": "NOISE", "from": 94, "to": 31, "unit": " dB", "at": "quiet.clicks-0.2", "dur": 2.4}, "from": "quiet.clicks-0.3", "to": "quiet.Two"},
       {"fx": {"kind": "pulse", "x": 0.035, "y": 0.085, "w": 0.26, "bpm": 74, "keys": [[round(t, 3), b] for t, b in BPM], "label": "YOU · BPM", "throb": True, "at": "falls.falls"}, "from": "falls.falls", "to": "ask"}]

# ───────────────────────── SOUND: one foley cue per action, a bed per place (library first; new ones from the local model)
sound += [
    {"amb": "airfield_dusk", "from": 0, "to": "hook.end+0.2", "db": -2, "fo": 0.5},
    {"sfx": "brick_glass", "at": "hook.glass-0.1", "db": -8},
    {"sfx": "touchdown_out", "at": "land-0.1", "db": -6},
    {"sfx": "cabin_landing", "at": "land.evening", "db": -12},
    {"amb": "airport_hall", "from": "land.You#2-0.1", "to": "watch.and+0.8", "db": -4, "fi": 0.4, "fo": 1.2},
    {"sfx": "phone_buzz", "at": "queue.phone", "db": -6},
    {"sfx": "bills_riffle", "at": "queue.wallet", "db": -8}, {"sfx": "coins", "at": "queue.wallet+0.6", "db": -10},
    {"sfx": "body_fall", "at": "falls.falls+0.1", "db": -3},
    {"sfx": "gasp", "at": "falls.booth+0.05", "db": -4},
    {"sfx": "shiver", "at": "suit.sweating", "db": -10},
    {"sfx": "bandage_scratch", "at": "suit.scratching", "db": -7},
    {"sfx": "barrier_rattle", "at": "leans.barrier", "db": -8},
    {"sfx": "stamp--cobra-effect", "at": "queue.wrong", "db": -8},
    {"sfx": "rustle", "at": "leans.help-0.1", "db": -10},
    {"sfx": "grab", "at": "bite.man", "db": -10},
    {"sfx": "bite_struggle", "at": "bite.bites-0.1", "db": -3},
    {"sfx": "breath_fast", "at": "bite.deep", "db": -10},
    {"sfx": "shoes_stumble", "at": "bite.deep-0.2", "db": -7},
    {"sfx": "scream_close", "at": "scream.screams-0.1", "db": -5},
    {"sfx": "crowd_gasp", "at": "scream.screams+0.6", "db": -8},
    {"sfx": "pa_foreign", "at": "scream.announcement-0.1", "db": -8},
    {"amb": "panic_hall", "from": "watch.and", "to": "quiet.clicks", "db": -1, "fi": 1.6, "fo": 0.15},
    {"sfx": "suitcase_tip", "at": "crush.push-0.4", "db": -6},
    {"sfx": "glass_doors", "at": "crush.exit-0.2", "db": -8},
    {"sfx": "barrier_creak", "at": "rule2.Stay", "db": -8},
    {"sfx": "shoes_stumble", "at": "crush.In+0.6", "db": -8},
    {"sfx": "crowd_gasp", "at": "crush.die", "db": -9},
    {"sfx": "run_tile", "at": "grab", "db": -8},
    {"sfx": "girl_cry", "at": "girl.calling", "db": -8},
    {"sfx": "grab", "at": "grab.pick", "db": -8},
    {"sfx": "rustle", "at": "grab.up+0.4", "db": -10},
    {"sfx": "grab", "at": "dani.grabs-0.05", "db": -8},
    {"sfx": "run_tile", "at": "dani.plane+0.3", "db": -9},
    {"sfx": "badge_beep", "at": "dani.badge", "db": -6},
    {"sfx": "door_push", "at": "dani.door", "db": -6},
    {"sfx": "steel_door", "at": "quiet.clicks", "db": -4},
    {"amb": "stairwell", "from": "quiet.clicks", "to": "quiet.into+0.6", "db": -6},
    {"sfx": "stairs_few", "at": "quiet.Two", "db": -10},
    {"sfx": "coat", "at": "names.reads", "db": -9},
    {"sfx": "stamp--cobra-effect", "at": "names.Leo+0.7", "db": -9},
    {"amb": "corridor_buzz", "from": "quiet.into+0.3", "to": "end", "db": -6, "fi": 0.6, "fo": 1.0},
] + [{"sfx": "counter", "at": f"board.flips+{1.0 * i:.1f}", "db": -6} for i in range(3)] + [
    {"sfx": "stamp--cobra-effect", "at": "board.Cancelled", "db": -9}, {"sfx": "stamp--cobra-effect", "at": "board.Cancelled#2", "db": -9}, {"sfx": "stamp--cobra-effect", "at": "board.Cancelled#3", "db": -9}] + [
    {"sfx": "heartbeat", "at": t, "db": -14} for t in beat_times(BPM, T("falls.falls") + 11.5, T("crush.They-0.1"), T("falls.falls"))] + [
    {"sfx": "heartbeat", "at": t, "db": -13} for t in beat_times(BPM, T("grab"), T("dani.door"), T("falls.falls"))] + [
    {"sfx": "heartbeat", "at": t, "db": -11} for t in beat_times(BPM, T("up.suit"), T("ask"), T("falls.falls"))] + [
    {"amb": "sirenfar", "from": "officer", "to": "end", "db": -10, "fi": 1.0, "fo": 1.0},
    {"sfx": "finger_tap", "at": "up.suit,+0.25", "db": -6},
    {"sfx": "rise_scrape", "at": "up.slowly-0.4", "db": -8},
    {"sfx": "groan_real", "at": "up.slowly", "db": -6},
    {"sfx": "pop", "at": "ask.hidden-0.1", "db": -10, "ui": True}, {"sfx": "pop", "at": "ask.run-0.1", "db": -10, "ui": True},
    {"sfx": "pop", "at": "ask.exit+0.3", "db": -10, "ui": True}, {"sfx": "paper--dq3", "at": "ask.Part+0.1", "db": -10, "ui": True},
    {"sfx": "pop", "at": "ask.end+0.1", "db": -9, "ui": True},
]

plan = {"slug": "flight1v2", "size": "16:9", "art": "art/flight1v2/raw", "tail": 3.1, "shots": shots, "sound": sound, "hud": hud}
json.dump(plan, open(Path(__file__).with_name("plan.json"), "w"), indent=1)
print(f"{len(shots)} shots · {sum(1 for s in shots if 'img' in s)} pictures · {sum(1 for s in shots if 'card' in s)} cards · {len(sound)} sound cues")
