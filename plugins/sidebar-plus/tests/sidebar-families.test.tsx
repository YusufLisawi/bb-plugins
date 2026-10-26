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
  threads: [] as unknown[],
  projectPinnedThreadIds: [] as string[],
}));
const projects = [
  { id: "alpha", name: "Alpha", isPersonal: false },
  { id: "beta", name: "Beta", isPersonal: false },
];
const makeThread = (
  id: string,
  updatedAt: number,
  {
    parent = null,
    projectId = "alpha",
    running = false,
    isPinned = false,
  }: {
    parent?: string | null;
    projectId?: string;
    running?: boolean;
    isPinned?: boolean;
  } = {},
) =>
  ({
    id,
    projectId,
    updatedAt,
    createdAt: 0,
    latestAttentionAt: 0,
    title: id,
    titleFallback: null,
    parentThreadId: parent,
    isArchived: false,
    isPinned,
    isUnread: false,
    hasPendingInteraction: false,
    indicator: running ? "runtime" : "none",
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
      threads: mock.threads,
    }),
    experimental_useSidebarThreadActions: () => ({ open: vi.fn() }),
    experimental_useSidebarThreadSplit: () => ({ splitProps: {} }),
    useRpc: () => rpc,
    useRealtime: () => {},
    useSdk: () => ({ threads: { update: vi.fn() }, threadSections: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } }),
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
  vi.clearAllMocks();
  mock.projectPinnedThreadIds = [];
  mock.call.mockImplementation(async () => ({
    projectPinnedThreadIds: mock.projectPinnedThreadIds,
    exemptThreadIds: [],
    folderPlacements: [],
    autoArchiveAvailable: true,
  }));
  window.localStorage.setItem(
    "sidebar-plus:ui",
    JSON.stringify({ openFolders: ["alpha", "beta"] }),
  );
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

async function renderSidebar(activeThreadId: string | null = null) {
  render(
    <SidebarList
      activeThreadId={activeThreadId}
      activeProjectId={null}
      isCompactViewport={false}
      onNavigate={() => {}}
      searchQuery=""
    />,
  );
  await act(async () => {});
}
const section = (name: string) => screen.getByRole("region", { name });
const rowTitles = (root: HTMLElement) =>
  within(root)
    .queryAllByRole("link")
    .map((link) => link.getAttribute("aria-label"));
const folder = (projectId: string) =>
  document.querySelector<HTMLElement>(`[data-sbp-project-id="${projectId}"]`)!;
const rowOf = (name: string, root: HTMLElement = document.body) =>
  within(root).getByRole("link", { name }).closest("li")!;

it("nests a running sub-agent under its idle parent and keeps the parent's other children in the folder", async () => {
  mock.threads = [
    makeThread("Parent", 1),
    makeThread("Worker", 5, { parent: "Parent", running: true }),
    makeThread("Finished", 2, { parent: "Parent" }),
    makeThread("Loose", 3),
  ];
  await renderSidebar();
  const running = section("In progress");
  expect(rowTitles(running)).toEqual(["Parent", "Worker"]);
  expect(
    within(rowOf("Parent", running)).getByRole("button", {
      name: "Collapse children",
    }),
  ).toBeTruthy();
  // Only the running child counts; its parent is context.
  expect(
    within(running).getByRole("button", { name: /In progress/ }).textContent,
  ).toContain("1");

  // The folder no longer repeats the running child, but its parent and the
  // remaining child stay together instead of the child turning into a root.
  const alpha = folder("alpha");
  expect(rowTitles(alpha)).toEqual(["Loose", "Parent"]);
  fireEvent.click(
    within(rowOf("Parent", alpha)).getByRole("button", {
      name: "Expand children",
    }),
  );
  expect(rowTitles(folder("alpha"))).toEqual(["Loose", "Parent", "Finished"]);
});

it("moves a globally pinned thread into Pinned with all of its children, as a collapsed accordion", async () => {
  mock.threads = [
    makeThread("Pinned parent", 1, { isPinned: true }),
    makeThread("Child A", 2, { parent: "Pinned parent" }),
    makeThread("Child B", 3, { parent: "Pinned parent", projectId: "beta" }),
    makeThread("Grandchild", 4, { parent: "Child A" }),
    makeThread("Other", 1),
  ];
  await renderSidebar();
  const pinned = section("Pinned");
  expect(rowTitles(pinned)).toEqual(["Pinned parent, pinned"]);
  expect(rowOf("Pinned parent, pinned", pinned).textContent).toContain("3");
  fireEvent.click(
    within(pinned).getByRole("button", { name: "Expand children" }),
  );
  expect(rowTitles(section("Pinned"))).toEqual([
    "Pinned parent, pinned",
    "Child B",
    "Child A",
  ]);
  // Each level is its own accordion.
  fireEvent.click(
    within(rowOf("Child A", section("Pinned"))).getByRole("button", {
      name: "Expand children",
    }),
  );
  expect(rowTitles(section("Pinned"))).toEqual([
    "Pinned parent, pinned",
    "Child B",
    "Child A",
    "Grandchild",
  ]);
  // None of the family is left behind in a folder, cross-project child included.
  expect(rowTitles(folder("alpha"))).toEqual(["Other"]);
  expect(rowTitles(folder("beta"))).toEqual([]);
  // The choice is remembered for this browser.
  expect(
    JSON.parse(window.localStorage.getItem("sidebar-plus:ui")!).openThreads,
  ).toEqual(["tree:Pinned parent", "tree:Child A"]);
});

it("keeps a project pin's family together at the top of the pin's folder", async () => {
  mock.projectPinnedThreadIds = ["Project pin"];
  mock.threads = [
    makeThread("Project pin", 1, { isPinned: true }),
    makeThread("Pin child", 2, { parent: "Project pin", projectId: "beta" }),
    ...Array.from({ length: 6 }, (_, i) => makeThread(`Recent ${i}`, i + 10)),
  ];
  await renderSidebar("Pin child");
  const alpha = folder("alpha");
  // Opened automatically because the active thread is inside the family.
  expect(rowTitles(alpha).slice(0, 2)).toEqual([
    "Project pin, pinned",
    "Pin child",
  ]);
  expect(rowTitles(folder("beta"))).toEqual([]);
  expect(screen.queryByRole("region", { name: "Pinned" })).toBeNull();
});
