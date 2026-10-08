#!/usr/bin/env python3
"""Music for films #4 ("Every business runs on questions") and #5 ("The glass box"):
ElevenLabs Music v2.5 composition plans pinned to each voice-over.

#4 answers, 120 BPM (bar = 2.0 s), 42 s:
   0–6    four customers ask (playful plucks)      6–14  narrator builds into the drop
  14      DROP on the mark reveal, after "…in seconds."   14–26 the morphing demo
  26–30   lighter: "You see every conversation"    30–34 build: "…grows as fast as you do"
  34      FINAL HIT on "Brainfast,"                34–42 bright resolve under the CTA
#5 glass, 124 BPM, 40 s:
   0–6.9  dark minimal: "Most AI is a black box…"  6.9  DROP after "…a glass box."
  6.9–12.7 groove: watching every conversation     12.7–16.6 suspense: "not quite right… dislike"
  16.6–19.6 build: "Apply your feedback… it learns for good."   19.6 LIFT: "The next customer gets it right."
  19.6–32.1 fuller groove: sharper, better, scaling  32.1 FINAL HIT on "Brainfast,"   → resolve to 40 s
Generates one take at a time (the account allows 2 concurrent music requests, shared).
Usage: . scripts/el-env.sh && .venv/bin/python scripts/music_films45.py <take> [...]"""
import json, os, sys, time, urllib.request, urllib.error

NEG = ["vocals", "lyrics", "singing", "voice", "choir", "spoken word", "rap", "harsh", "dubstep", "distorted", "lo-fi", "sad"]

def chunk(text, ms, styles, base, neg=()):
    return {"text": text, "duration_ms": ms, "positive_styles": base + styles, "negative_styles": NEG + list(neg)}

def answers(style, key, extra):
    base = [style, "120 BPM", key, "instrumental", "premium commercial mix", "clean and punchy",
            "plenty of space for a voice-over", "modern", "feel-good"]
    return {"chunks": [
        chunk("[Intro]\n{playful, curious}", 6000, ["playful plucked pizzicato and marimba", "finger snaps", "light and curious",
                                                   "no kick drum yet"], base, ["full drums", "big kick"]),
        chunk("[Build]\n{rising}", 8000, ["kick and claps join", "rising energy", "filtered synth riser",
                                         "builds into a big drop at the end"], base),
        chunk("[Drop]\n{bright groove on the first beat}", 12000, ["bright bouncy groove drops exactly on the first beat",
                                                                  "punchy claps", "bouncy bass", "shimmering plucky synth hook",
                                                                  "optimistic"] + extra, base, ["breakdown", "quiet section"]),
        chunk("[Bridge]\n{lighter, open}", 4000, ["lighter half-time feel", "open airy pads", "soft percussion",
                                                 "keeps the pulse"], base, ["full drums"]),
        chunk("[Build]\n{rising}", 4000, ["build up", "snare roll", "rising riser into a big final hit"], base),
        chunk("[Outro]\n{final hit, bright resolve}", 8000, ["one big final hit on the first beat",
                                                            "bright warm resolve with a light groove",
                                                            "final chord rings out at the end"], base, ["new melody", "abrupt ending"]),
    ]}

def glass(style, key, extra):
    base = [style, "124 BPM", key, "instrumental", "premium commercial mix", "sleek", "clean",
            "plenty of space for a voice-over", "modern", "confident"]
    return {"chunks": [
        chunk("[Intro]\n{dark, minimal, mysterious}", 6900, ["dark minimal intro", "deep sub pulse", "ticking clock-like hi-hat",
                                                            "mysterious filtered pads", "tension rising into a drop"],
              base, ["full drums", "big kick", "bright melody"]),
        chunk("[Drop]\n{groove on the first beat}", 5800, ["groove drops exactly on the first beat", "four-on-the-floor kick",
                                                          "glassy plucked synths", "warm rolling bass"] + extra, base,
              ["breakdown"]),
        chunk("[Break]\n{suspense}", 3900, ["short suspenseful breakdown", "kick drops out", "filtered bass",
                                           "single hi-hat", "a question hanging"], base, ["full drums"]),
        chunk("[Build]\n{rising}", 3000, ["quick build", "snare roll", "rising filter sweep", "into a lift"], base),
        chunk("[Chorus]\n{fuller, uplifting}", 12500, ["full groove returns on the first beat", "fuller and uplifting",
                                                      "bright glassy chords", "driving bass", "claps"] + extra, base),
        chunk("[Outro]\n{final hit, resolve}", 7900, ["one big final hit on the first beat", "warm confident resolve",
                                                     "light groove under a call to action", "final chord rings out"],
              base, ["new melody", "abrupt ending"]),
    ]}

TAKES = {
    "a1": ("answers", answers("bright feel-good indie-pop brand anthem", "D major", ["handclaps", "whistle-like synth lead"])),
    "a2": ("answers", answers("upbeat modern electro-pop for a product launch", "F major", ["big punchy drums", "wide bright synth chords"])),
    "g1": ("glass", glass("sleek melodic deep house", "A minor", ["shimmering glass textures", "crisp hi-hats"])),
    "g2": ("glass", glass("polished future-garage tech-pop", "C minor", ["shuffling garage drums", "glossy stabs"])),
}

def compose(name):
    film, plan = TAKES[name]
    key = os.environ["ELEVENLABS_API_KEY"]
    out = f"public/{film}/music/music-{name}.mp3"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for attempt in range(6):
        req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
                                     data=json.dumps({"composition_plan": plan, "model_id": "music_v2_5"}).encode(),
                                     headers={"xi-api-key": key, "Content-Type": "application/json", "User-Agent": "brainfast-showreel/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                open(out, "wb").write(r.read())
            print(out, f"{os.path.getsize(out) / 1024:.0f} KB", flush=True)
            return
        except urllib.error.HTTPError as e:
            body = e.read()[:300].decode(errors="replace")
            if e.code == 429:
                wait = 20 * (attempt + 1)
                print(name, "busy (429), retrying in", wait, "s", flush=True)
                time.sleep(wait)
                continue
            print(name, "ERROR", e.code, body, flush=True)
            return

if __name__ == "__main__":
    for t in sys.argv[1:] or TAKES:
        compose(t)
