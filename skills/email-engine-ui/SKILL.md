---
name: email-engine-ui
description: Build or change UI in the email-engine dashboard (web/, React + Vite + TanStack Router/Query, plain CSS with custom-property tokens — no Tailwind, no shadcn, no CSS-in-JS). Use whenever a task touches web/src — a new page, component, table, form, modal, drawer, chart, badge, or any visual/layout/animation change — so new UI reuses the existing design tokens (web/src/styles.css) and primitives (web/src/components/primitives.tsx) instead of inventing new colors, spacing, or one-off components. Trigger on "add a page", "new component", "style this", "make a table/modal/form", "dashboard UI", "add a chart", or any React/CSS edit under web/.
---

# email-engine dashboard UI

This is a **narrow, project-specific** skill, not a general UI/UX library. It exists because this codebase already has one consistent visual system, and the biggest risk on any UI task is a second one growing next to it — a hand-rolled button, an ad-hoc hex color, a new modal shape. The job here is almost always "reuse the existing thing," rarely "invent a new thing."

## The stack (and what's deliberately absent)

- React 18 + Vite + TanStack Router + TanStack Query. No Next.js, no server components, no Redux.
- Plain CSS in one file, `web/src/styles.css`, using CSS custom properties as design tokens. No Tailwind, no shadcn/ui, no styled-components/CSS-in-JS, no component library.
- One shared primitives module, `web/src/components/primitives.tsx`, that every feature module composes from.

If a task seems to call for installing a UI library or a CSS framework, that's a signal to stop and check with the user rather than doing it — it would fork the design system, not extend it.

## Golden rule: check before you build

Before writing new JSX markup or new CSS for something that looks like a button, table, modal, drawer, badge, form field, tab set, toggle, progress bar, empty state, or loading skeleton — check `primitives.tsx` first. It almost certainly already exists. Building a parallel version is the single most common way this codebase's UI drifts.

| Need | Use | Notes |
|---|---|---|
| Button | `Button` | `variant`: primary (default) / secondary / danger / ghost. `size`: normal / small. `loading` shows a spinner and disables input — use for in-flight mutations, don't roll your own disabled+spinner logic. |
| Data table | `Table<T>` | Generic, column-driven. Pair with `SkeletonTableRows` for the loading state so column widths don't jump when data lands. |
| Modal dialog | `Modal` | Fixed-size, actions pinned via `.modal-actions`. |
| Side panel | `Drawer` | Prefer over `Modal` once content can scroll — a modal's actions scroll away with the body; a drawer's footer stays pinned. |
| Dismiss animation for either | `useDismiss(onClose)` | Gives `closing`/`close()`; the hook unmounts after the exit transition finishes instead of yanking the panel away mid-animation. |
| Status pill with the word visible | `StatusBadge` / `HealthBadge` | |
| Status in a dense table column | `HealthDot` | A column of repeated "healthy" pills is noise that hides the one exception — the dot drops the word but keeps status in `aria-label` and `title`, so color is never the only channel. |
| Form field wrapper | `Field` | Label + control + optional hint, one consistent stack. |
| Checkbox-shaped boolean (a selection) | `Checkbox` | |
| On/off-shaped boolean (a setting) | `Switch` | Semantically distinct from `Checkbox` — reads as a state, not a selection. Renders `role="switch"`. |
| Grid of selectable cards | `OptionCards` | For choices where a bare radio label isn't enough context and a bigger tap target helps. |
| Section container | `Card` | |
| Page title + subtitle + actions row | `PageHeader` | |
| Tab navigation | `Tabs` / `TabPanel` | |
| Progress bar | `Progress` | |
| "Nothing here yet" state | `EmptyState` | |
| Loading placeholder | `Skeleton` / `SkeletonText` / `SkeletonTableRows` / `SkeletonStats` | Sized to roughly match the real content so nothing jumps on load. Mark the container `aria-busy`; the skeletons themselves are `aria-hidden` so assistive tech announces "busy" once, not a dozen empty cells. |
| Date/bool/relative-time formatting | `fmtDate`, `bool`, `relTime` | Don't hand-format dates inline — use these so formatting stays consistent across modules. |

