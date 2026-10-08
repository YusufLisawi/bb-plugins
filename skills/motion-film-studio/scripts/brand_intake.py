#!/usr/bin/env python3
"""
Brand intake: turn a product's website into a DRAFT brand kit.

    python3 $SKILL/scripts/brand_intake.py <url> <id> [--out DIR] [--html saved.html] [--name "Acme"]

Reads the page and its stylesheets, then writes <kit>/ (default $MFS_ASSETS/brands/<id>/):
  brand.json        draft tokens: name, url, colours, fonts, logo, CTA, tagline (status "draft")
  fonts/            the brand fonts, downloaded (site @font-face or Google Fonts)
  logo.svg|png      the best logo candidate; every candidate in logo-candidates/
  product.md        a product-truth DRAFT from the site's own words (verify before use)
  intake.md         what was found, how sure it is, what to check with the user

It is a draft on purpose: the agent reviews it, fixes what's wrong, renders the
preview (brand-preview.sh), and the user approves before any film. For sites that
render in JavaScript, save the rendered HTML with the browser (PinchTab) and pass
--html; copy computed colours/fonts from the browser if the CSS is runtime-only.
Standard library only.
"""
import argparse, colorsys, html, json, math, os, re, subprocess, sys, urllib.parse, urllib.request
from collections import Counter

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
GENERIC = {"inherit", "initial", "system-ui", "sans-serif", "serif", "monospace", "ui-sans-serif", "ui-serif", "ui-monospace", "-apple-system",
           "blinkmacsystemfont", "segoe ui", "roboto", "helvetica neue", "helvetica", "arial", "noto sans", "apple color emoji", "segoe ui emoji",
           "segoe ui symbol", "noto color emoji", "sf mono", "menlo", "monaco", "consolas", "liberation mono", "courier new", "var", "emoji", "math", "fangsong", "cursive", "fantasy", "unset", "revert"}


def fetch(url, binary=False, limit=4_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read(limit)
    return data if binary else data.decode("utf-8", "replace")


# ── colours ──────────────────────────────────────────────────────────────
def hex_rgb(h):
    h = h.lstrip("#")
    if len(h) in (3, 4): h = "".join(c * 2 for c in h[:3])
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_hex(c): return "#" + "".join(f"{max(0, min(255, round(v * 255))):02X}" for v in c)


def oklch_rgb(L, Cc, h):
    a, b = Cc * math.cos(math.radians(h)), Cc * math.sin(math.radians(h))
    l_, m_, s_ = L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    lin = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    return tuple(12.92 * v if v <= 0.0031308 else 1.055 * max(v, 0) ** (1 / 2.4) - 0.055 for v in lin)


def parse_color(v):
    v = v.strip().lower()
    try:
        if m := re.fullmatch(r"#([0-9a-f]{3,8})", v):
            return hex_rgb(m.group(1)) if len(m.group(1)) in (3, 4, 6, 8) else None
        if m := re.fullmatch(r"rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+).*\)", v):
            return tuple(float(m.group(i)) / 255 for i in (1, 2, 3))
        if m := re.fullmatch(r"hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%.*\)", v):
            return colorsys.hls_to_rgb(float(m.group(1)) / 360, float(m.group(3)) / 100, float(m.group(2)) / 100)
        if m := re.fullmatch(r"oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+).*\)", v):
            L = float(m.group(1)) / (100 if m.group(2) else 1)
            return oklch_rgb(L, float(m.group(3)), float(m.group(4)))
        if m := re.fullmatch(r"([\d.]+)\s+([\d.]+)%\s+([\d.]+)%", v):  # shadcn-style bare hsl in a custom property
            return colorsys.hls_to_rgb(float(m.group(1)) / 360, float(m.group(3)) / 100, float(m.group(2)) / 100)
    except (ValueError, OverflowError):
        return None
    return None


def lum(c): return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def sat(c): return colorsys.rgb_to_hls(*c)[2] if max(c) - min(c) > 0.02 else 0
def mix(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))


COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)")


def palette(css, theme_color):
    counts, named = Counter(), {}
    for m in re.finditer(r"--([\w-]+)\s*:\s*([^;}{]+)", css):  # custom properties carry the design tokens
        name, val = m.group(1).lower(), m.group(2).strip()
        c = parse_color(val) or (parse_color(COLOR_RE.search(val).group(0)) if COLOR_RE.search(val) else None)
        if c:
            named.setdefault(name, c)
            counts[rgb_hex(c)] += 3
    for m in COLOR_RE.finditer(css):
        c = parse_color(m.group(0))
        if c: counts[rgb_hex(c)] += 1
    cols = [(hex_rgb(h), n) for h, n in counts.most_common(400)]
    why = {}
    light = [c for c, n in cols if lum(c) > 0.9]
    dark = [c for c, n in cols if lum(c) < 0.18]
    bg = next((named[k] for k in ("background", "bg", "color-background", "surface-background") if k in named and lum(named[k]) > 0.85), light[0] if light else (1, 1, 1))
    ink = next((named[k] for k in ("foreground", "fg", "text", "color-text", "primary-foreground") if k in named and lum(named[k]) < 0.25), dark[0] if dark else (0.09, 0.09, 0.09))
    accent, src = None, ""
    tc = parse_color(theme_color) if theme_color else None
    if tc and sat(tc) > 0.25 and 0.12 < lum(tc) < 0.85: accent, src = tc, "meta theme-color"
    if not accent:
        for k in sorted(named):
            if re.search(r"(brand|primary|accent|secondary)(?!-foreground)", k) and sat(named[k]) > 0.3 and 0.1 < lum(named[k]) < 0.8:
                accent, src = named[k], f"CSS variable --{k}"; break
    if not accent:
        sats = [(c, n) for c, n in cols if sat(c) > 0.35 and 0.1 < lum(c) < 0.8]
        if sats: accent, src = sats[0][0], "most used saturated colour"
    if not accent: accent, src = (0.85, 0.34, 0.35), "fallback (no brand colour found)"
    why["accent"] = src
    white = (1, 1, 1)
    hue = colorsys.rgb_to_hls(*accent)[0]
    success = (0.18, 0.61, 0.42) if not (0.22 < hue < 0.45) else (0.11, 0.48, 0.62)
    P = {"bg": bg, "surface": mix(bg, ink, 0.05), "white": white, "ink": ink, "night": mix(ink, (0, 0, 0), 0.35),
         "accent": accent, "accentDeep": mix(accent, (0, 0, 0), 0.14), "accentLight": mix(accent, white, 0.35), "accentTint": mix(accent, white, 0.78),
         "gray": mix(ink, bg, 0.5), "gray2": mix(ink, bg, 0.68), "line": mix(ink, bg, 0.88), "success": success, "successTint": mix(success, white, 0.9)}
    return {k: rgb_hex(v) for k, v in P.items()}, why, [h for h, _ in counts.most_common(24)]


# ── fonts ────────────────────────────────────────────────────────────────
def families(css):
    c = Counter()
    for m in re.finditer(r"font-family\s*:\s*([^;}{]+)", css):
        first = m.group(1).split(",")[0].strip().strip("'\"")
        if first and first.lower() not in GENERIC and not first.startswith("var("): c[first] += 1
    for m in re.finditer(r"--[\w-]*font[\w-]*\s*:\s*([^;}{]+)", css):
        first = m.group(1).split(",")[0].strip().strip("'\"")
        if first and first.lower() not in GENERIC and not first.startswith("var("): c[first] += 2
    return c


