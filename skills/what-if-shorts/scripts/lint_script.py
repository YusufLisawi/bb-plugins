#!/usr/bin/env python3
"""lint_script.py — check a what-if-shorts script (and optionally its shot plan) against the format.

  lint_script.py episodes/<slug>/script.tsv --engine survival
  lint_script.py episodes/<slug>/script.tsv --engine survival --shots episodes/<slug>/shots.tsv
  lint_script.py episodes/<slug>/script.tsv --engine survival --shots … --lines public/<slug>/vo/lines.json

script.tsv rows: id ⇥ speaker ⇥ text ⇥ air [⇥ kw]   (blank and '#' lines are skipped; N = narrator)
shots.tsv rows:  id ⇥ line ⇥ word ⇥ frac ⇥ type ⇥ what ⇥ devices   (line END + word = seconds after the last word)

Without --lines the timeline is estimated from the engine's pace; with --lines (after voice.py) it is measured.
Prints ERROR / WARN / INFO lines and a summary; exit 1 on any ERROR. Pure standard library.
"""
import argparse, json, re, sys
from pathlib import Path

ENGINES = {
    # words, lines, mean words/line, mean shot (s), shots, max shot (s), pace (w/s while speaking), film (s), tail (s)
    "survival":   dict(words=(150, 205), lines=(13, 22), mean=(8, 13),  shot=(1.4, 1.9), shots=(32, 46), max_shot=3.4, pace=3.2, film=(55, 75), tail=2.7, story=True),
    "sequel":     dict(words=(150, 215), lines=(14, 28), mean=(5, 12),  shot=(1.5, 2.4), shots=(28, 46), max_shot=3.4, pace=3.0, film=(55, 75), tail=2.0, story=True),
    "build":      dict(words=(150, 210), lines=(14, 26), mean=(6, 12),  shot=(1.9, 2.6), shots=(24, 38), max_shot=3.6, pace=3.0, film=(55, 75), tail=1.5, story=True),
    "scale":      dict(words=(45, 130),  lines=(7, 18),  mean=(3, 9),   shot=(2.0, 62), shots=(1, 16),  max_shot=62,  pace=2.6, film=(50, 66), tail=1.5, story=False),
    "zoom":       dict(words=(90, 160),  lines=(12, 26), mean=(3, 9),   shot=(2.0, 62), shots=(1, 12),  max_shot=62,  pace=2.8, film=(50, 66), tail=1.5, story=False),
    "pov":        dict(words=(120, 190), lines=(14, 30), mean=(3, 10),  shot=(2.5, 4.0), shots=(14, 28), max_shot=5.0, pace=2.8, film=(55, 75), tail=1.5, story=True),
    "experiment": dict(words=(150, 205), lines=(14, 24), mean=(6, 12),  shot=(1.8, 2.4), shots=(26, 40), max_shot=3.2, pace=3.1, film=(55, 75), tail=2.0, story=True),
}
SHOT_TYPES = {"acting", "closeup", "ots", "insert", "map", "diagram", "card", "slam", "threat", "inventory", "journey", "end"}
FILLER = ["in this video", "let's dive", "lets dive", "did you know", "here's the thing", "make sure to follow", "like and subscribe",
          "stay tuned", "without further ado", "smash that", "don't forget to", "in today's video", "hey guys", "what's up guys",
          "follow for more", "comment below", "link in bio"]
WEAK_OPENERS = ["and then", "also,", "also ", "next,", "next up", "moving on", "another thing", "additionally", "furthermore",
                "basically", "so basically", "now let's", "let's ", "let us "]
CONNECTORS = ["but", "so", "instead", "no", "first", "then", "now", "on paper", "without", "there", "and", "when", "even",
              "until", "because", "after", "that", "if", "or", "yet", "still", "except", "every", "people said", "in real life"]
