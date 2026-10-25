#!/usr/bin/env python3
"""mkbrief.py <part N> <thread letter|gate> — assemble one Codex art brief = the series header (episodes/flight-delayed-s1/brief/header.md, {PART}/{TITLE} filled)
+ the part's own places / refs / state notes (episodes/flight<N>/brief/part.md) + the thread's picture list (episodes/flight<N>/brief/<letter>.md) → /tmp/briefs/flight<N>-<letter>.md"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
n, t = sys.argv[1], sys.argv[2]
TITLES = {"2": "STRANDED", "3": "RIGOR", "4": "FAST", "5": "THE COPY", "6": "THE TEACHER"}
head = (ROOT / "episodes/flight-delayed-s1/brief/header.md").read_text().replace("{PART}", n).replace("{TITLE}", TITLES[n])
part = ROOT / f"episodes/flight{n}/brief/part.md"
body = (ROOT / f"episodes/flight{n}/brief/{t}.md").read_text()
out = Path("/tmp/briefs"); out.mkdir(exist_ok=True)
f = out / f"flight{n}-{t}.md"
f.write_text(head + "\n" + (part.read_text() + "\n" if part.exists() else "") + body)
print(f)
