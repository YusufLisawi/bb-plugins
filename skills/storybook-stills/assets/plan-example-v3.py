#!/usr/bin/env python3
"""FLIGHT DELAYED · Part 1 v3 (round 2). `HOOK=A python3 episodes/flight1v3/make_script.py A && .venv/bin/python scripts/voice.py flight1v3 && python3 episodes/flight1v3/plan.py`
writes episodes/flight1v3/plan.json (→ scripts/stills_build.py flight1v3).

THE ROUND-2 RULES (owner), and how this plan applies them:
 1. NOTHING RUSHED. A card is on screen at least (read-aloud time + 1 s); its animation finishes early and then breathes. Where a card needs room the
    NARRATION waits (air in script.tsv): rule sentences are split in two, the diagram plays in the silence after the rule.
 2. EVERY BEAT ON ITS WORD. Cuts: the word's start − 0.08 s (the picture is there when the word is heard). Everything else (a stamp, a ring, a typed label,
    a card's typed lines, a counter, a board flip, a bubble) starts ON the word it illustrates: `at: "<line>.<word>"`, no other offsets.
 3. FEWER, BETTER HIGHLIGHTS: only what teaches something a viewer would miss: the bandage, the loupe on the far figures, the staff door, the badge LED, the escape
    route diagrams, the board. Each draws on in 0.7 s and stays ≥ 1.5 s (hold 2.2 s) before it fades. Nothing circles the obvious.
 4. TEXT NEVER OVERFLOWS: every boxed text goes through src/kit/stills/fit.ts (measure, wrap, shrink, keep inside the visible frame).
 5. ON-SCREEN TEXT = WORDS THE NARRATOR SAYS (or one keyword of them). No heartbeat meter, no unspoken clocks / counters / sub-labels. The Korean on signs and in the
    PA bubble is in-world signage. Only the end card's call-to-action words (COMMENT, FOLLOW, PART 2) are not narrated: that card is made to be read.
Anchors: "line.word" = the first word with that spelling in the line, "#2" = the second one; `end` = the end of the film; `line.end` = the line's last word's end.
"""
import json, sys, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "episodes/flighthooks"))
from plans import Hook, BODIES   # noqa: E402

X = os.environ.get("HOOK", "A").upper()
h = Hook("flight1v3", tail=3.0)
S, C = h.S, h.C

# ───────────────────────── THE HOOK = the owner's pick (hook B, the bite opening) closed with hook A's question
# "A zombie just bit the passport officer, and you're standing right there." (air) "Twenty minutes ago, you landed in Seoul, South Korea. You're Leo, twenty-seven,
#  from Chicago, and you don't speak a word of Korean." (air) "What do you do?" (air)
from plans import LEO_TAG, sign_rows   # noqa: E402
S("18_bite", 0, z=(1.12, 1.0), o=(50, 65), hits=["hbite.bit"], fx=[
    {"kind": "tag", "x": 0.2, "y": 0.2, "text": "ZOMBIE", "tx": 0.37, "ty": 0.47, "at": "hbite.zombie", "maxW": 0.2},
    {"kind": "burst", "at": "hbite.bit", "x": 0.446, "y": 0.653, "s": 0.8}, {"kind": "flash", "at": "hbite.bit", "col": "#ff3b30"}])
