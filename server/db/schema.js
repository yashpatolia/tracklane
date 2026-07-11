import { bigint, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigint('id', { mode: 'bigint' }).primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').default(''),
  avatarUrl: text('avatar_url').default(''),
  username: text('username').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  role: text('role').default(''),
  season: text('season').default('').notNull(),
  location: text('location').default(''),
  stack: text('stack').default(''),
  status: text('status').default('Not Applied'),
  applied: text('applied').default(''),
  oa: text('oa').default(''),
  interview: text('interview').default(''),
  offer: text('offer').default(''),
  comp: text('comp').default(''),
  compPeriod: text('comp_period').default('Hourly'),
  platform: text('platform').default(''),
  link: text('link').default(''),
  nextAction: text('next_action').default(''),
  nextActionDue: text('next_action_due').default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  notes: text('notes').default(''),
  archived: boolean('archived').default(false).notNull(),
});

export const friendships = pgTable('friendships', {
  id: serial('id').primaryKey(),
  requesterId: bigint('requester_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: bigint('addressee_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
});
