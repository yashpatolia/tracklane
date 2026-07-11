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

  it('stores user id as a 64-bit bigint', () => {
    expect(users.id.getSQLType()).toBe('bigint');
  });

  it('stores application user_id as a 64-bit bigint', () => {
    expect(applications.userId.getSQLType()).toBe('bigint');
  });

  it('allows a nullable, unique username on users', () => {
    expect(users.username.notNull).toBe(false);
  });

  it('defines a friendships table with pending/accepted status default', () => {
    expect(friendships.status.default).toBe('pending');
    expect(friendships.requesterId.getSQLType()).toBe('bigint');
    expect(friendships.addresseeId.getSQLType()).toBe('bigint');
  });
});
