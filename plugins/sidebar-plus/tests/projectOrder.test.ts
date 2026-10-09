import { describe, expect, it } from "vitest";
import type {
  PluginSidebarProject,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import {
  moveProjectOrder,
  normalizeProjectOrder,
  orderProjects,
} from "../src/projectOrder";
import { normalizeLayout } from "../src/layout";

const projects = [
  { id: "a", name: "Alpha", isPersonal: false },
  { id: "b", name: "Beta", isPersonal: false },
  { id: "c", name: "Charlie", isPersonal: false },
  { id: "personal", name: "Personal", isPersonal: true },
] as PluginSidebarProject[];
const threads = [
  { projectId: "a", updatedAt: 5, isArchived: false },
  { projectId: "b", updatedAt: 10, isArchived: false },
  { projectId: "personal", updatedAt: 20, isArchived: false },
  { projectId: "c", updatedAt: 100, isArchived: true },
] as PluginSidebarThread[];
const ids = (order: string[]) =>
  orderProjects(projects, threads, order).map((p) => p.id);
describe("project folder ordering", () => {
  it("uses recent activity with Personal last until an order is saved", () => {
    expect(ids([])).toEqual(["b", "a", "c", "personal"]);
  });
  it("keeps a manual order even when activity changes and permits Personal first", () => {
    expect(ids(["personal", "c", "a", "b"])).toEqual([
      "personal",
      "c",
      "a",
      "b",
    ]);
    expect(
      orderProjects(
        projects,
        [{ projectId: "b", updatedAt: 999 } as PluginSidebarThread],
        ["personal", "c", "a", "b"],
      ).map((p) => p.id),
    ).toEqual(["personal", "c", "a", "b"]);
  });
  it("ignores deleted IDs and duplicates and appends new projects without hiding them", () => {
    expect(ids(["deleted", "c", "c", "a"])).toEqual([
      "c",
      "a",
      "b",
      "personal",
    ]);
  });
  it("moves folders up, down, to the top, and to the bottom", () => {
    const order = ["a", "b", "c"];
    expect(moveProjectOrder(order, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveProjectOrder(order, "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveProjectOrder(order, "c", "top")).toEqual(["c", "a", "b"]);
    expect(moveProjectOrder(order, "a", "bottom")).toEqual(["b", "c", "a"]);
    expect(order).toEqual(["a", "b", "c"]);
  });
  it("handles first, last, and missing folders without losing any IDs", () => {
    expect(moveProjectOrder(["a", "b"], "a", "up")).toEqual(["a", "b"]);
    expect(moveProjectOrder(["a", "b"], "b", "down")).toEqual(["a", "b"]);
    expect(moveProjectOrder(["a", "b"], "missing", "top")).toEqual(["a", "b"]);
  });
  it("migrates old layouts and sanitizes corrupt saved IDs", () => {
    expect(normalizeLayout({}).projectOrder).toEqual([]);
    expect(
      normalizeProjectOrder(["a", "a", null, 1, "", "x".repeat(513), "b"]),
    ).toEqual(["a", "b"]);
  });
});