def font_faces(css, base):
    out = []
    for block in re.findall(r"@font-face\s*{([^}]*)}", css):
        fam = re.search(r"font-family\s*:\s*['\"]?([^;'\"]+)", block)
        src = re.findall(r"url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)\s*format\(\s*['\"]?(woff2|woff|truetype|opentype)", block) or [(u, "") for u in re.findall(r"url\(\s*['\"]?([^)'\"]+\.(?:woff2|woff|ttf|otf))", block)]
        if not fam or not src: continue
        wt = re.search(r"font-weight\s*:\s*([^;]+)", block)
        st = re.search(r"font-style\s*:\s*([^;]+)", block)
        uni = re.search(r"unicode-range\s*:\s*([^;]+)", block)
        out.append({"family": fam.group(1).strip(), "url": urllib.parse.urljoin(base, src[0][0]), "weight": (wt.group(1).strip() if wt else "400"),
                    "style": (st.group(1).strip() if st else "normal"), "latin": (not uni) or ("U+0000" in uni.group(1).upper() or "U+0020" in uni.group(1).upper())})
    return out


def google_faces(family):
    q = urllib.parse.quote(family)
    for spec in (f"{q}:ital,wght@0,100..900;1,100..900", f"{q}:wght@100..900", f"{q}:wght@400;600;700;800"):
        try:
            css = fetch(f"https://fonts.googleapis.com/css2?family={spec}&display=swap")
            faces = font_faces(css, "https://fonts.gstatic.com/")
            if faces: return faces
        except Exception:
            continue
    return []


def download_faces(faces, family, kit, tag):
    got, seen = [], set()
    for f in faces:
        if f["family"].strip("'\"").lower() != family.lower() or not f["latin"]: continue
        key = (f["weight"], f["style"])
        if key in seen: continue
        ext = os.path.splitext(urllib.parse.urlparse(f["url"]).path)[1] or ".woff2"
        name = re.sub(r"[^A-Za-z0-9]+", "", family) + f"-{tag}-{f['weight'].replace(' ', '_')}-{f['style']}{ext}"
        try:
            data = fetch(f["url"], binary=True, limit=3_000_000)
        except Exception:
            continue
        open(f"{kit}/fonts/{name}", "wb").write(data)
        seen.add(key)
        got.append({"file": name, "weight": f["weight"], "style": f["style"]})
    return got


# ── logo ─────────────────────────────────────────────────────────────────
def svg_box(svg):
    vb = re.search(r"viewBox=['\"]\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)", svg)
    if vb: return [round(float(vb.group(3)), 2), round(float(vb.group(4)), 2)]
    w, h = re.search(r"\bwidth=['\"]([\d.]+)", svg), re.search(r"\bheight=['\"]([\d.]+)", svg)
    return [float(w.group(1)), float(h.group(1))] if w and h else [100, 100]


