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
import { StatusGlyph } from "./StatusGlyph";
import { threadDisplayTitle } from "./status";

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
  colored,
  depth = 0,
  bgInset = 0,
  hint,
  onNavigate,
  leading,
}: {
  thread: PluginSidebarThread;
  isActive: boolean;
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
}) {
  const actions = useSidebarThreadActions();
  const { splitProps } = useSidebarThreadSplit(thread.id);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const title = threadDisplayTitle(thread);

  const open = (event: React.MouseEvent) => {
    event.preventDefault();
    actions.open(thread.id, { split: event.metaKey || event.ctrlKey });
    onNavigate();
  };

  const menuItems = (
    <MenuItems
      thread={thread}
      onRename={() => setIsEditing(true)}
      surface={menuOpen ? "dropdown" : "context"}
    />
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <li
          className={cn(
            ROW_CLASS,
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
              aria-label={title}
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
            {isEditing ? (
              <InlineRename
                initial={title}
                onCommit={(next) => {
                  setIsEditing(false);
                  if (next && next !== title) void actions.rename(thread.id, next);
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 truncate",
                  thread.isUnread && "font-medium",
                )}
                title={title}
              >
                {title}
              </span>
            )}
            {hint && !isEditing ? (
              <span className="ml-auto shrink-0 truncate pl-1 text-2xs text-muted-foreground/60 group-hover/row:hidden">
                {hint}
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
                  align="end"
                  sideOffset={4}
                  className={MENU_CLASS}
                >
                  {menuItems}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </span>
        </li>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={MENU_CLASS} aria-label="Thread actions">
          <MenuItems
            thread={thread}
            onRename={() => setIsEditing(true)}
            surface="context"
          />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

const MENU_CLASS =
  "z-50 min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md";
const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

function MenuItems({
  thread,
  onRename,
  surface,
}: {
  thread: PluginSidebarThread;
  onRename: () => void;
  surface: "context" | "dropdown";
}) {
  const actions = useSidebarThreadActions();
  const M = surface === "context" ? ContextMenu : DropdownMenu;
  const Item = ({
    children,
    destructive,
    onSelect,
  }: {
    children: ReactNode;
    destructive?: boolean;
    onSelect: () => void;
  }) => (
    <M.Item
      onSelect={onSelect}
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
      <Item onSelect={onRename}>
        <Icon name="Edit" className="size-3.5" /> Rename
      </Item>
      <Sep />
      <Item onSelect={() => void actions.setRead(thread.id, thread.isUnread)}>
        <Icon name={thread.isUnread ? "MailOpen" : "Mail"} className="size-3.5" />
        {thread.isUnread ? "Mark read" : "Mark unread"}
      </Item>
      <Item onSelect={() => void actions.setPinned(thread.id, !thread.isPinned)}>
        <Icon name={thread.isPinned ? "PinOff" : "Pin"} className="size-3.5" />
        {thread.isPinned ? "Unpin" : "Pin"}
      </Item>
      <Sep />
      <Item onSelect={() => actions.archive(thread.id)}>
        <Icon name="Archive" className="size-3.5" /> Archive
      </Item>
      <Item destructive onSelect={() => actions.requestDelete(thread.id)}>
        <Icon name="Trash2" className="size-3.5" /> Delete
      </Item>
    </>
  );
}

function InlineRename({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
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
      aria-label="Rename thread"
    />
  );
}
