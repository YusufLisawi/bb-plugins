#!/usr/bin/env python3
"""Package a finished film (any format): master copy, poster, key-frame sheet, a
compact 720p copy and a self-contained player page (video inlined as base64,
kept under ~5 MB: raise inline_crf to 28–30 for 40 s films).

Usage: .venv/bin/python scripts/package.py spec.json

spec: {
  "frames": "out/nfinal2",            finished frames f%04d.png (motion blur + grain)
  "audio":  "public/night/mix.wav",
  "master": "out/brainfast-night-shift-v2.mp4",
  "dest":   "~/Developer/brainfast/marketing/…",
  "name":   "brainfast-night-shift-v2",   file stem in dest
  "poster": 52,                          frame used as the cover
  "beats":  [[frame, "label"], …],       ten key frames for the sheet (5 × 2)
  "page":   {"path": "…/reports/x.html", "title": "…", "sub": "…", "meta": ["…", …]}
}
"""
import base64, io, json, os, shutil, subprocess, sys
from PIL import Image, ImageDraw

FPS = 30

def main():
    spec = json.load(open(sys.argv[1]))
    dest = os.path.expanduser(os.path.expandvars(spec["dest"]))
    os.makedirs(dest, exist_ok=True)
    name, frames = spec["name"], spec["frames"]
    shutil.copy(spec["master"], f"{dest}/{name}.mp4")

    poster = Image.open(f"{frames}/f{spec['poster']:04d}.png").convert("RGB")
    poster.save(f"{dest}/poster.png", optimize=True)

    W0, H0 = poster.size
    portrait = H0 >= W0
    w, h = (432, round(432 * H0 / W0)) if portrait else (640, round(640 * H0 / W0))
    beats = spec["beats"]
    cols = 5 if portrait else 3
    rows = (len(beats) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols, (h + 40) * rows), (250, 249, 245))
    d = ImageDraw.Draw(sheet)
    for i, (f, label) in enumerate(beats):
        im = Image.open(f"{frames}/f{int(f):04d}.png").convert("RGB").resize((w, h), Image.LANCZOS)
        x, y = (i % cols) * w, (i // cols) * (h + 40)
        sheet.paste(im, (x, y + 40))
        d.text((x + 12, y + 12), f"{f / FPS:4.1f}s  {label}", fill=(23, 23, 23))
    sheet.save(f"{dest}/keyframes.png", optimize=True)

    # compact copy for the inline player (stays well under the page-size limit once base64'd)
    small = f"out/{name}-inline.mp4"
    k = 720 / min(W0, H0)
    small_w, small_h = round(W0 * k / 2) * 2, round(H0 * k / 2) * 2
    subprocess.run(["npx", "remotion", "ffmpeg", "-hide_banner", "-v", "error", "-y", "-framerate", str(FPS),
                    "-i", f"{frames}/f%04d.png", "-i", spec["audio"],
                    "-vf", f"scale={small_w}:{small_h}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p",
                    "-c:v", "libx264", "-preset", "slow", "-crf", str(spec.get("inline_crf", 24)), "-profile:v", "high",
                    "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
                    "-c:a", "libfdk_aac", "-b:a", spec.get("inline_audio", "128k"), "-shortest", "-movflags", "+faststart", small],
                   check=True)

    pg = spec.get("page")
    if pg:
        buf = io.BytesIO()
        poster.resize((small_w, small_h), Image.LANCZOS).save(buf, "JPEG", quality=82)
        p64 = base64.b64encode(buf.getvalue()).decode()
        v64 = base64.b64encode(open(small, "rb").read()).decode()
        meta = "<br>".join(pg["meta"])
        html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{pg['title']}</title>
<style>
  html,body{{margin:0;background:#0F0F0E;color:#FAF9F5;font:14px/1.4 "DM Sans",system-ui,sans-serif}}
  .wrap{{display:flex;gap:22px;align-items:center;justify-content:center;padding:14px 16px;box-sizing:border-box;min-height:100vh}}
  video{{{"height:min(640px, calc(100vh - 28px))" if portrait else "width:min(880px, calc(100vw - 320px))"};aspect-ratio:{W0}/{H0};display:block;border-radius:14px;background:#000;box-shadow:0 20px 50px rgba(0,0,0,.5)}}
  .side{{max-width:260px}}
  .t{{font-weight:600;letter-spacing:-.01em;font-size:17px}} .t b{{color:#D95759;font-weight:600}}
  .s{{margin-top:6px;color:rgba(250,249,245,.7);font-size:13.5px}}
  .m{{margin-top:14px;font:11.5px ui-monospace,"DM Mono",monospace;letter-spacing:.06em;color:rgba(250,249,245,.5);text-transform:uppercase;line-height:1.7}}
  @media (max-width:560px){{.side{{display:none}}}}
</style></head>
<body><div class="wrap">
  <video controls playsinline preload="auto" poster="data:image/jpeg;base64,{p64}">
    <source type="video/mp4" src="data:video/mp4;base64,{v64}">
  </video>
  <div class="side">
    <div class="t">brainfast<b>.</b> — {pg['heading']}</div>
    <div class="s">{pg['sub']}</div>
    <div class="m">{meta}</div>
  </div>
</div></body></html>
"""
        path = os.path.expanduser(os.path.expandvars(pg["path"]))   # $BB_THREAD_STORAGE works
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "w").write(html)
        print("page", path, f"{os.path.getsize(path) / 1e6:.1f} MB")
    print("packaged ->", dest, sorted(os.listdir(dest)))

if __name__ == "__main__":
    main()
