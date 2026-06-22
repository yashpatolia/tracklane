import { readdirSync, readFileSync } from 'fs';

export function runMigrations(db, migrationsDir) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name));
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(`${migrationsDir}/${file}`, 'utf-8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      db.exec('COMMIT');
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
