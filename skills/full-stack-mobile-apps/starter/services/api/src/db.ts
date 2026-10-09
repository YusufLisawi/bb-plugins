import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const file = resolve(process.env.DATABASE_PATH ?? "./data/app.db");
mkdirSync(dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type ItemRow = { id: number; title: string; created_at: string };
export const listItems = db.prepare("SELECT id, title, created_at FROM items ORDER BY id DESC");
export const insertItem = db.prepare("INSERT INTO items (title) VALUES (?)");
export const getItem = db.prepare("SELECT id, title, created_at FROM items WHERE id = ?");
