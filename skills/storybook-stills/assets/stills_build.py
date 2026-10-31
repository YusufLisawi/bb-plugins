#!/usr/bin/env python3
"""stills_build.py <slug> [--no-mix] [--sheet] — build a STORYBOOK STILLS episode from episodes/<slug>/plan.json.

Needs the voice first (scripts/voice.py <slug> → public/<slug>/vo/lines.json, vo.wav). Then:
  1. resolves every time ANCHOR in the plan to seconds (shot starts, hits, fx "at"/"failAt", sound "at"/"from"/"to"):
       3.2            seconds
       "crash"        the start of line `crash`        "crash.end"  its last word's end
       "crash.door"   the first word "door" in that line (case/punctuation ignored)   "crash.door#2"  the 2nd one
       "end"          the end of the film               any anchor + "+0.3" / "-0.2"  an offset
  2. crops the art (plan "art", default art/<slug>/raw/*.png) to the frame → public/<slug>/<name>.jpg (props: prop_*.png are
     copied as transparent PNGs if they exist in <art>/../props or are referenced with a .png src)
  3. writes public/<slug>/stills.json (the engine's data: src/kit/stills/Stills.tsx)
  4. writes public/<slug>/sound.json from the plan's "sound" list, fetches the library sounds, runs scripts/mix.py
  5. --sheet: a contact sheet of every shot's picture in order → /tmp/stills-<slug>.jpg
Shots without "z"/"o" get a varied camera move from a preset cycle, so no two cuts in a row move the same way."""
import json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
slug = sys.argv[1]
plan = json.load(open(ROOT / f"episodes/{slug}/plan.json"))
lines = json.load(open(ROOT / f"public/{slug}/vo/lines.json"))
L = {l["id"]: l for l in lines}
last = max(w["e"] for l in lines for w in l["words"])
import math
_frames = math.ceil((last + plan.get("tail", 2.0)) * 30 - 1e-6)
DUR = round((_frames - 0.02) / 30, 4)   # a whole number of frames (ceil(DUR * 30) == _frames exactly): the render farm joins whole chunks and fails on "joined N frames, expected N+1" when the duration is fractional
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())

def at(a):
    """an anchor → seconds"""
    if isinstance(a, (int, float)): return float(a)
    m = re.match(r"^(.+?)([+\-][0-9]+(?:\.[0-9]+)?)?$", a.strip())   # base may contain hyphens ("twenty-seven,"); only a trailing +0.3 / -0.2 is an offset
    base, off = m.group(1), float(m.group(2) or 0)
    if base == "end": return DUR + off
    lid, _, word = base.partition(".")
    if lid not in L: raise SystemExit(f"anchor {a!r}: no line {lid!r} (lines: {', '.join(L)})")
    ws = L[lid]["words"]
    if not word: return ws[0]["s"] + off
    if word == "end": return ws[-1]["e"] + off
    w, _, nth = word.partition("#"); nth = int(nth or 1)
    hits = [x for x in ws if norm(x["w"]) == norm(w)]
    if len(hits) < nth: raise SystemExit(f"anchor {a!r}: word {w!r} #{nth} not in line {lid!r}: {' '.join(x['w'] for x in ws)}")
    return hits[nth - 1]["s"] + off

TIME_KEYS = ("at", "failAt", "from", "to", "thenAt", "strike", "commentAt", "partAt", "hookAt", "followAt", "subAt", "fromAt", "flyAt", "toAt", "spinAt", "typeAt", "nAt", "titleAt", "titleTo", "textAt", "textTo", "clockAt", "nameAt", "armsAt", "breatheAt", "questionAt", "questionTo", "zoneAt", "t0", "t1", "labelAt", "partSubAt", "tickAt", "titleAt", "sub2At", "end", "labelEnd", "picAt", "routeAt", "stormAt", "divertAt", "signalAt", "searchAt", "crashAt", "dieAt", "callAt", "routeAt", "enAt", "stiffAt", "offAt", "noteAt", "timeAt", "tickAt", "lowAt", "pressAt", "deadAt", "at2", "at3", "outAt")   # any of these holding a string / number is an anchor → seconds
def resolve(o, rel=0.0):
    """anchors → seconds; `rel` > 0 makes string anchors RELATIVE to a card start (the plan card animates on its own local clock: its items use seconds since the card began)"""
    if isinstance(o, dict): return {k: ((at(v) - (rel if isinstance(v, str) else 0.0)) if k in TIME_KEYS and isinstance(v, (str, int, float)) else [at(x) for x in v] if k == "hits" else [at(x) - (rel if isinstance(x, str) else 0.0) for x in v] if k == "ats" else resolve(v, rel)) for k, v in o.items()}
    if isinstance(o, list): return [resolve(x, rel) for x in o]
    return o

