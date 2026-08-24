import { useMemo, useState } from "react";
import {
  experimental_useSidebarThreadActions as useSidebarThreadActions,
  type PluginSidebarProject,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { StatusCluster } from "./StatusGlyph";
import { ThreadRow } from "./ThreadRow";
import { countStatuses } from "./status";

const FOLDER_PAGE = 25;

/**
 * A project drawn as a folder: a header row with the folder glyph, the name,
 * a status cluster, and a count; open it to see the project's threads as a
 * tree (children indented under their parent).
 */
export function Folder({
  project,
  threads,
  open,
  onToggle,
  activeThreadId,
  colored,
  onNavigate,
}: {
  project: PluginSidebarProject;
  threads: readonly PluginSidebarThread[];
  open: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  colored: boolean;
  onNavigate: () => void;
}) {
  const actions = useSidebarThreadActions();
  const [showAll, setShowAll] = useState(false);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(
    () => new Set(),
  );
  const counts = useMemo(() => countStatuses(threads), [threads]);
  const tree = useMemo(() => buildTree(threads), [threads]);
  const roots = showAll ? tree.roots : tree.roots.slice(0, FOLDER_PAGE);
  const hiddenCount = tree.roots.length - roots.length;
  const isActiveHere =
    activeThreadId !== null && threads.some((t) => t.id === activeThreadId);

  const rows: React.ReactNode[] = [];
  const walk = (thread: PluginSidebarThread, depth: number) => {
    const children = tree.childrenOf.get(thread.id) ?? [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedParents.has(thread.id);
    rows.push(
      <ThreadRow
        key={thread.id}
        thread={thread}
        depth={depth}
        bgInset={14}
        isActive={thread.id === activeThreadId}
        colored={colored}
        onNavigate={onNavigate}
        leading={
          hasChildren ? (
            <button
              type="button"
              aria-label={isCollapsed ? "Expand children" : "Collapse children"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setCollapsedParents((current) => {
                  const next = new Set(current);
                  if (next.has(thread.id)) next.delete(thread.id);
                  else next.add(thread.id);
                  return next;
                });
              }}
              className="-ml-1 flex size-4 items-center justify-center rounded text-subtle-foreground hover:text-foreground"
            >
              <Icon
                name="ChevronRight"
                className={cn(
                  "size-3 transition-transform",
                  !isCollapsed && "rotate-90",
                )}
              />
            </button>
          ) : undefined
        }
      />,
    );
    if (hasChildren && !isCollapsed) {
      for (const child of children) walk(child, depth + 1);
    }
  };
  for (const root of roots) walk(root, 1);

  return (
    <div className="mb-px">
      <div
        className={cn(
          "group/folder relative flex h-7 items-center gap-2 rounded-md pl-2 pr-1 text-sm transition-colors",
          "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground",
          isActiveHere && !open && "text-sidebar-foreground",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${project.name} (${threads.length} threads)`}
          className="absolute inset-0 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
        />
        <span className="pointer-events-none relative flex w-4 shrink-0 items-center justify-center text-subtle-foreground">
          <Icon
            name={open ? "FolderOpen" : "Folder"}
            className="size-4"
            aria-hidden
          />
        </span>
        <span className="pointer-events-none relative min-w-0 flex-1 truncate font-medium">
          {project.name}
        </span>
        <span className="pointer-events-none relative flex shrink-0 items-center gap-2 group-hover/folder:hidden">
          <StatusCluster counts={counts} colored={colored} />
          <span className="text-2xs tabular-nums text-subtle-foreground/70">
            {threads.length}
          </span>
        </span>
        <button
          type="button"
          aria-label={`New thread in ${project.name}`}
          title="New thread here"
          onClick={(event) => {
            event.stopPropagation();
            actions.openNewThread({ projectId: project.id, focusPrompt: true });
            onNavigate();
          }}
          className="relative z-10 hidden size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover/folder:flex"
        >
          <Icon name="Plus" className="size-3.5" />
        </button>
      </div>
      {open ? (
        <ul
          className={cn(
            "relative ml-2 space-y-px",
            // Hairline under the folder glyph, like bb's expanded project.
            "before:pointer-events-none before:absolute before:bottom-0 before:left-[7px] before:top-0 before:z-10 before:w-px before:bg-border-hairline before:opacity-70 before:content-['']",
          )}
        >
          {rows}
          {rows.length === 0 ? (
            <li className="py-1 pl-6 text-xs text-muted-foreground/60">
              No threads
            </li>
          ) : null}
          {hiddenCount > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="ml-3.5 flex h-6 w-[calc(100%-0.875rem)] items-center gap-1 rounded-md pl-2.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <Icon name="ChevronsDown" className="size-3" />
                Show {hiddenCount} more
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function buildTree(threads: readonly PluginSidebarThread[]) {
  const ids = new Set(threads.map((t) => t.id));
  const childrenOf = new Map<string, PluginSidebarThread[]>();
  const roots: PluginSidebarThread[] = [];
  const byUpdated = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const thread of byUpdated) {
    if (thread.parentThreadId && ids.has(thread.parentThreadId)) {
      const list = childrenOf.get(thread.parentThreadId) ?? [];
      list.push(thread);
      childrenOf.set(thread.parentThreadId, list);
    } else {
      roots.push(thread);
    }
  }
  return { roots, childrenOf };
}