S("h01_zombie", "hbite.and-0.1", z=(1.0, 1.16), o=(50, 42))                                                                  # "and you're standing right there": the zombie reaches for the camera = for you
C({"kind": "ago", "text": "20 MINUTES AGO", "sub": "SEOUL, SOUTH KOREA", "spinAt": "ago.Twenty", "typeAt": "ago.Twenty+0.1", "subAt": "ago.Seoul,"}, "ago.Twenty-0.1")
S("h02_leo_walk", "ago.You're-0.08", z=(1.0, 1.08), o=(50, 45), fx=[{"kind": "tag", "x": 0.2, "y": 0.2, "text": "LEO", "sub": "27", "subAt": "ago.twenty-seven,", "sub2": "· CHICAGO", "sub2At": "ago.Chicago,", "tx": 0.46, "ty": 0.3, "at": "ago.Leo,"}])
S("05_sign", "ago.and-0.08", z=(1.0, 1.1), o=(60, 25), fx=sign_rows("ago.don't", 0.45, ["ago.don't", "ago.speak", "ago.word", "ago.Korean."]))   # "you don't speak a word of Korean": the sign you cannot read writes itself
S("24_turn", "q.What-0.08", z=(1.0, 1.12), o=(62, 62), fx=[{"kind": "tag", "x": 0.86, "y": 0.64, "text": "YOU", "tx": 0.685, "ty": 0.52, "at": "q.you", "maxW": 0.14}])   # "What do you do?": you, tiny, in the middle of the panic
h.snd({"sfx": "bite_struggle", "at": "hbite.bit-0.05", "db": -3}, {"sfx": "breath_fast", "at": "hbite.bit+0.5", "db": -11},
      {"amb": "panic_hall", "from": 0, "to": "ago.Twenty", "db": -9, "fo": 0.8}, {"sfx": "gasp", "at": "hbite.you're", "db": -8},
      {"sfx": "cabin_landing", "at": "ago.landed", "db": -9}, {"sfx": "touchdown_out", "at": "ago.landed+0.2", "db": -9},
      {"amb": "airport_hall", "from": "ago.You're-0.5", "to": "queue.Your", "db": -7, "fi": 1.0, "fo": 1.0},
      {"sfx": "heartbeat", "at": "q.What", "db": -15}, {"sfx": "heartbeat", "at": "q.What+0.9", "db": -15})

# ───────────────────────── QUEUE: "Your phone has no signal, your wallet has the wrong money, and the passport line is two hundred people long."
S("06_phone", "queue-0.10", z=(1.0, 1.06), o=(55, 50), fx=[{"kind": "phoneui", "x": 0.542, "y": 0.509, "w": 0.2, "ar": 1.88, "rot": -3, "at": "queue.phone", "time": "NO SIGNAL", "status": "", "rows": []}])
S("07_wallet", "queue.your#2-0.08", z=(1.0, 1.07), o=(60, 40), fx=[{"kind": "stamp", "x": 0.47, "y": 0.2, "text": "WRONG MONEY", "at": "queue.wrong", "rot": -7}])
S("08_line", "queue.and-0.08", z=(1.0, 1.2), o=(32, 72), fx=[
    {"kind": "tag", "x": 0.14, "y": 0.5, "text": "YOU", "tx": 0.325, "ty": 0.735, "at": "queue.passport"},
    {"kind": "counter", "x": 0.5, "y": 0.1, "label": "PEOPLE", "from": 0, "to": 200, "at": "queue.two", "dur": 0.9}])

# ───────────────────────── SUIT: "Ten people ahead, a man in a grey suit is sweating, and scratching a bandage on his hand."
PIPS = [0.327, 0.396, 0.473, 0.531, 0.581, 0.623, 0.665, 0.712, 0.75, 0.792]     # x of the heads in 09_ten (frame fractions), you → the man
HEAD_Y = [0.47, 0.49, 0.45, 0.46, 0.43, 0.46, 0.44, 0.45, 0.445, 0.41]
S("09_ten", "suit-0.20", z=(1.0, 1.1), o=(62, 48), fx=[{"kind": "pips", "to": "suit.sweating-0.1", "items":
    [{"x": PIPS[i], "y": HEAD_Y[i], "n": i + 1, "at": f"{['suit.Ten', 'suit.people', 'suit.ahead,'][i // 3]}+{0.07 * (i % 3):.2f}"} for i in range(9)] + [{"x": PIPS[9], "y": HEAD_Y[9], "n": 10, "at": "suit.man"}]}])   # 1-9 count up, three on each of "Ten people ahead,"; the red 10th lands on "man"