def png_size(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n": return [int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")]
    if data[:4] == b"\x00\x00\x01\x00": return [data[6] or 256, data[7] or 256]  # .ico: first image's size
    return [0, 0]  # unknown raster: never auto-picked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url"); ap.add_argument("id")
    ap.add_argument("--out"); ap.add_argument("--html"); ap.add_argument("--name")
    a = ap.parse_args()
    pack = os.environ.get("MFS_ASSETS", os.path.expanduser("~/.local/share/motion-film-studio"))
    kit = a.out or f"{pack}/brands/{a.id}"
    os.makedirs(f"{kit}/fonts", exist_ok=True); os.makedirs(f"{kit}/logo-candidates", exist_ok=True)
    url = a.url if "://" in a.url else "https://" + a.url
    page = open(a.html).read() if a.html else fetch(url)
    notes = []

    meta = lambda *names: next((html.unescape(m.group(1)) for n in names for m in [re.search(rf'<meta[^>]+(?:name|property)=["\']{re.escape(n)}["\'][^>]*content=["\']([^"\']*)', page, re.I) or re.search(rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']{re.escape(n)}["\']', page, re.I)] if m), "")
    title = html.unescape(re.search(r"<title[^>]*>(.*?)</title>", page, re.S | re.I).group(1).strip()) if re.search(r"<title", page, re.I) else ""
    name = a.name or meta("og:site_name") or re.split(r"\s[|–—·-]\s", title)[0].strip() or a.id.capitalize()
    desc = meta("description", "og:description")
    host = urllib.parse.urlparse(url).netloc.removeprefix("www.")

    # stylesheets
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", page, re.S | re.I))
    css += "\n" + " ".join(re.findall(r'style=["\']([^"\']*)["\']', page))
    hrefs = [urllib.parse.urljoin(url, h) for h in re.findall(r'<link[^>]+rel=["\'][^"\']*stylesheet[^"\']*["\'][^>]*href=["\']([^"\']+)', page, re.I)]
    hrefs += [urllib.parse.urljoin(url, h) for h in re.findall(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']', page, re.I)]
    fetched, sheets = 0, [(css, url)]
    for h in dict.fromkeys(hrefs):
        if fetched >= 10: break
        try:
            t = fetch(h); css += "\n" + t; sheets.append((t, h)); fetched += 1
        except Exception as e:
            notes.append(f"could not fetch stylesheet {h}: {e}")
    if fetched == 0 and len(css) < 2000: notes.append("almost no CSS found: the site probably renders in JavaScript. Save the rendered page with the browser and re-run with --html, and read computed colours/fonts there.")

    colors, why, top = palette(css, meta("theme-color"))

    # fonts
    fams = families(css)
    faces_site = [f for t, base in sheets for f in font_faces(t, base)]  # font urls are relative to their stylesheet
    sans_family = next((f for f, _ in fams.most_common() if not re.search(r"mono|code", f, re.I)), None)
    mono_family = next((f for f, _ in fams.most_common() if re.search(r"mono|code", f, re.I)), None)
    fonts, font_note = {}, []
    for role, fam in (("sans", sans_family), ("mono", mono_family)):
        got = download_faces(faces_site, fam, kit, role) if fam else []
        if fam and not got: got = download_faces(google_faces(fam), fam, kit, role)
        if got:
            fonts[role] = {"family": fam, "faces": got}; font_note.append(f"{role}: {fam} ({len(got)} faces downloaded)")
        else:
            fb = {"sans": {"family": "DM Sans", "faces": [{"file": "DMSans-VF.ttf", "weight": "100 1000", "style": "normal"}, {"file": "DMSans-Italic-VF.ttf", "weight": "100 1000", "style": "italic"}]},
                  "mono": {"family": "DM Mono", "faces": [{"file": "DMMono-Regular.ttf", "weight": "400"}, {"file": "DMMono-Medium.ttf", "weight": "500"}]}}[role]
            fonts[role] = fb
            font_note.append(f"{role}: {'found ' + fam + ' but could not download it' if fam else 'none found'} → fallback {fb['family']} (ask the user for the font files if it matters)")
    fonts["wordmarkWeight"], fonts["wordmarkTracking"] = 700, -0.02

    # logo candidates
    cands = []
    for i, m in enumerate(re.finditer(r"<svg\b[^>]*>.*?</svg>", page, re.S | re.I)):
        svg = m.group(0)
        ctx = page[max(0, m.start() - 400):m.start()].lower() + svg[:300].lower()
        named = bool(re.search(r'(aria-label|title|alt)=["\'][^"\']*' + re.escape(name.lower()), svg[:400].lower())) or f"<title>{name.lower()}" in svg[:600].lower()
        score = (8 if named else 0) + (5 if "logo" in ctx else 0) + (3 if re.search(r'href=["\']/["\']|href=["\']' + re.escape(url), ctx) else 0) + (2 if "<header" in page[max(0, m.start() - 3000):m.start()].lower() else 0) - (4 if len(svg) < 300 else 0)
        if score > 0: cands.append((score, "svg", svg, f"inline svg #{i}"))
    for m in re.finditer(r"<img\b[^>]*>", page, re.I):
        tag = m.group(0); src = re.search(r'src=["\']([^"\']+)', tag)
        if not src or src.group(1).startswith("data:"): continue
        if "logo" in tag.lower():
            u = html.unescape(src.group(1))
            has_name = name.lower() in tag.lower()  # a 'logo' img without the brand's name is usually a customer logo or decoration
            cands.append(((6 if has_name else 1) + (2 if ".svg" in u.lower() else 0), "url", urllib.parse.urljoin(url, u), "img with 'logo'"))
    for rel, sc in (("mask-icon", 3), ("icon", 2), ("apple-touch-icon", 2)):
        for h in re.findall(rf'<link[^>]+rel=["\']{rel}["\'][^>]*href=["\']([^"\']+)', page, re.I):
            cands.append((sc + (1 if h.endswith(".svg") else 0), "url", urllib.parse.urljoin(url, h), rel))
    cands.sort(key=lambda c: -c[0])
    saved = []
    ink = colors["ink"]
    for n, (score, kind, val, label) in enumerate(cands[:8]):
        try:
            if kind == "svg":
                data, ext = val.encode(), ".svg"
            else:
                data = fetch(val, binary=True, limit=2_000_000); ext = ".svg" if data.lstrip()[:5] in (b"<svg ", b"<?xml") or val.endswith(".svg") else (".ico" if data[:4] == b"\x00\x00\x01\x00" else ".png")
            if ext == ".svg":
                txt = data.decode("utf-8", "replace").replace("currentColor", ink)
                if "xmlns=" not in txt: txt = txt.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
                data = txt.encode(); box = svg_box(txt)
            else:
                box = png_size(data)
            fn = f"logo-candidates/{n + 1:02d}-{re.sub(r'[^a-z0-9]+', '-', label.lower())}{ext}"
            open(f"{kit}/{fn}", "wb").write(data)
            saved.append({"file": fn, "score": score, "from": label, "box": box})
        except Exception as e:
            notes.append(f"logo candidate failed ({label}): {e}")
    logo = {"type": "image", "file": "brand/logo.svg", "viewBox": [100, 100]}
    wordmark = name
    if saved:
        best = saved[0]; ext = os.path.splitext(best["file"])[1]
        dst = f"brand/logo{ext}"
        os.makedirs(f"{kit}/brand", exist_ok=True)
        open(f"{kit}/{dst}", "wb").write(open(f"{kit}/{best['file']}", "rb").read())
        logo = {"type": "image", "file": dst, "viewBox": best["box"]}
        sq = [c for c in saved if c is not best and 0.8 < c["box"][0] / max(c["box"][1], 1) < 1.25 and max(c["box"]) >= 48 and not c["file"].endswith(".ico")]
        sq.sort(key=lambda c: (c["from"] not in ("apple-touch-icon", "mask-icon", "icon"), -max(c["box"])))
        if best["box"][0] / max(best["box"][1], 1) > 1.6 and sq:
            ext2 = os.path.splitext(sq[0]["file"])[1]
            open(f"{kit}/brand/icon{ext2}", "wb").write(open(f"{kit}/{sq[0]['file']}", "rb").read())
            logo["icon"] = f"brand/icon{ext2}"; notes.append(f"square icon for small spots: {sq[0]['file']} (check it)")
        if best["box"][0] / max(best["box"][1], 1) > 2.2:
            wordmark = ""; notes.append("the chosen logo is wide (it likely includes the name), so the wordmark is empty and the end card shows the logo alone")
    else:
        notes.append("no logo found: put the logo (SVG preferred) at brand/logo.svg and set logo.viewBox")

    # CTA + tagline
    texts = [html.unescape(re.sub(r"<[^>]+>", "", t)).strip() for t in re.findall(r"<(?:a|button)\b[^>]*>(.*?)</(?:a|button)>", page, re.S | re.I)]
    ctas = Counter(t for t in texts if 2 <= len(t) <= 40 and re.search(r"\b(start|try|get started|sign up|book|demo|free|join|download)\b", t, re.I))
    cta = ctas.most_common(1)[0][0] if ctas else f"Try {name} for free"
    h1 = html.unescape(re.sub(r"<[^>]+>", " ", (re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S | re.I) or re.search(r"(.*)", "")).group(1) or "")).split()
    tagline = h1[:7] if 2 <= len(h1) <= 9 else (desc.split()[:6] if desc else [name])

    b = {"id": a.id, "name": name, "status": "draft", "wordmark": wordmark, "url": host, "tagline": tagline, "cta": cta, "ctaAlt": [],
         "colors": colors, "fonts": fonts, "logo": logo, "voice": {"provider": "elevenlabs", "id": "uju3wxzG5OhpWcoi3SMy", "name": "Michael C. Vincent"},
         "taste": [], "sources": [url]}
    json.dump(b, open(f"{kit}/brand.json", "w"), indent=1, ensure_ascii=False)

    # product-truth draft from the site's own words
    heads = [html.unescape(re.sub(r"<[^>]+>", " ", h)).strip() for h in re.findall(r"<h[1-3][^>]*>(.*?)</h[1-3]>", page, re.S | re.I)]
    heads = [re.sub(r"\s+", " ", h) for h in heads if 3 < len(h) < 140]
    paras = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", p))).strip() for p in re.findall(r"<p[^>]*>(.*?)</p>", page, re.S | re.I)]
    paras = [p for p in paras if 40 < len(p) < 400][:25]
    nav = list(dict.fromkeys(urllib.parse.urljoin(url, h) for h in re.findall(r'<a[^>]+href=["\'](/[a-z0-9/_-]{2,60})["\']', page, re.I)))[:30]
    tpl = open(os.path.join(os.path.dirname(__file__), "templates", "product.md")).read()
    draft = tpl.replace("{{NAME}}", name).replace("{{URL}}", url).replace("{{DESC}}", desc or "(no meta description)")
    draft += "\n## Raw material from the homepage (unverified — sort into the sections above)\n\n**Headings**\n" + "\n".join(f"- {h}" for h in heads[:40])
    draft += "\n\n**Paragraphs**\n" + "\n".join(f"- {p}" for p in paras) + "\n\n**Pages to read next**\n" + "\n".join(f"- {n}" for n in nav) + "\n"
    open(f"{kit}/product.md", "w").write(draft)

    rep = [f"# Brand intake: {name}", "", f"Source: {url}  ·  kit: `{kit}`  ·  status: **draft**", "",
           "## Colours", f"- accent `{colors['accent']}` from {why['accent']}", f"- background `{colors['bg']}`, ink `{colors['ink']}`; the rest are derived (tints, grays, line)",
           f"- most used colours on the site: {', '.join(top[:14])}", "", "## Fonts", *[f"- {n}" for n in font_note], "",
           "## Logo", *(f"- {'**chosen** ' if i == 0 else ''}`{s['file']}` from {s['from']} (score {s['score']}, box {s['box']})" for i, s in enumerate(saved)), "",
           "## Strings", f"- name: {name}", f"- wordmark: {wordmark!r}", f"- url: {host}", f"- CTA: {cta!r} (other buttons: {', '.join(t for t, _ in ctas.most_common(6)) or '—'})", f"- tagline: {' '.join(tagline)!r}", "",
           "## Check before approving",
           "- Is the accent really the brand colour (not a link or a promo colour)? Compare with the logo.",
           "- Is the logo the real, current logo, and legible at small sizes? A square app icon is often better for the mark, a wide logo for the end card.",
           "- Font licences: web fonts downloaded here are for rendering this brand's own videos.",
           "- Rewrite the tagline and CTA with the user. Then fill product.md (read the pages listed there).", "",
           "## Notes", *[f"- {n}" for n in notes or ["none"]]]
    open(f"{kit}/intake.md", "w").write("\n".join(rep) + "\n")
    print(f"draft kit → {kit}\n" + "\n".join(rep[4:12]))


if __name__ == "__main__":
    main()
