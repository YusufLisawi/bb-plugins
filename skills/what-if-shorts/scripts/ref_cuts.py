#!/usr/bin/env python3
"""ref_cuts.py <ref.mp4> <transcript.json> <script.tsv> [--th 0.12] [--min-gap 0.3]  > episodes/<slug>/shots.tsv

Clone mode: the reference's shot list, cut on the words of YOUR script.
  1. Detect the reference's cuts (ffmpeg scene score > th; 0.12 found 41 cuts on the farm reference's 40 shots).
  2. Align the reference's spoken words (watch-video transcript.json, word times) to the script's words (difflib).
  3. Each cut becomes (line, word, frac): the word being spoken at the cut, and how far the cut sits between that word's
     start and the next word's start. Your film cuts on the same words at the same fractions, whatever your take's seconds.
Cuts after the last word become `END <seconds after the last word>`. Fill in type / what / devices by looking at the
frame after each cut; `what` starts with the reference time to help. Standard library only (plus ffmpeg).
"""
import argparse, difflib, json, re, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lint_script as LS  # noqa: E402


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def detect_cuts(mp4, th, min_gap):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"scale=144:-1,select='gt(scene,{th})',metadata=print:file=-",
                          "-an", "-f", "null", "-"], capture_output=True, text=True).stdout
    ts = [float(m) for m in re.findall(r"pts_time:([0-9.]+)", out)]
    cuts = []
    for t in ts:
        if not cuts or t - cuts[-1] >= min_gap:
            cuts.append(t)
    return cuts


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ref"); ap.add_argument("transcript"); ap.add_argument("script")
    ap.add_argument("--th", type=float, default=0.12)
    ap.add_argument("--min-gap", type=float, default=0.3)
    a = ap.parse_args()
    tr = json.load(open(a.transcript))
    segs = tr["segments"] if isinstance(tr, dict) else tr
    rw = [(w["word"].strip(), w["start"], w["end"]) for s in segs for w in s.get("words", [])]
    if not rw:
        sys.exit("no word times in the transcript (run watch-video transcribe.sh)")
    rows = [r for r in LS.read_script(a.script) if not r.get("bad")]
    sw = [(r["id"], i, w) for r in rows for i, w in enumerate(r["words"])]
    # align reference words → script words
    A = [norm(w) for w, _, _ in rw]
    Bn = [norm(w) for _, _, w in sw]
    sm = difflib.SequenceMatcher(None, A, Bn, autojunk=False)
    m = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            m[blk.a + k] = blk.b + k
    matched = sorted(m)
    if not matched:
        sys.exit("the transcript and the script share no words")
    cover = len(matched) / len(A)

    def to_script(k):
        if k in m:
            return m[k]
        prev = max((x for x in matched if x < k), default=None)
        nxt = min((x for x in matched if x > k), default=None)
        if prev is None:
            return max(0, m[nxt] - (nxt - k))
        if nxt is None:
            return min(len(sw) - 1, m[prev] + (k - prev))
        return m[prev] + round((k - prev) * (m[nxt] - m[prev]) / (nxt - prev))

    cuts = detect_cuts(a.ref, a.th, a.min_gap)
    last_end = rw[-1][2]
    print(f"# ref_cuts.py: {len(cuts) + 1} shots from {Path(a.ref).name} (scene > {a.th}); words aligned {cover:.0%}")
    print("# fill in type / what / devices from the frame after each cut (pacing-and-shots.md § 2)")
    print("# id\tline\tword\tfrac\ttype\twhat\tdevices")
    print(f"s01\t{sw[0][0]}\t0\t0\t\tref 0.00 s\t")
    for n, c in enumerate(cuts, 2):
        sid = f"s{n:02d}"
        if c >= last_end:
            print(f"{sid}\tEND\t{c - last_end:.2f}\t\t\tref {c:.2f} s\t")
            continue
        k = max(0, max((i for i, (_, s, _) in enumerate(rw) if s <= c), default=0))
        s0 = rw[k][1]
        s1 = rw[k + 1][1] if k + 1 < len(rw) else rw[k][2] + 0.4
        frac = min(0.99, max(0.0, (c - s0) / max(1e-3, s1 - s0)))
        line, i, w = sw[to_script(k)]
        print(f"{sid}\t{line}\t{i}\t{frac:.2f}\t\tref {c:.2f} s (on “{w}”)\t")


if __name__ == "__main__":
    main()
