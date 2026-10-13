#!/usr/bin/env python3
"""Compose sliced icons on the game's background colour for a visual QA pass.

Usage: contact_sheet.py OUT.png ICON [ICON ...] [--cols 5] [--bg #262421] [--cell 170]
Look at the result: every icon centred, same visual weight, no halos, no clipped edges,
frames/borders consistent within a category.
"""
import argparse
from PIL import Image

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out'); ap.add_argument('icons', nargs='+')
    ap.add_argument('--cols', type=int, default=5); ap.add_argument('--cell', type=int, default=170)
    ap.add_argument('--bg', default='#262421')
    a = ap.parse_args()
    rows = -(-len(a.icons) // a.cols)
    bg = tuple(int(a.bg[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    sheet = Image.new('RGBA', (a.cols * a.cell, rows * a.cell), bg)
    for k, p in enumerate(a.icons):
        im = Image.open(p).convert('RGBA')
        im.thumbnail((a.cell - 10, a.cell - 10))
        sheet.alpha_composite(im, ((k % a.cols) * a.cell + 5, (k // a.cols) * a.cell + 5))
    sheet.save(a.out)
    print(a.out)

if __name__ == '__main__':
    main()
