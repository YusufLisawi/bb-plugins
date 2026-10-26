import {
  createContext,
  useContext,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  experimental_useSidebarThreads as useSidebarThreads,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { CompactViewportOverrideProvider } from "@/components/ui/hooks/use-compact-viewport";
import { useThreadPreferences } from "./ThreadPreferences";
import { threadFolderId } from "./threadFolders";
import { threadDisplayTitle } from "./status";
import { cleanName, NAME_MAX } from "./pinGroups";

const Context = createContext<((thread: PluginSidebarThread) => void) | null>(
  null,
);

export function PinGroupPickerProvider({
  children,
  isCompactViewport,
}: {
  children: ReactNode;
  isCompactViewport: boolean;
}) {
  const [thread, setThread] = useState<PluginSidebarThread | null>(null);
  return (
    <Context.Provider value={setThread}>
      {children}
      <CompactViewportOverrideProvider isCompactViewport={isCompactViewport}>
        {thread ? (
          <PinGroupPicker
            key={thread.id}
            thread={thread}
            onClose={() =>
              setThread((current) =>
                current?.id === thread.id ? null : current,
              )
            }
          />
        ) : null}
      </CompactViewportOverrideProvider>
    </Context.Provider>
  );
}

export function usePinGroupPicker() {
  return useContext(Context);
}

/** Choose or create a named group of pins in the thread's own folder. */
function PinGroupPicker({
  thread,
  onClose,
}: {
  thread: PluginSidebarThread;
  onClose: () => void;
}) {
  const { projects } = useSidebarThreads();
  const preferences = useThreadPreferences();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const folderId = threadFolderId(
    thread,
    preferences.folderPlacements,
    new Set(projects.map((p) => p.id)),
  );
  const project = projects.find((p) => p.id === folderId);
  const folderName = project ? preferences.projectName(project) : "its folder";
  const groups = preferences.pinGroups.filter((g) => g.projectId === folderId);
  const current = groups.find((g) => g.threadIds.includes(thread.id));
  const pending = saving || preferences.pendingIds.has(thread.id);
  const newName = cleanName(name);

  const run = async (work: () => Promise<boolean>, done: string) => {
    setSaving(true);
    if (await work()) {
      toast.success(done);
      onClose();
    } else setSaving(false);
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    if (newName === null) return;
    void run(
      () => preferences.createPinGroup(folderId, newName, thread.id),
      `Pinned to ${newName}`,
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>Pin to a group</DialogTitle>
          <p className="truncate text-sm" title={threadDisplayTitle(thread)}>
            {threadDisplayTitle(thread)}
          </p>
          <DialogDescription>
            Groups sit at the top of {folderName}. The thread is pinned in this
            project.
          </DialogDescription>
        </DialogHeader>
        {groups.length > 0 ? (
          <ul
            aria-label={`Pin groups in ${folderName}`}
            className="flex min-h-0 max-h-[40dvh] flex-col gap-1 overflow-y-auto"
            aria-busy={pending}
          >
            {groups.map((group) => (
              <li key={group.id}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={!preferences.ready || pending || group === current}
                  aria-label={
                    group === current
                      ? `${group.name}, current group`
                      : `Pin to ${group.name}`
                  }
                  onClick={() =>
                    void run(
                      () => preferences.setThreadPinGroup(thread.id, group.id),
                      `Pinned to ${group.name}`,
                    )
                  }
                >
                  <Icon name="Layers" data-icon="inline-start" />
                  <span className="min-w-0 truncate">{group.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {group === current ? "Current" : group.threadIds.length}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={create} className="flex gap-2">
          <Input
            aria-label="New group name"
            placeholder="New group…"
            maxLength={NAME_MAX}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Button
            type="submit"
            disabled={!preferences.ready || pending || newName === null}
          >
            Create
          </Button>
        </form>
        {current ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              void run(
                () => preferences.setThreadPinGroup(thread.id, null),
                `Removed from ${current.name}`,
              )
            }
          >
            Remove from {current.name}
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
