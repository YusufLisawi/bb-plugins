import { timingSafeEqual } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { db, getItem, insertItem, listItems, type ItemRow } from "./db.js";

const app = new Hono();
const itemInput = z.object({ title: z.string().trim().min(1).max(120) });
const toItem = (row: ItemRow) => ({ id: row.id, title: row.title, createdAt: row.created_at });

function validAdminToken(provided: string): boolean {
  const secret = process.env.ADMIN_TOKEN ?? "";
  if (secret.length < 24) return false;
  const actual = Buffer.from(provided);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});
app.get("/health", (c) => {
  db.prepare("SELECT 1").get();
  return c.json({ ok: true });
});
app.get("/v1/items", (c) => {
  const rows = listItems.all() as ItemRow[];
  return c.json({ items: rows.map(toItem) });
});

const admin = new Hono();
admin.use("*", async (c, next) => {
  const provided = c.req.header("Authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? "";
  if (!validAdminToken(provided)) return c.json({ error: "Unauthorized" }, 401);
  await next();
});
admin.get("/items", (c) => {
  const rows = listItems.all() as ItemRow[];
  return c.json({ items: rows.map(toItem) });
});
admin.post("/items", async (c) => {
  const parsed = itemInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  const result = insertItem.run(parsed.data.title);
  const row = getItem.get(result.lastInsertRowid) as ItemRow;
  return c.json({ item: toItem(row) }, 201);
});
app.route("/admin", admin);

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
serve({ fetch: app.fetch, port }, () => console.log(`API listening on ${port}`));
