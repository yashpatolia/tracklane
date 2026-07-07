import { describe, expect, it } from 'vitest';
import {
  advanceStatus,
  formatRelativeStamp,
  getEmptyStateCopy,
  validateApplication,
} from './applications.js';

describe('application helpers', () => {
  it('advances status along the review flow', () => {
    expect(advanceStatus('Not Applied')).toBe('Applied');
    expect(advanceStatus('Applied')).toBe('OA');
    expect(advanceStatus('Offer')).toBe('Offer');
  });

  it('requires key fields before saving', () => {
    const result = validateApplication(
      { company: '', role: '', applied: '', status: 'Applied' },
      [],
      null
    );

    expect(result.errors).toEqual([
      'Company name is required.',
      'Role is required.',
      'Applied date is required once an application is active.',
    ]);
  });

  it('rejects duplicate company and role pairs', () => {
    const existing = [
      { company: 'Shopify', role: 'Intern' },
      { company: 'Stripe', role: 'Intern' },
    ];

    const result = validateApplication(
      { company: 'shopify', role: 'intern', applied: '2026-07-04', status: 'Applied' },
      existing,
      null
    );

    expect(result.errors).toContain('An application for this company and role already exists.');
  });

  it('formats update stamps and empty states', () => {
    expect(formatRelativeStamp('2026-07-04T12:00:00.000Z', new Date('2026-07-04T20:00:00.000Z'))).toBe('Updated today');
    expect(formatRelativeStamp('2026-07-01T12:00:00.000Z', new Date('2026-07-04T20:00:00.000Z'))).toBe('Updated 3d ago');
    expect(getEmptyStateCopy(null).title).toBe('Board clear');
    expect(getEmptyStateCopy('Interview').title).toBe('No interview applications yet');
  });
});
