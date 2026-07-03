import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { users } from './db/schema.js';

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

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

export default passport;
