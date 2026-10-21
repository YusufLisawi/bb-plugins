#!/usr/bin/env python3
"""new_episode.py — scaffold a what-if-shorts episode in a story-studio checkout. Run it from the checkout's root.

  new_episode.py docs <slug> <Component> --engine survival [--title "…"] [--series <slug> --part 2]
  new_episode.py code <slug> <Component> [--force]

docs  writes episodes/<slug>/{brief.md, script.tsv, cast.json, shots.tsv} from the skill's templates (never overwrites).
code  needs public/<slug>/vo/lines.json (after scripts/voice.py) and a filled episodes/<slug>/shots.tsv. It writes
      src/episodes/<slug>/{<Component>.tsx, beats.ts, shots.tsx, sound.ts}: every cut on its word, caption chunks with
      keyword colours, one placeholder card per shot (a timed animatic), then runs scripts/gen_root.py.
      <Component>.tsx and beats.ts are kept if they exist unless --force; shots.tsx and sound.ts are written only once.
"""
import argparse, json, re, subprocess, sys
from pathlib import Path

SK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SK / "scripts"))
import lint_script as LS  # noqa: E402

ROOT = Path.cwd()
# caption chunking costs — tuned on the farm film's hand-made chunks (36 of 55 identical, the rest read naturally)
SIZE_COST = {1: 5.0, 2: 0.8, 3: 0.0, 4: 0.0, 5: 0.3, 6: 2.0}
CHUNK_COST, PUNCT_BONUS, WEAK_PEN, NOBREAK_PEN, BEFORE_BONUS, CONTENT_PEN, MAX_CHARS = 0.3, -2.5, 3.0, 2.0, -0.8, 0.4, 26
WEAK_END = {"the", "a", "an", "to", "of", "in", "on", "at", "for", "and", "but", "or", "with", "from", "by", "your", "his", "her",
            "my", "our", "their", "its", "is", "are", "was", "were", "be", "that", "this", "if", "so", "as", "than", "into", "you're",
            "you", "he", "she", "we", "they", "i", "when", "while", "where", "because", "until"}
BREAK_BEFORE = {"and", "but", "or", "so", "on", "in", "at", "for", "from", "with", "into", "about", "before", "after", "when", "while",
                "where", "that", "which", "who", "is", "are", "was", "were", "your", "one", "because", "until", "than"}
NO_BREAK_BEFORE = {"of", "to"}
RED_WORDS = {"zombie", "zombies", "not", "never", "no", "dead", "die", "dies", "death", "kill", "kills", "killed", "bite", "bitten",
             "infected", "blood", "danger", "dangerous", "poison", "trapped", "drown", "drowns"}
UNITS = {"minute", "minutes", "hour", "hours", "day", "days", "week", "weeks", "month", "months", "year", "years", "mile", "miles",
         "yard", "yards", "feet", "foot", "gallon", "gallons", "pound", "pounds", "percent", "times", "folds", "degrees", "tons",
         "seconds", "second", "dollars", "cents", "light-years", "inches", "meters", "kilometers"}
PUNCT_END = re.compile(r"[,.;:!?…]$|\.\.\.$")


def norm(w):
    return re.sub(r"[^a-z0-9'-]", "", w.lower())


def need_root():
    if not (ROOT / "scripts" / "gen_root.py").exists():
        sys.exit("run this from a story-studio checkout (scripts/gen_root.py not found here)")
    (ROOT / "out").mkdir(exist_ok=True)  # stills.sh / render.sh write here; a fresh worktree has none


def write_new(path: Path, text: str, force=False):
    if path.exists() and not force:
        print(f"  kept     {path.relative_to(ROOT)} (exists)")
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print(f"  wrote    {path.relative_to(ROOT)}")
    return True


def fill(tmpl: str, **kv):
    for k, v in kv.items():
        tmpl = tmpl.replace("{{" + k + "}}", str(v))
    left = re.findall(r"\{\{[A-Z]+\}\}", tmpl)
    if left:
        raise SystemExit(f"template placeholders left: {left}")
    return tmpl


# ───────── docs ─────────
def cmd_docs(a):
    need_root()
    if a.engine not in LS.ENGINES:
        sys.exit(f"--engine must be one of {sorted(LS.ENGINES)}")
    ep = ROOT / "episodes" / a.slug
    title = a.title or a.slug.replace("-", " ").title()
    series = f"{a.series} · Part {a.part}" if a.series else "—"
    write_new(ep / "brief.md", fill((SK / "assets/templates/brief.md").read_text(), TITLE=title, ENGINE=a.engine, SLUG=a.slug,
                                     COMP=a.component, SERIES=series))
    write_new(ep / "script.tsv", (SK / f"assets/scripts/{a.engine}.tsv").read_text())
    cast = json.loads((SK / "assets/templates/cast.json").read_text())
    if a.engine == "pov":
        cast["C1"] = {"provider": "fish", "model": "drama-3-preview", "voice": "8d21b053e2804e2a890e1cf62f267b6f",
                      "name": "Verity (Fish) — the cold-open voice; audition a better fit", "temperature": 0.7, "top_p": 0.7, "tags": "strip"}
        cast["C2"] = {"provider": "fish", "model": "drama-3-preview", "voice": "e3cd384158934cc9a01029cd7d278634",
                      "name": "Laura (Fish) — the call / voicemail voice; audition a better fit", "temperature": 0.7, "top_p": 0.7,
                      "tags": "strip", "fx": "phone"}
    write_new(ep / "cast.json", json.dumps(cast, indent=1, ensure_ascii=False) + "\n")
    write_new(ep / "shots.tsv", (SK / "assets/templates/shots.tsv").read_text())
    if a.series and not (ROOT / "episodes" / a.series / "series.md").exists():
        print(f"  note     episodes/{a.series}/series.md does not exist yet — create the series bible (series.md in the skill)")
    print(f"\nnext: write episodes/{a.slug}/brief.md and script.tsv, then\n"
          f"  python3 {SK}/scripts/lint_script.py episodes/{a.slug}/script.tsv --engine {a.engine}")


