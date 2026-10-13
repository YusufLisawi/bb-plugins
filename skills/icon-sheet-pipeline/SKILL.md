---
name: icon-sheet-pipeline
description: Produce batches of consistent game icons, logos and small UI art through an image-generation agent, as grid sheets that are sliced, QA'd and wired into the game. Use when a game needs new icons for items, gambits, cards, tiles, traits, abilities, bosses or currencies, a redo of icons that look off-style, or new logo concepts.
---

# Icon sheet pipeline

Generate many small assets at once as **grid sheets**, then slice them into individual files. One
sheet per batch keeps the style consistent and makes review cheap. The flow below is the one
used for Gambit Arena (gambits, tiles, traits, bosses, logo); adapt names and paths per project.

## 1. Plan the batch (you, before any generation)

1. **List the exact ids** the code will look up, in final order, with a one-line visual idea each.
   The idea should show the *mechanic*, not the name: "pawn holding a coin purse", "hourglass with
   sound rings". Avoid text and letters inside icons.
2. **Group by category** (e.g. gambits / tiles / traits). Each category has a frame rule:
   tiles in coloured rounded-square frames, traits and gambits frameless, and so on. Check the
   existing sheets so a new batch matches; mixing framed and frameless in one category looks broken.
3. **Choose the grid.** 3×3 for small batches, 5 columns for larger ones (5×2, 5×3). Keep cells
   square. Record the order in the slicing manifest *before* generating.
4. **Pick style references**: 1–3 existing sheets or icons in the same category, plus the game
   UI background colour the icons will sit on.

## 2. Generate through the image agent (never call image APIs directly)

Send one message per sheet to the dedicated art thread or agent that has the image-generation
skill (in BB: a Codex thread with `imagegen`; reuse the existing art thread so it keeps context).
Include:

- The sheet file name and destination, e.g. `art/sheets/gambits-7.png`.
- Grid shape and cell order, with one line per cell: `id "Name" – visual idea`.
- Style rules: painted (not pixel art), transparent background, no borders unless the category
  uses frames, thick dark outline, same lighting and saturation as the references, no text.
- The reference images to match.
- "Reply with saved paths and the grid order."

For logos: ask for 2–3 distinct concepts, each as a lockup (mark + exact wordmark) and a
standalone mark, transparent, readable small. Present them to the user before replacing anything.

## 3. Slice

Add the sheet to the project's slicing manifest (or `art/slice.py` SHEETS/COLS) and run:

```bash
python3 .claude/skills/icon-sheet-pipeline/scripts/slice_sheets.py art/icons.json
```

The slicer trims each cell to its alpha bounds, centres it on a square canvas and resizes it
(160 px WebP by default). A sheet with an opaque corner is keyed on magenta first. A redo sheet
listed after the original overwrites those icons.

## 4. QA every batch visually

```bash
python3 .claude/skills/icon-sheet-pipeline/scripts/contact_sheet.py /tmp/batch.png web/static/icons/g/{lemon,twins,...}.webp --bg '#262421'
```

Open the contact sheet and check:

- **Centred and complete:** no clipped edges, no neighbouring cell bleeding in.
- **Consistent weight:** similar size and detail, matching outline thickness.
- **Category rules hold:** frames where the category has frames, none where it doesn't.
- **Readable at real size:** about 24–60 px in the UI, on the real background colour.
- **Matches the mechanic:** the image says what the item does.

If something fails, ask the art agent to redo **only those cells** as a small new sheet (e.g.
`tiles-4.png`, one row of 5), slice it after the original, and re-check.

## 5. Wire in and ship

- Icons are discovered by file name (`static/icons/<category>/<id>.webp`); rebuild the web
  bundle if the project generates an icon list.
- Check the real screens in a browser (catalog, shop, rails, tooltips) before committing.
- Commit the sheet (`art/sheets/…`), the slicing manifest change and the sliced icons together.
- Show the user the contact sheet. In remote BB use the Generated Images viewer
  (`bb generated-images import --thread <id> <paths>`), not local file links.

## Logos into the product

From the chosen concept: crop tight, produce a square mark (512/192/96/64/32 PNG plus a WebP for
the UI), a wide lockup WebP, an apple-touch icon on the app background, then update the favicon
links, web manifest icons, in-app logo spots and any external listing tile.

## Hard rules

- Ids and grid order are decided before generation; never guess the order after the fact.
- One generation route only (the image agent). Ask the user before switching tools.
- Never ship a batch without looking at the contact sheet.
