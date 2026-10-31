"""hookkit.py — builds the HOOK card of a NOBODY CAME part (fast flat motion graphics + big centred words, src/kit/stills/hook.tsx).
    from hookkit import hook
    C(hook("nc1", ["hook", "hook2"], starts=["beside", "and"], hi=["WENT DOWN", "HIDDEN", "NOBODY"], items=[…], tint="#ff8a5c"), 0)
`words` come from the real voice (public/<slug>/vo/lines.json): one {w, at} per spoken word, `n` marks the first word of each phrase (`starts` = those words, in order);
items are the MG icons (hook.tsx: plane, warn, splash, island, radar, chart, eyes, cloud, messenger, boat, calendar, fish, moon, drop, tick, person, lagoon, wave, plate, counter, qmark, magnifier, pin …),
`at` / `at2` / `at3` / `outAt` are word anchors ("hook2.nobody"), `path` moves an item in segments."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())


def words(slug, ids, starts=()):
    d = {l["id"]: l for l in json.load(open(ROOT / f"public/{slug}/vo/lines.json"))}
    out, k = [], 0
    for lid in ids:
        for w in d[lid]["words"]:
            item = {"w": w["w"], "at": round(w["s"], 3)}
            if k < len(starts) and norm(w["w"]) == norm(starts[k]): item["n"] = True; k += 1
            out.append(item)
    assert k == len(starts), f"{slug}: phrase starts not all found: {starts[k:]}"
    return out


def hook(slug, ids, starts, hi, items, tint="#ff8a5c", bg=None, size=None, y=None):
    c = {"kind": "hook", "words": words(slug, ids, starts), "hi": hi, "items": items, "tint": tint}
    if bg: c["bg"] = bg
    if size: c["size"] = size
    if y: c["y"] = y
    return c
