import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'tracker.sqlite');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const PORT = 3001;

const COLUMNS = ['company', 'role', 'location', 'stack', 'status', 'applied', 'oa', 'interview', 'offer', 'comp', 'platform', 'link', 'notes'];

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');
runMigrations(db, MIGRATIONS_DIR);

const app = express();
app.use(express.json());

app.get('/api/applications', (req, res) => {
  const rows = db.prepare(`SELECT ${COLUMNS.join(', ')} FROM applications ORDER BY id`).all();
  res.json(rows);
});

app.put('/api/applications', (req, res) => {
  const insert = db.prepare(`INSERT INTO applications (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`);
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM applications');
    for (const row of req.body) {
      insert.run(...COLUMNS.map((c) => row[c] ?? ''));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API server on http://localhost:${PORT}`);
});
