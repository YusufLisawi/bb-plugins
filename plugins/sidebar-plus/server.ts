// bb-plugin-sidebar-plus — backend: stores the sidebar layout in kv and
// broadcasts changes so every open window repaints at once.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  DEFAULT_LAYOUT,
  layoutSchema,
  normalizeLayout,
  type SidebarLayout,
} from "./src/layout";

const LAYOUT_KEY = "layout";
const LAYOUT_CHANNEL = "layout-changed";

export const rpcContract = defineRpcContract({
  getLayout: {
    input: z.null(),
    output: z.object({ layout: layoutSchema }),
  },
  setLayout: {
    // Accept anything object-shaped; the server normalizes so a stale client
    // can never wedge the stored layout.
    input: z.object({ layout: z.record(z.string(), z.unknown()) }).strict(),
    output: z.object({ layout: layoutSchema }),
  },
  resetLayout: {
    input: z.null(),
    output: z.object({ layout: layoutSchema }),
  },
});

export default async function plugin(bb: BbPluginApi) {
  async function readLayout(): Promise<SidebarLayout> {
    const stored = await bb.storage.kv.get<unknown>(LAYOUT_KEY);
    return normalizeLayout(stored ?? DEFAULT_LAYOUT);
  }

  async function writeLayout(next: unknown): Promise<SidebarLayout> {
    const layout = normalizeLayout(next);
    await bb.storage.kv.set(LAYOUT_KEY, layout);
    bb.realtime.publish(LAYOUT_CHANNEL, { at: Date.now() });
    return layout;
  }

  bb.rpc.register(rpcContract, {
    getLayout: async () => ({ layout: await readLayout() }),
    setLayout: async ({ layout }) => ({ layout: await writeLayout(layout) }),
    resetLayout: async () => ({ layout: await writeLayout(DEFAULT_LAYOUT) }),
  });

  bb.log.info("sidebar-plus loaded");
}
