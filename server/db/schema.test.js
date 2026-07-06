import { describe, expect, it } from 'vitest';
import { applications } from './schema.js';

describe('database schema', () => {
  it('requires a season value for applications', () => {
    expect(applications.season.notNull).toBe(true);
    expect(applications.season.config.notNull).toBe(true);
  });
});
