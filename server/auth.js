import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { getDevUserById, upsertDevUser } from './dev-store.js';
import { users } from './db/schema.js';

const hasGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

if (hasGoogleAuth) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value ?? '';
        const [existing] = await db.select().from(users).where(eq(users.googleId, profile.id));
        if (existing) {
          return done(null, existing);
        }
        const [created] = await db.insert(users).values({
          googleId: profile.id,
          email,
          name: profile.displayName ?? '',
          avatarUrl: profile.photos?.[0]?.value ?? '',
        }).returning();
        done(null, created);
      } catch (err) {
        done(err);
      }
    }
  ));
}

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    if (!hasGoogleAuth) {
      const userId = Number(id);
      return done(null, getDevUserById(Number.isNaN(userId) ? id : userId));
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

export async function localDevLogin(req, res, next) {
  if (hasGoogleAuth) {
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }

  try {
    const email = process.env.DEV_AUTH_EMAIL || 'dev@tracklane.local';
    const name = process.env.DEV_AUTH_NAME || 'Local Dev';
    const user = upsertDevUser({
      googleId: `dev:${email}`,
      email,
      name,
      avatarUrl: '',
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
    });
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

export { hasGoogleAuth };
export default passport;
