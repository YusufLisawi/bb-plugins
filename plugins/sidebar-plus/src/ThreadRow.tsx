import { useEffect, useRef, useState, type ReactNode } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  experimental_useSidebarThreadActions as useSidebarThreadActions,
  experimental_useSidebarThreadSplit as useSidebarThreadSplit,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { usePortalScopeProps } from "@/lib/portal-scope";
import { useThreadPreferences } from "./ThreadPreferences";
import { useThreadFolderPicker } from "./ThreadFolderPicker";
import { usePinGroupPicker } from "./PinGroupPicker";
import { StatusGlyph } from "./StatusGlyph";
import { threadDisplayTitle } from "./status";
import { useProjectSections } from "./ProjectSections";
import { subthreadCleanupPlan } from "./subthreadCleanup";

export const ROW_CLASS =
  "group/row relative flex h-7 w-full items-center gap-2 rounded-md pr-1 text-sm transition-colors";

/**
 * One thread row in bb's own shape: full-bleed link, truncated title, a
 * trailing 16px slot that shows the status glyph at rest and the actions on
 * hover, and a right-click menu. `depth` indents child threads.
 */
export function ThreadRow({
  thread,
  isActive,
  isFollowUp,
  onToggleFollowUp,
  colored,
  depth = 0,
  bgInset = 0,
  hint,
  onNavigate,
  leading,
  context = false,
  badge,
}: {
  thread: PluginSidebarThread;
  isActive: boolean;
  isFollowUp: boolean;
  onToggleFollowUp: (marked: boolean) => void;
  colored: boolean;
  depth?: number;
  /**
   * Pixels to inset the row's background from the left (margin instead of
   * padding), so a folder's vertical guide line never runs under the row's
   * hover/active background. Text position is unchanged.
   */
  bgInset?: number;
  /** Subtle trailing text, e.g. the project name inside a smart section. */
  hint?: string | null;
  onNavigate: () => void;
  /** Optional leading control (a collapse chevron for parents). */
  leading?: ReactNode;
  /** A parent shown only to place a matching child under it: muted title. */
  context?: boolean;
  /** Trailing summary, e.g. a collapsed parent's hidden children. */
  badge?: ReactNode;
}) {
  const actions = useSidebarThreadActions();
  const { splitProps } = useSidebarThreadSplit(thread.id);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const preferences = useThreadPreferences();
  const openFolderPicker = useThreadFolderPicker();
  const openPinGroupPicker = usePinGroupPicker();
  const isProjectPinned =
    thread.isPinned && preferences.projectPinnedIds.has(thread.id);
  const title = threadDisplayTitle(thread);
  const portalScopeProps = usePortalScopeProps();

  const open = (event: React.MouseEvent) => {
    event.preventDefault();
    if (contextOpen || menuOpen) return;
    actions.open(thread.id, { split: event.metaKey || event.ctrlKey });
    onNavigate();
  };

  return (
    <ContextMenu.Root onOpenChange={setContextOpen}>
      <ContextMenu.Trigger asChild>
        <li
          className={cn(
            ROW_CLASS,
            "sbp-thread-row",
            isActive
              ? "bg-sidebar-accent text-sidebar-foreground"
              : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground",
            menuOpen && "bg-sidebar-accent",
          )}
          style={{
            marginLeft: bgInset,
            width: bgInset > 0 ? `calc(100% - ${bgInset}px)` : undefined,
            paddingLeft: Math.max(4, 8 + depth * 16 - bgInset),
          }}
        >
          {!isEditing ? (
            <a
              data-sidebar-thread-shortcut-target=""
              data-sidebar-thread-id={thread.id}
              href="#"
              aria-label={[
                title,
                isFollowUp ? "marked for follow-up" : null,
                thread.isPinned ? "pinned" : null,
              ]
                .filter(Boolean)
                .join(", ")}
              aria-current={isActive ? "page" : undefined}
              {...splitProps}
              onClick={open}
              onDoubleClick={(event) => {
                event.preventDefault();
                setIsEditing(true);
              }}
              className="absolute inset-0 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
            />
          ) : null}
          {leading ? (
            <span className="relative z-10 flex shrink-0 items-center">
              {leading}
            </span>
          ) : null}
          <span className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-1.5">
            {thread.isPinned && !isEditing ? (
              <span
                data-sbp-thread-pin=""
                title={
                  isProjectPinned ? "Pinned in project" : "Pinned globally"
                }
                className="flex shrink-0 items-center text-muted-foreground"
                aria-hidden="true"
              >
                <Icon name="Pin" className="size-3" />
              </span>
            ) : null}
            {isEditing ? (
              <InlineRename
                initial={title}
                onCommit={(next) => {
                  setIsEditing(false);
                  if (next && next !== title)
                    void actions.rename(thread.id, next);
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 truncate",
                  thread.isUnread && "font-medium",
                  context && !isActive && "text-muted-foreground",
                )}
                title={title}
              >
                {title}
              </span>
            )}
            {(hint || badge) && !isEditing ? (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-1 group-hover/row:hidden">
                {badge}
                {hint ? (
                  <span className="truncate text-2xs text-muted-foreground/60">
                    {hint}
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
          <span className="relative flex size-5 shrink-0 items-center justify-center">
            <span
              className={cn(
                "flex items-center justify-center transition-opacity",
                "group-hover/row:opacity-0 group-focus-within/row:opacity-0",
                menuOpen && "opacity-0",
              )}
            >
              <StatusGlyph thread={thread} colored={colored} />
            </span>
            {isFollowUp ? (
              <span
                aria-hidden="true"
                title="Marked for follow-up"
                className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-warning ring-2 ring-sidebar"
              />
            ) : null}
            <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`${title} actions`}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100",
                    "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
                    menuOpen && "opacity-100 text-foreground",
                  )}
                >
                  <Icon name="MoreHorizontal" className="size-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  {...portalScopeProps}
                  align="end"
                  sideOffset={4}
                  className={MENU_CLASS}
                >
                  <MenuItems
                    thread={thread}
                    isFollowUp={isFollowUp}
                    onToggleFollowUp={onToggleFollowUp}
                    onRename={() => setIsEditing(true)}
                    onMoveFolder={
                      openFolderPicker
                        ? () => openFolderPicker(thread)
                        : undefined
                    }
                    onPinToGroup={
                      openPinGroupPicker
                        ? () => openPinGroupPicker(thread)
                        : undefined
                    }
                    surface="dropdown"
                  />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </span>
        </li>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          {...portalScopeProps}
          className={MENU_CLASS}
          aria-label="Thread actions"
        >
          <MenuItems
            thread={thread}
            isFollowUp={isFollowUp}
            onToggleFollowUp={onToggleFollowUp}
            onRename={() => setIsEditing(true)}
            onMoveFolder={
              openFolderPicker ? () => openFolderPicker(thread) : undefined
            }
            onPinToGroup={
              openPinGroupPicker ? () => openPinGroupPicker(thread) : undefined
            }
            surface="context"
          />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

const MENU_CLASS =
  "sbp-menu z-50 min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md";
const ITEM_CLASS =
  "sbp-menu-item flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

function MenuItems({
  thread,
  isFollowUp,
  onToggleFollowUp,
  onRename,
  onMoveFolder,
  onPinToGroup,
  surface,
}: {
  thread: PluginSidebarThread;
  isFollowUp: boolean;
  onToggleFollowUp: (marked: boolean) => void;
  onRename: () => void;
  onMoveFolder?: () => void;
  /** Pin in the project and file the thread in a named group. */
  onPinToGroup?: () => void;
  surface: "context" | "dropdown";
}) {
  const actions = useSidebarThreadActions();
  const preferences = useThreadPreferences();
  const isProjectPinned =
    thread.isPinned && preferences.projectPinnedIds.has(thread.id);
  const isExempt = preferences.exemptIds.has(thread.id);
  const pending = preferences.pendingIds.has(thread.id);
  const M = surface === "context" ? ContextMenu : DropdownMenu;
  const sections = useProjectSections();
  const portalScopeProps = usePortalScopeProps();
  const projectId = sections ? sections.folderIdOf(thread) : thread.projectId;
  const folders = sections && !thread.parentThreadId ? sections.foldersIn(projectId) : [];
  const currentFolder = folders.find((folder) => folder.id === thread.sectionId) ?? null;
  const cleanup = sections ? subthreadCleanupPlan(thread.id, sections.childrenOf) : null;
  const hasSubthreads = (sections?.childrenOf.get(thread.id)?.length ?? 0) > 0;
  const Item = ({
    children,
    destructive,
    disabled,
    onSelect,
  }: {
    children: ReactNode;
    destructive?: boolean;
    disabled?: boolean;
    onSelect: () => void;
  }) => (
    <M.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(ITEM_CLASS, destructive && "text-destructive-text")}
    >
      {children}
    </M.Item>
  );
  const Sep = () => <M.Separator className="my-1 h-px bg-border" />;
  return (
    <>
      <Item onSelect={() => actions.open(thread.id, { split: true })}>
        <Icon name="Columns2" className="size-3.5" /> Open in split
      </Item>
      <Item onSelect={() => deferMenuAction(onRename)}>
        <Icon name="Edit" className="size-3.5" /> Rename
      </Item>
      {onMoveFolder ? (
        <Item
          disabled={!preferences.ready || pending}
          onSelect={() => deferMenuAction(onMoveFolder)}
        >
          <Icon name="Folder" className="size-3.5" /> Move to project folder…
        </Item>
      ) : null}
      {sections && !thread.parentThreadId ? (
        <M.Sub>
          <M.SubTrigger className={ITEM_CLASS} disabled={!sections.ready}>
            <Icon name="FolderOpen" className="size-3.5" /> Move to folder
            <Icon name="ChevronRight" className="ml-auto size-3" />
          </M.SubTrigger>
          <M.Portal>
            <M.SubContent
              {...portalScopeProps}
              collisionPadding={8}
              className="sbp-menu z-50 min-w-44 max-w-64 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {folders.map((folder) => (
                <Item
                  key={folder.id}
                  disabled={folder.id === currentFolder?.id}
                  onSelect={() => void sections.moveThread(thread, folder)}
                >
                  <Icon name="Folder" className="size-3.5" />
                  <span className="min-w-0 truncate">{folder.name}</span>
                  {folder.id === currentFolder?.id ? (
                    <span className="ml-auto text-xs text-muted-foreground">Current</span>
                  ) : null}
                </Item>
              ))}
              {folders.length > 0 ? <Sep /> : null}
              <Item onSelect={() => deferMenuAction(() => sections.openCreate(projectId, thread))}>
                <Icon name="FolderPlus" className="size-3.5" /> New folder…
              </Item>
              {currentFolder ? (
                <Item onSelect={() => void sections.moveThread(thread, null)}>
                  <Icon name="FolderOpen" className="size-3.5" /> Remove from folder
                </Item>
              ) : null}
            </M.SubContent>
          </M.Portal>
        </M.Sub>
      ) : null}
      <Sep />
      <Item onSelect={() => void actions.setRead(thread.id, thread.isUnread)}>
        <Icon
          name={thread.isUnread ? "MailOpen" : "Mail"}
          className="size-3.5"
        />
        {thread.isUnread ? "Mark read" : "Mark unread"}
      </Item>
      <Item
        disabled={!preferences.ready || pending}
        onSelect={() =>
          preferences.setPinMode(thread.id, thread.isPinned ? "none" : "global")
        }
      >
        <Icon name={thread.isPinned ? "PinOff" : "Pin"} className="size-3.5" />
        {thread.isPinned ? "Unpin" : "Pin globally"}
      </Item>
      {thread.isPinned ? (
        <Item
          disabled={!preferences.ready || pending}
          onSelect={() =>
            preferences.setPinMode(
              thread.id,
              isProjectPinned ? "global" : "project",
            )
          }
        >
          <Icon
            name={isProjectPinned ? "Pin" : "Folder"}
            className="size-3.5"
          />
          {isProjectPinned
            ? "Move to global pinned section"
            : "Move to project pinned section"}
        </Item>
      ) : (
        <Item
          disabled={!preferences.ready || pending}
          onSelect={() => preferences.setPinMode(thread.id, "project")}
        >
          <Icon name="Folder" className="size-3.5" /> Pin in project
        </Item>
      )}
      {onPinToGroup ? (
        <Item
          disabled={!preferences.ready || pending}
          onSelect={() => deferMenuAction(onPinToGroup)}
        >
          <Icon name="Layers" className="size-3.5" />
          {isProjectPinned &&
          preferences.pinGroups.some((g) => g.threadIds.includes(thread.id))
            ? "Change group…"
            : "Pin to group…"}
        </Item>
      ) : null}
      <Item
        disabled={
          thread.isPinned || !preferences.autoArchiveAvailable || pending
        }
        onSelect={() => preferences.setAutoArchiveExempt(thread.id, !isExempt)}
      >
        <Icon name="Archive" className="size-3.5" />
        {thread.isPinned
          ? "Auto-archive disabled while pinned"
          : !preferences.ready
            ? "Loading auto-archive…"
            : !preferences.autoArchiveAvailable
              ? "Auto-archive unavailable"
              : isExempt
                ? "Enable auto-archive"
                : "Disable auto-archive"}
      </Item>
      <Item onSelect={() => onToggleFollowUp(!isFollowUp)}>
        <Icon name={isFollowUp ? "Check" : "Clock"} className="size-3.5" />
        {isFollowUp ? "Clear follow-up mark" : "Mark for follow-up"}
      </Item>
      <Sep />
      {cleanup && hasSubthreads ? (
        <Item
          disabled={cleanup.archive.length === 0}
          onSelect={() => {
            for (const child of cleanup.archive) actions.archive(child.id);
          }}
        >
          <Icon name="Archive" className="size-3.5" />
          {cleanup.archive.length === 0
            ? `Subthreads still running (${cleanup.keptCount})`
            : `Clean up subthreads (${cleanup.archivedCount})${cleanup.keptCount > 0 ? `, keeps ${cleanup.keptCount} running` : ""}`}
        </Item>
      ) : null}
      <Item onSelect={() => actions.archive(thread.id)}>
        <Icon name="Archive" className="size-3.5" /> Archive
      </Item>
      <Item
        destructive
        onSelect={() => deferMenuAction(() => actions.requestDelete(thread.id))}
      >
        <Icon name="Trash2" className="size-3.5" /> Delete
      </Item>
    </>
  );
}

// Let Radix finish dismissing the menu before opening bb's host-owned
// confirmation or edit UI. The native sidebar uses the same deferral.
function deferMenuAction(action: () => void): void {
  window.setTimeout(action, 0);
}

export function InlineRename({
  initial,
  onCommit,
  onCancel,
  label = "Rename thread",
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      onBlur={() => onCommit(value.trim())}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(value.trim());
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      className="pointer-events-auto relative z-10 w-full min-w-0 rounded bg-background px-1 text-sm outline-none ring-1 ring-sidebar-ring"
      aria-label={label}
    />
  );
}
