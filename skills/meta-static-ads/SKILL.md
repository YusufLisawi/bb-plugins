---
name: meta-static-ads
description: Produce on-brand static social ads for any brand (Meta/Instagram/Facebook feed 4:5, square, stories) as HTML designs rendered to max-quality PNGs, from a brand kit (logos, fonts, colors) plus photorealistic AI stock photos with a strict QA loop, delivered as a swipeable carousel with PNG/ZIP downloads. Use whenever the user asks for ad creatives, static ads, Meta ads, Instagram/Facebook ad designs, social banners, "anuncios", campaign visuals or more ad variations for an app or brand — even if they only paste a brand-kit zip or photos and say "make ads". For Eva Salud specifically, prefer the eva-salud-ads skill (brand already bundled). Works in Codex, Claude Code, bb or any agent that reads skills.
---

# Meta static ads (any brand)

Brand kit + product facts → AI background photos → strict photo QA → HTML ads → 2× PNG renders + ZIP → carousel link.

`$SKILL` below means this skill's directory. **For Eva Salud, use `eva-salud-ads` instead**: it has the same workflow with the brand, template and photo library already bundled.

The user cares about three things: photos that look **genuinely real** with zero AI mistakes, simple on-brand layouts, and copy in the right language. Anything they have to point out themselves is a failure. Check everything before you show it.

## Agent-specific notes: Codex vs Claude Code vs bb

This skill runs in any agent that reads `SKILL.md`. The workflow is the same everywhere; what differs is **how you make images, look at images, and share the result**. Work out which environment you're in first.

| | **Codex** (CLI / app) | **Claude Code** (or other agents without image generation) | **bb** (any provider) |
|---|---|---|---|
| Install path | `~/.codex/skills/<skill>/` | `~/.claude/skills/<skill>/` | `~/.bb/skills/<skill>/` (synced from the skills repo) |
| Generate photos | **Built-in image generation tool**, directly. No API key needed. Use the largest portrait size, make variations and keep the best. | **Can't generate images.** Ask the user for an OpenAI API key and run `scripts/generate_image.py` (model `gpt-image-2.5`). | If this thread can't generate images, delegate to a Codex child (`bb thread spawn --provider codex --model gpt-5.6-luna --reasoning-level max …`). Otherwise use route 3. |
| Fix a bad photo | Regenerate or edit with your image tool, passing the bad image as reference plus the exact correction | `generate_image.py --edit <img> --prompt "Keep everything. Fix: …"` | `bb thread tell <child> --mode auto "Read FIXES-N.md …"` |
| Look at photos and renders (QA) | Open each file with the image viewing tool (e.g. `view_image`) at full size | `Read` tool on the PNG/JPG (it shows images); crop with PIL to zoom into details | Same as the underlying provider |
| Secrets | Not needed for images | Key via env var `OPENAI_API_KEY` or `<project>/.env`. Never echo it, commit it, or put it in shared ZIPs | Use the `secrets` skill so the key never appears in chat |
| Share the carousel | `scripts/serve.sh` → give `http://localhost:8765/` (user opens locally) or the folder path | Same as Codex | `scripts/serve.sh` also runs `bb connect expose` → give the public URL as a markdown link |
| Sandbox gotchas | Workspace-write sandboxes may block `/tmp` or network: keep the project inside the workspace, and ask for approval if headless Chrome or `http.server` is blocked | Headless Chrome needed for renders; if it's a snap Chromium it can't read `/tmp` or hidden dirs (scripts already screenshot into `~/meta-ads-tmp`) | Parent permission mode caps the child's |

Rules that apply everywhere:
- **Never skip the full-size visual review because a tool or child says "done/fixed".** Verify the file changed and look at it.
- **Codex: don't spend an API key or install an OpenAI SDK.** Your built-in tool is better and free of setup.
- **Claude Code: don't pretend to have generated images, or fall back to random stock URLs.** Either get the key and use the script, or reuse the approved photo library (Eva) and say what's missing.
- **In any agent without a browser/Chrome,** say so and deliver the HTML folder plus instructions (`python3 -m http.server`, then open it). Rendering PNGs needs Chrome/Chromium.

## 1. Gather brand inputs

- **Brand kit.** Download and unzip it into a project dir (e.g. `/tmp/<brand>-ads/`). Read the manual (`pdftotext`) for palette, typography, logo rules and photo mood. A palette screenshot from the user overrides the manual.
- **Scaffold.** Create `site/{fonts,img,img/ai,img/web,png}` and copy `assets/example-carousel.html` to `site/index.html`. It's a complete carousel with 8 example ads, one per layout, currently styled for Eva. Swap in the new brand: `@font-face` fonts, the `:root` color variables, logo files, header text and `PNG_PREFIX`.
- **Logos.** Make positive, all-white and negative SVG versions. Pull the brand symbol out with `scripts/extract_isotype.sh <logo.svg> <path class|fill> site/img/<name>`. It measures the real bounding box. A hand-typed viewBox once cropped the top of the symbol.
- **Product facts.** Only claim real features. If the product's code or copy is available (e.g. an i18n JSON), grep it. Never invent prices, timings or services. List unverified claims for the user at the end.
- **Language.** Use the one the user wants (e.g. Castilian Spanish). Short, warm, one idea per ad.
- **Design best practices.** Read `references/ad-design-best-practices.md` before planning concepts. It covers formats and safe zones, the 1-second hierarchy and squint test, copy length, photos, contrast, logo, CTA, **carousel ads** (hook card, visual thread, CTA card), series and A/B variants, Meta policy (personal attributes in health ads) and the export pre-flight checklist.

