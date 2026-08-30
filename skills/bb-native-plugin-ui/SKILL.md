---
name: bb-native-plugin-ui
description: Build, redesign, or review user-facing UI in a BB plugin. Use whenever a BB plugin needs a nav page, list/detail flow, form, dialog, comments or activity view, right-panel tab, or visual polish—even when the user only says to make a plugin UI feel better. Make the result feel native to BB rather than like an embedded standalone dashboard.
---

# BB-native plugin UI

Use this skill to make plugin UI belong to BB's product surface: compact,
intentional, accessible, and built around the host's navigation, panels,
components, and theme.

The Dispatch task UI is the reference pattern. Its useful lesson is
architectural as well as visual: a quiet list is a launchpad, and the selected
task works in BB's host-owned right-panel tab.

## Start with the host contract

1. Read the `bb-plugin-authoring` skill and run `bb plugin types --check` in
   the plugin before relying on an experimental SDK surface. BB evolves its
   plugin APIs, and the installed declarations are the source of truth.
2. For visual work, use `/ui-ux-pro-max` to make a compact design contract and
   `/anti-ui-slop` to ground and finish the interface. Apply their guidance to
   the plugin's real job rather than importing a generic dashboard aesthetic.
3. Inspect the plugin's existing primitives, tokens, layout, and adjacent BB
   surfaces before adding anything. Reuse vendored BB shadcn source and host
   components; do not introduce a second design system.

`navPanel` supplies only a plugin page body. BB already owns the application
shell, panel chrome, Browser and Terminal tabs, split behavior, resizing,
keyboard commands, and persistence. Do not rebuild any of that inside the
plugin.

## Use BB's right panel for detail work

For an item detail that should feel like a real BB tab, use a `navPanel`
`fixedTabs` registration together with `experimental_useAppPanel()`. This is
the Dispatch pattern for clicking a task: it opens a custom tab in BB's right
panel instead of rendering a plugin-owned split page, drawer, or modal.

- Give the tab a stable `panelId` equal to its containing nav panel's `id`.
- Give its `experimental_target` a small, JSON-safe identifier such as
  `{ taskId }`; validate it before it reaches the detail component.
- Call `openFixedTab` from the list row, then navigate the plugin page to a
  deep-linkable `subPath` such as `task/<id>`.
- Let the URL carry durable identity for reload/back/forward. The tab target is
  session state, so use it only to select the host tab and re-fetch current
  data by id through RPC.
- In the detail component, require both the route id and a matching validated
  target. Show a loading state while they converge, not stale detail data.
- Use `layout: "flush"` for an app-like, full-height detail workspace that
  manages its own scrolling. Use `"padded"` only for document-like content.
- Make an intentional no-selection state because a fixed tab can exist before
  an item target is supplied. Never manufacture a fake task just to fill it.

Read [the right-panel reference](references/right-panel-tabs.md) whenever you
are adding a list/detail flow, a custom fixed tab, or deep-linkable selection.

Choose a host slot by where the user is working:

| Need | Use |
| --- | --- |
| A persistent detail next to a plugin nav page | `navPanel.fixedTabs` + `experimental_useAppPanel` |
| A detail launched from an existing thread | `threadPanelAction` |
| A detail launched from the New Thread screen | `experimental_newThreadPanelAction` |

Do not create a local right rail merely to imitate the native panel. It will
miss BB's tab strip, split placement, restoration, accessibility behavior, and
keyboard integration. A custom in-page drawer is appropriate only when the
experience truly needs temporary local inspection rather than a BB panel tab.

## Design the page as a calm working surface

Prefer a clear hierarchy over decoration:

- Give each surface one obvious primary action. In Dispatch, the list owns
  `New task`; the detail owns `Start thread` when the task has no BB thread.
- Keep list rows as whole-row buttons that open detail. Show title first, then
  a small amount of quiet status/priority/context metadata. Do not put several
  selects, repeated buttons, or inline mutation controls on every row.
- Keep broad filtering behind one quiet disclosure with an active count. Put
  common navigation in a compact tab switcher; put advanced options behind
  progressive disclosure.
- Keep a quick-add path low-friction. Reserve the full dialog for context,
  validation, and advanced fields.
- In details, group title, description, and properties before secondary work
  such as subtasks, activity, deletion, or handoff to an agent. Section rules
  and generous whitespace create hierarchy more reliably than stacks of cards.
- Let the full page or detail pane scroll normally with `min-h-0` and
  `overflow-y-auto`. Do not make search, tab, or action rows sticky by default;
  only pin controls when the task genuinely requires persistent access.
- Keep comments/activity as an editorial stream: small identity treatment,
  readable text, quiet timestamps, and one compact composer. Avoid a heavy
  card around every comment.
- Cover loading, empty, disconnected, validation-error, destructive-confirm,
  and retry states with the same restrained visual language as the happy path.

## Make controls feel deliberate

Use host token classes such as `bg-background`, `bg-card`, `bg-muted`,
`bg-state-hover`, `border-border`, `text-foreground`,
`text-muted-foreground`, `ring-ring`, and semantic destructive tokens. Those
follow the active BB theme; hand-picked gray or OKLCH values do not.

- Reuse `Button`, `Input`, `Textarea`, `Field`, `Select`, `Dialog`, and
  `AlertDialog` from the plugin's vendored BB registry source. Use `sonner`
  for toasts; do not mount a second toaster.
- Share compact control classes so inputs, selects, and textareas have one
  calm treatment: modest border contrast, subtle muted fill, readable
  13px-ish text, and clear focus state. Do not make inputs oversized or
  pill-shaped unless the surrounding BB surface calls for it.
- Pair every control with a real label (visually hidden is fine), meaningful
  errors, focus handling, and touch-safe height. Use `details` for optional
  configuration rather than showing every setting at once.
- Use `Markdown`, `ThreadChat`, `NewThreadComposer`, and other BB host
  components for BB-native capabilities instead of recreating their behavior
  in plugin UI.
- Avoid gradients, decorative color rails, ornamental badges, and colored
  left-edge stripes on cards or metric tiles. Convey hierarchy with spacing,
  typography, semantic status, and restrained surfaces.

## Finish gate

Before handing off UI work:

1. Exercise the real interaction path, including row-to-panel opening,
   deep-link refresh, back/close behavior, keyboard focus, and a narrow
   viewport. Verify that right-panel work opens as a BB tab rather than a
   plugin-made split.
2. Inspect loading, empty, error, form-validation, destructive, and long-text
   states. Check that tabs, controls, and comments still read quietly at dense
   widths.
3. Use `/pinchtab` for live browser QA; do not use `browser-bridge` or the
   `bridge` CLI.
4. Run the plugin's typecheck, `bb plugin types --check`, build, reload, and
   a focused live smoke test. Keep unrelated generated or dirty files out of
   the change.
