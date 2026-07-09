import { describe, expect, it } from 'vitest';
import { EMPTY_ENTRY } from '../constants.js';
import { applicationsToCsv, csvToApplications } from './csv.js';

describe('csv helpers', () => {
  it('serializes applications with a header row matching EMPTY_ENTRY column order', () => {
    const csv = applicationsToCsv([{ ...EMPTY_ENTRY, company: 'Acme', role: 'Intern' }]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe(Object.keys(EMPTY_ENTRY).join(','));
    expect(row).toContain('Acme');
    expect(row).toContain('Intern');
  });

  it('quotes and escapes fields containing commas, quotes, or newlines', () => {
    const csv = applicationsToCsv([
      { ...EMPTY_ENTRY, company: 'Acme, Inc.', notes: 'Line one\nLine "two"' },
    ]);
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"Line one\nLine ""two"""');
  });

  it('round-trips applications through export then import', () => {
    const original = [
      { ...EMPTY_ENTRY, company: 'Acme, Inc.', role: 'SWE Intern', notes: 'Great, fit\nfollow up' },
      { ...EMPTY_ENTRY, company: 'Globex', role: 'Backend Intern', status: 'Applied' },
    ];
    const csv = applicationsToCsv(original);
    const imported = csvToApplications(csv);

    expect(imported).toHaveLength(2);
    expect(imported[0]).toMatchObject({ company: 'Acme, Inc.', role: 'SWE Intern', notes: 'Great, fit\nfollow up' });
    expect(imported[1]).toMatchObject({ company: 'Globex', role: 'Backend Intern', status: 'Applied' });
  });

  it('round-trips the archived flag as a real boolean, not the string "false"', () => {
    const csv = applicationsToCsv([{ ...EMPTY_ENTRY, company: 'Acme', archived: true }]);
    const imported = csvToApplications(csv);

    expect(imported[0].archived).toBe(true);
    expect(csvToApplications('company,archived\nGlobex,false')[0].archived).toBe(false);
  });

  it('defaults unrecognized or missing columns instead of throwing', () => {
    const csv = 'company,role,mystery\nAcme,Intern,???';
    const imported = csvToApplications(csv);
    expect(imported).toEqual([{ ...EMPTY_ENTRY, company: 'Acme', role: 'Intern' }]);
  });

  it('skips blank trailing rows', () => {
    const csv = 'company,role\nAcme,Intern\n\n';
    expect(csvToApplications(csv)).toHaveLength(1);
  });

  it('returns an empty array for empty input', () => {
    expect(csvToApplications('')).toEqual([]);
  });
});
