import json, subprocess, sys, time
import numpy as np
from pathlib import Path
from faster_whisper import WhisperModel, BatchedInferencePipeline

work = Path(sys.argv[1])
lang = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None
video = next(p for p in sorted(work.glob("video.*")) if p.suffix not in (".vtt", ".json"))

def ts(s):
    m, s = divmod(s, 60)
    h, m = divmod(int(m), 60)
    return f"{h:d}:{m:02d}:{s:04.1f}" if h else f"{m:02d}:{s:04.1f}"

t0 = time.time()
try:
    model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
    device = "cuda"
except Exception as e:  # no GPU available: still works, just slower
    print(f"CUDA unavailable ({e}); using CPU", file=sys.stderr)
    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    device = "cpu"
# Decode with ffmpeg (16 kHz mono) instead of PyAV: faster and avoids PyAV version breakage.
pcm = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(video), "-vn", "-ac", "1",
                      "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
if audio.size == 0:
    raise SystemExit("no audio track")
pipe = BatchedInferencePipeline(model=model)
segments, info = pipe.transcribe(
    audio, language=lang, batch_size=16, word_timestamps=True,
    vad_filter=True, condition_on_previous_text=False,
)
# Batched mode returns ~30 s chunks; re-split on word timestamps into sentence-sized
# lines (end punctuation, a pause > 0.7 s, or > 12 s long) so they line up with frames.
words = [w for seg in segments for w in (seg.words or [])]
out, cur = [], []
def flush():
    if cur:
        out.append({"start": round(cur[0].start, 2), "end": round(cur[-1].end, 2),
                    "text": "".join(w.word for w in cur).strip(),
                    "words": [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()} for w in cur]})
        cur.clear()
for i, w in enumerate(words):
    if cur and (w.start - cur[-1].end > 0.7 or w.start - cur[0].start > 12):
        flush()
    cur.append(w)
    if w.word.strip()[-1:] in ".?!…" :
        flush()
flush()
lines = [f"[{ts(s['start'])} → {ts(s['end'])}] {s['text']}" for s in out]

(work / "transcript.json").write_text(json.dumps({
    "language": info.language, "language_probability": round(info.language_probability, 3),
    "duration": round(info.duration, 2), "device": device, "segments": out,
}, ensure_ascii=False, indent=1))
(work / "transcript.txt").write_text("\n".join(lines) + "\n")
print(f"{len(out)} segments, language={info.language}, audio {info.duration:.0f}s "
      f"transcribed in {time.time() - t0:.1f}s on {device} -> {work/'transcript.txt'}")
