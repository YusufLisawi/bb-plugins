import type { TaskRepeat } from "./contract.js";

const HOUR = 60 * 60 * 1000;

/**
 * The first occurrence of `repeat` strictly after `after`, in the server's
 * local time zone, or null for a task that does not repeat.
 */
export function nextOccurrence(repeat: TaskRepeat, after: number): number | null {
  if (repeat.kind === "none") return null;
  const [hours, minutes] = repeat.time.split(":").map(Number) as [number, number];

  if (repeat.kind === "hourly") {
    const candidate = new Date(after);
    candidate.setMinutes(minutes, 0, 0);
    let time = candidate.getTime();
    while (time <= after) time += HOUR;
    return time;
  }

  // Walk forward day by day; eight steps always reach a weekly match.
  const start = new Date(after);
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset,
      hours,
      minutes,
      0,
      0,
    );
    if (candidate.getTime() <= after) continue;
    const day = candidate.getDay();
    if (repeat.kind === "weekdays" && (day === 0 || day === 6)) continue;
    if (repeat.kind === "weekly" && day !== repeat.weekday) continue;
    return candidate.getTime();
  }
  return null;
}
