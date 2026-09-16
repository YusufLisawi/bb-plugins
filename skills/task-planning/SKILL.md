---
name: task-planning
description: Turn a rough idea, source document, voice dictation, or feature request into a grounded, prioritized implementation plan with a clear deliverable, reasoned subtasks, risks, ownership, and definition of done. Use when the user wants planning or breakdown only; do not create or update tasks in external tools.
---

# Task planning

Turn “we should build X” into an implementation-ready plan that a developer or
agent can pick up without re-deriving the context. This skill plans work only:
it does not create, edit, assign, comment on, or delete tasks, tickets, notes, or
other records in a project-management system.

## Research before drafting

Ground the plan in the material and code that are actually available before
writing the first work item:

- Inspect the repository's structure, conventions, and nearest existing analogs
  when a codebase is available. Use concrete file paths and symbols so the
  implementer can start from precedent rather than rediscovering it.
- Review existing plans, issues, design notes, or related work in the provided
  workspace when they are available. Call out overlap and consolidate instead
  of proposing duplicate work.
- If the request traces to an email, roadmap, specification, policy, or other
  source document, read the whole document before planning. Separate the
  requested work from context and from work owned by another team.
- If the repository or source material is unavailable, state the gap and mark
  assumptions explicitly. Never invent file paths, architecture, decisions, or
  acceptance criteria as if they were confirmed facts.

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

## Planning-only boundary

- Do not call task-management or ticketing CLIs/APIs.
- Do not create or modify external tasks, subtasks, comments, assignments,
  statuses, labels, milestones, or knowledge records.
- Do not claim that anything was created, assigned, or synchronized.
- If the user asks for execution after planning, return the plan and let the
  normal implementation or project-management workflow handle that separate
  request.

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

End with a `QUESTIONS FOR YOU` block containing only decisions the user or another
named stakeholder must make. If there are no such questions, say so explicitly.