S("10_sweat", "suit.sweating-0.10", z=(1.0, 1.1), o=(50, 30), fx=[{"kind": "drops", "x": 0.455, "y": 0.3, "n": 5}, {"kind": "drops", "x": 0.57, "y": 0.2, "n": 3}])
S("11_bandage", "suit.scratching-0.10", z=(1.0, 1.12), o=(50, 55), fx=[{"kind": "circle", "x": 0.46, "y": 0.3, "rx": 0.13, "ry": 0.17, "at": "suit.bandage", "label": "bandage", "lx": 0.2, "ly": -0.1}])

# ───────────────────────── FALLS / LEANS / BITE
S("12_collapse", "falls.he-0.06", z=(1.0, 1.08), o=(50, 60), hits=["falls.falls+0.14"])
S("13_booth", "falls.Right-0.08", z=(1.08, 1.0), o=(55, 55))
S("14_gasp", "falls.booth", z=(1.0, 1.1), o=(50, 45))
S("15_leans", "leans-0.08", z=(1.0, 1.1), o=(70, 55))
S("16_reach", "leans.over-0.08", z=(1.0, 1.12), o=(48, 55))
S("17_lunge", "leans.help+0.12", z=(1.0, 1.12), o=(57, 65))
S("18_bite", "bite.bites-0.10", z=(1.12, 1.0), o=(50, 65), hits=["bite.bites"], fx=[
    {"kind": "burst", "at": "bite.bites", "x": 0.446, "y": 0.653, "s": 0.8}, {"kind": "flash", "at": "bite.bites", "col": "#ff3b30"}])
S("19_arm", "bite.deep-0.08", z=(1.0, 1.1), o=(72, 60))

# ───────────────────────── SCREAM: "Someone screams. An announcement booms from the ceiling, in a language you don't understand."
S("20_scream", "scream-0.08", z=(1.0, 1.1), o=(52, 40), hits=["scream.screams"], fx=[
    {"kind": "ripple", "x": 0.345, "y": 0.42, "dir": 180, "spread": 100, "n": 3, "r0": 0.03, "r1": 0.2, "at": "scream.screams"},
    {"kind": "ripple", "x": 0.7, "y": 0.42, "dir": 0, "spread": 100, "n": 3, "r0": 0.03, "r1": 0.2, "at": "scream.screams"}])
S("21_speaker", "scream.An-0.05", z=(1.0, 1.1), o=(50, 30), fx=[
    {"kind": "ripple", "x": 0.5, "y": 0.43, "dir": 90, "spread": 110, "n": 4, "r0": 0.03, "r1": 0.26, "at": "scream.booms"},
    {"kind": "bubble", "x": 0.5, "y": 0.68, "w": 0.3, "text": "승객 여러분, 비상 상황입니다.", "ko": True, "at": "scream.announcement", "tx": 0.5, "ty": 0.44, "cps": 9}])
S("22_confused", "scream.in-0.07", z=(1.0, 1.08), o=(48, 25), fx=[
    {"kind": "bubble", "x": 0.2, "y": 0.2, "w": 0.1, "text": "???", "at": "scream.understand", "tx": 0.43, "ty": 0.25}])

# ───────────────────────── WATCH: "So you stop listening to the words, and you watch the crowd instead."
S("23_eyes", "watch-0.08", z=(1.0, 1.1), o=(63, 66))
S("24_turn", "watch.and-0.10", z=(1.0, 1.14), o=(60, 60), fx=[{"kind": "tag", "x": 0.86, "y": 0.66, "text": "YOU", "tx": 0.685, "ty": 0.515, "at": "watch.you#2", "maxW": 0.14}])

# ───────────────────────── CRUSH: "Two hundred people turn and push for the same exit. In a panic, people rarely die from what's behind them. They die in the crush."
S("25_surge", "crush-0.08", z=(1.0, 1.1), o=(60, 60), hits=["crush.push"], fx=[{"kind": "speed", "dir": -1, "at": "crush.turn", "o": 0.3}])
S("26_exit", "crush.same-0.10", z=(1.0, 1.1), o=(25, 65), hits=["crush.exit"])
S("27_feet", "crush.In-0.06", z=(1.0, 1.1), o=(50, 70))
S("28_pinned", "crush.die-0.10", z=(1.0, 1.12), o=(50, 62))
C({"kind": "gauge", "bare": True, "zones": ["CRUSH"], "zoneAt": "crush.crush.", "from": 1, "to": 6.6, "sweep": 1.4}, "crush.They-0.08")