# ───────── captions ─────────
def chunk_line(words):
    n = len(words)
    if n <= 3:
        return [(0, n - 1)]
    best = [0.0] + [float("inf")] * n
    back = [0] * (n + 1)
    for i in range(1, n + 1):
        for size in range(1, 7):
            j = i - size
            if j < 0:
                break
            cost = CHUNK_COST + SIZE_COST[size]
            chars = sum(len(w) for w in words[j:i]) + size - 1
            if chars > MAX_CHARS:
                cost += (chars - MAX_CHARS) * 0.15
            if i < n:
                last, nxt = words[i - 1], norm(words[i])
                if PUNCT_END.search(last):
                    cost += PUNCT_BONUS
                elif norm(last) in WEAK_END:
                    cost += WEAK_PEN
                elif nxt in NO_BREAK_BEFORE:
                    cost += NOBREAK_PEN
                elif nxt in BREAK_BEFORE:
                    cost += BEFORE_BONUS
                else:
                    cost += CONTENT_PEN
            c = best[j] + cost
            if c < best[i]:
                best[i], back[i] = c, j
    out, i = [], n
    while i > 0:
        out.append((back[i], i - 1))
        i = back[i]
    return out[::-1]


def chunks_for(lines, script_rows):
    kw_of = {r["id"]: [k.strip() for k in r["kw"].split(",") if k.strip()] for r in script_rows if not r.get("bad")}
    speakers = []
    for r in script_rows:
        if not r.get("bad") and r["speaker"] != "N" and r["speaker"] not in speakers:
            speakers.append(r["speaker"])
    spk_col = {s: ("TEAL" if k % 2 == 0 else "LAVENDER") for k, s in enumerate(speakers)}
    # names that recur (the hero, the dog) are characters, not keywords; a place said once is a keyword
    caps = [norm(w).replace("'s", "") for r in script_rows if not r.get("bad") for w in r["words"] if w[:1].isupper()]
    people = {c for c in caps if caps.count(c) >= 2}
    out = []
    for li, l in enumerate(lines):
        ws = [w["w"] for w in l["words"]]
        is_last = li == len(lines) - 1
        kws = kw_of.get(l["id"], [])
        orange = {norm(k) for k in kws if not k.startswith("!")}
        red = {norm(k.lstrip("!")) for k in kws if k.startswith("!") and not k.startswith("!!")}
        allred = {norm(k[2:]) for k in kws if k.startswith("!!")}
        parts = chunk_line(ws)
        for pi, (a, b) in enumerate(parts):
            kw, all_ = {}, None
            seg = ws[a:b + 1]
            for k in range(a, b + 1):
                w, nw = ws[k], norm(ws[k])
                prev = ws[k - 1] if k > 0 else ""
                if nw in red or nw in RED_WORDS:
                    kw[k] = "RED"
                elif nw in orange or (LS.is_num(w) and nw != "one"):
                    kw[k] = "ORANGE"
                    if k + 1 <= b and norm(ws[k + 1]) in UNITS:
                        kw[k + 1] = "ORANGE"
                elif (k > 0 and w[:1].isupper() and nw not in ("i", "i'm", "i'll") and nw.replace("'s", "") not in people
                      and not PUNCT_END.search(prev) and not prev.endswith('"')):
                    kw[k] = "ORANGE"  # a proper noun said once, mid-line (a place)
            if any(norm(w) in allred for w in seg):
                all_ = "RED"
            if l["speaker"] != "N":
                all_ = spk_col.get(l["speaker"], "TEAL")
            elif re.search(r"\bone problem", " ".join(seg).lower()):
                all_ = "RED"  # the turn: "ONE PROBLEM."
            elif is_last and pi == len(parts) - 1:
                if l["text"].rstrip().endswith("?"):
                    you = next((k for k in range(a, b + 1) if norm(ws[k]) == "you"), None)
                    for k in range((you + 1) if you is not None else a, b + 1):
                        kw[k] = "ORANGE"
                else:
                    all_ = "RED"  # the reveal: "INSIDE THE BARN."
            fields = [f'id: "{l["id"]}"', f"a: {a}", f"b: {b}"]
            if all_:
                fields.append(f"all: {all_}")
            elif kw:
                fields.append("kw: { " + ", ".join(f"{k}: {v}" for k, v in sorted(kw.items())) + " }")
            out.append(f"  {{ {', '.join(fields)} }}, // {' '.join(seg).upper()}")
    return "\n".join(out)


