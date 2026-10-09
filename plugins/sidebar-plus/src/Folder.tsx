import { useMemo, useState } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  experimental_useSidebarThreadActions as useSidebarThreadActions,
  type PluginSidebarProject,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { StatusCluster } from "./StatusGlyph";
import { ThreadRow } from "./ThreadRow";
import { usePortalScopeProps } from "@/lib/portal-scope";
import { useThreadPreferences } from "./ThreadPreferences";
import { buildTree, folderThreads, FOLDER_PAGE_SIZE } from "./folderThreads";
import { countStatuses } from "./status";
import type { ProjectMove } from "./projectOrder";

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
  followUpThreadIds,
  onSetFollowUp,
  colored,
  onNavigate,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
  placedAt,
}: {
  project: PluginSidebarProject;
  threads: readonly PluginSidebarThread[];
  open: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  followUpThreadIds: ReadonlySet<string>;
  onSetFollowUp: (threadId: string, marked: boolean) => void;
  colored: boolean;
  onNavigate: () => void;
  onMove?: (move: ProjectMove) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  placedAt?: ReadonlyMap<string, number>;
}) {
  const actions = useSidebarThreadActions();
  const [visibleCount, setVisibleCount] = useState(FOLDER_PAGE_SIZE);
  const [contextOpen, setContextOpen] = useState(false);
  const { projectPinnedIds } = useThreadPreferences();
  const portalScopeProps = usePortalScopeProps();
  const startThread = () => {
    actions.openNewThread({ projectId: project.id, focusPrompt: true });
    onNavigate();
  };
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(
    () => new Set(),
  );
  const counts = useMemo(() => countStatuses(threads), [threads]);
  const { pinned, page, hiddenCount } = useMemo(
    () => folderThreads(threads, projectPinnedIds, visibleCount, placedAt),
    [threads, projectPinnedIds, visibleCount, placedAt],
  );
  const tree = useMemo(() => buildTree(page), [page]);
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
        isFollowUp={followUpThreadIds.has(thread.id)}
        onToggleFollowUp={(marked) => onSetFollowUp(thread.id, marked)}
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
  for (const root of tree.roots) walk(root, 1);

  return (
    <div className="mb-px" data-sbp-project-id={project.id}>
      <ContextMenu.Root onOpenChange={setContextOpen}>
        <ContextMenu.Trigger asChild>
          <div
            className={cn(
              "sbp-folder-header group/folder relative flex h-7 items-center gap-2 rounded-md pl-2 pr-1 text-sm transition-colors",
              "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground",
              isActiveHere && !open && "text-sidebar-foreground",
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (contextOpen) return;
                if (open) setVisibleCount(FOLDER_PAGE_SIZE);
                onToggle();
              }}
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
                startThread();
              }}
              className="relative z-10 hidden size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover/folder:flex group-focus-within/folder:flex"
            >
              <Icon name="Plus" className="size-3.5" />
            </button>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            {...portalScopeProps}
            aria-label={`${project.name} project actions`}
            collisionPadding={8}
            className="sbp-menu z-50 min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <ContextMenu.Item
              onSelect={() => window.setTimeout(startThread, 0)}
              className="sbp-menu-item flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
            >
              <Icon name="Plus" className="size-3.5" /> Start new thread in this
              project
            </ContextMenu.Item>
            {onMove ? (
              <>
                <ContextMenu.Separator className="my-1 h-px bg-border" />
                {(
                  [
                    ["up", "Move folder up", "ChevronUp", canMoveUp],
                    ["down", "Move folder down", "ChevronDown", canMoveDown],
                    ["top", "Move folder to top", "ChevronsUp", canMoveUp],
                    [
                      "bottom",
                      "Move folder to bottom",
                      "ChevronsDown",
                      canMoveDown,
                    ],
                  ] as const
                ).map(([move, label, icon, enabled]) => (
                  <ContextMenu.Item
                    key={move}
                    disabled={!enabled}
                    onSelect={() => window.setTimeout(() => onMove(move), 0)}
                    className="sbp-menu-item flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    <Icon name={icon} className="size-3.5" /> {label}
                  </ContextMenu.Item>
                ))}
              </>
            ) : null}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {open ? (
        <ul
          className={cn(
            "relative ml-2 space-y-px",
            // Hairline under the folder glyph, like bb's expanded project.
            "before:pointer-events-none before:absolute before:bottom-0 before:left-[7px] before:top-0 before:z-10 before:w-px before:bg-border-hairline before:opacity-70 before:content-['']",
          )}
        >
          {pinned.length > 0 ? (
            <>
              {pinned.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  depth={1}
                  bgInset={14}
                  isActive={thread.id === activeThreadId}
                  isFollowUp={followUpThreadIds.has(thread.id)}
                  onToggleFollowUp={(marked) =>
                    onSetFollowUp(thread.id, marked)
                  }
                  colored={colored}
                  onNavigate={onNavigate}
                />
              ))}
            </>
          ) : null}
          {rows}
          {rows.length === 0 && pinned.length === 0 ? (
            <li className="py-1 pl-6 text-xs text-muted-foreground/60">
              No threads
            </li>
          ) : null}
          {hiddenCount > 0 ? (
            <li>
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((current) => current + FOLDER_PAGE_SIZE)
                }
                data-sbp-show-more={project.id}
                className="sbp-show-more ml-3.5 flex h-6 w-[calc(100%-0.875rem)] items-center gap-1 rounded-md pl-2.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <Icon name="ChevronsDown" className="size-3" />
                Show {Math.min(FOLDER_PAGE_SIZE, hiddenCount)} more
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