# ───────────────────────── RULE 1: "Rule one. Don't fight the flow." (air) "Move with it, and slowly cut across it, toward the edge." (air)
C({"kind": "rule", "n": "RULE 1", "title": "Don't fight the flow.", "nAt": "rule1a.Rule", "titleAt": "rule1a.Don't", "titleTo": "rule1a.end"}, "rule1a-0.08")
S("29_flow", "rule1b-0.08", z=(1.0, 1.08), o=(54, 45))
S("30_edge", "rule1b.cut-0.08", z=(1.0, 1.1), o=(66, 50))
C({"kind": "plan", "floor": [0.12, 0.2, 0.76, 0.7],
   "walls": [{"pts": [[0.12, 0.2], [0.88, 0.2], [0.88, 0.9], [0.12, 0.9], [0.12, 0.2]], "w": 12}, {"pts": [[0.12, 0.64], [0.12, 0.86]], "col": "#e6dcbd", "w": 16}],
   "boxes": [{"x": 0.3 + i * 0.07, "y": 0.2, "w": 0.06, "h": 0.07, "fill": "#cfc3a3", "at": 0.2 + i * 0.06} for i in range(6)],
   "crowd": [{"n": 64, "from": [0.22, 0.3, 0.55, 0.32], "to": [0.12, 0.75], "at": 0.1, "speed": 0.2}],
   "marks": [{"kind": "exit", "x": 0.12, "y": 0.75, "at": 0.2, "col": "#58b368"}, {"kind": "door", "x": 0.88, "y": 0.72, "at": 0.3, "col": "#d9a72b"},
             {"kind": "you", "x": 0.66, "y": 0.42, "at": 0.4, "mv": {"pts": [[0.66, 0.42], [0.55, 0.46], [0.5, 0.5], [0.62, 0.62], [0.74, 0.72], [0.78, 0.82]], "t0": 0.7, "t1": 1.9}}],
   "paths": [{"pts": [[0.62, 0.36], [0.4, 0.4], [0.2, 0.55], [0.15, 0.72]], "col": "#5b7aa8", "at": 0.3, "dur": 0.8, "arrow": True, "w": 10},
             {"pts": [[0.5, 0.52], [0.66, 0.62], [0.78, 0.76]], "col": "#e8372c", "at": 0.9, "dur": 1.0, "dash": True, "arrow": True, "w": 10}]}, "rule1b.edge-0.08")

# ───────────────────────── RULE 2: "Rule two. Stay off the walls and the barriers." (air) "And keep your arms up in front of your chest, so you can breathe." (air)
C({"kind": "rule", "n": "RULE 2", "title": "Stay off the walls and the barriers.", "nAt": "rule2a.Rule", "titleAt": "rule2a.Stay", "titleTo": "rule2a.end"}, "rule2a-0.08")
S("31_barrier", "rule2a.end+1.35", z=(1.0, 1.1), o=(30, 65))
S("32_guard", "rule2b-0.08", z=(1.0, 1.08), o=(50, 62))
C({"kind": "guard", "bare": True, "breatheLabel": "BREATHE", "breatheAt": "rule2b.breathe."}, "rule2b.so-0.08")

# ───────────────────────── GIRL / GRAB: "At the edge, a little girl is standing alone, with an orange lanyard around her neck, calling for someone." "You don't think. You pick her up."
S("33_kit", "girl-0.08", z=(1.0, 1.14), o=(60, 65))
S("34_lanyard", "girl.with-0.08", z=(1.0, 1.1), o=(54, 65))
S("35_calls", "girl.calling-0.10", z=(1.0, 1.1), o=(53, 36), fx=[
    {"kind": "ripple", "x": 0.36, "y": 0.41, "dir": 180, "spread": 90, "n": 4, "r0": 0.04, "r1": 0.34, "at": "girl.calling"},
    {"kind": "ripple", "x": 0.72, "y": 0.41, "dir": 0, "spread": 90, "n": 3, "r0": 0.03, "r1": 0.2, "at": "girl.calling"}])
