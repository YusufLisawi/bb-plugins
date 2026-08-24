import type { DispatchTask } from "./types.js";

export function buildTaskPrompt(task: DispatchTask, baseUrl: string): string {
  const description = task.description.trim() || "(No description was provided.)";
  return [
    `Work on Dispatch task ${task.id}: ${task.title}`,
    "",
    "Task description:",
    description,
    "",
    "Dispatch workflow:",
    `- Keep task ${task.id} updated as you work: move it to in_progress when you begin, comment with useful progress, and mark it done when the work is complete.`,
    `- Use the Dispatch CLI from this repository when available (for example: \`dispatch task ${task.id}\`, \`dispatch comment ${task.id} "..."\`, and \`dispatch update ${task.id} --status done\`).`,
    `- If the CLI is missing, install it with: curl -fsSL ${baseUrl}/api/install | bash`,
    "- Read the repository instructions before making changes, run the relevant checks, and report blockers in the task comments.",
  ].join("\n");
}
