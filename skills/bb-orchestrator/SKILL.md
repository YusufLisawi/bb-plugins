---
name: bb-orchestrator
description: Delegate substantial implementation work to a BB subagent and manage it to a verified finish. When the user does not explicitly mention a provider or model, always spawn the child with Codex GPT-5.6-Luna at maximum reasoning effort; only an explicit user override may select another provider, model, reasoning level, or service tier. Use when the user says they are away or AFK, asks you to be the boss, requests another BB agent or subagent, or wants a review-and-iterate coding workflow. Do not use for read-only questions, reviews, or trivial one-step edits.
---

# BB orchestrated implementation

Use this workflow when the user wants you to coordinate while another BB agent owns the implementation. The parent owns scope, delegation, review, and acceptance; one child agent owns the code changes.

## Operating contract

- Interpret “AFK” or “you are the boss” as permission to make ordinary in-repository implementation decisions within the requested scope. It does not authorize silently expanding the task, destructive cleanup, production changes, deployments, purchases, credential use, or other irreversible external actions.
- Preserve unrelated user changes. Inspect the working state before delegating and never reset, overwrite, or discard changes just to make the child’s work easier.
- Delegate implementation to one clear owner. Do not implement the task yourself while the child is working; do not spawn competing implementers or reviewers unless the task genuinely has independent workstreams.
- After spawning, end the parent turn and rely on BB’s child notification or ping. Do not turn the parent into a polling loop or send periodic progress commentary. Resume coordination only from a child event or a direct new user message.

## UI skill routing

- When the delegated brief touches a web, mobile, desktop, or other user interface, use `/ui-ux-pro-max` and `/anti-ui-slop` as the default and primary UI guidance. Include both in the child’s brief and have the child consult them before design or implementation, then apply their relevant review or finish-gate checks before reporting `DONE`.
- For non-UI work, do not invoke UI skills merely because the repository contains frontend code.

## 1. Build the implementation brief

Translate the user’s request into a short brief before spawning. If it touches UI, add this exact requirement to the brief:

```text
UI guidance: use /ui-ux-pro-max and /anti-ui-slop as the primary UI skills. Consult both before coding and apply their relevant validation/finish-gate guidance before DONE.
```

- objective and concrete acceptance criteria;
- relevant constraints, non-goals, and existing user changes to preserve;
- likely files or subsystem, if known;
- validation expected (tests, type-check, lint, build, or a focused manual check); and
- decisions the child may make autonomously versus decisions that require the user.

Inspect the repository enough to remove cheap ambiguity. Ask the user only when the missing decision changes scope materially, creates meaningful risk, or cannot be inferred safely. Otherwise choose a sensible implementation path and record the assumption in the brief. The child must receive the complete objective and acceptance criteria in its initial prompt so it can work independently.

## 2. Resolve the child provider, model, and effort

### Non-negotiable default

If the user says nothing about a provider or model, the child execution tuple is always:

```text
--provider codex --model gpt-5.6-luna --reasoning-level max
```

This is the default even when the parent is running another provider, the project remembers another model, or BB reports another catalog default. Do not omit any of these three flags and do not substitute another model. BB’s omitted-flag behavior uses remembered project defaults, so an omitted flag is a configuration error on this path.

Resolve the tuple before constructing the spawn command, and verify that the final command contains the literal provider, model, and `max` reasoning flags. If the default tuple is unavailable in the target environment, stop and ask the user; never silently downgrade, use the project default, or let BB choose.

### Explicit overrides

Only treat model selection as overridden when the user explicitly names a provider or model, or explicitly asks for a different reasoning level or service tier:

- Honor an explicit provider/model override. Match display names to real BB IDs only after inspecting the target environment’s catalogs. For example, if the catalog returns these IDs, “Cursor Composer 2.5, medium, no fast mode” maps to `--provider acp-cursor --model composer-2.5 --reasoning-level medium --service-tier default`, while “Cursor Grok 4.6, medium” maps to `--provider acp-cursor --model grok-4.6 --reasoning-level medium` plus `--service-tier default` when that provider supports service tiers.
- If the user explicitly requests “Luna 5.6 max,” use the catalog’s exact Codex tuple, such as `--provider codex --model gpt-5.6-luna --reasoning-level max`.
- If the user names a model but not its provider, search the available provider list and query candidate provider catalogs. Do not invent a provider ID; a model such as Grok may be exposed through an ACP provider rather than a provider named `grok`.
- For an explicit override, preserve any user-specified reasoning and service tier. If the user gives only a provider/model, use the provider’s catalog-supported default for fields they did not specify; the Luna/max rule applies to the no-provider/no-model path.
- Treat service tier separately from model and reasoning. Use `default` when the user says no fast mode or does not request fast; pass `fast` only when the user explicitly asks for it and the provider supports it. Omit the flag for providers without service-tier support.
- If the requested provider, model, reasoning level, or service tier is unavailable, do not silently substitute. Explain the exact mismatch and ask for a choice when it materially affects the task.

Get the current project and exact environment from `bb status --json` and `bb thread show --self --json`. Run `bb provider list --environment <environment-id> --json`, then query the selected provider with `bb provider models <provider-id> --environment <environment-id> --json`. Use the exact provider/model IDs and supported reasoning levels returned for that environment.

## 3. Spawn the owner in the same BB environment

Spawn one child against the same environment so its changes are visible for review. For the default path, use this literal execution shape and fill in only the project, environment, and prompt:

```sh
bb thread spawn --project <project-id> --environment <environment-id> --parent-self --provider codex --model gpt-5.6-luna --reasoning-level max --service-tier default --prompt "<complete implementation brief>"
```

