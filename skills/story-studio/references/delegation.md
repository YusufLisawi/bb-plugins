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

### Cardboard variant (the MAIN format) — change these fields

```
Read references/format-cardboard.md completely (content rules first), then the reference film:
src/episodes/cobra-cardboard/ (beats.ts, ShotsA–C.tsx, CobraCardboard.tsx, sound.ts) and episodes/cobra-cardboard/
(brief.md, shots.md, script.tsv, cast.json, sfx.json, music.json, art_catalog.py). Open the library contact sheets
public/_lib/cardboard/_sheets/*.jpg before planning shots.
EPISODE: cardboard · slug <slug> · component <Id> · niche <niche> → vibes <from NICHE_VIBE>
LENGTH: 55–72 s, ≈ 150–180 words, 3rd-grade English, few numbers/names, hook in 2 s, CTA question (format § 1).
VOICE: Fish narrator from voice.md (sample takes; speed 1.0). ART: library first; a Codex imagegen thread ONLY for
pieces unique to the story (spec art/briefs/_common.md), built with cardboard_lib.py --film <slug>.
CHECKPOINTS: (0) brief + script + voice + shot list; (1) stills of every shot; (2) qa.py PASS + frame QA.
RENDER: only through scripts/stills.sh / render.sh / deliver.sh (the queue); never bypass it.
```

## Review rubric (parent)

Open the child's stills sheet and the master's `out/<slug>-qa.jpg` yourself. Send back a short,
numbered list of concrete fixes ("shot at 33 s: crowd floats 80 px above the platform — feet at
y=600"). Pass only when:
- hook frame 0 is alive and readable; title card, rules, end card present;
- characters are staged on the plates (measured), readable, never off-model;
- every shot moves; no empty/black frames except the planned dip;
- captions clean; HUD never overlaps captions;
- qa.py PASS (format, loudness, speech) and the sound table has ≈ 0.6 cues/s (≈ 45 for a 72 s cardboard film);
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


### Second round (2026-10-20): cardboard animal facts, Opus 5.5 **medium**
| Opus 5.5 medium | Sea Otters Hold Hands, Never Upset a Crow | A−, A− | followed the strict eye-anchor procedure (measured anchors + crosshair debug sheet), kept boil tiny, 109–140 cues, found and fixed a real kit bug (stop-motion steps changing mid-frame ghosted under motion blur → `useStepT` reads the output frame) | first passes cropped characters at frame edges and used labels too small for a phone; both fixed after one review |

### Third round (2026-10-21): 12 Cardboard 2.0 films on the shared library + Cobra reference (Opus 5.5 max)
| Model · effort | Films | Grades | Pattern |
|---|---|---|---|
| **Sonnet 5.5 max** | Heather (true crime), Night One (zombie), The Magic Penny (money), The War That Birds Won (history), Your Body at Night (fun facts) | A−, A−, A−, **A**, A− | checks facts against sources and corrects the brief, runs 2–4 frame-QA rounds on its own, finds kit/library bugs and voice-timing issues (ElevenLabs word starts ~0.09 s late; trailing clause ends), richer staging |
| **Opus 5.5 low** | Closet, Zombies at the Mall, Ice Cream, Prices end in .99, Tickle, Dancing Plague, Octopus | B+, B+, B+, B+, B+, **B**, B+ | follows the guide and the review notes precisely and fast; first passes crop characters at frame edges, use labels too small for a phone, stiff/same-pose acting (the dance), occasionally forgets to commit mix/sfx/music |

Recommendation: **Sonnet 5.5 max** for premium cardboard films (≈ A−); **Opus 5.5 low** for volume with a strict checkpoint-1 review (≈ B+).
Always: one Codex art thread per film, max 3 agents at once, renders through the queue, the parent merges each branch and regenerates Root.tsx (`scripts/gen_root.py`) — Root.tsx conflicts on every merge are expected.

Recommendation (earlier rounds): Opus 5.5 high or Sonnet 5.5 high for premium episodes; Opus 5.5 low for fast
volume with a strong review; Haiku 5.5 max only with two review rounds. Every model improved a lot
from the checkpoint-1 review — never skip it.
