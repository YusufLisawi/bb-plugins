// Sidebar takeover: while a plugin page that offers one is open (Mail offers
// its split list), the thread list makes room for it. The thread list stays
// mounted but hidden so its state and the nav grid survive the round trip.
//
// The contract is a small versioned registry on `window`, shared with the
// offering plugin without a build-time dependency:
//   window.__bbSidebarTakeover = { version: 1, current, hosts, set, subscribe }
import { Component, useEffect, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import type { PluginThreadListProps } from "@get-bb/plugin-sdk/app";
import { SidebarList } from "./SidebarList";

interface SidebarTakeover {
  id: string;
  component: ComponentType<{ onNavigate: () => void }>;
}

interface TakeoverRegistry {
  version: 1;
  current: SidebarTakeover | null;
  hosts: number;
  set(next: SidebarTakeover | null): void;
  subscribe(listener: () => void): () => void;
}

declare global {
  interface Window {
    __bbSidebarTakeover?: TakeoverRegistry;
  }
}

function registry(): TakeoverRegistry {
  if (!window.__bbSidebarTakeover) {
    const listeners = new Set<() => void>();
    const created: TakeoverRegistry = {
      version: 1,
      current: null,
      hosts: 0,
      set(next) {
        created.current = next;
        for (const listener of listeners) listener();
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    window.__bbSidebarTakeover = created;
  }
  return window.__bbSidebarTakeover;
}

/** A crashing takeover falls back to the thread list instead of an empty sidebar. */
class TakeoverBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SidebarListWithTakeover(props: PluginThreadListProps) {
  const shared = registry();
  const takeover = useSyncExternalStore(shared.subscribe, () => shared.current);

  useEffect(() => {
    shared.hosts += 1;
    shared.set(shared.current);
    return () => {
      shared.hosts = Math.max(0, shared.hosts - 1);
      shared.set(shared.current);
    };
  }, [shared]);

  const Offered = takeover?.component;
  return (
    <>
      <div style={{ display: Offered ? "none" : "contents" }}>
        <SidebarList {...props} />
      </div>
      {Offered ? (
        <TakeoverBoundary key={takeover.id} onError={() => shared.set(null)}>
          <Offered onNavigate={props.onNavigate} />
        </TakeoverBoundary>
      ) : null}
    </>
  );
}
