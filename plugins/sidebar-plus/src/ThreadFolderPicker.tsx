import { createContext, useContext, useState, type ReactNode } from "react";
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

const Context = createContext<((thread: PluginSidebarThread) => void) | null>(
  null,
);

export function ThreadFolderPickerProvider({
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
          <ThreadFolderPicker
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

export function useThreadFolderPicker() {
  return useContext(Context);
}

function ThreadFolderPicker({
  thread,
  onClose,
}: {
  thread: PluginSidebarThread;
  onClose: () => void;
}) {
  const { status, projects } = useSidebarThreads();
  const preferences = useThreadPreferences();
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const currentId = threadFolderId(
    thread,
    preferences.folderPlacements,
    new Set(projects.map((p) => p.id)),
  );
  const results = [...projects]
    .filter((p) =>
      p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(a.isPersonal) - Number(b.isPersonal) ||
        a.name.localeCompare(b.name),
    );
  const pending = saving || preferences.pendingIds.has(thread.id);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>Move to project folder</DialogTitle>
          <p className="truncate text-sm" title={threadDisplayTitle(thread)}>
            {threadDisplayTitle(thread)}
          </p>
          <DialogDescription>
            Choose a sidebar folder. This thread keeps its current workspace.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Search project folders"
          placeholder="Search projects…"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          className="sbp-folder-search"
        />
        <div
          className="min-h-0 max-h-[45dvh] overflow-y-auto"
          aria-busy={pending}
        >
          {status === "loading" ? (
            <p role="status" className="py-4 text-sm text-muted-foreground">
              Loading projects…
            </p>
          ) : status === "error" ? (
            <p role="alert" className="py-4 text-sm text-muted-foreground">
              Could not load projects. Close and try again.
            </p>
          ) : results.length === 0 ? (
            <p role="status" className="py-4 text-sm text-muted-foreground">
              No projects match your search.
            </p>
          ) : (
            <ul
              aria-label="Destination project folders"
              className="flex flex-col gap-1"
            >
              {results.map((project) => (
                <li key={project.id}>
                  <Button
                    variant="ghost"
                    className="sbp-folder-destination w-full justify-start"
                    disabled={
                      !preferences.ready || pending || project.id === currentId
                    }
                    aria-label={
                      project.id === currentId
                        ? `${project.name}, current folder`
                        : `Move to ${project.name}`
                    }
                    onClick={async () => {
                      setSaving(true);
                      setError(false);
                      const success = await preferences.setThreadFolder(
                        thread.id,
                        project.id,
                      );
                      if (success) {
                        toast.success(`Moved to ${project.name}`);
                        onClose();
                      } else {
                        setSaving(false);
                        setError(true);
                      }
                    }}
                  >
                    <Icon name="Folder" data-icon="inline-start" />
                    <span className="min-w-0 truncate">{project.name}</span>
                    {project.id === currentId ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Current
                      </span>
                    ) : null}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {pending ? (
          <p role="status" className="text-xs text-muted-foreground">
            Moving thread…
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive-text">
            Could not move the thread. Try again.
          </p>
        ) : null}
        <DialogClose asChild>
          <Button variant="outline" className="sbp-folder-cancel">
            Cancel
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