If something genuinely doesn't exist yet (say, a chart), look for the nearest existing pattern to extend rather than starting from a blank canvas — check `web/src/modules/*` for prior art before assuming there is none.

## Tokens: the vocabulary, not a menu to browse

`styles.css` defines the full token set (colors, radii, shadows, type, motion, z-index) once at the top, with a light-theme override block (`:root[data-theme="light"]`) beneath it. Full reference: [references/tokens.md](references/tokens.md).

The short version:
- Never write a literal hex color, `px` shadow, or `ms` duration in a component. Use the `var(--...)` token. If the right token doesn't exist yet, that's rarer than it seems — re-check the list before adding one, and if you do add one, add it to *both* the dark block and the light override block, not just one.
- Status color (green/amber/red/gray/purple/slate/blue) is a closed set tied to specific meanings already used across the app (e.g. red = error/danger, never repurpose it for "featured" or "new"). Match meaning to existing usage, don't pick "a color that looks nice."
- `--accent` is brand blue and is reserved for primary actions and active/selected state — it used to be a color that read as an error state on buttons, which is why the codebase is careful about not letting accent and `--red` overlap. Don't introduce a second "primary-looking" color.
- Motion always uses `var(--dur)` (180ms) and `var(--ease)`. There's no second timing scale — a hand-picked duration will read as slightly off next to everything else that moves.

## Accessibility rules specific to this app

These aren't generic a11y advice — they're patterns this codebase already committed to, so follow them rather than reintroducing the problem they solved:
- `:focus-visible` is styled globally (solid accent outline + soft ring) — don't suppress it with `outline: none` on a custom control; if a focus ring looks wrong on something, fix the element's box model, not the outline.
- Status/meaning is never color-only. Anywhere you're tempted to convey state with just a background tint (a colored dot, a colored row), also carry it in text, `title`, or `aria-label` — see `HealthDot` for the pattern.
- Numeric table columns get `font-variant-numeric: tabular-nums` (already global for `td`, `.num`, `.badge`) so digits align — don't override that with a custom font-variant.
- Modals and drawers are real dialogs: `role="dialog"`, `aria-modal="true"`, an accessible label from the title, and Escape-to-close. Both existing primitives do this already — if you're building a new overlay instead of using `Modal`/`Drawer`, replicate all of it, not just the visuals.

## Layout stance: desktop-first internal tool

This is an internal dashboard, not a marketing site or a mobile app. `.content` caps at `max-width: 1480px`; the sidebar collapses to a 76px icon rail rather than disappearing behind a hamburger. Don't add phone-first responsive breakpoints, hamburger nav, or bottom-tab-bar patterns unless the user specifically asks for mobile support — they're solving a problem this product doesn't have, and they're one more layout mode to keep in sync with the desktop one.

Spacing is not on a strict formal scale (you'll see 22px, 18px, 14px, 12px card padding side by side) — when adding spacing, match the values already used by visually adjacent elements rather than importing a scale (like a 4px/8px grid) the rest of the file doesn't follow.

## Adding something new

1. Search `primitives.tsx` and the relevant `web/src/modules/<feature>/` for something close enough to extend. Most "new" UI is an existing primitive plus one new prop.
2. If new CSS is genuinely needed, add it to `styles.css` near related rules (e.g. table styling near `.table`, not at the end of the file), using existing tokens exclusively.
3. Write a short comment explaining *why* when a rule isn't self-evident (an animation-timing gotcha, an accessibility reason for an odd markup choice) — this file already does that throughout, and an undocumented rule is the one someone "simplifies" into a regression later. Don't comment what the CSS obviously does.
4. Check the result isn't dark-theme-only: anything using a raw color instead of a token will look fine in dark mode and break in light mode, since only tokens flip between the two blocks.
5. If you touched `Table`, `Modal`, or `Drawer` usage, confirm loading state (`Skeleton*`) and empty state (`EmptyState`) are still wired up — both are easy to forget when only the "happy path" gets tested.
