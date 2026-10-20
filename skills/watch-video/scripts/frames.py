#!/usr/bin/env python3
"""frames.py <workdir> [--max N] [--scene T] [--min-gap S] [--max-gap S]

Picks frames on scene changes plus a heartbeat frame every --max-gap seconds,
never closer than --min-gap, then thins evenly to --max. Writes
<workdir>/frames/f0001_t00m12.4s.jpg (1024px wide) and frames.json [{file, t}].
"""
import argparse, json, re, shutil, subprocess
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("--max", type=int, default=100)
ap.add_argument("--scene", type=float, default=0.3)
ap.add_argument("--min-gap", type=float, default=1.0)
ap.add_argument("--max-gap", type=float, default=None, help="default: duration/40, clamped 2-15s")
a = ap.parse_args()

work = Path(a.work)
video = next(p for p in sorted(work.glob("video.*")) if p.suffix not in (".vtt", ".json"))
dur = float(json.loads((work / "probe.json").read_text())["format"]["duration"])
max_gap = a.max_gap or min(15.0, max(2.0, dur / 40))

out = work / "frames"
shutil.rmtree(out, ignore_errors=True)
out.mkdir()
sel = (f"isnan(prev_selected_t)+gte(t-prev_selected_t\\,{max_gap})"
       f"+gt(scene\\,{a.scene})*gte(t-prev_selected_t\\,{a.min_gap})")
r = subprocess.run(
    ["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-i", str(video), "-an",
     "-vf", f"select='{sel}',showinfo,scale='min(1024,iw)':-2",
     "-fps_mode", "vfr", "-q:v", "3", str(out / "raw_%05d.jpg")],
    capture_output=True, text=True)
if r.returncode:
    raise SystemExit(r.stderr[-2000:])
times = [float(t) for t in re.findall(r"pts_time:([\d.]+)", r.stderr)]
raw = sorted(out.glob("raw_*.jpg"))
pairs = list(zip(raw, times))

keep = pairs
if len(pairs) > a.max:
    step = (len(pairs) - 1) / (a.max - 1)
    idx = {round(i * step) for i in range(a.max)}
    keep = [p for i, p in enumerate(pairs) if i in idx]
kept = {p for p, _ in keep}
for p, _ in pairs:
    if p not in kept:
        p.unlink()

index = []
for n, (p, t) in enumerate(keep, 1):
    m, s = divmod(t, 60)
    name = f"f{n:04d}_t{int(m):02d}m{s:04.1f}s.jpg"
    p.rename(out / name)
    index.append({"file": f"frames/{name}", "t": round(t, 2)})
(work / "frames.json").write_text(json.dumps(index, indent=1))
print(f"{len(index)} frames from {dur:.0f}s video (scene>{a.scene}, every <= {max_gap:.1f}s) -> {out}")
