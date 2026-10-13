---
name: directed-asset-generation
description: Lead-and-artist workflow for generating any visual asset (icons, sprites, characters, bosses, backgrounds, tiles, textures, UI art, logos, marketing images) where you plan, brief and review while a Codex BB thread with the imagegen skill does the generation. Use whenever a project needs new images, a redo of off-style art, or several concepts to choose from, and image generation should go through a dedicated art agent rather than direct API calls.
---

# Directed asset generation

You are the **art lead**: you decide what is needed, write precise briefs, review every result
and integrate the approved files. A **Codex art thread** with its `imagegen` skill is the
**artist**: it generates, edits and saves images in the workspace. Never call image or video
generation APIs yourself. Never switch to another generation route without asking the user.

## 1. Intake (lead)

Before briefing anything, establish:

- **What and how many:** exact asset ids or file names, final order, and what each must show.
  Describe the *function* (what the item does, what the character is), not just a name.
- **Technical frame:** where it is used (UI chip, board tile, full-screen background, store
  listing), display size, aspect ratio, transparency, file format, naming/path convention.
- **Existing direction:** find current art, sheets, screenshots, brand kit, palette and fonts.
  Match them unless the user asked for a redesign. Pick 1–3 reference images.
- **Category rules:** framed vs frameless, outline weight, lighting, view angle, background.

If the request is vague (for example "make it look like game X"), look at references of X and
say in one line what you will take from it (shapes, palette, feel) before generating.

## 2. Set up the artist thread

Reuse an existing art thread for the project when there is one, so style context carries over.
Otherwise spawn one under the current thread:

```bash
bb thread spawn --parent-self --provider codex --title "Art · <project> <batch>" \
  --prompt-file - <<'EOF'
<brief, see templates>
EOF
```

Use the user's configured Codex model (do not override provider or model unless the user asked).
Parallel art threads are fine only when each writes to its own files or worktree.

## 3. Write the brief (pick the template from references/brief-templates.md)

Every brief states:

1. Output files: exact paths, sizes, format, transparency.
2. Layout: single image, or a grid sheet with columns × rows and **cell order listed id by id**.
3. Content per item: one line each, concrete and visual.
4. Style: medium (painted, flat, pixel…), outline, lighting, palette, references to match,
   "no text or letters" unless lettering is the point (logos).
5. What to reply with: saved paths, grid order, anything it could not do.

Batch similar items on one grid sheet (3×3, 5×2, 5×3…) for consistency. Do one-off hero
pieces (logo, boss portrait, background) as single images, 2–3 concepts when the user should choose.

After sending, stop polling. The artist's completion message comes back to you.

## 4. Review (lead)

When the artist replies:

- Open every image. For sheets, slice first (see `icon-sheet-pipeline` if available) and build a
  contact sheet on the real background colour.
- Check against the brief: correct content per id, consistent style and weight across the
  batch, category rules (frames, outline), clean transparency (no halos or boxes), nothing
  clipped, readable at real display size, no stray text.
- Anything wrong: send a short, specific redo for **only** those items ("cells 3 and 7: …";
  "redo the 5 tiles with coloured rounded frames like tiles-1.png") as a new small file, never
  a full regeneration of approved work.

## 5. Integrate and deliver

- Post-process locally: trim, square or resize, convert (WebP for web UI), generate size
  variants (favicons 32/64/192/512, apple-touch on the app background, store tiles).
- Wire into the product, then check the real screens in a browser before committing.
- Commit the source sheets or images, any slicing config and the final assets together.
- Show the user the result. In remote BB put images in the Generated Images viewer
  (`bb generated-images import --thread <id> <paths>`) instead of local file links.
- For concepts the user must pick from (logos, character directions), present them and wait;
  do not replace live assets until the user chooses.

## Rules

- One route: the Codex art thread with imagegen. No direct image API calls, no AI video unless
  the user asked, ask before switching routes or models.
- Ids, order and destination paths are decided before generation.
- Never ship an image you have not looked at.
- Keep provenance: note the brief/prompt and references next to the sheets when the project has
  a manifest or README for art.
