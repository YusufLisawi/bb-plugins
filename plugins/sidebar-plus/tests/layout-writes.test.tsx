// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT, type SidebarLayout } from "../src/layout";
import { useLayout } from "../src/useLayout";

const mock = vi.hoisted(() => ({
  call: vi.fn(),
  realtime: (() => {}) as () => void,
  error: vi.fn(),
}));
vi.mock("@get-bb/plugin-sdk/app", () => ({
  useRpc: () => ({ call: mock.call }),
  useRealtime: (_channel: string, callback: () => void) => {
    mock.realtime = callback;
  },
}));
vi.mock("sonner", () => ({ toast: { error: mock.error } }));
afterEach(cleanup);

it("saves rapid reorder clicks in sequence and keeps intermediate responses from reverting the displayed order", async () => {
  let stored = DEFAULT_LAYOUT;
  const writes: {
    layout: SidebarLayout;
    resolve: (value: { layout: SidebarLayout }) => void;
  }[] = [];
  mock.call.mockImplementation((method, input) => {
    if (method === "getLayout") return Promise.resolve({ layout: stored });
    return new Promise((resolve) =>
      writes.push({ layout: input.layout, resolve }),
    );
  });
  const hook = renderHook(useLayout);
  await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
  await act(async () => {
    hook.result.current.update({ projectOrder: ["a", "b", "c"] });
    hook.result.current.update({ projectOrder: ["b", "a", "c"] });
  });
  expect(writes).toHaveLength(1);
  await act(async () => {
    mock.realtime();
  });
  expect(hook.result.current.layout.projectOrder).toEqual(["b", "a", "c"]);
  await act(async () => {
    stored = writes[0].layout;
    writes[0].resolve({ layout: stored });
  });
  expect(writes).toHaveLength(2);
  expect(hook.result.current.layout.projectOrder).toEqual(["b", "a", "c"]);
  await act(async () => {
    stored = writes[1].layout;
    writes[1].resolve({ layout: stored });
  });
  expect(stored.projectOrder).toEqual(["b", "a", "c"]);
  expect(hook.result.current.layout.projectOrder).toEqual(stored.projectOrder);

  // A failed save must restore authoritative settings and explain the failure.
  mock.call.mockImplementation((method) =>
    method === "getLayout"
      ? Promise.resolve({ layout: stored })
      : Promise.reject(new Error("Disconnected")),
  );
  await act(async () => {
    hook.result.current.update({ projectOrder: ["c", "b", "a"] });
  });
  await waitFor(() =>
    expect(mock.error).toHaveBeenCalledWith("Could not save sidebar settings"),
  );
  expect(hook.result.current.layout.projectOrder).toEqual(stored.projectOrder);
});