S("36_sprint", "grab-0.08", z=(1.0, 1.1), o=(55, 60), fx=[{"kind": "speed", "dir": -1, "o": 0.3, "at": "grab.You"}])
S("37_lift", "grab.pick-0.12", z=(1.08, 1.0), o=(50, 60), hits=["grab.pick"], fx=[{"kind": "burst", "at": "grab.pick", "x": 0.5, "y": 0.85, "s": 0.45}])
S("38_hug", "grab.end+0.25", z=(1.0, 1.08), o=(50, 50))

# ───────────────────────── DANI: "And a hand grabs your arm. A flight attendant, from your own plane. She swipes her badge at a grey door with a staircase on it."
S("39_grabarm", "dani.grabs-0.08", z=(1.0, 1.08), o=(62, 62), hits=["dani.grabs"], fx=[{"kind": "burst", "at": "dani.grabs", "x": 0.64, "y": 0.62, "s": 0.4}])
S("40_dani", "dani.A#2-0.10", z=(1.0, 1.08), o=(55, 50), fx=[{"kind": "tag", "x": 0.21, "y": 0.62, "text": "FLIGHT ATTENDANT", "tx": 0.52, "ty": 0.55, "at": "dani.flight", "maxW": 0.26}])
S("41_run_door", "dani.plane-0.10", z=(1.0, 1.1), o=(80, 50), x=(0.01, -0.02), fx=[{"kind": "speed", "dir": 1, "o": 0.4, "n": 14, "at": "dani.plane-0.10"}])
S("42_swipe", "dani.swipes-0.08", z=(1.0, 1.1), o=(60, 45), fx=[{"kind": "led", "x": 0.673, "y": 0.266, "at": "dani.badge", "r": 0.011}, {"kind": "circle", "x": 0.673, "y": 0.285, "rx": 0.05, "at": "dani.badge", "col": "#7fd08a", "label": "badge", "lx": -0.2, "ly": -0.13}])
S("43_door_open", "dani.grey-0.08", z=(1.0, 1.1), o=(52, 30), fx=[{"kind": "circle", "x": 0.526, "y": 0.12, "rx": 0.075, "ry": 0.06, "at": "dani.staircase", "label": "staircase", "lx": -0.12, "ly": 0.1}])

# ───────────────────────── SAYS: "Staff only, she says, in your language. This way. Now."
S("44_shout", "says-0.08", z=(1.05, 1.0), o=(60, 45), fx=[{"kind": "bubble", "x": 0.28, "y": 0.22, "w": 0.2, "text": "Staff only.", "at": "says.Staff", "tx": 0.54, "ty": 0.44}])
S("45_beckon", "says.This-0.10", z=(1.0, 1.07), o=(50, 40), fx=[{"kind": "bubble", "x": 0.25, "y": 0.2, "w": 0.24, "text": "This way. Now.", "at": "says.This", "tx": 0.46, "ty": 0.3}])

# ───────────────────────── RULE 3: "Rule three. When everyone runs for the main exit, look for the door nobody sees." (air) "Staff doors, service stairs, the exit behind the counter." (air)
C({"kind": "rule", "n": "RULE 3", "text": "When everyone runs for the main exit,", "title": "Look for the door nobody sees.", "textFirst": True, "nAt": "rule3a.Rule",
   "textAt": "rule3a.When", "textTo": "rule3a.exit,", "titleAt": "rule3a.look", "titleTo": "rule3a.end"}, "rule3a-0.08")
