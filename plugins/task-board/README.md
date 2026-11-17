# Task Board

A calm kanban for BB threads. A task is a prompt that runs in a thread, and one
thread can hold many tasks over time.

| Column | Meaning |
| --- | --- |
| Todo | Drafted. Starts only when you run it. |
| Queued | Waits for a time, for its thread to be free, or for another task. |
| In progress | Sent. Moves to Done when the agent's turn ends. |
| Done | Finished. A repeating task queues its next run. |

- Click a card to open it in BB's right panel: the live thread (chat, steer,
  model) on the **Thread** tab, and prompt, thread, model, priority, start
  and repeat on the **Task** tab.
- Open the real thread in a split (`Ctrl/⌘ ⇧ S`) or full view (`Ctrl/⌘ ⇧ O`).
- `Ctrl/⌘ ⇧ K` opens the board; on the board, `C` adds a task and `/`
  focuses quick add.
- Drag cards between columns: to In progress runs now, to Queued schedules,
  to Done marks done, to Todo unschedules.
- A failed or interrupted turn flags the card and pauses everything waiting on
  it until you retry it or mark it done.

## Develop

```sh
npm install
npm run typecheck && npm test
bb plugin build && bb plugin reload task-board
```

`bb task-board list|add|run` is documented in `skills/task-board/SKILL.md`.
