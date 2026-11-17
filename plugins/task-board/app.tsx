// Task Board frontend: the board is a nav page; a card opens in bb's right
// panel as a host-owned tab with the task's live thread and settings.
import { definePluginApp, type ExperimentalBadge } from "@get-bb/plugin-sdk/app";
import { BoardPage } from "./src/app/BoardPage.js";
import { TASK_TAB, useTasks, useThreadDirectory } from "./src/app/data.js";
import { isWaitingOnUser } from "./src/app/status.js";
import { TaskDetailPanel } from "./src/app/TaskDetail.js";

/** The sidebar entry shows how many agents are working, or what needs you. */
function useBoardBadge(): ExperimentalBadge | null {
  const { tasks } = useTasks();
  const { threads, descendants } = useThreadDirectory();
  if (!tasks) return null;
  const plural = (count: number) => (count === 1 ? "" : "s");
  const flagged = tasks.filter((task) => task.error !== null).length;
  const waiting = tasks.filter(
    (task) =>
      task.status === "running" &&
      task.error === null &&
      task.threadId !== null &&
      (isWaitingOnUser(threads.get(task.threadId)) || descendants(task.threadId).some(isWaitingOnUser)),
  ).length;
  if (flagged + waiting > 0) {
    const parts = [flagged ? `${flagged} task${plural(flagged)} need attention` : null, waiting ? `${waiting} waiting for you` : null].filter(Boolean);
    return { count: flagged + waiting, tone: flagged ? "critical" : "warning", label: parts.join(", ") };
  }
  const running = tasks.filter((task) => task.status === "running").length;
  return running > 0 ? { count: running, label: `${running} task${running === 1 ? "" : "s"} in progress` } : null;
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "board",
    title: "Task Board",
    icon: "ListTodo",
    path: "board",
    component: BoardPage,
    experimental_useBadge: useBoardBadge,
  });

  app.slots.experimental_tab({
    ...TASK_TAB,
    title: "Task",
    icon: "ListTodo",
    layout: "flush",
    component: TaskDetailPanel,
  });

  // Ctrl/⌘ ⇧ K opens the board from anywhere in bb.
  app.contentScripts.register({
    id: "open-board-shortcut",
    mount({ pluginId, signal }) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== "k") return;
        event.preventDefault();
        const target = new URL(window.location.href);
        target.pathname = `/plugins/${pluginId}/board`;
        target.search = "";
        target.hash = "";
        window.history.pushState({}, "", target);
        window.dispatchEvent(new PopStateEvent("popstate"));
      };
      document.addEventListener("keydown", onKeyDown, { signal });
      return () => document.removeEventListener("keydown", onKeyDown);
    },
  });
});
