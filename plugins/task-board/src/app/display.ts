import { useCallback, useState } from "react";

/** Which details a card shows. Each is a switch in the board's Display menu. */
export interface CardDisplay {
  project: boolean;
  thread: boolean;
  model: boolean;
  schedule: boolean;
  repeat: boolean;
  subAgents: boolean;
  preview: boolean;
}

export const DISPLAY_OPTIONS: readonly { key: keyof CardDisplay; label: string; detail: string }[] = [
  { key: "preview", label: "Prompt preview", detail: "Two lines under the title" },
  { key: "project", label: "Project", detail: "When showing all projects" },
  { key: "thread", label: "Thread", detail: "Existing thread or own worktree" },
  { key: "model", label: "Model", detail: "Opus 5.5, 6.1-Sol…" },
  { key: "schedule", label: "Schedule", detail: "When a queued task starts" },
  { key: "repeat", label: "Repeat", detail: "Daily, weekly…" },
  { key: "subAgents", label: "Sub-agents", detail: "Grouped under the parent" },
];

const DEFAULT_DISPLAY: CardDisplay = {
  project: true,
  thread: true,
  model: true,
  schedule: true,
  repeat: true,
  subAgents: true,
  preview: true,
};

const KEY = "task-board:card-display";

function read(): CardDisplay {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_DISPLAY, ...(JSON.parse(raw) as Partial<CardDisplay>) };
  } catch {
    // Fall back to defaults.
  }
  return DEFAULT_DISPLAY;
}

/** The board's card display choices, remembered per browser. */
export function useCardDisplay() {
  const [display, setDisplay] = useState<CardDisplay>(read);
  const toggle = useCallback((key: keyof CardDisplay, value: boolean) => {
    setDisplay((current) => {
      const next = { ...current, [key]: value };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Not remembered, still applied.
      }
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Ignore.
    }
    setDisplay(DEFAULT_DISPLAY);
  }, []);
  return { display, toggle, reset };
}
