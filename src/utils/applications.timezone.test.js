import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

let formatRelativeStamp;
let getDeadlineState;

beforeAll(async () => {
  vi.stubEnv('TZ', 'America/Toronto');
  vi.resetModules();
  ({ formatRelativeStamp, getDeadlineState } = await import('./applications.js'));
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('application helpers timezone behavior', () => {
  it('treats late-night updates as the previous local day instead of UTC today', () => {
    const updatedAt = '2026-07-04T23:30:00';
    const now = new Date(2026, 6, 5, 0, 15);

    expect(formatRelativeStamp(updatedAt, now)).toBe('Updated 1d ago');
  });

  it('treats date-only due dates as local calendar days', () => {
    const now = new Date(2026, 6, 4, 23, 30);

    expect(getDeadlineState('2026-07-05', now)).toEqual({
      tone: 'soon',
      label: 'Due in 1d',
    });
  });

  it('counts calendar days correctly across DST boundaries', () => {
    const now = new Date(2026, 2, 7, 23, 30);

    expect(getDeadlineState('2026-03-09', now)).toEqual({
      tone: 'soon',
      label: 'Due in 2d',
    });
  });

  it('formats older updates with a calendar date fallback', () => {
    const label = formatRelativeStamp('2026-06-20T12:00:00', new Date(2026, 6, 4, 12, 0));

    expect(label).toMatch(/^Updated [A-Z][a-z]{2} \d{1,2}$/);
  });

  it('marks past deadlines as overdue', () => {
    expect(getDeadlineState('2026-07-01', new Date(2026, 6, 4, 12, 0))).toEqual({
      tone: 'overdue',
      label: 'Overdue 3d',
    });
  });
});
