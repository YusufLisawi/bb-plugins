import assert from "node:assert/strict";
import { test } from "node:test";
import { nextOccurrence } from "../src/repeat.ts";

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

test("none never repeats", () => {
  assert.equal(nextOccurrence({ kind: "none", time: "09:00", weekday: 1 }, Date.now()), null);
});

test("daily is later today, else tomorrow", () => {
  const rule = { kind: "daily", time: "09:30", weekday: 1 } as const;
  assert.equal(nextOccurrence(rule, at(2026, 11, 16, 8)), at(2026, 11, 16, 9, 30));
  assert.equal(nextOccurrence(rule, at(2026, 11, 16, 9, 30)), at(2026, 11, 17, 9, 30));
});

test("weekdays skips the weekend", () => {
  const rule = { kind: "weekdays", time: "09:00", weekday: 1 } as const;
  // Friday 2026-11-20 after 9:00 -> Monday 2026-11-23.
  assert.equal(nextOccurrence(rule, at(2026, 11, 20, 10)), at(2026, 11, 23, 9));
});

test("weekly lands on the chosen day", () => {
  const rule = { kind: "weekly", time: "18:00", weekday: 3 } as const;
  // Sunday 2026-11-15 -> Wednesday 2026-11-18.
  assert.equal(nextOccurrence(rule, at(2026, 11, 15, 12)), at(2026, 11, 18, 18));
  // On Wednesday after 18:00 -> next Wednesday.
  assert.equal(nextOccurrence(rule, at(2026, 11, 18, 19)), at(2026, 11, 25, 18));
});

test("hourly uses the minute past the hour", () => {
  const rule = { kind: "hourly", time: "00:15", weekday: 1 } as const;
  assert.equal(nextOccurrence(rule, at(2026, 11, 16, 10, 5)), at(2026, 11, 16, 10, 15));
  assert.equal(nextOccurrence(rule, at(2026, 11, 16, 10, 15)), at(2026, 11, 16, 11, 15));
});
