import { describe, expect, it } from 'vitest';
import friendsRouter, { isValidUsername, normalizeUsername } from './friends.js';

describe('friends router', () => {
  it('normalizes and validates usernames', () => {
    expect(normalizeUsername(' Alice_01 ')).toBe('alice_01');
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('alice_01')).toBe(true);
    expect(isValidUsername('alice-01')).toBe(false);
    expect(isValidUsername('a'.repeat(21))).toBe(false);
  });

  it('registers the friend request routes', () => {
    const routes = friendsRouter.stack.map((layer) => `${Object.keys(layer.route?.methods ?? {}).join(',')} ${layer.route?.path}`);
    expect(routes).toEqual(expect.arrayContaining([
      'get /search',
      'post /request',
      'get /',
      'post /:id/accept',
      'post /:id/decline',
      'post /:id/cancel',
    ]));
  });
});