S("47_door_plain", "rule3b-0.08", z=(1.0, 1.08), o=(72, 52))   # "Staff doors,": the door itself is the subject (no ring: the shot is 1 s)
S("47b_stairs", "rule3b.service-0.08", z=(1.0, 1.08), o=(60, 55))
S("48_counter", "rule3b.the-0.08", z=(1.0, 1.08), o=(55, 52))
C({"kind": "plan", "floor": [0.12, 0.2, 0.76, 0.7],
   "walls": [{"pts": [[0.12, 0.2], [0.88, 0.2], [0.88, 0.9], [0.12, 0.9], [0.12, 0.2]], "w": 12}, {"pts": [[0.12, 0.64], [0.12, 0.86]], "col": "#e6dcbd", "w": 16}],
   "boxes": [{"x": 0.3 + i * 0.07, "y": 0.2, "w": 0.06, "h": 0.07, "fill": "#cfc3a3", "at": 0.1 + i * 0.04} for i in range(6)] + [{"x": 0.9, "y": 0.58, "w": 0.075, "h": 0.28, "fill": "#e2d8bd", "at": 0.3}],
   "crowd": [{"n": 70, "from": [0.2, 0.3, 0.5, 0.45], "to": [0.12, 0.75], "at": 0.2, "speed": 0.22}],
   "marks": [{"kind": "exit", "x": 0.12, "y": 0.75, "at": 0.3, "col": "#58b368"}, {"kind": "x", "x": 0.2, "y": 0.75, "at": 0.9}, {"kind": "door", "x": 0.88, "y": 0.68, "at": 0.5, "col": "#d9a72b"},
             {"kind": "you", "x": 0.66, "y": 0.5, "at": 0.4, "mv": {"pts": [[0.66, 0.5], [0.8, 0.6], [0.88, 0.68], [0.94, 0.7], [0.94, 0.5]], "t0": 0.9, "t1": 2.1}}],
   "paths": [{"pts": [[0.66, 0.5], [0.8, 0.6], [0.88, 0.68], [0.94, 0.7], [0.94, 0.45]], "col": "#e8372c", "at": 0.8, "dur": 1.1, "dash": True, "arrow": True, "w": 9}]}, "rule3b.end+0.30")

# ───────────────────────── QUIET: "The door clicks shut behind you, and the screaming goes quiet. Two flights up, into a dark crew corridor."
S("49_shut", "quiet-0.08", z=(1.0, 1.08), o=(50, 50), hits=["quiet.clicks"])
S("50_silence", "quiet.and-0.10", z=(1.0, 1.06), o=(50, 50))
S("51_climb", "quiet.Two-0.10", z=(1.0, 1.1), o=(35, 40))
S("52_corridor", "quiet.into-0.05", z=(1.0, 1.1), o=(50, 55))

# ───────────────────────── NAMES: "Her name is Dani. The girl is Kit, nine, travelling alone. Dani reads your name off your passport. Leo."
S("53_dani_intro", "names-0.08", z=(1.0, 1.1), o=(46, 45), fx=[{"kind": "tag", "x": 0.78, "y": 0.3, "text": "DANI", "tx": 0.47, "ty": 0.46, "at": "names.Dani"}])
S("54_kit_badge", "names.Kit,-0.08", z=(1.0, 1.1), o=(46, 40), fx=[{"kind": "tag", "x": 0.2, "y": 0.28, "text": "KIT", "sub": "nine · travelling alone", "subAt": "names.nine,", "tx": 0.455, "ty": 0.2, "at": "names.Kit,", "maxW": 0.3}])
S("55_passport", "names.Dani#2-0.08", z=(1.0, 1.08), o=(42, 40))
C({"kind": "passport", "bare": True, "name": "LEO", "nameAt": "names.Leo."}, "names.passport-0.08")

