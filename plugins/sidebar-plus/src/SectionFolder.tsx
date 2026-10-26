import { useMemo, useState } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  experimental_useSidebarThreadActions as useSidebarThreadActions,
  type PluginSidebarSection,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { usePortalScopeProps } from "@/lib/portal-scope";
import { StatusCluster } from "./StatusGlyph";
import { ThreadTree, type TreeExpansion } from "./ThreadTree";
import { useThreadPreferences } from "./ThreadPreferences";
import { useProjectSections } from "./ProjectSections";
import { folderThreads, FOLDER_PAGE_SIZE } from "./folderThreads";
import { countStatuses } from "./status";

const ITEM =
  "sbp-menu-item flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

/**
 * A folder inside a project (a bb thread section): a collapsible header with
 * its own menu, and the threads filed in it as a tree.
 */
export function SectionFolder({
  projectId,
  section,
  threads,
  expansion,
  activeThreadId,
  followUpThreadIds,
  onSetFollowUp,
  colored,
  onNavigate,
  placedAt,
}: {
  projectId: string;
  section: PluginSidebarSection;
  threads: readonly PluginSidebarThread[];
  expansion: TreeExpansion;
  activeThreadId: string | null;
  followUpThreadIds: ReadonlySet<string>;
  onSetFollowUp: (threadId: string, marked: boolean) => void;
  colored: boolean;
  onNavigate: () => void;
  placedAt?: ReadonlyMap<string, number>;
}) {
  const actions = useSidebarThreadActions();
  const sections = useProjectSections();
  const { projectPinnedIds } = useThreadPreferences();
  const portalScopeProps = usePortalScopeProps();
  const [contextOpen, setContextOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FOLDER_PAGE_SIZE);
  const key = `section:${projectId}:${section.id}`;
  const holdsActive = activeThreadId !== null && threads.some((t) => t.id === activeThreadId);
  const open = expansion.isOpen(key, holdsActive);
  const counts = useMemo(() => countStatuses(threads), [threads]);
  const { pinned, page, hiddenCount } = useMemo(
    () => folderThreads(threads, projectPinnedIds, visibleCount, placedAt),
    [threads, projectPinnedIds, visibleCount, placedAt],
  );
  const startThread = () => {
    actions.openNewThread({ projectId, sectionId: section.id, focusPrompt: true });
    onNavigate();
  };
  const treeProps = {
    scope: "tree",
    defaultOpen: "auto",
    expansion,
    depth: 2,
    bgInset: 14,
    activeThreadId,
    followUpThreadIds,
    onSetFollowUp,
    colored,
    onNavigate,
  } as const;

  return (
    <li data-sbp-section-id={section.id}>
      <ContextMenu.Root onOpenChange={setContextOpen}>
        <ContextMenu.Trigger asChild>
          <div
            className={cn(
              "sbp-section-folder group/section relative flex h-7 items-center gap-2 rounded-md pr-1 text-sm transition-colors",
              "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground",
            )}
            style={{ marginLeft: 14, width: "calc(100% - 14px)", paddingLeft: 10 }}
          >
            <button
              type="button"
              onClick={() => {
                if (contextOpen) return;
                expansion.setOpen(key, !open);
              }}
              aria-expanded={open}
              aria-label={`${section.name} folder (${threads.length} threads)`}
              className="absolute inset-0 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
            />
            <span className="pointer-events-none relative flex w-4 shrink-0 items-center justify-center text-subtle-foreground">
              <Icon name={open ? "FolderOpen" : "Folder"} className="size-3.5" aria-hidden />
            </span>
            <span className="pointer-events-none relative min-w-0 flex-1 truncate">{section.name}</span>
            <span className="pointer-events-none relative flex shrink-0 items-center gap-2 group-hover/section:hidden">
              <StatusCluster counts={counts} colored={colored} />
              <span className="text-2xs tabular-nums text-subtle-foreground/70">{threads.length}</span>
            </span>
            <button
              type="button"
              aria-label={`New thread in ${section.name}`}
              title="New thread in this folder"
              onClick={(event) => {
                event.stopPropagation();
                startThread();
              }}
              className="relative z-10 hidden size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover/section:flex group-focus-within/section:flex"
            >
              <Icon name="Plus" className="size-3.5" />
            </button>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            {...portalScopeProps}
            aria-label={`${section.name} folder actions`}
            collisionPadding={8}
            className="sbp-menu z-50 min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <ContextMenu.Item onSelect={() => window.setTimeout(startThread, 0)} className={ITEM}>
              <Icon name="Plus" className="size-3.5" /> New thread in this folder
            </ContextMenu.Item>
            <ContextMenu.Item
              disabled={!sections}
              onSelect={() => window.setTimeout(() => sections?.openRename(section), 0)}
              className={ITEM}
            >
              <Icon name="Edit" className="size-3.5" /> Rename folder…
            </ContextMenu.Item>
            <ContextMenu.Separator className="my-1 h-px bg-border" />
            <ContextMenu.Item
              disabled={!sections}
              onSelect={() => window.setTimeout(() => void sections?.remove(section), 0)}
              className={cn(ITEM, "text-destructive-text")}
            >
              <Icon name="Trash2" className="size-3.5" /> Delete folder (keeps its threads)
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {open ? (
        <ul className="space-y-px">
          <ThreadTree nodes={pinned} {...treeProps} />
          <ThreadTree nodes={page} {...treeProps} />
          {threads.length === 0 ? (
            <li className="py-1 pl-12 text-xs text-muted-foreground/60">Empty folder</li>
          ) : null}
          {hiddenCount > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + FOLDER_PAGE_SIZE)}
                className="sbp-show-more ml-7 flex h-6 w-[calc(100%-1.75rem)] items-center gap-1 rounded-md pl-2.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <Icon name="ChevronsDown" className="size-3" />
                Show {Math.min(FOLDER_PAGE_SIZE, hiddenCount)} more
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