# camera presets: push in, pull out, drift left/right, rise; cycled so consecutive cuts differ
PRESETS = [{"z": [1.0, 1.07], "o": [50, 55]}, {"z": [1.08, 1.02], "o": [45, 50]}, {"z": [1.04, 1.1], "o": [62, 55]},
           {"z": [1.06, 1.06], "o": [50, 50], "x": [0.015, -0.015]}, {"z": [1.02, 1.08], "o": [38, 60]}, {"z": [1.06, 1.06], "o": [50, 50], "y": [0.015, -0.01]}]

def lower_text(f):
    """owner rule (2026-10-31): no text parked at the top of the frame. Text over a picture (tags, speech bubbles, stamps, counters, captions) that a plan placed in the top third sits in the lower-middle
    safe area instead; a tag's pointer line and a bubble's tail still reach up to their target (tx, ty)."""
    k, y = f.get("kind"), f.get("y")
    if y is None: return f
    clamp = lambda v, a, b: max(a, min(b, v))
    if k == "tag" and y < 0.3: return {**f, "y": round(clamp(f.get("ty", 0.5) + 0.22, 0.6, 0.86), 3)}
    if k == "say" and y < 0.3: return {**f, "y": round(clamp(f.get("ty", 0.4) + 0.27, 0.64, 0.84), 3)}
    if k in ("stamp", "counter", "count") and y < 0.3: return {**f, "y": 0.78}
    if k == "caption" and y < 0.45: return {**f, "y": 0.82}
    return f

shots, starts = [], [at(s.get("at", 0)) for s in plan["shots"]]
for i, s in enumerate(plan["shots"]):
    t0, t1 = round(starts[i], 3), round(starts[i + 1] if i + 1 < len(starts) else DUR, 3)
    if t1 <= t0: raise SystemExit(f"shot {i} ({s.get('img') or s.get('card', {}).get('kind')}) starts at {t0:.2f}s, not before the next one ({t1:.2f}s)")
    card = s.get("card", {}); rel = t0 - card.get("skip", 0.0) if card.get("kind") in ("plan", "guard", "gauge", "passport") else 0.0   # these cards run on their own clock (seconds since the card began, + skip): string anchors become card-relative
    r = {k: v for k, v in resolve(s, rel).items() if k not in ("at", "note")}
    if r.get("fx"): r["fx"] = [lower_text(f) for f in r["fx"]]
    if "z" not in r and "card" not in r: r = {**PRESETS[i % len(PRESETS)], **r}
    r.setdefault("z", [1, 1]); r.setdefault("o", [50, 50])
    shots.append({"t0": t0, "t1": t1, **r})

