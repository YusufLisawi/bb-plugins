#!/usr/bin/env python3
"""FLIGHT DELAYED · the three story openings (hooks) of Part 1. `python3 episodes/flighthooks/plans.py` writes
episodes/flighthook{A,B,C}/plan.json; scripts/stills_build.py <slug> turns each into public/<slug>/stills.json (anchors → seconds).

Each hook: ~12-20 s, crystal clear "ZOMBIE OUTBREAK" in the first 2 s, then WHO Leo is, where he is from and where he has landed
(Chicago → Seoul, South Korea), and it ends where the story flows into the passport queue. Round 2 rules applied here:
  * on-screen text = the narrator's own words (or one keyword of them): ZOMBIE OUTBREAK, LEO · 27 · CHICAGO, CHICAGO → SEOUL · SOUTH KOREA, 20 MINUTES AGO,
    EXIT, PASSPORT DESK. The Korean on the signs is real signage (in-world), not a label.
  * a highlight draws on slowly, stays >= 1.5 s, and only points at what teaches; no clocks, no BPM, no counters nobody says.
Art coordinates: frame_x = art_x / 1536, frame_y = (art_y - 80) / 864.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
fx_ = lambda x: round(x / 1536, 4)
fy_ = lambda y: round((y - 80) / 864, 4)

# the four blank rectangles of the big blue sign in 05_sign (art px): x 716..1222; rows top..bottom
SIGN = [(160, 216, "출구"), (230, 290, "입국심사"), (307, 366, "수하물"), (380, 440, "계단")]   # exit · immigration · baggage claim · stairs (Korean only: Leo can't read it)
def sign_rows(at_first, step, anchors=None):
    """the four Korean sign rows type themselves: one per anchor (the narrator's words) or `step` seconds apart from `at_first`"""
    return [{"kind": "signtext", "x": fx_(716), "y": fy_(t), "w": round((1222 - 716) / 1536, 4), "h": round((b - t) / 864, 4), "text": txt, "ko": True, "at": (anchors[i] if anchors else f"{at_first}+{i * step:.2f}"), "cps": 5} for i, (t, b, txt) in enumerate(SIGN)]


class Hook:
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
    def snd(self, *cues): self.sound += list(cues)
    def write(self):
        plan = {"slug": self.slug, "size": "16:9", "art": "art/flight1v2/raw", "tail": self.tail, "shots": self.shots, "sound": self.sound, "mix": ["--limit", "0.6"]}
        json.dump(plan, open(ROOT / f"episodes/{self.slug}/plan.json", "w"), indent=1)
        print(f"{self.slug}: {len(self.shots)} shots ({sum(1 for s in self.shots if 'img' in s)} pictures, {sum(1 for s in self.shots if 'card' in s)} cards) · {len(self.sound)} sound cues")


STAMP = {"kind": "stamp", "text": "ZOMBIE OUTBREAK", "rot": -7, "size": 0.075}
LEO_TAG = lambda at, sub_at, sub="27": {"kind": "tag", "x": 0.2, "y": 0.2, "text": "LEO", "sub": sub, "subAt": sub_at, "tx": 0.46, "ty": 0.3, "at": at}   # the narrator says "Leo, twenty-seven": the tag says LEO · 27 (Chicago comes with the flight card)

# ───────────────────────────────────────────── the hook BODIES: shots + sound up to the moment the story flows into the passport queue.
# Each body takes a recorder `h` (Hook) and `end` = the anchor its ambience bed runs to ("end" in the hook clip, "queue.Your" in the film).
def body_A(h, end="end"):
    # "A zombie outbreak starts in an airport where you can't read a single sign. What do you do? You're Leo, twenty-seven, from Chicago, and you just landed in Seoul, South Korea."
    h.S("h01_zombie", 0, z=(1.0, 1.1), o=(50, 40), hits=["q.zombie"], fx=[dict(STAMP, x=0.785, y=0.17, size=0.066, at="q.zombie")])      # the zombie in the first frame; the stamp lands ON the word
    h.S("05_sign", "q.in", z=(1.0, 1.07), o=(60, 25), fx=sign_rows("q.where", 0.45, ["q.where", "q.read", "q.single", "q.sign"]))                                                         # "where you can't read a single sign": the Korean sign writes itself, one row a beat
    h.S("24_turn", "q.What-0.05", z=(1.0, 1.12), o=(62, 62), fx=[{"kind": "tag", "x": 0.86, "y": 0.64, "text": "YOU", "tx": 0.685, "ty": 0.52, "at": "q.you#2", "maxW": 0.14}])   # "What do you do?"
    h.S("h02_leo_walk", "who-0.08", z=(1.0, 1.08), o=(50, 45), fx=[LEO_TAG("who.Leo,", "who.twenty-seven,")])
    h.C({"kind": "flight", "fromLabel": "CHICAGO", "toLabel": "SEOUL", "sub": "SOUTH KOREA", "fromAt": "who.Chicago,", "flyAt": "who.Chicago,", "toAt": "who.Seoul,", "subAt": "who.South"}, "who.from-0.05")
    h.snd({"amb": "panic_hall", "from": 0, "to": "who-0.3", "db": -9, "fo": 1.2}, {"sfx": "groan_real", "at": 0.15, "db": -6}, {"sfx": "stamp--cobra-effect", "at": "q.zombie", "db": -7},
          {"amb": "airport_hall", "from": "who-0.6", "to": end, "db": -7, "fi": 1.0, "fo": 1.0}, {"sfx": "touchdown_out", "at": "who.landed", "db": -8})

def body_B(h, end="end"):
    # "A zombie just bit the passport officer, and you're standing right there. Twenty minutes ago, you landed in Seoul, South Korea. You're Leo, twenty-seven, from Chicago, and you don't speak a word of Korean."
    h.S("18_bite", 0, z=(1.12, 1.0), o=(50, 65), hits=["bite.bit"], fx=[
        {"kind": "tag", "x": 0.2, "y": 0.2, "text": "ZOMBIE", "tx": 0.37, "ty": 0.47, "at": "bite.zombie", "maxW": 0.2},
        {"kind": "burst", "at": "bite.bit", "x": 0.446, "y": 0.653, "s": 0.8}, {"kind": "flash", "at": "bite.bit", "col": "#ff3b30"}])
    h.S("h01_zombie", "bite.and-0.1", z=(1.0, 1.16), o=(50, 42))                                                                            # "and you're standing right there": the zombie reaches for the camera = for you
    h.C({"kind": "ago", "text": "20 MINUTES AGO", "sub": "SEOUL, SOUTH KOREA", "spinAt": "ago.Twenty", "typeAt": "ago.Twenty+0.1", "subAt": "ago.Seoul,"}, "ago.Twenty-0.1")
    h.S("h02_leo_walk", "ago.You're-0.2", z=(1.0, 1.08), o=(50, 45), fx=[LEO_TAG("ago.Leo,", "ago.twenty-seven,", "27 · CHICAGO")])
    h.S("05_sign", "ago.and-0.1", z=(1.0, 1.07), o=(60, 25), fx=sign_rows("ago.and", 0.45))                                                  # "you don't speak a word of Korean": the sign you cannot read
    h.snd({"sfx": "bite_struggle", "at": "bite.bit-0.05", "db": -3}, {"sfx": "breath_fast", "at": "bite.bit+0.5", "db": -11},
          {"amb": "panic_hall", "from": 0, "to": "ago.Twenty", "db": -9, "fo": 0.8}, {"sfx": "gasp", "at": "bite.you're", "db": -8},
          {"sfx": "cabin_landing", "at": "ago.landed", "db": -9}, {"sfx": "touchdown_out", "at": "ago.landed+0.2", "db": -9},
          {"amb": "airport_hall", "from": "ago.You're-0.5", "to": end, "db": -7, "fi": 1.0, "fo": 1.0})

def body_C(h, end="end"):
    # "In a zombie outbreak an airport is the worst place to be: glass walls, strangers everywhere, and every exit behind a passport desk. You're Leo, twenty-seven, from Chicago, and you just landed in Seoul, where you don't speak a word of Korean."
    h.S("26_exit", 0, z=(1.0, 1.1), o=(30, 60), hits=["trap.zombie"], fx=[dict(STAMP, x=0.58, y=0.2, at="trap.zombie")])
    h.S("01_hook", "trap.an-0.1", z=(1.0, 1.1), o=(45, 60))                                                                                  # "an airport is the worst place to be"
    h.S("02_glass", "trap.glass-0.12", z=(1.0, 1.12), o=(38, 40), fx=[{"kind": "crack", "x": 0.3, "y": 0.34, "at": "trap.glass+0.05", "len": 0.62}])   # "glass walls": the glass cracks
    h.S("08_line", "trap.strangers-0.15", z=(1.0, 1.12), o=(35, 72))                                                                         # "strangers everywhere"
    h.C({"kind": "plan", "floor": [0.12, 0.2, 0.76, 0.7],
         "walls": [{"pts": [[0.12, 0.2], [0.88, 0.2], [0.88, 0.9], [0.12, 0.9], [0.12, 0.2]], "w": 12}],
         "boxes": [{"x": 0.14 + i * 0.125, "y": 0.5, "w": 0.1, "h": 0.07, "fill": "#cfc3a3", "at": 0.3 + i * 0.1} for i in range(6)],
         "crowd": [{"n": 70, "from": [0.16, 0.66, 0.68, 0.2], "to": [0.5, 0.56], "at": 0.4, "speed": 0.2}],
         "marks": [{"kind": "exit", "x": 0.5, "y": 0.2, "at": "trap.exit", "col": "#58b368"}, {"kind": "x", "x": 0.5, "y": 0.535, "at": "trap.desk."}],
         "paths": [{"pts": [[0.5, 0.66], [0.5, 0.5], [0.5, 0.3]], "col": "#e8372c", "at": "trap.exit+0.3", "dur": 1.1, "dash": True, "arrow": True, "w": 9}],
         "texts": [{"x": 0.5, "y": 0.125, "text": "EXIT", "at": "trap.exit", "size": 0.045}, {"x": 0.86, "y": 0.47, "text": "PASSPORT DESK", "at": "trap.passport", "size": 0.032, "anchor": "end"}]}, "trap.and-0.05")
    h.S("h02_leo_walk", "who-0.08", z=(1.0, 1.08), o=(50, 45), fx=[LEO_TAG("who.Leo,", "who.twenty-seven,")])
    h.C({"kind": "flight", "fromLabel": "CHICAGO", "toLabel": "SEOUL", "fromAt": "who.Chicago,", "flyAt": "who.Chicago,", "toAt": "who.Seoul,"}, "who.from-0.05")
    h.S("05_sign", "who.where-0.05", z=(1.0, 1.07), o=(60, 25), fx=sign_rows("who.where", 0.5))
    h.snd({"amb": "panic_hall", "from": 0, "to": "trap.an", "db": -7, "fo": 0.8}, {"sfx": "glass_doors", "at": 0.2, "db": -9}, {"sfx": "stamp--cobra-effect", "at": "trap.zombie", "db": -7},
          {"amb": "airport_hall", "from": "trap.an-0.4", "to": end, "db": -7, "fi": 1.0, "fo": 1.0}, {"sfx": "brick_glass", "at": "trap.glass", "db": -8}, {"sfx": "touchdown_out", "at": "who.Seoul,-0.9", "db": -9})

BODIES = {"A": body_A, "B": body_B, "C": body_C}

def hook_clip(x):
    """the stand-alone hook clip: its body + one closing shot into the passport queue"""
    h = Hook(f"flighthook{x}", tail=2.0)
    BODIES[x](h)
    last = {"A": ("08_line", "who.end+0.8"), "B": ("08_line", "ago.end+0.8"), "C": ("09_ten", "who.end+0.9")}[x]
    h.S(last[0], last[1], z=(1.0, 1.1), o=(35, 72) if last[0] == "08_line" else (62, 48))
    return h

if __name__ == "__main__":
    for x in "ABC": hook_clip(x).write()
