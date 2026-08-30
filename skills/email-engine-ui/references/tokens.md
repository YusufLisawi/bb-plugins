# Token reference

Source of truth: `web/src/styles.css`, lines 1–120ish (`:root` and `:root[data-theme="light"]`). This file is a curated pointer to what's there, not a copy to trust blindly — re-check `styles.css` if a value here looks stale, since it's the only source that actually ships.

## Surfaces (dark default)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0f0f0f` | `#f5f7fa` | Page background |
| `--surface` | `#181818` | `#ffffff` | Cards, sidebar |
| `--surface-2` | `#1f1f1f` | `#f3f5f8` | Hover states, nested surfaces |
| `--surface-3` | `#262626` | `#e9edf2` | Third layer (e.g. active nested state) |
| `--border` | `#262b33` | `#e3e7ee` | Default hairline |
| `--border-strong` | `#333a44` | `#d3d9e2` | Emphasized divider, scrollbar thumb |

## Text

| Token | Dark | Light |
|---|---|---|
| `--text` | `#f2f2f2` | `#0f172a` |
| `--text-dim` | `#a3a3a3` | `#475569` |
| `--text-faint` | `#6e6e6e` | `#64748b` |

## Accent (brand blue — primary actions, active/selected state only)

| Token | Dark | Light |
|---|---|---|
| `--accent` | `#0376eb` | `#0258a8` (darker: needs AA against white, not just black) |
| `--accent-hover` | `#0262c0` | `#014686` |
| `--accent-soft` | `rgba(3,118,235,.14)` | `rgba(2,88,168,.1)` |
| `--accent-ring` | `rgba(3,118,235,.35)` | `rgba(2,88,168,.28)` |
| `--on-accent` | `#ffffff` | `#ffffff` |

## Status colors (closed set — match existing meaning, don't repurpose)

Each has a `-bg` tint at ~12–16% alpha for pill/badge backgrounds.

| Token | Meaning as used elsewhere in the app |
|---|---|
| `--green` | success / healthy |
| `--amber` | warning / in-progress caution |
| `--red` | error / danger / destructive action |
| `--gray` | neutral / disabled / unknown |
| `--purple` | a distinct categorical tag (check current usage before reusing) |
| `--slate` | secondary neutral, distinct from `--gray` in current usage |
| `--blue` | informational, distinct from `--accent` (accent = brand/primary, this = info) |

Dark and light values differ per color to hold AA contrast against each theme's surfaces — see `styles.css` for exact hex/rgba per theme.

## Shape, elevation, motion

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `10px` | Buttons, small controls, icon buttons |
| `--radius` | `14px` | Cards, standard containers |
| `--radius-lg` | `20px` | Larger surfaces (modals, drawers) |
| `--shadow-1` | subtle | Cards at rest |
| `--shadow-2` | medium | Popovers, dropdowns |
| `--shadow-pop` | strong | Modals, drawers |
| `--ease` | `cubic-bezier(0.2, 0.6, 0.2, 1)` | All transitions |
| `--dur` | `180ms` | Default transition duration (some layout transitions like sidebar collapse use longer, explicit durations — that's intentional, not a token to copy for ordinary hover/focus transitions) |

## Typography

| Token | Value |
|---|---|
| `--sans` | Montserrat, system sans fallback stack |
| `--mono` | Fira Code, system mono fallback stack |

Base body text: 14px / 1.55 line-height. Page titles (`.content h1`): 23px/700 weight. Card headers (`.card h2`): 14px/600. There's no formal type-scale beyond what's already used at each level — match the nearest existing heading/label rather than picking a new size.

## Z-index scale

| Token | Value |
|---|---|
| `--z-overlay` | 40 |
| `--z-drawer` | 50 |
| `--z-toast` | 100 |
| `--z-tooltip` | 110 |

Use these rather than an arbitrary `z-index` — a one-off value between two of these will eventually land on the wrong side of a stacking decision someone already made.

## Two-theme discipline

Every color used in a component must resolve through a token that has both a dark value (`:root`) and a light value (`:root[data-theme="light"]`). A literal color skips this and silently breaks whichever theme wasn't tested. When adding a new token, add both blocks in the same change.
