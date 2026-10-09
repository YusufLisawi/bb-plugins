// Example Hono route module. Mount write routes behind an auth middleware.
import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";

type Item = { id: number; title: string };
type ItemRepository = {
  list(): Item[];
  create(title: string): Item;
};
const createBody = z.object({ title: z.string().trim().min(1).max(120) });

export function createItemRoutes(repository: ItemRepository, requireAdmin: MiddlewareHandler) {
  const routes = new Hono();
  routes.get("/items", (c) => c.json({ items: repository.list() }));
  routes.post("/items", requireAdmin, async (c) => {
    const input = createBody.safeParse(await c.req.json().catch(() => null));
    if (!input.success) {
      return c.json({ error: "Invalid body", details: input.error.flatten() }, 400);
    }
    const item = repository.create(input.data.title);
    return c.json({ item }, 201);
  });
  return routes;
}
