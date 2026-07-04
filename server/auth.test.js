import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('localDevLogin', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GOOGLE_CLIENT_ID = '';
    process.env.GOOGLE_CLIENT_SECRET = '';
    process.env.GOOGLE_CALLBACK_URL = '';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.DEV_AUTH_EMAIL = 'test@example.com';
    process.env.DEV_AUTH_NAME = 'Local Dev';
    delete process.env.DATABASE_URL;
  });

  it('creates a local dev user in memory and redirects', async () => {
    const { hasGoogleAuth, localDevLogin } = await import('./auth.js');

    expect(hasGoogleAuth).toBe(false);

    const req = {
      login: vi.fn((user, done) => done()),
    };
    const res = {
      redirect: vi.fn(),
    };
    const next = vi.fn();

    await localDevLogin(req, res, next);

    expect(req.login).toHaveBeenCalledWith(
      expect.objectContaining({
        googleId: 'dev:test@example.com',
        email: 'test@example.com',
        name: 'Local Dev',
        avatarUrl: '',
      }),
      expect.any(Function)
    );
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173');
    expect(next).not.toHaveBeenCalled();
  });
});
