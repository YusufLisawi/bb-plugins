#!/usr/bin/env python3
"""Cut chained UGC takes down to the script: keep only spoken words that match the script (latest occurrence wins,
so the repeats at chain seams drop out), cut at dropped words and at real audio silence, then join.
usage: align_cut.py SCRIPT.txt OUT.mp4 TAKE1.mp4 [TAKE2.mp4 ...] [--lang spa] [--numbers numbers.json]
  SCRIPT.txt     the exact script (the words the speaker should say, in order)
  TAKE*.mp4      the takes in order (e.g. omni_chain turns, or several chains); transcribed with stt.py if no
                 TAKE.mp4.stt.json exists yet
  numbers.json   optional {"34": "treinta", "%": "por ciento", "brandname": "brand name"} spoken forms
Writes OUT.mp4 (1080x1920 @30, voice chain applied, no pitch change), OUT.words.json (words on the edit clock)
and OUT.cuts.json, and prints the dropped words so you can read them."""
import json, os, re, subprocess, sys, unicodedata, difflib
HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
lang = args[args.index("--lang") + 1] if "--lang" in args else None
nums = json.load(open(args[args.index("--numbers") + 1])) if "--numbers" in args else {}
args = [a for i, a in enumerate(args) if a not in ("--lang", "--numbers") and (i == 0 or args[i - 1] not in ("--lang", "--numbers"))]
script_f, out, takes = args[0], args[1], args[2:]
FPS, LEAD, TAIL, GAP = 30, 0.10, 0.18, 0.32
VOICE = "highpass=f=85,equalizer=f=3200:t=q:w=1:g=2,acompressor=threshold=-22dB:ratio=2.2:attack=8:release=120"

def tok(x):
    x = "".join(c for c in unicodedata.normalize("NFD", x.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9%]", "", x)
def toks(x):
    t = tok(x)
    if t in nums: return nums[t].split()
    if t.endswith("%") and t[:-1] in nums: return nums[t[:-1]].split() + nums.get("%", "%").split()
    return [t.replace("%", "")] if t.strip("%") else []
def words(take):
    j = take + ".stt.json"
    if not os.path.exists(j):
        subprocess.run([sys.executable, f"{HERE}/stt.py", take] + (["--lang", lang] if lang else []), check=True, stdout=subprocess.DEVNULL)
    return [{"w": w[0], "s": w[1], "e": w[2]} for w in json.load(open(j))]
def silences(c, a, b):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", c, "-vn", "-af",
                        "silencedetect=n=-36dB:d=0.35", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(x) + a for x in re.findall(r"silence_start: ([0-9.]+)", o)]
    en = [float(x) + a for x in re.findall(r"silence_end: ([0-9.]+)", o)]
    return list(zip(st, en + [b] * (len(st) - len(en))))
def dur(c):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", c], capture_output=True, text=True).stdout)

S = [y for x in open(script_f, encoding="utf-8").read().split() for y in toks(x)]
allw = [(c, dict(w, t=y)) for c in takes for w in words(c) for y in toks(w["w"])]
A, B = [x[1]["t"] for x in allw][::-1], S[::-1]   # reversed: the latest occurrence of a repeated word wins
sim = lambda a, b: a == b or (len(a) > 3 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.8)
n, m = len(A), len(B); dp = [[0] * (m + 1) for _ in range(n + 1)]
for i in range(n - 1, -1, -1):
    for j in range(m - 1, -1, -1):
        dp[i][j] = dp[i + 1][j + 1] + 1 if sim(A[i], B[j]) else max(dp[i + 1][j], dp[i][j + 1])
keep, i, j = set(), 0, 0
while i < n and j < m:
    if sim(A[i], B[j]) and dp[i][j] == dp[i + 1][j + 1] + 1: keep.add(n - 1 - i); i += 1; j += 1
    elif dp[i + 1][j] >= dp[i][j + 1]: i += 1
    else: j += 1
print(f"aligned {len(keep)} of {m} script words")
print("dropped:", " ".join(allw[k][1]["w"] for k in range(len(allw)) if k not in keep) or "-")

kept, seen = [], set()
for k in sorted(keep):
    c, w = allw[k]
    if (c, w["s"]) not in seen: seen.add((c, w["s"])); kept.append((c, dict(w, k=k)))
runs, cur = [], [kept[0]]
for c, w in kept[1:]:
    pc, pw = cur[-1]
    dropped_between = any(allw[q][1]["s"] not in (pw["s"], w["s"]) for q in range(pw["k"] + 1, w["k"]))
    if c == pc and 0 <= w["s"] - pw["e"] <= GAP and not dropped_between: cur.append((c, w))
    else: runs.append(cur); cur = [(c, w)]
runs.append(cur)

segs, out_words, t = [], [], 0.0
for r in runs:
    c = r[0][0]; full = words(c)
    prev_e = max([w["e"] for w in full if w["s"] < r[0][1]["s"] - 0.01] or [-1])
    next_s = min([w["s"] for w in full if w["s"] > r[-1][1]["s"] + 0.01] or [1e9])
    a = max(0, r[0][1]["s"] - LEAD, prev_e + 0.03 if prev_e > 0 else 0)
    b = min(dur(c), r[-1][1]["e"] + TAIL, next_s - 0.03)
    pieces = [[a, b]]
    for s0, s1 in silences(c, a, b):   # STT stretches words over pauses: trust the audio
        c0, c1 = s0 + 0.12, s1 - 0.08
        if c1 - c0 < 0.15: continue
        last = pieces[-1]
        if c0 > last[0] and c1 < last[1]: pieces[-1] = [last[0], c0]; pieces.append([c1, last[1]])
        elif c0 <= last[0] < c1: last[0] = c1
        elif c0 < last[1] <= c1: last[1] = c0
    for pa, pb in pieces:
        pa, pb = round(pa * FPS) / FPS, round(pb * FPS) / FPS
        if pb - pa < 0.1: continue
        if segs and segs[-1][0] == c and pa < segs[-1][2]: pa = segs[-1][2]
        segs.append((c, pa, pb))
        out_words += [{"w": w["w"], "s": round(t + w["s"] - pa, 3), "e": round(t + min(w["e"], pb) - pa, 3)} for _, w in r if pa - 0.05 <= w["s"] < pb]
        t += pb - pa

inputs, idx = [], {}
for c in takes: idx[c] = len(idx); inputs += ["-i", c]
vf = [f"[{idx[c]}:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,fps={FPS}[v{k}]" for k, (c, a, b) in enumerate(segs)]
af = [f"[{idx[c]}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={b - a - 0.012:.3f}:d=0.012[a{k}]" for k, (c, a, b) in enumerate(segs)]
k = len(segs)
graph = ";".join(vf + af + ["".join(f"[v{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0[vo]",
                            "".join(f"[a{i}]" for i in range(k)) + f"concat=n={k}:v=0:a=1,{VOICE}[ao]"])
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[vo]", "-map", "[ao]",
                "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out], check=True)
base = os.path.splitext(out)[0]
json.dump(out_words, open(base + ".words.json", "w"), ensure_ascii=False)
json.dump([[os.path.basename(c), a, b] for c, a, b in segs], open(base + ".cuts.json", "w"))
print(f"{out}: {len(segs)} segments, {t:.2f} s")
