# Conditional task detail drawer

## Context

The Dispatch plugin currently registers task details as an
`experimental_fixedTabs` view. BB opens the first fixed tab on a wide visit,
so the plugin shows an empty Task side panel even when the user is only
browsing the task list.

## Decision

Remove the host-owned fixed Task tab. Keep the task list as the only default
surface and render task details as a conditional right-side drawer inside the
Dispatch nav page.

## Behavior

- `/plugins/dispatch/tasks` renders the full-width task list with no detail
  drawer.
- Clicking a task title or its Start action navigates to
  `/plugins/dispatch/tasks/task/<id>` and opens the drawer.
- The drawer is driven by `subPath`, so browser back, the drawer close button,
  and a direct deep link behave consistently.
- Closing the drawer returns to the list without losing list filters or scroll
  state where the host preserves it.
- All existing detail actions remain available: editing, comments, subtasks,
  deletion, linked-thread display, and native BB thread creation.
- On compact viewports the drawer may occupy the available width; on wide
  viewports it is a bounded right rail beside the list.

## Implementation shape

`DispatchPage` owns route selection and renders `TaskDetail` in a local
drawer when `subPath` contains a task id. `app.tsx` registers only the main
`tasks` nav panel. `TaskDetail` receives the same route remainder and uses
`useBbNavigate` to close or open sibling tasks.

The drawer is a semantic side rail with token-based styling and an explicit
close control. It is non-modal on wide viewports so the task list remains
available beside the selected task; on compact viewports it occupies the
available panel width. No new backend or REST behavior is needed.

## Acceptance criteria

- The default Dispatch page has no empty Task side panel.
- Clicking a task opens the detail drawer and updates the URL.
- Refreshing a task deep link opens the same drawer.
- Closing/back returns to the list.
- Existing task detail and thread actions still render and typecheck.
- `npx tsc --noEmit`, `bb plugin types --check`, `bb plugin build`, and live
  browser QA pass.
