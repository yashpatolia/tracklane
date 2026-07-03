import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').default(''),
  avatarUrl: text('avatar_url').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  role: text('role').default(''),
  location: text('location').default(''),
  stack: text('stack').default(''),
  status: text('status').default('Not Applied'),
  applied: text('applied').default(''),
  oa: text('oa').default(''),
  interview: text('interview').default(''),
  offer: text('offer').default(''),
  comp: text('comp').default(''),
  platform: text('platform').default(''),
  link: text('link').default(''),
  notes: text('notes').default(''),
});