## 2. Photos

Write `BRIEF.md` using `references/example-brief-eva-salud.md` as the model:
- output folder, exact filenames, 4:5 portrait at the largest available size
- the **global realism block**: editorial stock look, full-frame camera, 35/50mm, natural light, real skin, correct anatomy, perfect hands, no plastic/HDR, no text, logos or watermarks, market-appropriate people and places, palette nudged to the brand
- the **device rule**, in every brief: phones, tablets and laptops face the person using them, so the camera sees the back of the device, never screen content. A screen facing the viewer while the person looks at it is physically wrong, and generators mangle fingers when they try it.
- per image: scene, people, action and emotion, where the devices are, **where the negative space is**

Generate with whatever this agent supports, and save originals to `site/img/ai/<name>.png`:

1. **Built-in image generation** (Codex and similar): use it directly. Make variations and keep the best.
2. **bb, but no image tool here:** delegate to a Codex child and wait for its report without polling. Default model is `gpt-5.6-luna` at max reasoning unless the user says otherwise:
   `bb thread spawn --parent-self --project "$BB_PROJECT_ID" --provider codex --model gpt-5.6-luna --reasoning-level max --permission-mode full --environment <project_dir> --prompt "Read <project_dir>/BRIEF.md and generate every image into site/img/ai/ …"`
   Send fixes with `bb thread tell <id> --mode auto "Read FIXES-N.md …"`.
3. **No image generation** (e.g. Claude Code outside bb): use the OpenAI Images API with **gpt-image-2.5**.
   - If `OPENAI_API_KEY` isn't set, ask the user for an OpenAI API key. In bb, use the `secrets` skill; elsewhere, an env var or `<project_dir>/.env`.
   - Never echo or log the key, and keep `.env` out of shared files.
   ```bash
   python3 $SKILL/scripts/generate_image.py --prompt-file prompts/<name>.txt --out site/img/ai/<name>.png --n 3
   python3 $SKILL/scripts/generate_image.py --edit site/img/ai/<name>.png --prompt "Keep everything. Fix: …" --out site/img/ai/<name>.png
   ```

## 3. Review every photo yourself

Open each image at full size. Never trust a generator's or child's claim that something is fixed; one "replaced" file was actually unchanged. Check:
- [ ] No screen content faces the viewer; devices face their users.
- [ ] Hands: exactly 2 per person, 5 natural fingers, believable grips, no ownerless hands.
- [ ] Eyes, teeth and skin look real.
- [ ] Objects are physically sound (no holes, melted edges, floating items); no gibberish text or logos.
- [ ] Gaze and roles are consistent; scene fits the market and brief; negative space exists.

For each failure, write a fixes note (`references/example-fixes-round.md`): file, exact error, why it's wrong, the corrected composition, "keep everything else". Regenerate or edit, then re-check. Loop until all pass. When the user reports one mistake, look for that class of mistake across **all** images.

Then run `$SKILL/scripts/web_images.sh site/img/ai site/img/web`.

## 4. Build the ads

Each ad: `<section class="slide" data-name="…"><div class="frame"><div class="ad LAYOUT">…</div></div></section>`. Photos use `background-image:url(img/web/<name>.jpg)`. In HQ render mode the page swaps in `img/ai/<name>.png` automatically.

| Layout | Use |
|---|---|
| `P` white panel bottom | Safest; any photo |
| `N` dark band bottom + faint symbol | Any photo |
| `B g`/`B n` bottom brand gradient, white text | Faces in the top two-thirds |
| `T light`/`T dark` text on top | Only with real empty space in the top ~35% |
| `L` text left over light gradient | Subject on the right |
| `V` brand color, typography only | No photo |

Extras: `.chat`, `.card`, `.pill`, `.cta` (`.white`/`.navy`), `.logo.chip`.

Rules:
- **Text never covers faces.** Change the layout rather than zooming the photo; zoom plus gradient washes faces out.
- **The symbol is always whole.**
- **CTAs are content-width.**
- **Logos stay readable.** Use a chip on busy areas.
- **Replaced logo or symbol files get a new `?v=N`** on their `src`. Serve with `scripts/serve.sh` (no-cache), or browsers keep showing the stale, broken file.
- **Keep it simple:** headline ≤3 lines with one highlighted phrase, one sub, one CTA.

## 5. Render at max quality, check, share

```bash
$SKILL/scripts/serve.sh <project_dir>/site 8765
$SKILL/scripts/render_ads.sh http://localhost:8765/index.html <count> <project_dir>/site/png <PNG_PREFIX> [scale=2]
```

- **Renders:** `<prefix>-N.png` at 2160×2700 (lossless, 2× device scale, original AI photos), `<prefix>-todos.zip`, and contact sheets in `png/_check/`. The carousel's download links use these names, so `PNG_PREFIX` must match.
- **Review:** read every sheet (overlaps, cropped symbols, stretched CTAs, low-contrast logos, missing photos) plus the pre-flight checklist in `ad-design-best-practices.md`, fix, re-render. Crop and zoom the 2× PNG to verify small details like symbol tips and accents.
- **Share:** in bb, `serve.sh` prints the public `bb connect` URL; give it as a markdown link. Elsewhere, give the local URL or folder.
- **Series:** keep earlier series as `v1.html` etc., linked from the header.

## 6. Report back (short)

- the carousel link
- the list of ads (headline each)
- what QA caught and fixed
- unverified claims to confirm
- file location (suggest a permanent folder if they're in `/tmp`)