PLACEHOLDER = re.compile(r"<|>|\bTODO\b|\bTBD\b|\[write|XXX")
TAG = re.compile(r"\[[^\]]*\]")
NUMWORDS = {"one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "twenty", "thirty",
            "forty", "fifty", "hundred", "hundreds", "thousand", "thousands", "million", "millions", "billion", "billions"}
EASY_LONG = {"apocalypse", "electricity", "everything", "everyone", "everybody", "absolutely", "impossible", "observable", "universe",
             "anybody", "anything", "actually", "probably", "generator", "already", "underground", "another", "hospital",
             "emergency", "everywhere", "different", "dangerous", "elevator", "information", "america", "american", "animals",
             "anyone", "nobody", "together", "history", "galaxy", "computer", "telephone", "vegetables", "experiment"}


def words_of(text):
    return TAG.sub("", text).split()


def syllables(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


def is_num(w):
    t = re.sub(r"[^a-z0-9]", "", w.lower())
    return bool(t) and (t[0].isdigit() or t in NUMWORDS)


def read_script(path):
    rows = []
    for k, ln in enumerate(open(path, encoding="utf-8"), 1):
        if not ln.strip() or ln.lstrip().startswith("#"):
            continue
        p = ln.rstrip("\n").split("\t")
        if len(p) < 3:
            rows.append({"lineno": k, "bad": True, "raw": ln.rstrip("\n")})
            continue
        rows.append({"lineno": k, "id": p[0].strip(), "speaker": p[1].strip(), "text": p[2].strip(),
                     "air": p[3].strip() if len(p) > 3 else "", "kw": p[4].strip() if len(p) > 4 else "",
                     "words": words_of(p[2])})
    return rows


def read_shots(path):
    rows = []
    for k, ln in enumerate(open(path, encoding="utf-8"), 1):
        if not ln.strip() or ln.lstrip().startswith("#"):
            continue
        p = ln.rstrip("\n").split("\t")
        if p[0].strip() == "id":
            continue
        p += [""] * (7 - len(p))
        rows.append({"lineno": k, "id": p[0].strip(), "line": p[1].strip(), "word": p[2].strip(), "frac": p[3].strip(),
                     "type": p[4].strip(), "what": p[5].strip(), "devices": p[6].strip()})
    return rows


def timeline(rows, pace, lines_json=None):
    """{line id: [(start, end) per word]} — measured from lines.json or estimated from the pace."""
    if lines_json:
        L = json.load(open(lines_json))
        return {l["id"]: [(w["s"], w["e"]) for w in l["words"]] for l in L}, L[-1]["end"]
    tl, t = {}, 0.23
    for r in rows:
        if r.get("bad"):
            continue
        n = max(1, len(r["words"]))
        d = n / pace
        tl[r["id"]] = [(t + i * d / n, t + (i + 0.85) * d / n) for i in range(n)]
        t += d
        air = r["air"]
        t += (float(air[1:]) if air.startswith("+") else 0.0) + (float(air) if air and not air.startswith("+") else 0.32)
    return tl, t - 0.32


def cut_time(tl, order, line, i, frac):
    ws = tl[line]
    s = ws[i][0]
    if i + 1 < len(ws):
        nxt = ws[i + 1][0]
    else:
        k = order.index(line)
        nxt = tl[order[k + 1]][0][0] if k + 1 < len(order) else ws[i][1] + 0.4
    return s + frac * (nxt - s)


class Report:
    def __init__(self):
        self.items = []

    def e(self, m): self.items.append(("ERROR", m))
    def w(self, m): self.items.append(("WARN", m))
    def i(self, m): self.items.append(("INFO", m))

    @property
    def errors(self): return [m for k, m in self.items if k == "ERROR"]


def lint_script(rows, engine, R, lines_json=None):
    E = ENGINES[engine]
    good = [r for r in rows if not r.get("bad")]
    for r in rows:
        if r.get("bad"):
            R.e(f"line {r['lineno']}: needs id ⇥ speaker ⇥ text (got {r['raw'][:60]!r})")
    ids = [r["id"] for r in good]
    for d in sorted({x for x in ids if ids.count(x) > 1}):
        R.e(f"duplicate line id {d!r}")
    for r in good:
        if not re.fullmatch(r"[a-z][A-Za-z0-9]*", r["id"]):
            R.e(f"line id {r['id']!r}: use camelCase letters/digits (it becomes a TypeScript key)")
        if PLACEHOLDER.search(r["text"]):
            R.e(f"{r['id']}: placeholder text left: {r['text'][:70]!r}")
        low = r["text"].lower()
        for f in FILLER:
            if f in low:
                R.e(f"{r['id']}: filler/meta phrase {f!r} — cut it")
        if r["air"] and not re.fullmatch(r"\+?\d+(\.\d+)?", r["air"]):
            R.e(f"{r['id']}: air must be blank, a number, or +hold (got {r['air']!r})")
    if not good:
        R.e("no lines")
        return None
    narr = [r for r in good if r["speaker"] == "N"]
    cast = [r for r in good if r["speaker"] != "N"]
    nw = [len(r["words"]) for r in good]
    total = sum(nw)
    tl, last_end = timeline(good, E["pace"], lines_json)
    film = last_end + E["tail"]
    # length and size
    lo, hi = E["words"]
    (R.e if total > hi * 1.15 else R.w)(f"{total} words (engine target {lo}–{hi})") if not lo <= total <= hi else None
    lo, hi = E["lines"]
    if not lo <= len(good) <= hi:
        R.w(f"{len(good)} lines (engine target {lo}–{hi})")
    mean = total / len(good)
    lo, hi = E["mean"]
    if not lo <= mean <= hi:
        R.w(f"mean {mean:.1f} words per line (target {lo}–{hi})")
    flo, fhi = E["film"]
    if film > 75:
        R.e(f"film ≈ {film:.1f} s > 75 s (owner rule: short) — cut words, never speed the voice up")
    elif not flo <= film <= fhi:
        R.w(f"film ≈ {film:.1f} s (engine target {flo}–{fhi} s)")
    for r, n in zip(good, nw):
        if n > 24:
            R.e(f"{r['id']}: {n} words — split it (≤ 18)")
        elif n > 20:
            R.w(f"{r['id']}: {n} words — long; ≤ 18 reads better")
    # hook
    h = good[0]
    hn = len(h["words"])
    if hn > 20:
        R.e(f"hook ({h['id']}) is {hn} words — ≤ 16")
    elif hn > 16:
        R.w(f"hook ({h['id']}) is {hn} words — ≤ 16 is the target")
    ht = h["text"].lower()
    first2 = " ".join(r["text"].lower() for r in good[:2])
    checks = {
        "survival": (ht.startswith("if ") and re.search(r"\b(do not|don't|never|dont)\b", ht), 'survival hook: "If [event] starts while you\'re [place], do not [instinct]."'),
        "build": (ht.startswith("if you") or ht.startswith("how "), 'build hook: "If you [naive version], you have a [goal]."'),
        "scale": (ht.startswith("what if") and ht.rstrip().endswith("?") and any(is_num(w) for w in h["words"]), 'scale hook: "What if you [repeated action] [N] times?"'),
        "zoom": (ht.startswith("what if") and "zoom" in ht, 'zoom hook: "What if you zoomed in until [everyday thing] [touched]?"'),
        "pov": (re.search(r"\byou(r)?\b", first2) is not None, 'POV: "you" must appear in the first two lines'),
        "experiment": (re.search(r"every (day|night|week|morning)|for a (month|week|year)|\d+ days", ht) is not None, 'experiment hook: "This guy [does odd thing] every day for a month."'),
        "sequel": (not re.search(r"\bpart (one|two|three|four|five|\d)\b", ht) and "apocalypse on a" not in ht, "sequel: open on the recap-hook, never on the series name or 'Part N' (owner rule)"),
    }
    ok, msg = checks[engine]
    if not ok:
        R.w(f"hook pattern: {msg}")
    for r in good:
        if re.search(r"\bpart (one|two|three|four|five|\d)\b", r["text"].lower()):
            R.w(f"{r['id']}: says a part number — the end card can show PART N; the voice never says the series/part (owner)")
    # line shape: punches and connectors
    if E["story"]:
        run = 0
        for r, n in zip(good, nw):
            run = run + 1 if n >= 10 else 0
            if run == 5:
                R.w(f"{r['id']}: 5 long lines (≥ 10 words) in a row — add a 2–7-word punch line (farm: at most 4)")
        punches = sum(1 for n in nw if n <= 7)
        if punches < len(good) / 4:
            R.w(f"only {punches} punch lines (≤ 7 words) in {len(good)} — the format alternates long and short")
    for r in good[1:]:
        lt = r["text"].lower().lstrip("\"'“")
        for wo in WEAK_OPENERS:
            if lt.startswith(wo):
                R.w(f"{r['id']}: weak opener {wo.strip()!r} — use a logic connector (But / So / Instead / First / No, …)")
    conn = sum(1 for r in good[1:] if any(r["text"].lower().startswith(c + " ") or r["text"].lower().startswith(c + ",") for c in CONNECTORS))
    if E["story"] and conn < 3:
        R.w(f"only {conn} lines start with a connector (But/So/Instead/First/No, …) — the spine is the But/So rule")
    # numbers
    for r in good:
        nums = sum(1 for w in r["words"] if is_num(w))
        if nums > 2 and r["text"].count(",") < 2:
            R.w(f"{r['id']}: {nums} numbers in one line — keep ≤ 1 unless it's a list")
    # words: grade + long words
    sents = max(1, len(re.findall(r"[.!?…]+", " ".join(r["text"] for r in good))))
    syl = sum(syllables(w) for r in good for w in r["words"])
    grade = 0.39 * (total / sents) + 11.8 * (syl / max(1, total)) - 15.59
    long = sorted({re.sub(r"[^a-z']", "", w.lower()) for r in good for w in r["words"]
                   if syllables(w) >= 4 and re.sub(r"[^a-z']", "", w.lower()) not in EASY_LONG})
    if grade > 6.0:
        R.w(f"reading grade ≈ {grade:.1f} (target ≤ 5: very easy English) — shorter sentences, smaller words")
    if len(long) > 5:
        R.w(f"{len(long)} long words: {', '.join(long[:10])} — at most one technical word, explained in the same line")
    # tags, cast, holds
    if any(TAG.search(r["text"]) for r in narr):
        R.w("narrator lines carry [tags] — Fish drags with tags (2.35–2.6 w/s); strip them (cast.json \"tags\": \"strip\")")
    if len(cast) > 6:
        R.w(f"{len(cast)} cast lines — ≤ 6 per film")
    for r in cast:
        if len(r["words"]) > 8:
            R.w(f"{r['id']} ({r['speaker']}): {len(r['words'])} words — cast lines are 2–8 words")
    holds = [(r["id"], float(r["air"][1:])) for r in good if r["air"].startswith("+")]
    if len(holds) > 2:
        R.w(f"{len(holds)} holds — the format has one (before the reveal)")
    for hid, hv in holds:
        if hv > 1.2:
            R.w(f"{hid}: a {hv:.2f} s hold — ≤ 1.0 s")
    # ending
    endl = good[-1]
    en = len(endl["words"])
    if en > 12:
        R.e(f"last line ({endl['id']}) is {en} words — ≤ 8")
    elif en > 8:
        R.w(f"last line ({endl['id']}) is {en} words — ≤ 8 lands harder")
    if re.search(r"\b(follow|subscribe|part \d|part two|next part)\b", endl["text"].lower()):
        R.w("the last spoken line asks to follow / names the next part — end on the story (the end card can say FOLLOW …)")
    ending = "question (dilemma/debate)" if endl["text"].rstrip().endswith("?") else "statement (cliffhanger / mind-blow)"
    # measured voice stats
    if lines_json:
        L = json.load(open(lines_json))
        speech = sum(l["end"] - l["start"] for l in L)
        wsum = sum(len(l["words"]) for l in L)
        pace = wsum / max(0.01, speech)
        if pace < 2.8:
            R.w(f"measured pace {pace:.2f} w/s while speaking — below 2.8 (sample more takes, or Fish speed 1.04–1.06)")
        elif pace > 3.5:
            R.w(f"measured pace {pace:.2f} w/s — above 3.5 feels rushed")
        gaps = [(l["id"], b["s"] - a["e"]) for l in L for a, b in zip(l["words"], l["words"][1:])]
        big = [(i, g) for i, g in gaps if g > 1.0]
        for i, g in big[:5]:
            R.w(f"{i}: a {g:.2f} s gap inside the line (dropout?) — pick another take")
        R.i(f"measured: {wsum} words, speech {speech:.1f} s, pace {pace:.2f} w/s, film ≈ {film:.1f} s")
    R.i(f"{len(good)} lines · {total} words · mean {mean:.1f} · punches {sum(1 for n in nw if n <= 7)} · connectors {conn} · "
        f"grade ≈ {grade:.1f} · cast lines {len(cast)} · film ≈ {film:.1f} s ({'measured' if lines_json else 'estimated at %.1f w/s' % E['pace']}) · ending: {ending}")
    return dict(tl=tl, last=last_end, order=[r["id"] for r in good], rows=good)


def lint_shots(shots, ctx, engine, R):
    E = ENGINES[engine]
    tl, order, last = ctx["tl"], ctx["order"], ctx["last"]
    ids = [s["id"] for s in shots]
    for d in sorted({x for x in ids if ids.count(x) > 1}):
        R.e(f"duplicate shot id {d!r}")
    times = []
    for k, s in enumerate(shots):
        tag = f"shot {s['id']} (shots.tsv line {s['lineno']})"
        if not re.fullmatch(r"[a-z][A-Za-z0-9]*", s["id"]):
            R.e(f"{tag}: id must be camelCase letters/digits")
        if s["type"] not in SHOT_TYPES:
            R.e(f"{tag}: type {s['type']!r} — one of {', '.join(sorted(SHOT_TYPES))}")
        try:
            if s["line"] == "END":
                t = last + float(s["word"])
            else:
                if s["line"] not in tl:
                    R.e(f"{tag}: line {s['line']!r} is not in the script")
                    times.append(None)
                    continue
                i = int(s["word"])
                fr = float(s["frac"] or 0)
                n = len(tl[s["line"]])
                if not 0 <= i < n:
                    R.e(f"{tag}: word {i} out of range (line {s['line']} has {n} words, 0–{n - 1})")
                    times.append(None)
                    continue
                if not 0 <= fr < 1:
                    R.e(f"{tag}: frac {fr} must be in [0, 1)")
                t = cut_time(tl, order, s["line"], i, fr)
        except ValueError:
            R.e(f"{tag}: word/frac must be numbers")
            times.append(None)
            continue
        times.append(0.0 if k == 0 else t)
    if any(t is None for t in times) or not shots:
        return
    for a, b, s in zip(times, times[1:], shots[1:]):
        if b <= a:
            R.e(f"shot {s['id']}: starts at {b:.2f} s, not after the previous shot ({a:.2f} s) — keep film order")
    dur = last + E["tail"]
    lens = [b - a for a, b in zip(times, times[1:] + [dur])]
    body = [(s, L) for s, L in zip(shots, lens) if s["type"] not in ("end", "journey")]
    mean = sum(L for _, L in body) / max(1, len(body))
    lo, hi = E["shot"]
    if not lo <= mean <= hi:
        (R.e if mean > hi * 1.5 else R.w)(f"mean shot {mean:.2f} s (engine target {lo}–{hi} s)")
    lo, hi = E["shots"]
    if not lo <= len(shots) <= hi:
        R.w(f"{len(shots)} shots (engine target {lo}–{hi})")
    for s, L in body:
        if L > E["max_shot"]:
            R.w(f"shot {s['id']}: {L:.2f} s — over {E['max_shot']} s; add an insert or a new angle")
        if L < 0.45:
            R.w(f"shot {s['id']}: {L:.2f} s — under 0.45 s reads as a flash")
    types = [s["type"] for s in shots]
    cnt = {t: types.count(t) for t in SHOT_TYPES if types.count(t)}
    slams = cnt.get("slam", 0) + sum(1 for s in shots if s["type"] != "slam" and "slam" in s["devices"].lower())
    if E["story"] and engine not in ("pov",):
        n = len(shots)
        if cnt.get("acting", 0) < 0.25 * n:
            R.w(f"acting shots {cnt.get('acting', 0)}/{n} — the hero must DO the lines (≥ 25 %)")
        if cnt.get("closeup", 0) < 2:
            R.w("fewer than 2 close-ups — the emotion beats need faces")
        if cnt.get("insert", 0) < 2:
            R.w("fewer than 2 inserts — hands and props at prop scale sell the actions")
        if engine in ("survival", "sequel") and cnt.get("map", 0) + cnt.get("diagram", 0) < 3:
            R.w("fewer than 3 map/diagram shots — show where and why")
        if engine == "build" and cnt.get("diagram", 0) < 4:
            R.w("build engine: return to the cutaway diagram after each fix (≥ 4 diagram shots)")
        if not 2 <= slams <= 4 and engine in ("survival", "experiment", "sequel"):
            R.w(f"{slams} graphic slams — 2–4 per film (correction · stakes · twist); a slam inside a shot counts when its devices name it (NoSlam@…)")
    if engine in ("survival", "experiment") and "end" not in types:
        R.w("no end card (type end) — Part 1 / experiment films close on PART 2 · teaser")
    for t, c in cnt.items():
        if c > 0.5 * len(shots) and len(shots) > 6 and t not in ("journey",):
            R.w(f"{c}/{len(shots)} shots are {t} — vary the shot types")
    for s in shots:
        if not s["what"]:
            R.w(f"shot {s['id']}: no description (what we see)")
    # long lines with no cut inside
    for lid in order:
        ws = tl[lid]
        a, b = ws[0][0], ws[-1][1]
        inside = [t for t in times if a < t < b]
        if b - a > E["max_shot"] and not inside and E["story"]:
            R.w(f"line {lid}: {b - a:.1f} s with no cut inside — one picture per phrase")
    R.i(f"{len(shots)} shots · mean {mean:.2f} s · min {min(L for _, L in body):.2f} · max {max(L for _, L in body):.2f} · "
        + " ".join(f"{t} {c}" for t, c in sorted(cnt.items(), key=lambda x: -x[1])))
    return times


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("--engine", required=True, choices=sorted(ENGINES))
    ap.add_argument("--shots")
    ap.add_argument("--lines", help="public/<slug>/vo/lines.json (measured timing)")
    ap.add_argument("--pace", type=float, help="override the engine's estimated pace (w/s)")
    a = ap.parse_args()
    if a.pace:
        ENGINES[a.engine]["pace"] = a.pace
    R = Report()
    rows = read_script(a.script)
    ctx = lint_script(rows, a.engine, R, a.lines)
    if ctx and a.shots:
        if not Path(a.shots).exists():
            R.e(f"{a.shots} not found")
        else:
            lint_shots(read_shots(a.shots), ctx, a.engine, R)
    for k, m in R.items:
        print(f"{k:5} {m}")
    n_e, n_w = len(R.errors), sum(1 for k, _ in R.items if k == "WARN")
    print(f"\n{'FAIL' if n_e else 'PASS'}  {n_e} errors · {n_w} warnings")
    sys.exit(1 if n_e else 0)


if __name__ == "__main__":
    main()