# ───────── code ─────────
def cmd_code(a):
    need_root()
    ep = ROOT / "episodes" / a.slug
    lj = ROOT / "public" / a.slug / "vo" / "lines.json"
    if not lj.exists():
        sys.exit(f"{lj.relative_to(ROOT)} not found — record the voice first (scripts/voice.py {a.slug})")
    shots_p = ep / "shots.tsv"
    script_rows = LS.read_script(ep / "script.tsv")
    shots = LS.read_shots(shots_p)
    if not shots:
        sys.exit(f"{shots_p.relative_to(ROOT)} has no shot rows — write the shot plan first")
    lines = json.load(open(lj))
    brief = (ep / "brief.md").read_text() if (ep / "brief.md").exists() else ""
    m = re.search(r"what-if-shorts · (\w+) engine", brief)
    engine = a.engine or (m.group(1) if m else "survival")
    t = re.search(r'^title: "?(.+?)"?$', brief, re.M)
    title = a.title or (t.group(1) if t else a.slug)
    # validate with the linter (measured timing)
    R = LS.Report()
    ctx = LS.lint_script(script_rows, engine, R, str(lj))
    if ctx:
        LS.lint_shots(shots, ctx, engine, R)
    for k, msg in R.items:
        if k != "INFO":
            print(f"  {k:5} {msg}")
    if R.errors:
        sys.exit(f"\n{len(R.errors)} errors — fix the script / shot plan first")
    ids = {l["id"] for l in lines}
    cuts, types, stubs, reg = [], [], [], []
    ends = [float(s["word"]) for s in shots if s["line"] == "END"]
    tail = round(max(ends) + 0.94, 2) if ends else 1.2
    for k, s in enumerate(shots):
        if k == 0:
            expr = "0"
        elif s["line"] == "END":
            expr = f"LAST + {float(s['word']):g}"
        else:
            if s["line"] not in ids:
                sys.exit(f"shot {s['id']}: line {s['line']} not in lines.json")
            fr = float(s["frac"] or 0)
            expr = f'cut("{s["line"]}", {int(s["word"])}' + (f", {fr:g})" if fr else ")")
        cuts.append(f"  {s['id']}: {expr},")
        types.append(f'  {s["id"]}: "{s["type"]}",')
        stubs.append(f"/* ═════════ {k + 1} · {s['id']} ({s['type']}) ═════════ */\n"
                     f"const Shot_{s['id']}: React.FC<ShotProps> = (p) => (\n"
                     f"  <Placeholder {{...p}} id={json.dumps(s['id'])} type={json.dumps(s['type'])} what={{{json.dumps(s['what'])}}} devices={{{json.dumps(s['devices'])}}} />\n);")
        reg.append(f"  {s['id']}: Shot_{s['id']},")
    src = ROOT / "src" / "episodes" / a.slug
    kv = dict(TITLE=title, ENGINE=engine, SLUG=a.slug, COMP=a.component)
    code = SK / "assets" / "code"
    write_new(src / f"{a.component}.tsx", fill((code / "Component.tsx.tmpl").read_text(), **kv), a.force)
    write_new(src / "beats.ts", fill((code / "beats.ts.tmpl").read_text(), CUTS="\n".join(cuts), TYPES="\n".join(types), TAIL=tail,
                                     CHUNKS=chunks_for(lines, script_rows), **kv), a.force)
    write_new(src / "shots.tsx", fill((code / "shots.tsx.tmpl").read_text(), STUBS="\n\n".join(stubs), REG="\n".join(reg), **kv))
    write_new(src / "sound.ts", fill((code / "sound.ts.tmpl").read_text(), **kv))
    subprocess.run([sys.executable, "scripts/gen_root.py"], cwd=ROOT, check=True)
    print(f"\nnext: npx tsc --noEmit -p . && scripts/stills.sh {a.component} out/{a.slug}-r0.jpg <secs…>   (the timed animatic)\n"
          f"then replace the placeholders shot by shot (build.md § 4) and review the CHUNKS colours in beats.ts")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("docs")
    d.add_argument("slug"); d.add_argument("component")
    d.add_argument("--engine", required=True)
    d.add_argument("--title"); d.add_argument("--series"); d.add_argument("--part", type=int, default=2)
    c = sub.add_parser("code")
    c.add_argument("slug"); c.add_argument("component")
    c.add_argument("--engine"); c.add_argument("--title"); c.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z][a-z0-9-]*", a.slug):
        sys.exit("slug: lowercase letters, digits, hyphens (e.g. flood-car)")
    if not re.fullmatch(r"[A-Z][A-Za-z0-9]*", a.component):
        sys.exit("Component: PascalCase (e.g. FloodCar)")
    (cmd_docs if a.cmd == "docs" else cmd_code)(a)


if __name__ == "__main__":
    main()