# ───────────────────────── WINDOW / BOARD: "From the corridor window, you can see the whole hall below. The arrivals board flips, line by line. Cancelled. Cancelled. Cancelled."
S("56_window", "window-0.08", z=(1.0, 1.08), o=(60, 55))
S("57_below", "window.you-0.10", z=(1.0, 1.1), o=(60, 45), fx=[{"kind": "loupe", "x": 0.67, "y": 0.46, "r": 0.17, "zoom": 3.4, "lx": 0.3, "ly": 0.58, "at": "window.hall"}])
BOARD = {"kind": "board", "x": 0.135, "y": 0.33, "w": 0.78, "h": 0.42, "tickAt": "board.flips,", "tickStep": 0.34, "rows": [["LISBON", "LANDED"], ["DUBAI", "ON TIME"], ["OSLO", "ON TIME"], ["TOKYO", "DELAYED"], ["MADRID", "ON TIME"], ["CAIRO", "ON TIME"]],
         "flip": "CANCELLED", "at": "board.Cancelled", "rot": -1.5,
         "ats": ["board.Cancelled", "board.Cancelled+0.16", "board.Cancelled#2", "board.Cancelled#2+0.16", "board.Cancelled#3", "board.Cancelled#3+0.16"]}
S("58_board", "board-0.08", z=(1.02, 1.07), o=(50, 50), fx=[BOARD])
S("59_grim", "board.end+0.45", z=(1.0, 1.1), o=(48, 52))

# ───────────────────────── OFFICER / UP: "The officer is sitting against his booth, holding his arm." "And the man in the grey suit, the one who fell, slowly gets up."
S("60_officer", "officer-0.08", z=(1.0, 1.1), o=(66, 55))
S("61_arm", "officer.holding-0.10", z=(1.0, 1.1), o=(52, 64))
S("62_twitch", "up-0.08", z=(1.0, 1.1), o=(62, 56))
S("63_allfours", "up.the#3-0.08", z=(1.0, 1.1), o=(54, 60))
S("64_rises", "up.gets-0.08", z=(1.02, 1.12), o=(52, 45))

# ───────────────────────── THE END CARD: the question typed as the narrator asks it, the two answers on their words, comment, PART 2 · STRANDED with the spoken line typed under it, FOLLOW
C({"kind": "cta", "question": ["WOULD YOU STAY HIDDEN UPSTAIRS,", "OR RUN FOR THE EXIT?"], "hi": ["HIDDEN", "RUN"], "questionAt": "ask.Would", "questionTo": "ask.exit?+0.38",
   "options": [{"n": "1", "label": "HIDE", "sub": "UPSTAIRS", "icon": "stairs", "at": "ask.hidden"}, {"n": "2", "label": "RUN", "sub": "FOR THE EXIT", "icon": "run", "at": "ask.run"}],
   "comment": "Comment 1 or 2", "commentAt": "ask.exit?+0.5", "partAt": "ask.Part-0.1", "part": "PART 2", "title": "STRANDED", "titleAt": "ask.stranded", "partSub": "in a country that isn't yours", "partSubAt": "ask.in",
   "img": "66_teaser", "bg": "65_horror", "followAt": "ask.end+0.1", "follow": "FOLLOW FOR PART 2"}, "ask-0.08")

