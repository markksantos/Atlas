import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export type DB = Database.Database;

export function createDatabase(): DB {
  const dataDir = join(process.cwd(), ".data");
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, "atlas.sqlite"));
  db.pragma("journal_mode = WAL");

  db.exec(`
    create table if not exists kv (
      key text primary key,
      value text not null
    );

    create table if not exists runs (
      id integer primary key autoincrement,
      created_at text default (datetime('now')),
      prompt text not null,
      models text not null,
      final_text text,
      candidates_json text,
      cost_cents integer default 0,
      status text default 'done'
    );
  `);

  // Attempt to add new columns if migrating older DBs
  try { db.exec("alter table runs add column final_text text"); } catch {}
  try { db.exec("alter table runs add column candidates_json text"); } catch {}

  return db;
}

export type RunRow = {
  id: number;
  created_at: string;
  prompt: string;
  models: string;
  final_text: string | null;
  candidates_json: string | null;
  cost_cents: number;
  status: string;
};

export function saveRun(db: DB, run: { prompt: string; models: string[]; finalText: string; candidates: unknown; costCents?: number; status?: string }): number {
  const stmt = db.prepare(
    "insert into runs(prompt, models, final_text, candidates_json, cost_cents, status) values(?, ?, ?, ?, ?, ?)"
  );
  const info = stmt.run(run.prompt, JSON.stringify(run.models), run.finalText, JSON.stringify(run.candidates), run.costCents ?? 0, run.status ?? "done");
  return Number(info.lastInsertRowid);
}

export function listRuns(db: DB, opts: { query?: string; limit?: number; offset?: number } = {}) {
  const limit = Math.min(opts.limit ?? 25, 100);
  const offset = opts.offset ?? 0;
  const q = opts.query?.trim();
  if (q) {
    const stmt = db.prepare<RunRow>(
      "select * from runs where prompt like ? order by id desc limit ? offset ?"
    );
    return stmt.all(`%${q}%`, limit, offset) as unknown as RunRow[];
  }
  const stmt = db.prepare<RunRow>("select * from runs order by id desc limit ? offset ?");
  return stmt.all(limit, offset) as unknown as RunRow[];
}

export function clearRuns(db: DB) {
  db.prepare("delete from runs").run();
}