# the pictures: crop the 3:2 art to the frame
W, H = (1920, 1080) if plan.get("size", "16:9") == "16:9" else (1080, 1920)
art = ROOT / plan.get("art", f"art/{slug}/raw")
pub = ROOT / f"public/{slug}"; pub.mkdir(parents=True, exist_ok=True)
need = sorted({s["img"] for s in shots if s.get("img")} | {s["card"][k] for s in shots for k in ("bg", "img") if s.get("card", {}).get(k)})
missing = [n for n in need if not (art / f"{n}.png").exists() and not (art / f"{n}.jpg").exists()]
if missing and "--placeholders" not in sys.argv: raise SystemExit(f"missing art in {art}: {', '.join(missing)}  (--placeholders builds a grey stand-in frame for them, to check the timing before the art is done)")
for n in need:
    if n in missing:   # a stand-in frame (replaced automatically once the real picture exists and is newer)
        from PIL import Image, ImageDraw
        im = Image.new("RGB", (W, H), (58, 62, 74)); d = ImageDraw.Draw(im); d.rectangle([40, 40, W - 40, H - 40], outline=(255, 230, 120), width=6); d.text((W // 2 - 60, H // 2), n, fill=(255, 230, 120))
        im.save(pub / f"{n}.jpg", quality=80); (pub / f"{n}.ph").touch(); continue   # the .ph marker: a stand-in, replaced as soon as the real picture exists (whatever the file times say)
    src = art / f"{n}.png" if (art / f"{n}.png").exists() else art / f"{n}.jpg"
    dst = pub / f"{n}.jpg"
    ph = pub / f"{n}.ph"
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime and not ph.exists(): continue
    ph.unlink(missing_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(src), "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}", "-q:v", "2", str(dst)], check=True)
hud = [resolve(h) for h in plan.get("hud", [])]   # screen-space overlays {"fx": {...}, "from": a, "to": b} (a heartbeat meter, a clock): not moved by the camera
json.dump({"slug": slug, "dur": DUR, "shots": shots, "fadeOut": plan.get("fadeOut", 0.9), **({"hud": hud} if hud else {})}, open(pub / "stills.json", "w"), indent=1)
print(f"{slug}: {len(shots)} shots · {DUR:.1f}s · {len(need)} pictures → public/{slug}/stills.json")

# the sound: one cue per action (library first), beds per place
if plan.get("sound") and "--no-mix" not in sys.argv:
    from find_sfx import fetch, load
    lib = {x["name"]: x for x in load()}
    cues = []
    for c in plan["sound"]:
        if "amb" in c:
            t0, t1 = at(c.get("from", 0)), at(c.get("to", "end"))
            cues.append({"t": round(t0, 3), "sfx": c["amb"], "kind": "amb", "db": c.get("db", -14), "dur": round(t1 - t0, 3), "fi": c.get("fi", 0.4), "fo": c.get("fo", 0.6)})
        else:   # one cue per action; "ui": true → a soft UI tick (kind ui, never ducked); optional pan / pan2 (-1 left … 1 right) / align "peak"
            cue = {"t": round(at(c["at"]), 3), "sfx": c["sfx"], "kind": "ui" if c.get("ui") else "fx", "db": c.get("db", -8)}
            cue.update({k: c[k] for k in ("pan", "pan2", "align", "note") if k in c})
            cues.append(cue)
    sd = pub / "sfx"; sd.mkdir(exist_ok=True)
    for n in sorted({c["sfx"] for c in cues}):
        f = sd / f"{n}.mp3"
        if f.exists(): continue
        if n not in lib: raise SystemExit(f"sound {n!r} is not in the library and not in public/{slug}/sfx/ (search: scripts/find_sfx.py <words>; generate: scripts/sfx.py with ElevenLabs)")
        f.write_bytes(fetch(lib[n]["url"]))
    json.dump({"cues": cues, "music": None, "meta": {"duration": DUR, "slug": slug}}, open(pub / "sound.json", "w"))
    subprocess.run([str(ROOT / ".venv/bin/python"), str(ROOT / "scripts/mix.py"), slug, *map(str, plan.get("mix", []))], check=True)   # plan "mix": ["--limit", "0.5"] = a peak limiter ahead of loudnorm for sparse, hot mixes

if "--sheet" in sys.argv:
    imgs = [str(pub / f"{s['img']}.jpg") for s in shots if s.get("img")]
    cols = 4; args = sum([["-i", p] for p in imgs], [])
    f = "".join(f"[{i}]scale=480:-2[p{i}];" for i in range(len(imgs))) + "".join(f"[p{i}]" for i in range(len(imgs))) + f"xstack=inputs={len(imgs)}:layout=" + "|".join(f"{(i % cols) * 480}_{(i // cols) * (480 * H // W)}" for i in range(len(imgs)))
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *args, "-filter_complex", f, "-frames:v", "1", f"/tmp/stills-{slug}.jpg"], check=True)
    print(f"sheet /tmp/stills-{slug}.jpg")
