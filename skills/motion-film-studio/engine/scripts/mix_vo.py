#!/usr/bin/env python3
"""Mix a voice-over film: VO + ducked music + calibrated sound design → one WAV.

Cue sheet (JSON):
  fps, durationInFrames, out
  music, musicGain              the bed (musicOffset s into the file, musicFadeIn s)
  music_env: [[s, dB], ...]     bed automation (piecewise-linear in dB), e.g. a pre-hit drop-out
  vo:  [[frame, path], ...]     voice lines (placed on their frame)
  duck: {under_db, attack, release}   music level under speech, relative to the gaps
  sfx: [[frame, path, type, trim_db, note], ...]
       type picks a target level relative to the bed at that moment (music as ducked
       + voice), so effects sit under the voice and never vanish; trim_db nudges one cue.

Steps: every VO line is loudness-matched to the others (speech RMS), the music is
ducked under each spoken window (smooth attack/release), effects are trimmed of
lead-in silence and levelled by measurement, then limiter + −14 LUFS like mix.py.

Usage: .venv/bin/python scripts/mix_vo.py cues.json [--table] [--peaks]
(Films normally go through scripts/mix_film.py, which builds this cue dict from film.json + the SOUND export.)
"""
import json, sys
import numpy as np
sys.path.insert(0, "scripts")
from audio import SR, lead_in, limiter, load, lufs, write_wav

# target level (dB) of each effect type relative to the bed, window (s), gain clamp
TYPE = {
    "ui":       (-10.0, 0.08, (0.03, 3.0)),   # ticks, pops, taps
    "confirm":  (-9.0, 0.10, (0.03, 2.0)),    # checks, chimes
    "phone":    (-9.0, 0.25, (0.03, 2.0)),    # buzz, ring, answer
    "sweep":    (-12.0, 0.30, (0.02, 1.0)),   # whoosh, swell, draw, shimmer
    "prop":     (-9.0, 0.15, (0.03, 2.0)),    # sign flip, clock tick
    "ambience": (-20.0, 1.50, (0.01, 0.6)),   # night air, birds
    "hit":      (-4.0, 0.25, (0.05, 1.2)),    # impacts on the music's own hits
}
FLOOR_DB = -30.0
db = lambda a: 20 * np.log10(np.sqrt(np.mean(np.square(a))) + 1e-9)

def speech_window(x, thr_db=-38):
    loud = np.where(np.abs(x).max(axis=1) > 10 ** (thr_db / 20))[0]
    return (int(loud[0]), int(loud[-1])) if len(loud) else (0, len(x))

