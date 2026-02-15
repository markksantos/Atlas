import type { DB } from "./db.js";

const KEY_PREFIX = "api:";

export function saveKeys(db: DB, keys: Map<string, string>): void {
  const insert = db.prepare("insert into kv(key, value) values(?, ?) on conflict(key) do update set value=excluded.value");
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) insert.run(KEY_PREFIX + k, v);
  });
  tx([...keys.entries()]);
}

export function getKeys(db: DB): Map<string, string> {
  const rows = db.prepare("select key, value from kv where key like ?").all(KEY_PREFIX + "%");
  const map = new Map<string, string>();
  for (const r of rows as { key: string; value: string }[]) {
    map.set(r.key.replace(KEY_PREFIX, ""), r.value);
  }
  return map;
}

export function clearKeys(db: DB): void {
  db.prepare("delete from kv where key like ?").run(KEY_PREFIX + "%");
}

export function getKey(db: DB, name: string): string | undefined {
  const row = db.prepare("select value from kv where key = ?").get(KEY_PREFIX + name) as { value?: string } | undefined;
  return row?.value;
}


