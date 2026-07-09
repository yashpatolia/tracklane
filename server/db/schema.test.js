import { describe, expect, it } from 'vitest';
import { applications, friendships, users } from './schema.js';

describe('database schema', () => {
  it('requires a season value for applications', () => {
    expect(applications.season.notNull).toBe(true);
    expect(applications.season.config.notNull).toBe(true);
  });

  it('defaults archived to false and requires a value', () => {
    expect(applications.archived.notNull).toBe(true);
    expect(applications.archived.default).toBe(false);
  });

  it('allows a nullable, unique username on users', () => {
    expect(users.username.notNull).toBe(false);
    expect(users.username.isUnique).toBe(true);
  });

  it('defaults friendship status to pending and requires requester/addressee', () => {
    expect(friendships.status.default).toBe('pending');
    expect(friendships.status.notNull).toBe(true);
    expect(friendships.requesterId.notNull).toBe(true);
    expect(friendships.addresseeId.notNull).toBe(true);
    expect(friendships.respondedAt.notNull).toBe(false);
  });
});
