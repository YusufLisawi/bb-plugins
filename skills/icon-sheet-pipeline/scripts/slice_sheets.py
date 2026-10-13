#!/usr/bin/env python3
"""Slice generated icon sheets into trimmed, square, transparent icons.

Usage:
  slice_sheets.py manifest.json [--out DIR] [--size 160] [--format webp]

manifest.json:
  {"sheets_dir": "art/sheets", "out_dir": "web/static/icons", "size": 160,
   "sheets": {"gambits-7": {"cols": 5, "names": ["g/lemon", "g/twins", ...]},
              "tiles-1":   {"names": ["t/gold", "t/trap", ...]}}}   # cols defaults to 3

Cells are read left to right, top to bottom. Later sheets overwrite earlier ones with the
same name, so a redo sheet can be listed after the original. A sheet with an opaque corner
is assumed to use a magenta (#FF00FF-ish) key background and is keyed out first.
"""
import argparse, json, os, sys
from PIL import Image

def key_magenta(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if r > 200 and b > 200 and g < 80:
                px[x, y] = (0, 0, 0, 0)
    return im

def cell_icon(cell, size):
    bbox = cell.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bbox:
        raise ValueError('empty cell')
    icon = cell.crop(bbox)
    side = max(icon.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
    return square.resize((size, size), Image.LANCZOS)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('manifest')
    ap.add_argument('--out')
    ap.add_argument('--size', type=int)
    ap.add_argument('--format', default='webp', choices=['webp', 'png'])
    a = ap.parse_args()
    root = os.path.dirname(os.path.abspath(a.manifest))
    m = json.load(open(a.manifest))
    sheets_dir = os.path.join(root, m.get('sheets_dir', 'sheets'))
    out = a.out or os.path.join(root, m.get('out_dir', 'icons'))
    size = a.size or m.get('size', 160)
    done = 0
    for sheet, spec in m['sheets'].items():
        path = os.path.join(sheets_dir, sheet + '.png')
        if not os.path.exists(path):
            print('missing', path); continue
        im = Image.open(path).convert('RGBA')
        if im.getpixel((2, 2))[3] == 255:
            im = key_magenta(im)
        names = spec['names']; cols = spec.get('cols', 3); rows = -(-len(names) // cols)
        w, h = im.width // cols, im.height // rows
        for k, name in enumerate(names):
            x, y = (k % cols) * w, (k // cols) * h
            try:
                icon = cell_icon(im.crop((x, y, x + w, y + h)), size)
            except ValueError:
                print(f'EMPTY cell {k} ({name}) in {sheet}'); continue
            dest = os.path.join(out, f'{name}.{a.format}')
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            icon.save(dest, 'WEBP', quality=88, method=6) if a.format == 'webp' else icon.save(dest)
            done += 1
    print('icons', done, '->', out)

if __name__ == '__main__':
    sys.exit(main())
