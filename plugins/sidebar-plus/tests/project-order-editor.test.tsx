// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT } from "../src/layout";
import { LayoutEditor } from "../src/LayoutEditor";

const mock = vi.hoisted(() => ({
  update: vi.fn(),
  order: [] as string[],
  loaded: true,
}));
vi.mock("../src/useLayout", async () => {
  const { DEFAULT_LAYOUT } = await import("../src/layout");
  return {
    useLayout: () => ({
      layout: { ...DEFAULT_LAYOUT, projectOrder: mock.order },
      update: mock.update,
      reset: vi.fn(),
      isLoaded: mock.loaded,
    }),
  };
});
vi.mock("@get-bb/plugin-sdk/app", () => ({
  experimental_useSidebarThreads: () => ({
    status: "ready",
    threads: [],
    projects: [
      { id: "a", name: "Alpha", isPersonal: false },
      { id: "b", name: "Beta", isPersonal: false },
      { id: "personal", name: "Personal", isPersonal: true },
    ],
  }),
}));
vi.mock("../components/ui/icon", () => ({ Icon: () => <span /> }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mock.order = [];
  mock.loaded = true;
});

it("reorders project folders with labelled arrows and offers a reset to recent activity", () => {
  const view = render(<LayoutEditor compact />);
  expect(
    (screen.getByRole("button", { name: "Move Alpha up" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Move Beta up" }));
  const update = mock.update.mock.calls[0][0];
  mock.order = update(DEFAULT_LAYOUT).projectOrder;
  expect(mock.order).toEqual(["b", "a", "personal"]);
  view.rerender(<LayoutEditor compact />);
  expect(
    screen.getByRole("list", { name: "Project folder order" }).textContent,
  ).toBe("BetaAlphaPersonal");
  fireEvent.click(
    screen.getByRole("button", { name: "Use recent activity order" }),
  );
  expect(mock.update).toHaveBeenLastCalledWith({ projectOrder: [] });
});

it("waits for stored settings before enabling folder changes", () => {
  mock.loaded = false;
  render(<LayoutEditor compact />);
  expect(
    (screen.getByRole("button", { name: "Move Beta up" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Move Beta up" }));
  expect(mock.update).not.toHaveBeenCalled();
});