def run(cue, show_table=False, show_peaks=False):
    """Mix one film from a cue dict (see the module docstring); returns (LUFS, dBTP)."""
    fps = cue["fps"]
    total = int(round(cue["durationInFrames"] / fps * SR))

    # ── voice: loudness-matched lines ──
    lines = []
    for frame, path in cue["vo"]:
        x = load(path)
        a, b = speech_window(x)
        lines.append((int(round(frame / fps * SR)), x, a, b, db(x[a:b])))
    ref = float(np.median([l[4] for l in lines]))
    vo = np.zeros((total, 2), np.float32)
    duck = np.ones(total, np.float32)
    d = cue.get("duck", {})
    under = 10 ** (d.get("under_db", -9.0) / 20)
    att, rel = int(d.get("attack", 0.2) * SR), int(d.get("release", 0.45) * SR)
    for at, x, a, b, lvl in lines:
        g = 10 ** ((ref - lvl) / 20)
        n = min(len(x), total - at)
        vo[at: at + n] += x[:n] * g
        s, e = at + a, at + b
        duck[max(0, s - att): min(total, e + rel)] = under
    # optional gentle peak compression of the voice bus: a hot word (a shouted
    # brand name) otherwise sets the limiter working once the mix is at -14 LUFS
    vc = cue.get("vo_comp")
    if vc:
        thr = 10 ** ((ref + vc.get("above_rms_db", 10.0)) / 20)
        ratio = vc.get("ratio", 3.0)
        blk = int(0.003 * SR)
        nb = int(np.ceil(total / blk))
        pad = np.zeros((nb * blk, 2), np.float32)
        pad[:total] = vo
        pk = np.abs(pad).max(axis=1).reshape(nb, blk).max(axis=1)
        want = np.where(pk > thr, (np.maximum(pk, 1e-9) / thr) ** (1 / ratio - 1), 1.0)
        want = np.minimum(want, np.concatenate([want[1:], [1.0]]))  # look ahead one block
        g = np.ones(nb)
        rel = 1 - np.exp(-blk / (SR * 0.08))
        for i in range(nb):
            g[i] = want[i] if want[i] < g[i - 1] else g[i - 1] + (want[i] - g[i - 1]) * rel if i else want[i]
        gs = np.interp(np.arange(total), np.arange(nb) * blk + blk / 2, g).astype(np.float32)
        vo *= gs[:, None]
        print(f"voice compression: max {20 * np.log10(g.min()):.1f} dB above {20 * np.log10(thr):.1f} dBFS, {ratio}:1")
    # smooth the duck so it breathes instead of switching
    k = int(0.18 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode="same").astype(np.float32)

    # ── music: gain set so the bed under the voice sits ~13 dB below it ──
    # no music at all is a valid choice (cue["music"] = None): voice + sound design only
    music = load(cue["music"]) if cue.get("music") else np.zeros((total, 2), np.float32)
    off = int(cue.get("musicOffset", 0.0) * SR)  # start the bed this far into the file
    music = music[off:off + total]
    fi = int(cue.get("musicFadeIn", 0.0) * SR)
    if fi > 0:
        music[:fi] *= np.linspace(0, 1, fi)[:, None]
    music = np.pad(music, ((0, max(0, total - len(music))), (0, 0)))
    speech = duck < under + 0.02
    mg = cue.get("musicGain") if cue.get("music") else 0.0
    if mg is None:
        target = ref - cue.get("music_under_voice_db", 18.0)
        mg = 10 ** ((target - db(music[speech] * under)) / 20)
    music *= mg
    t = np.arange(total) / SR
    # optional bed automation: [[seconds, dB], ...] piecewise-linear in dB, e.g. a
    # pre-hit drop-out so the lockup lands like a real final hit
    env = cue.get("music_env")
    if env:
        ts = np.array([p[0] for p in env], dtype=np.float64)
        gs = np.array([p[1] for p in env], dtype=np.float64)
        music *= (10 ** (np.interp(t, ts, gs) / 20)).astype(np.float32)[:, None]
    a0, b0 = cue.get("fadeOut", [total / SR - 0.8, total / SR])
    fade = np.clip((b0 - t) / (b0 - a0), 0, 1) ** 1.5
    bed_music = music * duck[:, None] * fade[:, None]
    bed = bed_music + vo

    # ── sound design, levelled against the bed at each moment ──
    sfx = np.zeros((total, 2), np.float32)
    cache, table = {}, []
    # no effect may peak close to the voice's own peaks (keeps the limiter idle);
    # small UI sounds sit further under than sweeps and hits
    vo_peak = float(np.abs(vo).max())
    CAP_DB = {"ui": -9.0, "confirm": -9.0, "sweep": -7.0, "hit": -4.0}
    for frame, path, kind, trim, note in cue["sfx"]:
        if path not in cache:
            x = load(path)
            cache[path] = x[lead_in(x):]
        x = cache[path]
        target, win, (lo, hi) = TYPE[kind]
        at = int(round(frame / fps * SR))
        w = int(win * SR)
        # level against the bed, but never against less than the voice − 18 dB: with soft or
        # no music, effects in the gaps must still be heard (they carry the life of the film)
        bed_db = max(FLOOR_DB, ref - 18.0, db(bed[at: at + w]))
        g = float(np.clip(10 ** ((bed_db + target + trim - db(x[:w])) / 20), lo, hi))
        cap = vo_peak * 10 ** (CAP_DB.get(kind, -6.0) / 20)
        g = min(g, cap / (float(np.abs(x).max()) + 1e-9))
        n = min(len(x), total - at)
        sfx[at: at + n] += x[:n] * g
        table.append((frame, path.split("/")[-1], kind, g, note))

    mix = bed + sfx * fade[:, None]
    pre_i, _ = lufs(mix)
    norm = 10 ** ((-14.0 - pre_i) / 20)
    if show_peaks:
        # where would the limiter work, and who is loud there?
        env = np.abs(mix * norm).max(axis=1)
        blk = int(0.05 * SR)
        nb = len(env) // blk
        pk = env[: nb * blk].reshape(nb, blk).max(axis=1)
        for i in np.argsort(pk)[::-1][:8]:
            sl = slice(i * blk, (i + 1) * blk)
            parts = {n: 20 * np.log10(np.abs(v[sl] * norm).max() + 1e-9) for n, v in
                     (("vo", vo), ("music", bed_music), ("sfx", sfx))}
            print(f"  peak {20*np.log10(pk[i]):5.1f} dBFS at {i*blk/SR:6.2f}s  " + "  ".join(f"{n} {v:5.1f}" for n, v in parts.items()))
    mix *= norm
    mix, gmin = limiter(mix)
    post_i, post_tp = lufs(mix)
    write_wav(cue["out"], mix)
    print(f"{len(lines)} VO lines (matched to {ref:.1f} dB), music gain {mg:.2f}, duck {20*np.log10(under):.0f} dB, "
          f"{len(table)} cues -> {cue['out']}")
    print(f"loudness {post_i:.1f} LUFS / {post_tp:.1f} dBTP (limiter max reduction {20*np.log10(gmin):.1f} dB)")
    if show_table:
        for frame, name, kind, g, note in table:
            print(f"  {frame:7.1f} {name:14} {kind:8} gain {g:5.2f}  {note}")
    return post_i, post_tp

def main():
    run(json.load(open(sys.argv[1])), show_table="--table" in sys.argv, show_peaks="--peaks" in sys.argv)

if __name__ == "__main__":
    main()
