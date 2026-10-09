// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { SidebarList } from "../src/SidebarList";

const mock = vi.hoisted(() => ({
  call: vi.fn(),
  preferences: {
    projectPinnedThreadIds: [] as string[],
    exemptThreadIds: [] as string[],
    folderPlacements: [] as {
      threadId: string;
      projectId: string;
      movedAt: number;
    }[],
    autoArchiveAvailable: true,
  },
  pinned: false,
}));
const projects = [
  { id: "source", name: "Alpha", isPersonal: false },
  { id: "target", name: "Beta", isPersonal: false },
];
const makeThread = (
  id: string,
  projectId: string,
  updatedAt: number,
  isPinned = false,
) =>
  ({
    id,
    projectId,
    updatedAt,
    createdAt: 0,
    latestAttentionAt: 0,
    title: id,
    titleFallback: null,
    parentThreadId: null,
    isArchived: false,
    isPinned,
    isUnread: false,
    indicator: "none",
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
  }) as PluginSidebarThread;
vi.mock("@get-bb/plugin-sdk/app", () => {
  const rpc = { call: mock.call };
  return {
    experimental_useSidebarThreads: () => ({
      status: "ready",
      projects,
      threads: [
        makeThread("Mistake", "source", 1, mock.pinned),
        ...Array.from({ length: 8 }, (_, i) =>
          makeThread(`Recent ${i}`, "target", i + 2),
        ),
      ],
    }),
    experimental_useSidebarThreadActions: () => ({ open: vi.fn() }),
    experimental_useSidebarThreadSplit: () => ({ splitProps: {} }),
    useRpc: () => rpc,
    useRealtime: () => {},
  };
});
vi.mock("../src/useLayout", async () => {
  const { DEFAULT_LAYOUT } = await import("../src/layout");
  return {
    useLayout: () => ({
      layout: DEFAULT_LAYOUT,
      update: vi.fn(),
      isLoaded: true,
    }),
  };
});
vi.mock("../src/navGrid", () => ({ useNavGrid: () => {} }));
vi.mock("../src/useFollowUps", () => ({
  useFollowUps: () => ({ threadIds: new Set(), setMarked: vi.fn() }),
}));
vi.mock("../components/ui/icon", () => ({ Icon: () => <span /> }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mock.pinned = false;
  mock.preferences = {
    projectPinnedThreadIds: [],
    exemptThreadIds: [],
    folderPlacements: [],
    autoArchiveAvailable: true,
  };
  mock.call.mockImplementation(
    async (method: string, input: { threadId: string; projectId: string }) => {
      if (method === "setThreadFolder")
        mock.preferences = {
          ...mock.preferences,
          folderPlacements: [{ ...input, movedAt: 100 }],
        };
      return structuredClone(mock.preferences);
    },
  );
  window.localStorage.setItem(
    "sidebar-plus:ui",
    JSON.stringify({
      openFolders: ["source"],
      closedFolders: ["target"],
      collapsedSections: [],
    }),
  );
  class PointerEvent extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  window.PointerEvent = PointerEvent as typeof window.PointerEvent;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

async function openPicker(compact = true) {
  const view = render(
    <SidebarList
      activeThreadId={null}
      activeProjectId={null}
      isCompactViewport={compact}
      onNavigate={() => {}}
      searchQuery=""
    />,
  );
  await act(async () => {});
  fireEvent.pointerDown(screen.getByRole("link", { name: /^Mistake/ }), {
    pointerType: "touch",
    button: 0,
  });
  await act(async () => {
    vi.advanceTimersByTime(750);
  });
  fireEvent.click(
    screen.getByRole("menuitem", { name: "Move to project folder…" }),
  );
  await act(async () => {
    vi.runOnlyPendingTimers();
  });
  // The native mobile drawer realizes its content after its opening frames.
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  return view;
}

it("long-presses a thread on mobile, searches destinations and opens its new folder with the thread visible in the first five", async () => {
  const { container } = await openPicker();
  const dialog = screen.getByRole("dialog", { name: "Move to project folder" });
  expect(dialog.hasAttribute("data-persistent-drawer-content")).toBe(true);
  expect(
    (
      within(dialog).getByRole("button", {
        name: "Alpha, current folder",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Search project folders" }),
    { target: { value: "nobody" } },
  );
  expect(within(dialog).getByRole("status").textContent).toBe(
    "No projects match your search.",
  );
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Search project folders" }),
    { target: { value: "beta" } },
  );
  await act(async () => {
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Move to Beta" }),
    );
  });
  expect(mock.call).toHaveBeenCalledWith("setThreadFolder", {
    threadId: "Mistake",
    projectId: "target",
  });
  expect(
    screen.queryByRole("dialog", { name: "Move to project folder" }),
  ).toBeNull();
  const target = container.querySelector('[data-sbp-project-id="target"]')!;
  expect(
    target
      .querySelector(".sbp-folder-header button")
      ?.getAttribute("aria-expanded"),
  ).toBe("true");
  expect(target.querySelectorAll(".sbp-thread-row")).toHaveLength(5);
  expect(
    target.querySelector('[data-sidebar-thread-id="Mistake"]'),
  ).not.toBeNull();
  expect(
    container.querySelector(
      '[data-sbp-project-id="source"] [data-sidebar-thread-id="Mistake"]',
    ),
  ).toBeNull();
});

it("keeps a project pin pinned in the destination folder on desktop", async () => {
  mock.pinned = true;
  mock.preferences.projectPinnedThreadIds = ["Mistake"];
  const { container } = await openPicker(false);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Move to Beta" }));
  });
  const target = container.querySelector('[data-sbp-project-id="target"]')!;
  expect(
    target.querySelector('[data-sidebar-thread-id="Mistake"]'),
  ).not.toBeNull();
  expect(target.querySelector("[data-sbp-thread-pin]")).not.toBeNull();
  expect(target.querySelectorAll(".sbp-thread-row")).toHaveLength(6);
  expect(mock.preferences.projectPinnedThreadIds).toEqual(["Mistake"]);
});

it("keeps the picker open after a failed save and allows cancellation without a move", async () => {
  await openPicker();
  mock.call.mockImplementation(async (method: string) => {
    if (method === "setThreadFolder") throw new Error("Disconnected");
    return structuredClone(mock.preferences);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Move to Beta" }));
  });
  const dialog = screen.getByRole("dialog", { name: "Move to project folder" });
  expect(within(dialog).getByRole("alert").textContent).toBe(
    "Could not move the thread. Try again.",
  );
  expect(mock.preferences.folderPlacements).toEqual([]);
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(
    screen.queryByRole("dialog", { name: "Move to project folder" }),
  ).toBeNull();
});
