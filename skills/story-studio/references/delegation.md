# Delegation: briefing child agents and reviewing them

The user wants this workflow replicable by cheaper models (Opus 5.5 low, Sonnet 5.5 high,
Haiku 5.5 max) with a stronger model reviewing. Past lesson: delegated films came back far below
the bar when the brief was loose and nobody reviewed. So: strict brief, isolated worktree, a
review after the first stills sheet, a review of the master.

## Setup per child

```bash
WT=$(~/Developer/story-studio/scripts/new-worktree.sh <name>)    # ~/Developer/story-studio-wt/<name>, branch ep/<name>
bb thread spawn --project proj_personal --parent-self --provider claude-code --model claude-sonnet-5-5 \
  --reasoning-level high --environment "$WT" --title "Episode · <show>" --prompt-file /tmp/brief-<name>.md --json
```
Max 3 children at once (15 GB RAM, earlyoom). Each child renders through the GPU lock.

## The brief (fill every field)

```
You are making ONE episode with the story-studio skill. Read ~/Developer/bb-plugins/skills/story-studio/SKILL.md
and every reference it links for your format, then read the reference episode
src/episodes/last-train/ (beats.ts, LastTrain.tsx, sound.ts) and episodes/last-train/ (script, cast, sfx, music).
Work ONLY in your worktree: <WT> (branch ep/<name>). Never touch ~/Developer/story-studio itself.

EPISODE: <format> · "<SHOW> · Part 1" · slug <slug> · component <Id>
PREMISE: <one paragraph: setting, the built-in rule, hero, the three rules/facts, the twist, Part 2 title>
LENGTH: 85–100 s. VOICE: narrator <id>; cast from voice.md.
DELIVERABLES: out/<slug>.mp4 passing scripts/qa.py; ~/Videos/story-studio/<slug>.mp4 via deliver.sh;
episodes/<slug>/brief.md with your concept and three alternatives you rejected; committed on your branch.
CHECKPOINTS: (1) after your first full stills sheet, STOP and reply with the sheet path and the
list of shots; wait for my review. (2) after qa.py passes, reply with the qa output and the sheet.
STORAGE: df -h ~ before renders; never render to /tmp; run scripts/clean.sh <slug> at the end.
SETS: designed in code only (sets.md). No generated images (cardboard format excepted), no image APIs, no AI video.
```

## Review rubric (parent)

Open the child's stills sheet and the master's `out/<slug>-qa.jpg` yourself. Send back a short,
numbered list of concrete fixes ("shot at 33 s: crowd floats 80 px above the platform — feet at
y=600"). Pass only when:
- hook frame 0 is alive and readable; title card, rules, end card present;
- characters are staged on the plates (measured), readable, never off-model;
- every shot moves; no empty/black frames except the planned dip;
- captions clean; HUD never overlaps captions;
- qa.py PASS (format, loudness, speech) and the sound table has ≥ 40 cues for 90 s;
- the brief shows a real concept (not a reskin of the Last Train).
Grade each child (A/B/C) with one line on what it did well and what it missed; tell the user
which model met the bar.

## Results of the first comparison (Oct 2026, 9 delegated episodes, same brief + skill)

| Model · effort | Episodes | Grade | What it did well | What it missed |
|---|---|---|---|---|
| Opus 5.5 high | The Fake Taxi, Deep Shift | A−, A− | richest sets and devices (plate check, ride-app map, roll call, catch diagram), new reusable kit pieces, thorough frame QA, honest reports | slight overruns in length; a few long torsos in seated poses |
| Sonnet 5.5 high | 3:07 AM, Squirrels (cardboard), The Lindy Effect | B+, A−, A− | best at matching a reference style (the cardboard episode); strong explainer craft; 100–230 cues | first pass too monochrome (3:07 AM) until told to add warm key lights |
| Opus 5.5 low | The 13th Floor, Dirty Money | B+, B+ | fast, clean structure, good fair-play twist plants, applies review notes precisely | simpler sets, stiffer staging; diagrams small until asked |
| Haiku 5.5 max | The Night Ferry, What if the Sun disappeared? | B, B | follows the pipeline; physics-careful facts; good QA hygiene | emptier frames, less variety in puppets, needs more review rounds |

Recommendation: Opus 5.5 high or Sonnet 5.5 high for premium episodes; Opus 5.5 low for fast
volume with a strong review; Haiku 5.5 max only with two review rounds. Every model improved a lot
from the checkpoint-1 review — never skip it.
