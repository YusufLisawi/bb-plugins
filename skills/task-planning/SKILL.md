---
name: task-planning
description: Turn rough ideas, dictations, source documents, or feature requests into grounded, prioritized implementation plans and, when explicitly requested, create and verify the parent tasks and subtasks in the correct Dispatch project. Use for planning, sequencing, scoping, and breaking work down across projects; do not implement the code as part of planning.
---

# Task planning and Dispatch execution

Turn an informal request such as “we should build X” into an implementation-ready
plan that a developer or agent can pick up without re-deriving the context. When
the user explicitly asks to create, add, or update tasks, carry that plan through
to Dispatch and verify the resulting hierarchy. Planning and task creation are the
scope of this skill; implementation is a separate workflow.

## Choose the operating mode and project

- If the user asks only for a plan, do not mutate Dispatch. Return the plan and
  the questions that block execution.
- If the user asks to create tasks, create them after research and review. A
  dictation that clearly says to add, create, track, or put the work in Dispatch
  is an explicit creation request.
- Use `dispatch where` when working inside a linked repository. Otherwise use
  `dispatch projects`, project context, and the user-provided product or repo
  name to select the existing project. Prefer an existing parent or project
  context over creating a new board.
- For a repository that is not linked, inspect the exact repository and use the
  project context that actually owns the product. Do not guess when two projects
  are equally plausible; ask before creating tasks.
- For work genuinely shared by several projects, keep one source task and use
  Dispatch sharing (`--also` or `share`) only when the same state should appear on
  each board. Create separate tasks only when the deliverables or ownership differ.

## Research before drafting

Ground the plan in the material that is actually available before writing the
first work item:

- Read the relevant Dispatch project context, existing tasks, comments, and
  knowledge notes. Extend an existing task or add a child when the work already
  exists; do not create duplicate parents because a request was rephrased.
- Inspect the repository's structure, conventions, and nearest existing analogs
  when a codebase is available. Use concrete file paths and symbols so the
  implementer can start from precedent rather than rediscovering it.
- Review existing plans, issues, design notes, or related work in the provided
  workspace when they are available. Call out overlap and consolidate instead
  of proposing duplicate work.
- If the request traces to an email, roadmap, specification, policy, or other
  source document, read the whole document before planning. Separate the
  requested work from context and from work owned by another team.
- If code or source material is unavailable, state the gap and mark assumptions.
  Never invent paths, architecture, decisions, platform support, or acceptance
  criteria as confirmed facts.
- Treat current provider, API, model, pricing, policy, and review requirements as
  time-sensitive. Verify them from an authoritative source or make provider/model
  selection an explicit decision task instead of relying on memory.

## Structure: one outcome, reasoned work items

Use one parent deliverable for each genuinely separate outcome. The parent
summary should explain:

- what is being delivered and why it matters;
- where the request came from, when there is a source;
- the prior art, files, services, or patterns it builds on;
- the scope and explicit non-goals; and
- a concrete, checkable definition of done.

Break the deliverable into work items in real dependency order, usually from
discovery or decisions through data/model, service/API, UI or integration, edge
cases, tests, and rollout. Each item must explain why it exists and what failure
mode or user outcome it addresses, not merely name an implementation action.

Good:

> A public upload endpoint is an invitation to abuse. Add per-IP throttling and
> challenge handling, then log rejected attempts so legitimate candidates can be
> distinguished from automated abuse during rollout.

Weak:

> Add rate limiting.

Include dependencies, relevant files or areas, validation, and observable
acceptance criteria whenever the evidence supports them.

## Make risky decisions explicit

Do not bury a business or product decision inside a build item. If implementation
depends on a human choice—such as pipeline stages, retention or probation length,
the live domain, metric ownership, permissions, or rollout policy—make it a
separate decision item. Record the decision needed, who must make it if known,
the options or trade-off, and which build items are blocked until it is settled.

## Priority and ownership discipline

Use priorities consistently:

- **urgent** — blocks other work or affects money, security, privacy, or data
  correctness, or the user explicitly said it comes first;
- **high** — important deliverable work and the default for committed scope;
- **medium** — useful polish or work that can wait for a later iteration; and
- **low / backlog** — deliberately parked work. Explain what is unresolved and
  what would unpark it.

Any work item touching money or personal data should be treated as urgent when it
protects the boundary of the feature, even if the overall deliverable is lower
priority.

Capture exactly the owner the user named. If no owner was named, write
“unassigned / open to claim” and do not guess based on related work. Planning may
recommend ownership questions, but it must not assign anyone implicitly.

## Scope honestly and avoid duplicate plans

When a source or request covers multiple areas, plan only the work that belongs in
the stated scope. Keep the rest as context or a non-goal. If ownership is unclear,
make “confirm ownership” a small, low-priority decision item rather than planning
an entire build on an unverified assumption.

If related work already exists in the supplied material or workspace, reference it
and explain whether this plan extends, replaces, or depends on it. Do not create a
second plan for the same deliverable.

## Create tasks safely through Dispatch

Use the supported `dispatch` CLI for task creation and updates. Do not use browser
automation to create tasks. Create the parent first, capture its ID, then create
subtasks with `--parent <parent-id>` in the planned order. Keep titles and
descriptions in English unless the user explicitly requests another language.

For a substantial batch, prepare the complete list before executing it and use a
small reviewed shell loop. The first line of `dispatch create` is `✓ created <id>`:
extract the ID with `head -1 | awk '{print $3}'`, not `$2`. Verify the parent and
the first subtasks before continuing a long batch. If a command fails halfway,
resume from the failed item using the existing parent ID; never rerun the whole
batch and create duplicate parents.

Do not place credentials, access tokens, private URLs, or raw secrets in task
descriptions. For external setup, record the required configuration, owner,
approval state, and blocker without exposing secret values.

## Output

Return a concise, actionable plan in English unless the user explicitly asks for
another language. Keep titles, descriptions, and acceptance criteria precise and
avoid decorative filler. A useful shape is:

1. **Outcome** — the parent deliverable and why it matters.
2. **Context and evidence** — source, prior art, and relevant paths.
3. **Scope / non-goals** — what is and is not included.
4. **Decisions and assumptions** — confirmed choices, open decisions, and
   blockers.
5. **Work breakdown** — ordered items with why, scope, acceptance criteria,
   dependencies, priority, and owner.
6. **Definition of done** — the end state that can be checked.
7. **Risks and rollout** — likely failure modes, observability, migration, and
   rollback considerations when relevant.

After creating or updating tasks, list the relevant project with
`dispatch tasks --project <slug>` and read the result. Inspect the parent and at
least the first created subtasks with `dispatch task`; confirm hierarchy,
priorities, descriptions, and ownership. Report the project, parent ID, subtask
IDs, sequence, reused related tasks, external blockers, and only the decisions
that still need the user.

End with a `QUESTIONS FOR YOU` block containing only decisions the user or another
named stakeholder must make. If there are no such questions, say so explicitly.
Never claim that a task was created, assigned, synchronized, approved, or completed
unless the CLI or the relevant source confirms it.
