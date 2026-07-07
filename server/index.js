import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import { db, pool } from './db/index.js';
import { applications } from './db/schema.js';
import passport, { hasGoogleAuth, localDevLogin, requireAuth } from './auth.js';
import { getDevApplications, replaceDevApplications } from './dev-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PgSession = connectPgSimple(session);
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'tracklane-dev-session-secret');

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production.');
}

const COLUMNS = ['company', 'role', 'season', 'location', 'stack', 'status', 'applied', 'oa', 'interview', 'offer', 'comp', 'platform', 'link', 'nextAction', 'nextActionDue', 'updatedAt', 'notes'];

const app = express();
app.use(express.json());
app.set('trust proxy', 1);

const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

if (process.env.DATABASE_URL) {
  sessionConfig.store = new PgSession({ pool, createTableIfMissing: true });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

if (hasGoogleAuth) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: CLIENT_URL }),
    (req, res) => res.redirect(CLIENT_URL)
  );
} else {
  app.get('/auth/google', localDevLogin);
  app.get('/auth/google/callback', localDevLogin);
}

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  const { id, email, name, avatarUrl } = req.user;
  res.json({ user: { id, email, name, avatarUrl } });
});

app.get('/api/applications', requireAuth, async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json(getDevApplications(req.user.id));
  }
  const rows = await db.select().from(applications).where(eq(applications.userId, req.user.id));
  res.json(rows);
});

app.put('/api/applications', requireAuth, async (req, res) => {
  if (!process.env.DATABASE_URL) {
    replaceDevApplications(req.user.id, req.body);
    return res.json({ ok: true });
  }

  await db.transaction(async (tx) => {
    await tx.delete(applications).where(eq(applications.userId, req.user.id));
    for (const row of req.body) {
      await tx.insert(applications).values({
        userId: req.user.id,
        ...Object.fromEntries(COLUMNS.map((c) => {
          if (c === 'updatedAt') return [c, row.updatedAt || new Date().toISOString()];
          return [c, row[c] ?? ''];
        })),
      });
    }
  });
  res.json({ ok: true });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

if (HOST) {
  app.listen(PORT, HOST, () => {
    console.log(`API server on http://${HOST}:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`API server on http://0.0.0.0:${PORT}`);
  });
}
