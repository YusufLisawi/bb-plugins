#!/usr/bin/env python3
"""timeline.py <workdir>
Merges transcript.json and frames.md (the frame agent's notes, one '## [mm:ss.s] ...' block per frame)
into timeline.md, ordered by time, so speech and visuals line up.
"""
import json, re, sys
from pathlib import Path

work = Path(sys.argv[1])
def ts(t):
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:04.1f}"

items = []
tj = work / "transcript.json"
if tj.exists():
    for s in json.loads(tj.read_text())["segments"]:
        items.append((s["start"], 1, f"- 🗣 [{ts(s['start'])}–{ts(s['end'])}] {s['text']}"))
fm = work / "frames.md"
if fm.exists():
    for block in re.split(r"(?m)^(?=## )", fm.read_text()):
        m = re.match(r"## \[(\d+):(\d+(?:\.\d+)?)\]", block)
        if m:
            t = int(m.group(1)) * 60 + float(m.group(2))
            items.append((t, 0, "\n" + block.strip() + "\n"))
        elif block.strip():
            items.append((-1, 0, block.strip() + "\n"))
items.sort(key=lambda x: (x[0], x[1]))
(work / "timeline.md").write_text("# Video timeline\n\n" + "\n".join(i[2] for i in items) + "\n")
print(work / "timeline.md")
