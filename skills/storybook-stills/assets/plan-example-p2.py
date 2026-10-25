#!/usr/bin/env python3
"""FLIGHT DELAYED · Part 2 · STRANDED (the story: episodes/_series/flight-delayed/season-1.md). The build, from the repo root:
    python3 episodes/flight2/make_script.py && .venv/bin/python scripts/voice.py flight2 && .venv/bin/python scripts/trim_take.py flight2 && .venv/bin/python scripts/voice.py flight2 --reuse
    python3 episodes/flight2/plan.py && python3 scripts/stills_build.py flight2 [--placeholders] && python3 scripts/gen_root.py
writes episodes/flight2/plan.json → public/flight2/stills.json, sound.json, mix.wav. Dev player: scripts/devplayer.sh FlightDelayed2.

THE RULES OF THE FORMAT (skill storybook-stills), as applied here:
  cuts 0.08 s before the word that names the picture; every other beat starts ON its word (`at: "<line>.<word>"`, "#2" = the second one, `end` = the line's last word's end);
  on-screen text = the narrator's own words, revealed word by word; highlights draw 0.7 s and hold ≥ 2 s and only teach (the battery, the badge); no heartbeat meter,
  no stingers, no beeps on graphics; one foley cue per action, a bed per place. Art coordinates → frame: x = art_x / 1536, y = (art_y − 80) / 864.
Part 2 plants for the next parts: rigor mortis = two days (then it wears off → Part 3), Kit's red-coat search, the officer's badge on its lanyard (the cliffhanger),
the offline map + translator (Part 3), Leo's navy crew backpack, Kit's sticker notebook.
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]


class Plan:
    def __init__(self, slug, tail):
        self.slug, self.tail, self.shots, self.sound = slug, tail, [], []

    def S(self, img, at, z=(1.0, 1.06), o=(50, 50), fx=None, hits=None, x=None, y=None):
        d = {"img": img, "at": at, "z": list(z), "o": list(o)}
        if fx: d["fx"] = fx
        if hits: d["hits"] = hits
        if x: d["x"] = list(x)
        if y: d["y"] = list(y)
        self.shots.append(d)

    def C(self, card, at): self.shots.append({"card": card, "at": at})
    def snd(self, *cues): self.sound.extend(cues)


h = Plan("flight2", tail=4.0)
S, C = h.S, h.C
RULE = lambda n, title, line, first, last="end", at_off=-0.08: C({"kind": "rule", "n": f"RULE {n}", "title": title, "nAt": f"{line}.Rule", "titleAt": f"{line}.{first}", "titleTo": f"{line}.{last}"}, f"{line}{at_off:+.2f}")

# ───────────────────────── PREVIOUSLY (the last part's three pictures, 7 s): "Previously: a zombie bit the officer, you carried a girl through a staff door, and the man in the grey suit got up."
S("01_prev_bite", 0, z=(1.0, 1.1), o=(50, 62), fx=[{"kind": "kicker", "text": "PREVIOUSLY", "at": "prev", "to": "prev.you"}])
S("02_prev_lift", "prev.you-0.08", z=(1.08, 1.0), o=(50, 60))
S("03_prev_rises", "prev.and-0.08", z=(1.02, 1.12), o=(52, 50))

# ───────────────────────── HOOK: "There's a zombie outbreak in the airport below you, and the Wi-Fi up here dies in ten minutes. What do you download?"
S("04_hall_dead", "hook-0.08", z=(1.0, 1.1), o=(40, 55), hits=["hook.zombie"], fx=[{"kind": "stamp", "x": 0.7, "y": 0.2, "text": "ZOMBIE OUTBREAK", "at": "hook.zombie", "rot": -7, "size": 0.075}])
S("05_phone_wifi", "hook.and-0.08", z=(1.0, 1.06), o=(50, 50), fx=[{"kind": "phoneapp", "app": "download", "rows": [], "x": 0.497, "y": 0.467, "w": 0.256, "ar": 1.85, "at": "hook.Wi-Fi", "label": "10 MINUTES", "labelAt": "hook.ten"}])
S("06_what_download", "hook.What-0.1", z=(1.0, 1.12), o=(50, 40))

# ───────────────────────── ROOM: "Dani locks the crew room door, and hands you a navy backpack. The crew Wi-Fi runs on a backup battery, she says. Ten minutes, maybe."
S("07_lock", "room-0.08", z=(1.0, 1.08), o=(45, 55))
S("08_bolt", "room.locks-0.08", z=(1.0, 1.1), o=(50, 50), hits=["room.locks+0.1"])
S("09_pack", "room.hands-0.1", z=(1.0, 1.08), o=(50, 55))
S("10_router", "room.The#2-0.08", z=(1.0, 1.08), o=(55, 45), fx=[
    {"kind": "led", "x": 0.46, "y": 0.435, "at": "room.Wi-Fi", "r": 0.007},
    {"kind": "circle", "x": 0.675, "y": 0.37, "rx": 0.17, "ry": 0.12, "at": "room.backup", "labelAt": "room.backup+0.15", "label": "backup battery", "lx": -0.06, "ly": 0.27}])
S("11_dani_shrug", "room.Ten-0.1", z=(1.0, 1.07), o=(50, 50))

# ───────────────────────── RULE 1: "Rule one. Learn the local emergency numbers before you fly." / "In South Korea, one-one-two is the police, and one-one-nine is fire and ambulance."
RULE(1, "Learn the local emergency numbers before you fly.", "rule1a", "Learn")
S("12_police", "rule1b-0.08", z=(1.0, 1.08), o=(45, 55), fx=[
    {"kind": "stamp", "x": 0.72, "y": 0.22, "text": "112", "at": "rule1b.one-one-two", "rot": -6, "size": 0.1},
    {"kind": "tag", "x": 0.22, "y": 0.2, "text": "POLICE", "tx": 0.5, "ty": 0.55, "at": "rule1b.police,"}])
S("13_rescue", "rule1b.and-0.08", z=(1.0, 1.08), o=(50, 55), fx=[
    {"kind": "stamp", "x": 0.5, "y": 0.2, "text": "119", "at": "rule1b.one-one-nine", "rot": -6, "size": 0.1},
    {"kind": "tag", "x": 0.2, "y": 0.2, "text": "FIRE", "tx": 0.22, "ty": 0.5, "at": "rule1b.fire"},
    {"kind": "tag", "x": 0.82, "y": 0.18, "text": "AMBULANCE", "tx": 0.8, "ty": 0.5, "at": "rule1b.ambulance.", "maxW": 0.3}])

# ───────────────────────── BUSY: "You dial one-one-nine. A recorded voice repeats the same message. Nobody is coming."
S("14_dial", "busy-0.08", z=(1.0, 1.05), o=(50, 50), fx=[{"kind": "phoneapp", "app": "dial", "digits": "119", "x": 0.494, "y": 0.462, "w": 0.262, "ar": 1.8, "rot": 1.5, "at": "busy.dial-0.05", "cps": 2.2, "callAt": "busy.A-0.4"}])
S("15_ear", "busy.A-0.08", z=(1.0, 1.1), o=(48, 40), fx=[
    {"kind": "bubble", "x": 0.76, "y": 0.14, "w": 0.3, "text": "잠시 후 다시 걸어 주세요.", "ko": True, "at": "busy.recorded", "tx": 0.6, "ty": 0.4, "cps": 9},
    {"kind": "bubble", "x": 0.82, "y": 0.36, "w": 0.28, "text": "잠시 후 다시 걸어 주세요.", "ko": True, "at": "busy.repeats", "tx": 0.62, "ty": 0.42, "cps": 9}])
S("16_nobody", "busy.Nobody-0.08", z=(1.0, 1.08), o=(50, 50))

# ───────────────────────── RULE 2: "Rule two. Download what you need while you have signal." / "The offline map, and the Korean language pack. The bars crawl. The Wi-Fi dies one second after they finish."
RULE(2, "Download what you need while you have signal.", "rule2a", "Download")
DL = lambda x, y, w, rot=0, ar=1.95: {"kind": "phoneapp", "app": "download", "x": x, "y": y, "w": w, "ar": ar, "rot": rot, "at": "rule2b.offline-0.1", "dieAt": "rule2b.dies",
                              "rows": [{"label": "OFFLINE MAP", "at": "rule2b.offline", "to": "rule2b.Korean+0.2"}, {"label": "KOREAN PACK", "at": "rule2b.Korean", "to": "rule2b.dies-0.1"}]}
S("17_dl_map", "rule2b-0.08", z=(1.0, 1.05), o=(50, 50), fx=[DL(0.509, 0.486, 0.223, -1.0, 2.0)])
S("18_bars_face", "rule2b.The#3-0.08", z=(1.0, 1.1), o=(50, 40), fx=[{"kind": "drops", "x": 0.62, "y": 0.4, "n": 3}])
S("19_dl_done", "rule2b.The#4-0.08", z=(1.04, 1.0), o=(50, 50), fx=[DL(0.487, 0.476, 0.22, -1.4, 1.98)])

# ───────────────────────── WORKS: "Now your phone has an airport map and a translator, and neither needs signal."
S("20_map", "works-0.08", z=(1.0, 1.05), o=(50, 50), fx=[{"kind": "phoneapp", "app": "map", "x": 0.495, "y": 0.485, "w": 0.21, "ar": 2.1, "rot": -1.6, "at": "works.phone", "label": "AIRPORT MAP", "labelAt": "works.airport", "routeAt": "works.map"}])
S("21_translate", "works.a-0.1", z=(1.0, 1.05), o=(50, 50), fx=[
    {"kind": "phoneapp", "app": "translate", "x": 0.502, "y": 0.486, "w": 0.222, "ar": 2.0, "rot": -1.2, "at": "works.a", "ko": "비상구", "en": "EMERGENCY EXIT", "enAt": "works.translator,+0.3", "label": "TRANSLATOR", "labelAt": "works.translator,"},
    {"kind": "stamp", "x": 0.8, "y": 0.2, "text": "NO SIGNAL", "at": "works.signal.", "rot": -6, "col": "#58b368", "size": 0.06}])

# ───────────────────────── KIT: "Kit asks for her mom, who was waiting in Arrivals. Dani checks the pouch on her lanyard: a passport, and a phone number."
S("22_kit_asks", "kit-0.08", z=(1.0, 1.1), o=(50, 55))
S("23_arrivals", "kit.who-0.08", z=(1.0, 1.1), o=(50, 60))
S("24_pouch", "kit.Dani-0.08", z=(1.0, 1.08), o=(48, 55))
S("24b_pouch_open", "kit.a-0.08", z=(1.0, 1.08), o=(50, 55), fx=[
    {"kind": "tag", "x": 0.2, "y": 0.18, "text": "PASSPORT", "tx": 0.42, "ty": 0.4, "at": "kit.passport,", "maxW": 0.26},
    {"kind": "tag", "x": 0.8, "y": 0.75, "text": "PHONE NUMBER", "tx": 0.56, "ty": 0.4, "at": "kit.phone", "maxW": 0.3}])

# ───────────────────────── RULE 3: "Rule three. Keep your passport on your body, never in a bag." (the card says the first half; the pictures say the second)
RULE(3, "Keep your passport on your body.", "rule3", "Keep", "body,")
S("25_suitcase_lost", "rule3.never-0.08", z=(1.0, 1.1), o=(50, 70))
S("26_pocket", "rule3.end-0.1", z=(1.0, 1.1), o=(55, 60))

# ───────────────────────── BELOW: "The dead fill the hall below, slow and stiff. You teach chemistry, so you know why: rigor mortis locks a body for two days. Then it wears off."
S("28_dead_fill", "below-0.08", z=(1.0, 1.1), o=(40, 55))
S("29_dead_stiff", "below.slow-0.08", z=(1.0, 1.1), o=(50, 55), fx=[{"kind": "tag", "x": 0.8, "y": 0.18, "text": "STIFF", "tx": 0.57, "ty": 0.36, "at": "below.stiff."}])
S("30_classroom", "below.You-0.08", z=(1.0, 1.08), o=(50, 50))
S("31_leo_thinks", "below.so-0.08", z=(1.0, 1.1), o=(50, 45))
C({"kind": "stages", "title": "RIGOR MORTIS", "titleAt": "below.rigor", "n": 7, "stiff": 2, "stiffAt": "below.locks", "label": "TWO DAYS", "labelAt": "below.two", "offAt": "below.Then"}, "below.rigor-0.08")

# ───────────────────────── COUNT: "You count the supplies: nine bottles of water, four sandwiches, one box of crackers. Three people, two days, if you ration."
S("32_fridge", "count-0.08", z=(1.0, 1.08), o=(50, 55), fx=[{"kind": "pips", "to": "count.four-0.1", "r": 0.016, "items": [{"x": 0.225 + 0.0278 * i, "y": 0.47, "n": i + 1, "at": f"{['count.nine', 'count.bottles', 'count.of'][i // 3]}+{0.07 * (i % 3):.2f}"} for i in range(9)]}])
S("33_sandwiches", "count.four-0.08", z=(1.0, 1.08), o=(50, 55), fx=[{"kind": "pips", "to": "count.one-0.1", "items": [{"x": [0.22, 0.39, 0.57, 0.75][i], "y": 0.42, "n": i + 1, "at": f"count.sandwiches,+{0.12 * i:.2f}"} for i in range(4)]}])
S("34_crackers", "count.one-0.08", z=(1.0, 1.1), o=(50, 55), fx=[{"kind": "tag", "x": 0.18, "y": 0.28, "text": "1 BOX", "tx": 0.41, "ty": 0.5, "at": "count.one"}])
S("35_table_three", "count.Three-0.08", z=(1.0, 1.08), o=(50, 55), fx=[{"kind": "note", "x": 0.86, "y": 0.14, "w": 0.22, "lines": [{"text": "3 PEOPLE", "at": "count.Three"}, {"text": "2 DAYS", "at": "count.two"}]}])
S("35b_ration", "count.if-0.08", z=(1.0, 1.1), o=(50, 55))

# ───────────────────────── RULE 4: "Rule four. Fill every bottle with water now." / "The toilet tank is clean. The bowl never is. Then boil it for one full minute."
RULE(4, "Fill every bottle with water now.", "rule4a", "Fill")
S("36_tank", "rule4b-0.08", z=(1.0, 1.08), o=(50, 50), fx=[{"kind": "tag", "x": 0.78, "y": 0.18, "text": "CLEAN", "tx": 0.45, "ty": 0.47, "at": "rule4b.clean."}])
S("37_bowl", "rule4b.The#2-0.08", z=(1.0, 1.08), o=(50, 55), fx=[{"kind": "stamp", "x": 0.5, "y": 0.3, "text": "NEVER", "at": "rule4b.never", "rot": -6, "size": 0.09}])
S("39_kettle", "rule4b.Then-0.08", z=(1.0, 1.08), o=(50, 50), fx=[{"kind": "tag", "x": 0.17, "y": 0.2, "text": "1 MINUTE", "tx": 0.36, "ty": 0.4, "at": "rule4b.one", "maxW": 0.26}])

# ───────────────────────── NIGHT: "Night falls, and the terminal glows like a lighthouse. Below, the dead turn their faces up toward your window."
S("40_terminal_night", "night-0.08", z=(1.0, 1.08), o=(60, 50))
S("40b_lighthouse", "night.like-0.08", z=(1.0, 1.1), o=(60, 45))
S("41_heads_up", "night.Below,-0.08", z=(1.0, 1.1), o=(50, 55))
S("41b_dead_face_up", "night.faces-0.08", z=(1.0, 1.1), o=(50, 50))

# ───────────────────────── RULE 5: "Rule five. Lights off, and cover the glass." / "Blankets over the window, jackets over every screen. A phone glows like a candle in the dark."
RULE(5, "Lights off, and cover the glass.", "rule5a", "Lights")
S("43_blanket", "rule5b-0.08", z=(1.0, 1.08), o=(50, 50))
S("44_jacket_phone", "rule5b.jackets-0.08", z=(1.0, 1.1), o=(50, 55))
S("45_phone_candle", "rule5b.A-0.08", z=(1.0, 1.08), o=(50, 45))
S("46_dark_room", "rule5b.in-0.08", z=(1.0, 1.06), o=(50, 50))

# ───────────────────────── WATCH / ADMIT: "You take turns on watch." "Then Dani admits there's a security monitor behind the lockers, with every camera in the airport. She switches it on, low."
S("47_watch", "watch-0.08", z=(1.0, 1.08), o=(50, 55))
S("48_dani_admits", "admit-0.08", z=(1.0, 1.1), o=(50, 55))
S("49_monitor_off", "admit.security-0.08", z=(1.0, 1.1), o=(50, 55))
S("49b_cameras", "admit.with-0.08", z=(1.0, 1.1), o=(50, 40))
S("50_monitor_on", "admit.She-0.08", z=(1.0, 1.1), o=(50, 50))

# ───────────────────────── CAM: "Kit leans in, searching Arrivals for her mom's red coat. The hall is full of the dead. No red coat. Not one."
S("51_kit_leans", "cam-0.08", z=(1.0, 1.1), o=(50, 50))
S("51b_notebook_coat", "cam.her-0.08", z=(1.0, 1.1), o=(50, 50), fx=[{"kind": "tag", "x": 0.83, "y": 0.4, "text": "RED COAT", "tx": 0.6, "ty": 0.42, "at": "cam.red", "maxW": 0.26}])
S("52_cctv_arrivals", "cam.The-0.08", z=(1.02, 1.1), o=(50, 50), fx=[{"kind": "cctv", "at": "cam.The-0.08"}])
S("52b_cctv_shop", "cam.No-0.08", z=(1.0, 1.08), o=(70, 50), fx=[{"kind": "cctv", "at": "cam.No-0.08"}])
S("53_kit_face", "cam.Not-0.08", z=(1.0, 1.1), o=(50, 45))

# ───────────────────────── BEEP: "At 3:07 a.m., a beep wakes you. Access granted."
S("54_leo_wakes", "beep-0.08", z=(1.0, 1.1), o=(50, 50), fx=[{"kind": "clock", "x": 0.06, "y": 0.1, "min": 187, "at": "beep.3:07"}])
S("55_cctv_door_closed", "beep.a-0.08", z=(1.0, 1.1), o=(70, 45), fx=[{"kind": "cctv", "at": "beep.a-0.08"}, {"kind": "led", "x": 0.853, "y": 0.47, "at": "beep.Access", "r": 0.01}])
S("60_trio_stricken", "beep.end+0.05", z=(1.0, 1.08), o=(50, 50))

# ───────────────────────── DOOR: "On the monitor, the staff door swings open. Pressed against its reader by the crowd: the dead officer's badge, still on its lanyard."
S("56_cctv_door_open", "door.swings-0.08", z=(1.0, 1.08), o=(70, 45), hits=["door.swings"], fx=[{"kind": "cctv", "at": "door.swings-0.08"}])
S("57_badge_close", "door.Pressed-0.08", z=(1.0, 1.1), o=(50, 50), fx=[{"kind": "led", "x": 0.66, "y": 0.145, "at": "door.reader", "r": 0.012}])
S("58_officer_dead", "door.the#4-0.08", z=(1.0, 1.1), o=(50, 55), fx=[{"kind": "circle", "x": 0.572, "y": 0.64, "rx": 0.06, "at": "door.badge,", "label": "badge", "lx": 0.22, "ly": -0.2}])

# ───────────────────────── DONT: "The dead don't need to open doors. They just need a badge."
S("59_stairs_dead", "dont-0.08", z=(1.0, 1.1), o=(50, 60))
S("59b_first_step", "dont.They-0.08", z=(1.0, 1.1), o=(50, 60))

# ───────────────────────── THE END CARD: "Would you barricade the door, or climb for the roof? Part three: rigor. It doesn't last."
C({"kind": "cta", "question": ["WOULD YOU BARRICADE THE DOOR,", "OR CLIMB FOR THE ROOF?"], "hi": ["BARRICADE", "CLIMB"], "questionAt": "ask.Would", "questionTo": "ask.roof?+0.38",
   "options": [{"n": "1", "label": "BARRICADE", "sub": "THE DOOR", "icon": "door", "at": "ask.barricade"}, {"n": "2", "label": "CLIMB", "sub": "FOR THE ROOF", "icon": "up", "at": "ask.climb"}],
   "comment": "Comment 1 or 2", "commentAt": "ask.roof?+0.5", "partAt": "ask.Part-0.1", "part": "PART 3", "title": "RIGOR", "titleAt": "ask.rigor.", "partSub": "it doesn't last", "partSubAt": "ask.It",
   "img": "61_teaser", "bg": "59b_first_step", "followAt": "ask.end+0.1", "follow": "FOLLOW FOR PART 3"}, "ask-0.08")

# ───────────────────────── SOUND: one foley cue per action, a bed per place, no stingers, no beeps on graphics
h.snd(
    {"amb": "airport_hall", "from": 0, "to": "hook-0.2", "db": -9, "fo": 0.5},
    {"sfx": "burned_crowd", "at": "hook-0.1", "db": -10},
    {"amb": "bank", "from": "room-0.5", "to": "rule5a-0.1", "db": -6, "fi": 0.8, "fo": 1.0},
    {"sfx": "deadbolt", "at": "room.locks", "db": -5}, {"sfx": "rustle", "at": "room.hands", "db": -10},
    {"sfx": "phone_buzz", "at": "hook.Wi-Fi", "db": -12},
    {"sfx": "sirenfar", "at": "rule1b.South", "db": -16},
    {"sfx": "dial--three-oh-seven", "at": "busy.dial", "db": -8},
    {"sfx": "busy_tone", "at": "busy.A+0.2", "db": -9},
    {"sfx": "phone_lock", "at": "rule2b.dies", "db": -8},
    {"sfx": "coat", "at": "kit.Dani", "db": -10}, {"sfx": "paper", "at": "kit.a#2", "db": -10},
    {"sfx": "rustle", "at": "rule3.end-0.1", "db": -9}, {"sfx": "suitcase_tip", "at": "rule3.never", "db": -9},
    {"sfx": "groan_real", "at": "below.fill", "db": -12}, {"sfx": "shuffle", "at": "below.slow", "db": -10},
    {"sfx": "fridge", "at": "count", "db": -7}, {"sfx": "bottles", "at": "count.nine", "db": -8}, {"sfx": "paper", "at": "count.four", "db": -11},
    {"sfx": "tank_lid", "at": "rule4b-0.05", "db": -5}, {"sfx": "tap_run", "at": "rule4b.clean", "db": -14},
    {"sfx": "kettle_boil", "at": "rule4b.boil-0.2", "db": -8},
    {"amb": "wind_cold", "from": "night-0.3", "to": "night.Below,", "db": -12, "fi": 0.5, "fo": 0.6},
    {"sfx": "groan_real", "at": "night.faces", "db": -11},
    {"amb": "deep_hum", "from": "night.Below,", "to": "end", "db": -9, "fi": 0.8, "fo": 1.5},
    {"sfx": "blanket", "at": "rule5b", "db": -6}, {"sfx": "rustle", "at": "rule5b.jackets", "db": -10},
    {"sfx": "monitor_on", "at": "admit.switches", "db": -6},
    {"sfx": "breath--dq7", "at": "cam.The", "db": -14}, {"sfx": "girl_cry", "at": "cam.No", "db": -10},
    {"sfx": "badge_beep", "at": "beep.Access", "db": -5},
    {"sfx": "door_push", "at": "door.swings", "db": -6}, {"sfx": "groan_real", "at": "door.swings+0.4", "db": -9},
    {"amb": "stairwell", "from": "dont-0.3", "to": "ask.end", "db": -7, "fi": 0.5, "fo": 1.0},
    {"sfx": "shoes_stumble", "at": "dont.They", "db": -8}, {"sfx": "burned_crowd", "at": "dont.need", "db": -10},
    {"sfx": "pop", "at": "ask.barricade-0.05", "db": -10, "ui": True}, {"sfx": "pop", "at": "ask.climb-0.05", "db": -10, "ui": True},
    {"sfx": "pop", "at": "ask.roof?+0.5", "db": -10, "ui": True}, {"sfx": "paper--dq3", "at": "ask.Part+0.1", "db": -10, "ui": True}, {"sfx": "pop", "at": "ask.end+0.1", "db": -9, "ui": True},
)
for t0, n in (("door.swings", 4),):   # a subtle heartbeat (lub-dub every 0.9 s, -16 dB) under the door opening (no meter)
    for i in range(n): h.snd({"sfx": "heartbeat", "at": f"{t0}+{0.9 * i + 0.2:.2f}", "db": -17})

plan = {"slug": h.slug, "size": "16:9", "art": "art/flight2/raw", "tail": h.tail, "shots": h.shots, "sound": h.sound, "mix": ["--limit", "0.6"]}
json.dump(plan, open(Path(__file__).with_name("plan.json"), "w"), indent=1)
print(f"{h.slug}: {len(h.shots)} shots ({sum(1 for s in h.shots if 'img' in s)} pictures, {sum(1 for s in h.shots if 'card' in s)} cards) · {len(h.sound)} sound cues")
