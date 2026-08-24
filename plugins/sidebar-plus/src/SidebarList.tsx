import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as Popover from "@radix-ui/react-popover";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  type PluginSidebarProject,
  type PluginSidebarThread,
  type PluginThreadListProps,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Folder } from "./Folder";
import { LayoutEditor } from "./LayoutEditor";
import { Section } from "./Section";
import { statusDotClass } from "./StatusGlyph";
import { ThreadRow } from "./ThreadRow";
import type { SectionId } from "./layout";
import { useLayout } from "./useLayout";
import { useNavGrid } from "./navGrid";
import { matchesQuery, threadStatus } from "./status";

const STORE_KEY = "sidebar-plus:ui";

interface UiState {
  /** Sections the user collapsed (sections default open). */
  collapsedSections: string[];
  /** Folders the user opened (folders default closed). */
  openFolders: string[];
  /** Folders the user closed while they were auto-opened. */
  closedFolders: string[];
}

function readUiState(): UiState {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<UiState>) : {};
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    return {
      collapsedSections: arr(parsed.collapsedSections),
      openFolders: arr(parsed.openFolders),
      closedFolders: arr(parsed.closedFolders),
    };
  } catch {
    return { collapsedSections: [], openFolders: [], closedFolders: [] };
  }
}

/** Per-client memory of which sections are collapsed and which folders open. */
function useUiState() {
  const [state, setState] = useState<UiState>(readUiState);
  const commit = useCallback((updater: (current: UiState) => UiState) => {
    setState((current) => {
      const next = updater(current);
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // Private mode etc. — in-memory state still works for this session.
      }
      return next;
    });
  }, []);
  const toggleSection = useCallback(
    (id: string) =>
      commit((c) => ({
        ...c,
        collapsedSections: c.collapsedSections.includes(id)
          ? c.collapsedSections.filter((x) => x !== id)
          : [...c.collapsedSections, id],
      })),
    [commit],
  );
  const setFolderOpen = useCallback(
    (id: string, open: boolean) =>
      commit((c) => ({
        ...c,
        openFolders: open
          ? [...new Set([...c.openFolders, id])]
          : c.openFolders.filter((x) => x !== id),
        closedFolders: open
          ? c.closedFolders.filter((x) => x !== id)
          : [...new Set([...c.closedFolders, id])],
      })),
    [commit],
  );
  return { state, toggleSection, setFolderOpen };
}

