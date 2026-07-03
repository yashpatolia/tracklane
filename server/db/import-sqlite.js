import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { applications, users } from './schema.js';

// One-off: copies rows from the legacy tracker.sqlite into Postgres,
// attached to the given user's account. Log in with Google once first
// so that account exists, then run:
//   node server/db/import-sqlite.js you@example.com

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_FILE = path.join(__dirname, '..', '..', 'tracker.sqlite');
const COLUMNS = ['company', 'role', 'location', 'stack', 'status', 'applied', 'oa', 'interview', 'offer', 'comp', 'platform', 'link', 'notes'];

const email = process.argv[2];
if (!email) {
  console.error('Usage: node server/db/import-sqlite.js <account-email>');
  process.exit(1);
}

const [user] = await db.select().from(users).where(eq(users.email, email));
if (!user) {
  console.error(`No account found for ${email}. Sign in with Google once first, then re-run this.`);
  process.exit(1);
}

const sqlite = new DatabaseSync(SQLITE_FILE);
const rows = sqlite.prepare(`SELECT ${COLUMNS.join(', ')} FROM applications ORDER BY id`).all();

for (const row of rows) {
  await db.insert(applications).values({
    userId: user.id,
    ...Object.fromEntries(COLUMNS.map((c) => [c, row[c] ?? ''])),
  });
}

console.log(`Imported ${rows.length} rows into Postgres for ${email}.`);
await pool.end();
