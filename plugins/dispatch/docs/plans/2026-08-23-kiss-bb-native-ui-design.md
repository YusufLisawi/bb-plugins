# BB-native KISS UI for Dispatch

## Goal

Make the Dispatch plugin feel like a small native BB surface instead of a
standalone task-management dashboard. The list should answer one question at
a glance: “What work can I act on?” Details and mutations should appear only
after a task is selected.

## Design direction

Use the existing BB theme tokens and vendored primitives: `bg-background`,
`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`,
`bg-state-hover`, and the existing `Button`, `Card`, and dialog components.
Keep the current dark-first visual language, restrained blue accent, compact
spacing, and accessible focus states. Do not add a new sidebar, custom color
system, gradients, or decorative chrome.

## Changes

- Keep a single page header with the current user context, one primary `New
  task` action, and a quiet refresh action.
- Keep one compact `Mine` / `Unclaimed` view switch. Move status, project, and
  completed-task controls into one optional filter popover so they do not
  compete with the main list.
- Keep quick add as one low-friction title field with the project selector
  tucked into the same control row; the full task dialog remains available for
  descriptions and advanced fields.
- Remove inline status and priority selectors, per-row `Start`, assignee
  counts, and redundant project chips. A row shows only the status marker,
  title, and quiet project/priority metadata, and the entire row opens details.
- Keep claiming available from the task detail drawer for unclaimed work.
- Reduce the drawer header and primary task card so title, status, priority,
  project, and the main edit fields are grouped in one compact surface. Keep
  comments, subtasks, deletion, and BB thread handoff as secondary sections.
- Preserve deep-linking and close/back behavior: no task selected means no
  detail panel is mounted.

## Interaction rules

- One obvious primary action per surface: `New task` on the list and `Start
  thread` when a task has no linked BB thread.
- Clicking a task row is the only list-to-detail path; task-specific mutations
  live in the drawer.
- Filters disclose only when requested and show a small active-filter count.
- Empty states explain the current view and offer one relevant next action.
- All controls retain labels, keyboard focus rings, and touch-safe heights.

## Acceptance checks

- The list is visibly shorter and contains no per-row select controls or
  repeated action buttons.
- Default view shows assigned open work without exposing completed tasks.
- Mine/unclaimed, status, project, and “show done” behavior still works.
- Claiming, editing, comments, subtasks, delete, and BB thread handoff still
  work from task details.
- Typecheck, plugin build, reload, and a direct RPC smoke check pass.
