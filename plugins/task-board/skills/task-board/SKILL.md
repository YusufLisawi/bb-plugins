---
name: task-board
description: Add, list, and start Task Board tasks (prompts queued on BB threads) with the `bb task-board` command. Use when the user asks to put work on their task board, queue a follow-up on a thread, or check what is queued or running.
---

# Task Board

Task Board is a kanban of agent tasks. A task is a prompt that runs in a BB
thread; one thread can hold many tasks over time. Columns are Todo, Queued,
In progress, and Done.

- **Todo**: drafted, starts only when the user runs it.
- **Queued**: waits for a time, for its thread to be free, or for another
  task to finish. Tasks on one thread run one at a time, in priority order.
- **In progress**: the prompt was sent; it moves to Done when the turn ends.
  A failed or interrupted turn flags the card and pauses tasks waiting on it.
- **Done**: finished. A repeating task queues its next run here.

## Commands

```sh
bb task-board list [--status todo|queued|running|done] [--json]
bb task-board add "<prompt>" --project <proj_id>   # runs in a new thread
bb task-board add "<prompt>" --thread <thr_id>     # runs in that thread
bb task-board run <task-id>                        # now, or when its thread frees up
```

To queue a follow-up on the current thread, add it with
`--thread "$BB_THREAD_ID"` and let the user schedule it on the board. Do not
`run` a task on your own thread from inside a turn; it would only start after
your turn ends.

Scheduling, repeats, models, and chains are set in the board's task panel.