export function SidebarList({
  activeThreadId,
  activeProjectId,
  onNavigate,
  searchQuery,
}: PluginThreadListProps) {
  const { status, threads, projects } = useSidebarThreads();
  const { layout } = useLayout();
  useNavGrid(layout);
  const { state: ui, toggleSection, setFolderOpen } = useUiState();
  // The Customize trigger lives in the top chrome row (left of Back/Forward)
  // when that row exists; the mobile drawer has none, so it falls back to a
  // slim row above the list.
  const [chromeHost, setChromeHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const row = document.querySelector<HTMLElement>(
      '[data-testid="app-sidebar-top-reserve-row"]',
    );
    if (!row) return;
    const host = document.createElement("span");
    host.className = "flex items-center";
    host.dataset.sbpCustomize = "";
    row.insertBefore(host, row.firstChild);
    setChromeHost(host);
    return () => {
      host.remove();
      setChromeHost(null);
    };
  }, []);
  // In chrome mode Extensions leaves the nav list; we draw a toolbox button
  // in the footer (where Remote access sat). Clicking it activates the host's
  // own (hidden) Extensions row so navigation stays SPA routing.
  const extensionsInFooter = layout.primaryStyle === "chrome";
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!extensionsInFooter) return;
    const menu = document.querySelector<HTMLElement>(
      '[data-sidebar="footer"] ul',
    );
    if (!menu) return;
    const item = document.createElement("li");
    item.className = "min-w-0";
    item.dataset.sbpExtensions = "";
    menu.insertBefore(item, menu.children[1] ?? null);
    setFooterHost(item);
    return () => {
      item.remove();
      setFooterHost(null);
    };
  }, [extensionsInFooter]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [nowMinute, setNowMinute] = useState(() => Math.floor(Date.now() / 60_000));
  useEffect(() => {
    const timer = setInterval(() => setNowMinute(Math.floor(Date.now() / 60_000)), 60_000);
    return () => clearInterval(timer);
  }, []);

  const visible = useMemo(
    () => threads.filter((thread) => !thread.isArchived),
    [threads],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const activeThread = useMemo(
    () => visible.find((thread) => thread.id === activeThreadId) ?? null,
    [visible, activeThreadId],
  );

  // ---- search mode: one flat result list, newest first -------------------
  const query = searchQuery.trim();
  if (query) {
    const results = visible
      .filter((thread) => matchesQuery(thread, query))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {results.length === 0 ? (
          <Empty>No threads match “{query}”</Empty>
        ) : (
          <ul className="space-y-px">
            {results.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                colored={layout.statusColors}
                hint={projectById.get(thread.projectId)?.name ?? null}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---- smart sections -----------------------------------------------------
  const windowStart =
    layout.smartWindowDays > 0
      ? nowMinute * 60_000 - layout.smartWindowDays * 86_400_000
      : 0;
  const byUpdated = (a: PluginSidebarThread, b: PluginSidebarThread) =>
    b.updatedAt - a.updatedAt;
  const attention = visible
    .filter((t) => {
      const s = threadStatus(t);
      return s === "attention" || s === "error";
    })
    .sort((a, b) => b.latestAttentionAt - a.latestAttentionAt);
  const running = visible.filter((t) => threadStatus(t) === "running").sort(byUpdated);
  const done = visible
    .filter((t) => threadStatus(t) === "done" && t.updatedAt >= windowStart)
    .sort(byUpdated);
  const pinned = visible.filter((t) => t.isPinned).sort(byUpdated);

  // Threads visibly listed in an OPEN smart section above. A collapsed or
  // disabled section does not claim its threads, so folding "In progress"
  // makes those threads reappear in their folders instead of vanishing.
  const listed = new Set<string>();
  const enabledSections = layout.sections.filter((s) => s.enabled);
  for (const section of enabledSections) {
    if (ui.collapsedSections.includes(section.id)) continue;
    const source =
      section.id === "attention"
        ? attention
        : section.id === "running"
          ? running
          : section.id === "done"
            ? done
            : section.id === "pinned"
              ? pinned
              : [];
    for (const thread of source) listed.add(thread.id);
  }

  const threadsByProject = new Map<string, PluginSidebarThread[]>();
  for (const thread of visible) {
    if (layout.dedupeFolders && listed.has(thread.id)) {
      // Keep a child visible if its parent is in the folder; the folder tree
      // needs the parent to place it. Simplest rule: hide only root threads.
      if (!thread.parentThreadId) continue;
    }
    const list = threadsByProject.get(thread.projectId) ?? [];
    list.push(thread);
    threadsByProject.set(thread.projectId, list);
  }
  const orderedProjects: PluginSidebarProject[] = [...projects].sort((a, b) => {
    if (a.isPersonal !== b.isPersonal) return a.isPersonal ? 1 : -1;
    const la = threadsByProject.get(a.id)?.[0]?.updatedAt ?? 0;
    const lb = threadsByProject.get(b.id)?.[0]?.updatedAt ?? 0;
    return lb - la;
  });

  const renderSmart = (id: SectionId, list: PluginSidebarThread[], accent: string | null) => {
    if (list.length === 0 && id !== "pinned") return null;
    if (id === "pinned" && list.length === 0) return null;
    const label =
      id === "attention" ? "Needs attention" : id === "running" ? "In progress" : id === "done" ? "Done" : "Pinned";
    return (
      <Section
        key={id}
        label={label}
        count={list.length}
        collapsed={ui.collapsedSections.includes(id)}
        onToggle={() => toggleSection(id)}
        accent={accent}
      >
        <ul className="space-y-px">
          {list.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              colored={layout.statusColors}
              hint={
                layout.showProjectHint
                  ? (projectById.get(thread.projectId)?.name ?? null)
                  : null
              }
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </Section>
    );
  };

  const colored = layout.statusColors;
  const hasAnything = visible.length > 0;

  const customizer = (
    <Popover.Root open={editorOpen} onOpenChange={setEditorOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Customize sidebar"
          title="Customize sidebar"
          className={cn(
            chromeHost
              ? "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              : "flex size-5 items-center justify-center rounded text-subtle-foreground/60 outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            editorOpen && "bg-sidebar-accent text-foreground",
          )}
        >
          <Icon name="SlidersHorizontal" className="size-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-72 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Customize sidebar</span>
            <Popover.Close
              aria-label="Close"
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" className="size-3.5" />
            </Popover.Close>
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-0.5">
            <LayoutEditor compact />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  const extensionsButton = footerHost
    ? createPortal(
        <button
          type="button"
          aria-label="Extensions"
          title="Extensions"
          onClick={() => {
            const hostRow = document.querySelector<HTMLButtonElement>(
              '[data-testid="plugin-nav-sidebar-items"] button:has([data-icon="Toolbox"])',
            );
            hostRow?.click();
          }}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring [&>svg]:opacity-80"
        >
          <Icon name="Toolbox" className="size-4" />
        </button>,
        footerHost,
      )
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {extensionsButton}
      {chromeHost ? (
        createPortal(customizer, chromeHost)
      ) : (
        <div className="flex h-6 shrink-0 items-center justify-end px-2">
          {customizer}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
        {status === "loading" ? null : status === "error" ? (
          <Empty>Could not load threads.</Empty>
        ) : !hasAnything ? (
          <Empty>No threads yet</Empty>
        ) : (
          enabledSections.map((section) => {
            switch (section.id) {
              case "attention":
                return renderSmart("attention", attention, statusDotClass("attention", colored));
              case "running":
                return renderSmart("running", running, statusDotClass("running", colored));
              case "done":
                return renderSmart("done", done, statusDotClass("done", colored));
              case "pinned":
                return renderSmart("pinned", pinned, null);
              case "projects": {
                return (
                  <Section
                    key="projects"
                    label="Projects"
                    count={orderedProjects.length}
                    collapsed={ui.collapsedSections.includes("projects")}
                    onToggle={() => toggleSection("projects")}
                  >
                    {orderedProjects.map((project) => {
                      const autoOpen =
                        activeThread?.projectId === project.id ||
                        (activeThread === null && activeProjectId === project.id);
                      const open =
                        ui.openFolders.includes(project.id) ||
                        (autoOpen && !ui.closedFolders.includes(project.id));
                      return (
                        <Folder
                          key={project.id}
                          project={project}
                          threads={threadsByProject.get(project.id) ?? []}
                          open={open}
                          onToggle={() => setFolderOpen(project.id, !open)}
                          activeThreadId={activeThreadId}
                          colored={colored}
                          onNavigate={onNavigate}
                        />
                      );
                    })}
                  </Section>
                );
              }
              default:
                return null;
            }
          })
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="px-2 py-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}