For an explicit override, replace the provider/model/reasoning/service-tier fields with the verified tuple. Add `--service-tier default` when the selected provider supports service tiers and the user did not request fast; add `--service-tier fast` only for an explicit fast request. Omit `--permission-mode` to inherit the parent’s permission ceiling. Do not request a higher permission mode than the parent has. Do not create a separate worktree unless the user explicitly wants isolated work.

Before executing `bb thread spawn`, perform this preflight:

1. If there is no explicit provider/model override, confirm the command has `--provider codex --model gpt-5.6-luna --reasoning-level max` (and `--service-tier default` when Codex advertises it).
2. If any of those default flags are missing, stop and correct the command before spawning.
3. Include the resolved provider, model, reasoning level, and service tier in the child’s prompt so the execution choice is explicit and can be reported back.

The default execution tuple is `codex / gpt-5.6-luna / max`; the child should not change that selection mid-task unless the parent directs it.

The child’s prompt must make it the sole owner and include this instruction:

```text
You are the sole implementation owner for this brief. Before touching files, set a native durable Goal using BB’s Goal action (`/goal`, exposed to Codex as the `create_goal` tool). Use the objective and acceptance criteria below as the Goal. Then inspect the existing code and working tree, implement the request end to end, and run the relevant validation. Make routine decisions yourself; do not stop at a plan. Preserve unrelated changes and do not perform unrequested destructive or external actions.

If the brief touches a user interface, use `/ui-ux-pro-max` and `/anti-ui-slop` as the required default UI guidance before coding and during the final review. Do not use `ui-ux-craft` as a substitute; use another UI skill only when the user explicitly requests it.

The parent thread is available for coordination, but it may end its active turn while you work. You may and should ping it when you need clarification, a product or technical decision, guidance, permission, or help with a blocker. You may also ping it at a meaningful milestone and when the implementation is done. To find the parent ID, run `bb thread show --self --json` and read `.thread.parentThreadId`; then send a message with `bb thread tell <parent-thread-id> "QUESTION: ..." --mode steer` (or use `--mode queue` for a non-urgent update). Label messages `QUESTION`, `GUIDANCE NEEDED`, `BLOCKED`, `MILESTONE`, or `DONE`, include the relevant evidence and the specific answer or action needed, and do not spam routine progress. After a ping, continue independently unless the decision is necessary to proceed; do not repeatedly resend the same ping. Never guess through a material or unsafe decision.

When finished, send a `DONE` message to the parent and report the outcome, changed files, validation run and results, assumptions, the resolved execution tuple, and any blocker. If the task is genuinely blocked or unsafe, mark the Goal blocked and report the exact reason instead of claiming completion.
```

Include the full brief after that instruction. Tell the child to leave the implementation in the shared environment; a commit is unnecessary unless the user or repository workflow specifically requires one.

## 4. End the parent turn and rely on child events

Immediately after spawning, end the parent turn. Do not call `bb thread wait` as part of the normal orchestration path, repeatedly check status, read logs or diffs, use shell sleeps, or send periodic progress commentary. BB’s child notification or a direct child ping is the signal to resume. If the child is still working, leave it alone.

A direct child ping is handled in a later parent turn:

- For `QUESTION`, `GUIDANCE NEEDED`, or `BLOCKED`, answer with `bb thread tell <child-id> "<clear answer or guidance>" --mode steer` when urgent, or `--mode queue` when it can wait. Then end the parent turn again. Decide routine, safe choices yourself; surface material product decisions, missing access, or risky approvals to the user.
- For `MILESTONE`, acknowledge only if needed and end the turn. Do not begin review or send unsolicited guidance.
- For `DONE`, proceed to the review section; the completion report is the handoff point.

A direct new user message may still be answered while the child works. Answer it without starting a polling loop. If it changes the delegated objective, send one clear update to the child with `bb thread tell`, then end the parent turn again. If it requests stopping or another consequential change, follow the user’s explicit instruction and preserve a recoverable workspace.

## 5. Review only after the child reports completion

Once BB delivers the child’s completion notification or `DONE` report, and not before, inspect its output and the shared-environment diff using `bb thread output <child-id>` and `bb thread show <child-id> --git-diff`. Review for:

- every acceptance criterion and the requested behavior;
- correctness, regressions, security, and consistency with local conventions;
- relevant validation actually passing, including failures hidden by a partial test run;
- unrelated or accidental file changes; and
- preservation of the user’s pre-existing work.

Run read-only validation yourself when that improves confidence, but do not directly edit the implementation. The child remains the owner.

## 6. Guide focused iterations

If the review finds a problem, send one consolidated, actionable follow-up with `bb thread tell <child-id> "<findings and exact required changes>" --mode steer`. State the evidence, the desired correction, and the validation to rerun. If the previous Goal was completed, have the child create a new Goal for the correction round; if it remains active, keep working toward it.

End the parent turn after sending the follow-up. Resume only when the child sends its next completion notification or `DONE` report, then review the updated diff. Repeat this review-and-guidance loop until the acceptance criteria and validation pass. If the child fails or becomes blocked, inspect its log after the relevant child event before retrying and give it a concrete alternative; do not blindly respawn duplicate work.

## 7. Close the handoff

Only after the review passes, report the completed outcome to the user with the child thread, resolved provider/model/reasoning/service tier, changed files, validation results, important assumptions, and any remaining limitation. Do not commit, deploy, or make other external changes unless the user asked for them. If completion is impossible without a user decision, say exactly what decision is needed and leave the workspace in a recoverable state.