#!/usr/bin/env python3
"""Cut a continuous VO take into per-line clips (cuts land mid-silence), and lay
them out on the timeline with the natural spacing of the read plus deliberate
extra breaths where the picture needs a beat.

Writes <take_dir>/lNN.mp3 + lNN.words.json + lines.json (line start frames) —
src/remotion/kit/timing.ts makeTiming() reads them — and prints the table.
Tune --extra (seconds of air before each line) until every scene has room and
the drop / final hit land where the music wants them.

Usage: .venv/bin/python scripts/split_take.py <take_dir> --counts 3,8,9,... --extra 0,0,0.35,...
       [--fps 30] [--start 9]
"""
import argparse, json, os, subprocess, sys
sys.path.insert(0, "scripts")
from audio import SR, load, write_wav

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("take_dir")
    ap.add_argument("--counts", required=True, help="words per line, comma separated")
    ap.add_argument("--extra", default="", help="extra seconds of air BEFORE each line (first ignored)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--start", type=int, default=9, help="frame where line 1's clip starts")
    a = ap.parse_args()
    take = json.load(open(os.path.join(a.take_dir, "take.words.json")))
    words = take["words"]
    counts = [int(c) for c in a.counts.split(",")]
    assert sum(counts) == len(words), f"counts sum {sum(counts)} != {len(words)} words"
    extra = [float(e) for e in a.extra.split(",")] if a.extra else [0.0] * len(counts)
    x = load(os.path.join(a.take_dir, "take.mp3"))
    # line boundaries (index of first word of each line)
    firsts = [sum(counts[:i]) for i in range(len(counts))]
    cuts = [max(0.0, words[0]["s"] - 0.12)]
    for i in range(1, len(counts)):
        prev_end = words[firsts[i] - 1]["e"]
        nxt = words[firsts[i]]["s"]
        cuts.append((prev_end + nxt) / 2)
    cuts.append(min(take["duration"], words[-1]["e"] + 0.35))
    table, t_line = {}, a.start / a.fps
    for i in range(len(counts)):
        s, e = cuts[i], cuts[i + 1]
        seg = x[int(s * SR): int(e * SR)]
        slug = f"l{i + 1:02d}"
        tmp = os.path.join(a.take_dir, f"_{slug}.wav")
        write_wav(tmp, seg)
        subprocess.run(["npx", "--yes", "remotion", "ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", tmp,
                        "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(a.take_dir, f"{slug}.mp3")], check=True, capture_output=True)
        os.remove(tmp)
        ws = words[firsts[i]: firsts[i] + counts[i]]
        json.dump({"text": " ".join(w["w"] for w in ws), "duration": e - s,
                   "words": [{"w": w["w"], "s": round(w["s"] - s, 3), "e": round(w["e"] - s, 3)} for w in ws]},
                  open(os.path.join(a.take_dir, f"{slug}.words.json"), "w"), indent=1)
        if i > 0:
            t_line += (cuts[i] - cuts[i - 1]) + extra[i]
        table[slug] = round(t_line * a.fps)
        print(f"{slug}  clip {e - s:5.2f}s  starts f{table[slug]:4d} ({t_line:5.2f}s)  {' '.join(w['w'] for w in ws)}")
    last = f"l{len(counts):02d}"
    end = table[last] + round((cuts[-1] - cuts[-2]) * a.fps)
    print(json.dumps(table))
    json.dump(table, open(os.path.join(a.take_dir, "lines.json"), "w"), indent=1)
    # every line's words in ONE file, so a film imports two files whatever its line count
    allw = {f"l{i + 1:02d}": json.load(open(os.path.join(a.take_dir, f"l{i + 1:02d}.words.json"))) for i in range(len(counts))}
    json.dump(allw, open(os.path.join(a.take_dir, "words.json"), "w"), indent=1)
    print(f"wrote {os.path.join(a.take_dir, 'lines.json')} (the film's timing imports it)")
    print(f"last clip ends f{end} ({end / a.fps:.2f}s)")

if __name__ == "__main__":
    main()