# ───────────────────────── SOUND: one foley cue per action, a bed per place; a subtle heartbeat under the two tense beats (no meter)
h.snd(
    {"amb": "airport_hall", "from": "queue.Your", "to": "watch.and+0.8", "db": -5, "fi": 0.8, "fo": 1.2},
    {"sfx": "phone_buzz", "at": "queue.phone", "db": -6},
    {"sfx": "stamp--cobra-effect", "at": "queue.wrong", "db": -8}, {"sfx": "bills_riffle", "at": "queue.wallet", "db": -8}, {"sfx": "coins", "at": "queue.wallet+0.6", "db": -10},
    {"sfx": "shiver", "at": "suit.sweating", "db": -10},
    {"sfx": "bandage_scratch", "at": "suit.scratching", "db": -7},
    {"sfx": "body_fall", "at": "falls.falls+0.14", "db": -3},
    {"sfx": "gasp", "at": "falls.booth", "db": -4},
    {"sfx": "rustle", "at": "leans.help-0.1", "db": -10}, {"sfx": "barrier_rattle", "at": "leans.barrier", "db": -8},
    {"sfx": "grab", "at": "bite.man", "db": -10},
    {"sfx": "bite_struggle", "at": "bite.bites-0.1", "db": -3},
    {"sfx": "breath_fast", "at": "bite.deep", "db": -10}, {"sfx": "shoes_stumble", "at": "bite.deep-0.2", "db": -7},
    {"sfx": "scream_close", "at": "scream.screams-0.1", "db": -5}, {"sfx": "crowd_gasp", "at": "scream.screams+0.6", "db": -8},
    {"sfx": "pa_foreign", "at": "scream.announcement-0.1", "db": -8},
    {"amb": "panic_hall", "from": "watch.and", "to": "rule1a.Rule", "db": -2, "fi": 1.6, "fo": 0.8},
    {"sfx": "suitcase_tip", "at": "crush.push-0.4", "db": -6}, {"sfx": "glass_doors", "at": "crush.exit-0.2", "db": -8},
    {"sfx": "shoes_stumble", "at": "crush.In+0.6", "db": -8}, {"sfx": "crowd_gasp", "at": "crush.die", "db": -9},
    {"sfx": "barrier_creak", "at": "rule2a.end+1.35", "db": -8},
    {"sfx": "run_tile", "at": "grab", "db": -8}, {"sfx": "girl_cry", "at": "girl.calling", "db": -8},
    {"sfx": "grab", "at": "grab.pick", "db": -8}, {"sfx": "rustle", "at": "grab.up+0.3", "db": -10},
    {"sfx": "grab", "at": "dani.grabs-0.05", "db": -8},
    {"sfx": "run_tile", "at": "dani.plane+0.3", "db": -9},
    {"sfx": "badge_beep", "at": "dani.badge", "db": -6}, {"sfx": "door_push", "at": "dani.door", "db": -6},
    {"sfx": "steel_door", "at": "quiet.clicks", "db": -4},
    {"amb": "stairwell", "from": "quiet.clicks", "to": "quiet.into+0.6", "db": -6},
    {"sfx": "stairs_few", "at": "quiet.Two", "db": -10},
    {"amb": "corridor_buzz", "from": "quiet.into+0.3", "to": "end", "db": -6, "fi": 0.6, "fo": 1.0},
    {"sfx": "coat", "at": "names.reads", "db": -9},
    {"sfx": "counter", "at": "board.Cancelled", "db": -7}, {"sfx": "counter", "at": "board.Cancelled#2", "db": -7}, {"sfx": "counter", "at": "board.Cancelled#3", "db": -7},
    {"amb": "sirenfar", "from": "officer", "to": "end", "db": -10, "fi": 1.0, "fo": 1.0},
    {"sfx": "finger_tap", "at": "up.suit,+0.25", "db": -6}, {"sfx": "rise_scrape", "at": "up.slowly-0.4", "db": -8}, {"sfx": "groan_real", "at": "up.slowly", "db": -6},
    {"sfx": "pop", "at": "ask.hidden-0.05", "db": -10, "ui": True}, {"sfx": "pop", "at": "ask.run-0.05", "db": -10, "ui": True},
    {"sfx": "pop", "at": "ask.exit?+0.5", "db": -10, "ui": True}, {"sfx": "paper--dq3", "at": "ask.Part+0.1", "db": -10, "ui": True}, {"sfx": "pop", "at": "ask.end+0.1", "db": -9, "ui": True},
)
# a subtle heartbeat (lub-dub every 0.9 s, -16 dB) under the bite and under the man getting up
for t0, n in (("bite.bites", 5), ("up.fell,", 5)):
    for i in range(n): h.snd({"sfx": "heartbeat", "at": f"{t0}+{0.9 * i + 0.2:.2f}", "db": -16})

plan = {"slug": "flight1v3", "size": "16:9", "art": "art/flight1v2/raw", "tail": h.tail, "shots": h.shots, "sound": h.sound, "mix": ["--limit", "0.6"]}
json.dump(plan, open(Path(__file__).with_name("plan.json"), "w"), indent=1)
print(f"flight1v3 · hook {X}: {len(h.shots)} shots ({sum(1 for s in h.shots if 'img' in s)} pictures, {sum(1 for s in h.shots if 'card' in s)} cards) · {len(h.sound)} sound cues")
