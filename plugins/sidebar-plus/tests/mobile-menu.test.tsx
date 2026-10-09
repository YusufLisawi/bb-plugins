// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PluginSidebarProject,
  PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { Folder } from "../src/Folder";
import { ThreadRow } from "../src/ThreadRow";

const mock = vi.hoisted(() => ({
  openNewThread: vi.fn(),
  open: vi.fn(),
  setPinMode: vi.fn(),
  setAutoArchiveExempt: vi.fn(),
  projectPinnedIds: new Set<string>(),
  exemptIds: new Set<string>(),
}));
vi.mock("@get-bb/plugin-sdk/app", () => ({
  experimental_useSidebarThreadActions: () => ({
    openNewThread: mock.openNewThread,
    open: mock.open,
  }),
  experimental_useSidebarThreadSplit: () => ({ splitProps: {} }),
}));
vi.mock("../src/ThreadPreferences", () => ({
  useThreadPreferences: () => ({
    ...mock,
    ready: true,
    autoArchiveAvailable: true,
    pendingIds: new Set(),
  }),
}));
vi.mock("../components/ui/icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-test-icon={name} />,
}));
const project = {
  id: "proj_example",
  name: "Example",
  isPersonal: false,
} as PluginSidebarProject;
const thread = (id: string, isPinned = false): PluginSidebarThread =>
  ({
    id,
    projectId: project.id,
    title: id,
    titleFallback: null,
    updatedAt: Number(id) || 1,
    parentThreadId: null,
    isPinned,
    indicator: "none",
    isUnread: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
  }) as PluginSidebarThread;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mock.projectPinnedIds.clear();
  mock.exemptIds.clear();
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
});
async function hold(element: HTMLElement) {
  fireEvent.pointerDown(element, {
    pointerType: "touch",
    clientX: 40,
    clientY: 40,
    button: 0,
  });
  await act(async () => {
    vi.advanceTimersByTime(750);
  });
}
describe("mobile sidebar menus", () => {
  it("offers folder ordering through a touch hold and disables movement beyond the first folder", async () => {
    const move = vi.fn();
    render(
      <Folder
        project={project}
        threads={[]}
        open={false}
        onToggle={() => {}}
        activeThreadId={null}
        followUpThreadIds={new Set()}
        onSetFollowUp={() => {}}
        colored={false}
        onNavigate={() => {}}
        onMove={move}
        canMoveUp={false}
        canMoveDown
      />,
    );
    await hold(screen.getByRole("button", { name: "Example (0 threads)" }));
    expect(
      screen
        .getByRole("menuitem", { name: "Move folder up" })
        .getAttribute("data-disabled"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("menuitem", { name: "Move folder to top" })
        .getAttribute("data-disabled"),
    ).not.toBeNull();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Move folder to bottom" }),
    );
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(move).toHaveBeenCalledWith("bottom");
    expect(mock.openNewThread).not.toHaveBeenCalled();
  });
  it("long-presses a project folder and opens a composer scoped to that project", async () => {
    const toggle = vi.fn(),
      navigate = vi.fn();
    render(
      <Folder
        project={project}
        threads={[]}
        open={false}
        onToggle={toggle}
        activeThreadId={null}
        followUpThreadIds={new Set()}
        onSetFollowUp={() => {}}
        colored={false}
        onNavigate={navigate}
      />,
    );
    const folder = screen.getByRole("button", { name: "Example (0 threads)" });
    await hold(folder);
    expect(
      screen.getByRole("menuitem", {
        name: "Start new thread in this project",
      }),
    ).toBeTruthy();
    fireEvent.click(folder);
    expect(toggle).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("menuitem", {
        name: "Start new thread in this project",
      }),
    );
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(mock.openNewThread).toHaveBeenCalledWith({
      projectId: project.id,
      focusPrompt: true,
    });
    expect(navigate).toHaveBeenCalledOnce();
  });
  it("cancels a hold when the user scrolls", async () => {
    render(
      <Folder
        project={project}
        threads={[]}
        open={false}
        onToggle={() => {}}
        activeThreadId={null}
        followUpThreadIds={new Set()}
        onSetFollowUp={() => {}}
        colored={false}
        onNavigate={() => {}}
      />,
    );
    const folder = screen.getByRole("button", { name: "Example (0 threads)" });
    fireEvent.pointerDown(folder, { pointerType: "touch", button: 0 });
    fireEvent.pointerMove(folder, { pointerType: "touch", clientY: 100 });
    await act(async () => {
      vi.advanceTimersByTime(750);
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("reveals exactly five additional threads per click", () => {
    const { container } = render(
      <Folder
        project={project}
        threads={Array.from({ length: 12 }, (_, i) => thread(String(i)))}
        open
        onToggle={() => {}}
        activeThreadId={null}
        followUpThreadIds={new Set()}
        onSetFollowUp={() => {}}
        colored={false}
        onNavigate={() => {}}
      />,
    );
    expect(container.querySelectorAll(".sbp-thread-row")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Show 5 more" }));
    expect(container.querySelectorAll(".sbp-thread-row")).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(container.querySelectorAll(".sbp-thread-row")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: /Show .* more/ })).toBeNull();
  });
  it("offers separate pin and exemption actions on an unpinned thread", async () => {
    render(
      <ul>
        <ThreadRow
          thread={thread("One")}
          isActive={false}
          isFollowUp={false}
          onToggleFollowUp={() => {}}
          colored={false}
          onNavigate={() => {}}
        />
      </ul>,
    );
    const link = screen.getByRole("link", { name: /^One/ });
    await hold(link);
    fireEvent.click(link);
    expect(mock.open).not.toHaveBeenCalled();
    expect(
      screen.getByRole("menuitem", { name: "Pin in project" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("menuitem", {
        name: "Move to project pinned section",
      }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Disable auto-archive" }),
    );
    expect(mock.setAutoArchiveExempt).toHaveBeenCalledWith("One", true);
    expect(mock.setPinMode).not.toHaveBeenCalled();
  });
  it("offers movement to the project section only for an existing global pin", async () => {
    render(
      <ul>
        <ThreadRow
          thread={thread("One", true)}
          isActive={false}
          isFollowUp={false}
          onToggleFollowUp={() => {}}
          colored={false}
          onNavigate={() => {}}
        />
      </ul>,
    );
    await hold(screen.getByRole("link", { name: /^One/ }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Move to project pinned section" }),
    );
    expect(mock.setPinMode).toHaveBeenCalledWith("One", "project");
  });
  it("keeps pinned threads protected even if a manual exemption can otherwise be enabled", async () => {
    mock.projectPinnedIds.add("One");
    mock.exemptIds.add("One");
    const renderRow = (pinned: boolean) => (
      <ul>
        <ThreadRow
          thread={thread("One", pinned)}
          isActive={false}
          isFollowUp={false}
          onToggleFollowUp={() => {}}
          colored={false}
          onNavigate={() => {}}
        />
      </ul>
    );
    const view = render(renderRow(true));
    await hold(screen.getByRole("link", { name: /^One/ }));
    expect(
      screen.getByRole("menuitem", { name: "Move to global pinned section" }),
    ).toBeTruthy();
    const protectedItem = screen.getByRole("menuitem", {
      name: "Auto-archive disabled while pinned",
    });
    expect(protectedItem.getAttribute("data-disabled")).not.toBeNull();
    fireEvent.click(protectedItem);
    expect(mock.setAutoArchiveExempt).not.toHaveBeenCalled();
    fireEvent.keyDown(protectedItem, { key: "Escape" });
    view.rerender(renderRow(false));
    await hold(screen.getByRole("link", { name: "One" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Enable auto-archive" }),
    );
    expect(mock.setAutoArchiveExempt).toHaveBeenCalledWith("One", false);
  });
  it("shows project pins before their titles without Pinned or Recent folder headings", () => {
    mock.projectPinnedIds.add("Pin thread");
    const { container } = render(
      <Folder
        project={project}
        threads={[thread("Pin thread", true), thread("Other thread")]}
        open
        onToggle={() => {}}
        activeThreadId={null}
        followUpThreadIds={new Set()}
        onSetFollowUp={() => {}}
        colored={false}
        onNavigate={() => {}}
      />,
    );
    expect(screen.queryByText("Pinned", { exact: true })).toBeNull();
    expect(screen.queryByText("Recent", { exact: true })).toBeNull();
    const pin = container.querySelector("[data-sbp-thread-pin]")!;
    const title = screen.getByText("Pin thread", { exact: true });
    expect(
      pin.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
