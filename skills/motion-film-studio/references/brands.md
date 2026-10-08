# Brands: any product, one kit

The engine has no brand baked in. Every colour, font, the logo, the wordmark, the URL, the CTA wording, the narrator and the taste rules come from one **brand kit**, and every product claim comes from the kit's **product truth**. Brainfast is simply the default preset.

```mermaid
flowchart LR
  A[website / logo folder] -->|brand_intake.py| B[draft kit]
  B -->|you review + fix| C[brand-preview.sh]
  C -->|user approves| D[status: approved]
  D -->|new-project.sh --brand id| E[project, rebranded]
  B -. product.md draft .-> F[verify product truth]
  F --> E
```

## The flow for a new app or SaaS

1. **Intake.** `python3 $SKILL/scripts/brand_intake.py <url> <id>` writes a draft kit to `$MFS_ASSETS/brands/<id>/` (media, so outside the skill):
   - `brand.json`: name, URL, colours (accent + derived tints and grays), fonts (downloaded), logo (+ square icon), CTA, tagline, `status: "draft"`
   - `fonts/`, `brand/logo.*`, `brand/icon.*`, every logo candidate in `logo-candidates/`
   - `product.md`: a product-truth draft built from the site's own headings and paragraphs, plus the pages to read next
   - `intake.md`: what it found, from where, and what to check

   JavaScript-rendered sites give little in raw HTML. Save the rendered page with the browser (PinchTab, per AGENTS.md) and pass `--html saved.html`; read computed colours and fonts in the browser when the CSS is built at runtime. A folder of brand files from the user beats any scrape: copy their logo, fonts and hex codes into the kit by hand.

2. **Review the draft yourself.** Read `intake.md`, open the logo candidates, and fix `brand.json`. The usual fixes:
   - the accent picked a promo or link colour, not the brand colour (compare with the logo)
   - the sans is the site's display font; body text may be a different family
   - a wide logo with no square icon: set `logo.icon` to the app icon for small square spots
   - the tagline and CTA are raw site copy: rewrite them with the user
   - `wordmark: ""` when the logo already contains the name (the end card then shows the logo alone)

3. **Preview and approve.** Scaffold (or re-apply to) a scratch project, render the preview, and show it to the user:
   ```bash
   bash $SKILL/scripts/new-project.sh ~/Developer/<id>-films --brand <id>
   bash $SKILL/scripts/brand-preview.sh ~/Developer/<id>-films      # → out/brand/preview.png
   ```
   The preview is one image: palette with hex codes, type specimen, the logo, a chat and a system card in the brand's colours, and the real end card with the CTA and URL. On the user's OK set `"status": "approved"` in the kit and `brand.sh apply <id> <project>` again. **No film starts from a draft kit.**

4. **Verify the product truth** (`product.md`, below) before writing any script.

5. Make films as usual: `new-film.sh`, then the normal workflow.

## Commands

| Command | Does |
|---|---|
| `brand_intake.py <url> <id> [--out DIR] [--html FILE] [--name NAME]` | website → draft kit |
| `brand.sh list` | every kit and its status |
| `brand.sh check <id\|dir> [project]` | validates brand.json and the files it points to |
| `brand.sh apply <id\|dir> <project>` | writes the kit into a project: `src/remotion/brand.json`, `public/fonts/`, logo files, `brand/product.md` |
| `new-project.sh <dir> --brand <id\|dir>` | scaffold already rebranded (default `brainfast`) |
| `brand-preview.sh <project> [out.png]` | the approval image |

Kits are looked up by id in `$SKILL/brands/<id>` (text-only presets: Brainfast) and then `$MFS_ASSETS/brands/<id>` (kits with font and logo files), or pass a folder.

## brand.json

```json
{
  "id": "acme", "name": "Acme", "status": "draft | approved",
  "wordmark": "acme", "url": "acme.com",
  "tagline": ["Ship", "email", "that", "lands."],
  "cta": "Get started for free", "ctaAlt": ["Try it free"],
  "colors": { "bg": "#FFFFFF", "surface": "#F4F4F5", "white": "#FFFFFF", "ink": "#0A0A0A", "night": "#050505",
              "accent": "#5B5BD6", "accentDeep": "#4747B8", "accentLight": "#9B9BEA", "accentTint": "#E6E6FA",
              "gray": "#71717A", "gray2": "#A1A1AA", "line": "#E4E4E7", "success": "#2E9C6A", "successTint": "#EAF6EF" },
  "fonts": { "sans": { "family": "Inter", "faces": [{ "file": "Inter-VF.woff2", "weight": "100 900", "style": "normal" }] },
             "mono": { "family": "JetBrains Mono", "faces": [{ "file": "JBMono-400.woff2", "weight": "400" }] },
             "wordmarkWeight": 700, "wordmarkTracking": -0.02 },
  "logo": { "type": "image", "file": "brand/logo.svg", "viewBox": [377, 81], "icon": "brand/icon.png" },
  "voice": { "provider": "elevenlabs | fish", "id": "uju3wxzG5OhpWcoi3SMy", "name": "Michael C. Vincent" },
  "taste": ["rules from the user's feedback for THIS brand"],
  "sources": ["where each value came from"]
}
```

- **Colours** keep the kit's original key names inside the engine (`C.coral` = accent, `C.cream` = bg, `C.sand` = surface, `C.green` = success), so every kit piece and every example film works for any brand. Never hard-code a hex in a film.
- **Fonts**: woff2/ttf/otf files in the kit's `fonts/`. Prefer variable files (type can animate weight). Missing fonts fall back to DM Sans / DM Mono, which the asset pack always has.
- **Logo**:
  - `"stroke"`: `parts` (SVG path `d` strings in pen order), optional `nubs`, `stroke` width, `viewBox`. `Mark` draws it as a pen stroke with a travelling head and a shine (Brainfast).
  - `"image"`: an SVG (best) or PNG in the kit. `Mark` reveals it with a wipe; trails and pen heads are skipped. If it's wide, add `icon` (square) for avatar tiles and the corner bug.
  - A single-line logo can be converted to `"stroke"` by hand (trace its centre line into `parts`) when the pen-draw reveal matters.
- **voice**: the narrator and its engine (`elevenlabs` or `fish`, see voice.md). Pass them to `vo_take.py --provider … --voice …`. Change it only when the user wants a different voice for this brand.
- **taste**: this brand's hard rules. They sit next to the global ones in SKILL.md.

## Product truth (product.md)

Every claim a film makes about the product must trace to a line in `brand/product.md`, and every line there has a source. This is what kept the Brainfast films honest: the tool types, the campaign settings and "Email (coming soon)" were all checked in the code before a script used them.

- **Build it** from the intake draft: read the pages it lists (features, pricing, docs, changelog), the app itself (screens, exact button labels), and the codebase when you have it (grep for feature names and UI strings).
- **Sections** (template in `scripts/templates/product.md`): what it is · who it's for · features (verified) with exact UI strings and a source · integrations and channels · **NOT supported** · numbers a film may use, with their source · words and taste · sources.
- **Use it**: the script's claims come from it; on-screen UI uses its exact strings; the README's *Content check* lists each product claim the film makes, with its product.md line. Anything fictional (the customer, the business, the numbers) is labelled as such in the README.
- Keep it current. When a film needs a claim that isn't there, verify it first and add it.

## Taste stays per brand

The global taste in SKILL.md (upbeat and smooth, fill the frame, no code on screen for business audiences, generic enough that anyone relates) applies to every brand. A brand's own rules (a narrator it rejected, words it avoids, a competitor it never names) go in its `taste` list and its product.md, not in the skill's global rules.
