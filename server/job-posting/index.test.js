import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJobPostingDetails, HttpError } from './index.js';
import { cleanRoleTitle, extractSeason, extractStack, findSalaryInText, shortenLocation, titleLocation } from './shared.js';

function jsonLdShell({ posting }) {
  return `<!doctype html><html><head>
    <meta property="og:title" content="Fallback Title" />
    <meta property="og:site_name" content="Fallback Co" />
    <script type="application/ld+json">${JSON.stringify(posting)}</script>
  </head><body></body></html>`;
}

function response({ ok = true, status = 200, body = '', json }) {
  return {
    ok,
    status,
    text: async () => body,
    json: async () => (json !== undefined ? json : JSON.parse(body)),
  };
}

describe('job-posting helpers', () => {
  it('cleanRoleTitle truncates after "Intern"/"Internship" but leaves other titles alone', () => {
    expect(cleanRoleTitle('Performance Engineer Intern, Systems Software - Fall 2026')).toBe('Performance Engineer Intern');
    expect(cleanRoleTitle('Software Engineer Internship - Summer 2026')).toBe('Software Engineer Internship');
    expect(cleanRoleTitle('Senior Backend Engineer')).toBe('Senior Backend Engineer');
    expect(cleanRoleTitle('International Trade Analyst')).toBe('International Trade Analyst');
    expect(cleanRoleTitle('')).toBe('');
  });

  it('shortenLocation collapses "United States (of America)" to "US"', () => {
    expect(shortenLocation('San Francisco, CA, United States')).toBe('San Francisco, CA, US');
    expect(shortenLocation('St. Louis, MO, United States of America')).toBe('St. Louis, MO, US');
    expect(shortenLocation('Toronto, Canada')).toBe('Toronto, Canada');
    expect(shortenLocation('')).toBe('');
  });

  it('shortenLocation drops a repeated segment, like a city whose name matches its state', () => {
    expect(shortenLocation('New York, New York, United States')).toBe('New York, US');
    expect(shortenLocation('Oklahoma City, Oklahoma, United States')).toBe('Oklahoma City, Oklahoma, US');
  });

  it('extractStack finds curated keywords and ignores noise', () => {
    const text = 'You will write Python and Go services, deploy with Docker and Kubernetes, and use React on the frontend.';
    expect(extractStack(text)).toBe('Go, Python, React, Docker, Kubernetes');
  });

  it('extractStack does not false-positive on ordinary words like "go" or "c"', () => {
    expect(extractStack('We go above and beyond for our customers, from a to c.')).toBe('');
  });

  it('titleLocation pulls a location from "Role (Location) - Season Year | Company" titles', () => {
    const html = '<title>Software Developer Intern (New York) - Summer 2027 | The D. E. Shaw Group</title>';
    expect(titleLocation(html)).toBe('New York');
  });

  it('titleLocation ignores parentheticals that are not followed by a season and year', () => {
    const html = '<title>Account Executive, AI Sales (Grower) | Stripe</title>';
    expect(titleLocation(html)).toBe('');
  });

  it('titleLocation returns empty when there is no <title> tag', () => {
    expect(titleLocation('<html><body>no title here</body></html>')).toBe('');
  });

  it('extractSeason finds Summer/Fall/Winter but not Spring (unsupported option)', () => {
    expect(extractSeason('Software Engineer Intern - Fall 2026')).toBe('Fall');
    expect(extractSeason('Summer 2026 internship program')).toBe('Summer');
    expect(extractSeason('Winter co-op term')).toBe('Winter');
    expect(extractSeason('Spring 2026 internship')).toBe('');
    expect(extractSeason('Senior Backend Engineer')).toBe('');
  });

  describe('findSalaryInText', () => {
    it('matches a dollar-sign range near a salary keyword', () => {
      const result = findSalaryInText('Details. Base Pay Range: $80,000 - $120,000 per year for this role.');
      expect(result).toEqual({ comp: '80000-120000', compPeriod: 'Yearly' });
    });

    it('matches currency-code ranges like "20 USD - 71 USD"', () => {
      const result = findSalaryInText('The hourly rate for our interns is 20 USD - 71 USD.');
      expect(result).toEqual({ comp: '20-71 USD', compPeriod: 'Hourly' });
    });

    it('finds the pay period even when it precedes the keyword ("a monthly base salary of $X")', () => {
      const result = findSalaryInText('The position offers a monthly base salary of $25,000, plus benefits.');
      expect(result).toEqual({ comp: '25000 USD', compPeriod: 'Monthly' });
    });

    it('returns null when no salary keyword is present, even if dollar amounts appear', () => {
      expect(findSalaryInText('This role has a $5,000 signing bonus and $1,000 in relocation.')).toBeNull();
    });
  });
});

describe('fetchJobPostingDetails', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects invalid URLs before making any request', async () => {
    await expect(fetchJobPostingDetails('not-a-url')).rejects.toThrow(HttpError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(fetchJobPostingDetails('ftp://example.com/job')).rejects.toThrow(HttpError);
  });

  it('rejects requests to localhost / private hosts', async () => {
    await expect(fetchJobPostingDetails('http://localhost:3000/job')).rejects.toThrow(HttpError);
    await expect(fetchJobPostingDetails('http://192.168.1.5/job')).rejects.toThrow(HttpError);
  });

  it('surfaces a 502 when the page fetch fails', async () => {
    fetch.mockResolvedValueOnce(response({ ok: false, status: 404 }));
    await expect(fetchJobPostingDetails('https://example.com/jobs/1')).rejects.toMatchObject({ status: 502 });
  });

  it('surfaces a 504 on timeout', async () => {
    fetch.mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    await expect(fetchJobPostingDetails('https://example.com/jobs/1')).rejects.toMatchObject({ status: 504 });
  });

  it('extracts a generic (non-ATS-specific) posting from schema.org JSON-LD', async () => {
    const html = jsonLdShell({
      posting: {
        '@type': 'JobPosting',
        title: 'Software Engineer Intern, Platform Team - Summer 2026',
        hiringOrganization: { '@type': 'Organization', name: 'Acme Corp' },
        jobLocation: { address: { addressLocality: 'Austin', addressRegion: 'TX', addressCountry: 'United States' } },
        baseSalary: { '@type': 'MonetaryAmount', currency: 'USD', value: { minValue: 30, maxValue: 45, unitText: 'HOUR' } },
        description: 'Work with Python, React, and AWS on our platform team this summer.',
      },
    });
    fetch.mockResolvedValueOnce(response({ body: html }));

    const result = await fetchJobPostingDetails('https://example.com/jobs/software-engineer-intern');

    expect(result).toMatchObject({
      ok: true,
      role: 'Software Engineer Intern',
      company: 'Acme Corp',
      location: 'Austin, TX, US',
      comp: '30-45 USD',
      compPeriod: 'Hourly',
      season: 'Summer',
    });
    expect(result.stack).toContain('Python');
    expect(result.stack).toContain('React');
    expect(result.stack).toContain('AWS');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to Open Graph meta tags when there is no JSON-LD', async () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Backend Engineer Intern" />
      <meta property="og:site_name" content="Meta Fallback Inc" />
    </head><body>No structured data here.</body></html>`;
    fetch.mockResolvedValueOnce(response({ body: html }));

    const result = await fetchJobPostingDetails('https://example.com/careers/42');

    expect(result.role).toBe('Backend Engineer Intern');
    expect(result.company).toBe('Meta Fallback Inc');
  });

  it('falls back to the page <title> for location when JSON-LD jobLocation is present but empty', async () => {
    const html = jsonLdShell({
      posting: {
        '@type': 'JobPosting',
        title: 'Software Developer Intern',
        hiringOrganization: { name: 'The D. E. Shaw Group' },
        jobLocation: { address: { '@type': 'PostalAddress', addressLocality: '', addressRegion: '' } },
      },
    }).replace('<head>', '<head><title>Software Developer Intern (New York) - Summer 2027 | The D. E. Shaw Group</title>');
    fetch.mockResolvedValueOnce(response({ body: html }));

    const result = await fetchJobPostingDetails('https://www.deshaw.com/careers/software-developer-intern-123');

    expect(result.location).toBe('New York');
  });

  it('uses the Workday strategy: derives company from the subdomain and pulls salary from the CXS API', async () => {
    const shellHtml = jsonLdShell({
      posting: {
        '@type': 'JobPosting',
        title: 'Performance Engineer Intern, Systems Software - Fall 2026',
        hiringOrganization: { '@type': 'Organization', name: '2100 NVIDIA USA' },
        jobLocation: { address: { addressLocality: 'St. Louis, MO', addressCountry: 'United States of America' } },
      },
    });
    const cxsPayload = {
      jobPostingInfo: {
        title: 'Performance Engineer Intern, Systems Software - Fall 2026',
        jobDescription: '<p>Write Python and PyTorch code. The hourly rate for our interns is 20 USD - 71 USD.</p>',
      },
    };

    fetch.mockImplementation(async (url) => {
      if (url.includes('/wday/cxs/')) return response({ json: cxsPayload });
      return response({ body: shellHtml });
    });

    const result = await fetchJobPostingDetails(
      'https://nvidia.wd5.myworkdayjobs.com/en-US/nvidiaexternalcareersite/job/Performance-Engineer-Intern_JR123'
    );

    expect(result.company).toBe('Nvidia'); // not the raw "2100 NVIDIA USA" from JSON-LD
    expect(result.role).toBe('Performance Engineer Intern');
    expect(result.comp).toBe('20-71 USD');
    expect(result.compPeriod).toBe('Hourly');
    expect(result.location).toBe('St. Louis, MO, US');
    expect(result.stack).toContain('Python');
    expect(result.stack).toContain('PyTorch');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not call the Workday CXS API for non-Workday hosts', async () => {
    fetch.mockResolvedValueOnce(response({ body: jsonLdShell({ posting: { '@type': 'JobPosting', title: 'Engineer' } }) }));
    await fetchJobPostingDetails('https://example.com/jobs/1');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses the Greenhouse strategy: pulls clean data from the Job Board API when the board page itself has none', async () => {
    const emptyShellHtml = '<!doctype html><html><head></head><body>Redirecting...</body></html>';
    const apiPayload = {
      title: 'Account Executive, AI Sales',
      company_name: 'Stripe',
      location: { name: 'San Francisco, CA' },
      content: '<p>Compensation Range: $262,900 - $394,300 per year. Familiarity with SQL is a plus.</p>',
    };

    fetch.mockImplementation(async (url) => {
      if (url.includes('boards-api.greenhouse.io')) return response({ json: apiPayload });
      return response({ body: emptyShellHtml });
    });

    const result = await fetchJobPostingDetails('https://job-boards.greenhouse.io/stripe/jobs/7954688');

    expect(result.role).toBe('Account Executive, AI Sales');
    expect(result.company).toBe('Stripe');
    expect(result.location).toBe('San Francisco, CA');
    expect(result.comp).toBe('262900-394300');
    expect(result.compPeriod).toBe('Yearly');
    expect(result.stack).toContain('SQL');
  });

  it('still returns generic results if the Greenhouse API call fails', async () => {
    const html = jsonLdShell({
      posting: { '@type': 'JobPosting', title: 'Recruiter', hiringOrganization: { name: 'Some Co' } },
    });
    fetch.mockImplementation(async (url) => {
      if (url.includes('boards-api.greenhouse.io')) return response({ ok: false, status: 500 });
      return response({ body: html });
    });

    const result = await fetchJobPostingDetails('https://job-boards.greenhouse.io/someco/jobs/999');
    expect(result.role).toBe('Recruiter');
    expect(result.company).toBe('Some Co');
  });

  it('reports ok: false when nothing useful could be extracted', async () => {
    fetch.mockResolvedValueOnce(response({ body: '<!doctype html><html><head></head><body>Nothing here.</body></html>' }));
    const result = await fetchJobPostingDetails('https://example.com/jobs/1');
    expect(result.ok).toBe(false);
  });

  it('uses the Lever strategy: derives company from the URL slug and pulls role/location/description from the postings API', async () => {
    const shellHtml = '<!doctype html><html><head></head><body>Redirecting...</body></html>';
    const apiPayload = {
      text: 'Associate Director, Growth',
      categories: { location: 'New York, NY, United States' },
      descriptionPlain: 'We are looking for a growth marketer. The annual salary range is $120,000 - $150,000.',
    };

    fetch.mockImplementation(async (url) => {
      if (url.includes('api.lever.co')) return response({ json: apiPayload });
      return response({ body: shellHtml });
    });

    const result = await fetchJobPostingDetails('https://jobs.lever.co/ro/bde27362-0652-4d1a-bb8e-d6100ca20654');

    expect(result.company).toBe('Ro');
    expect(result.role).toBe('Associate Director, Growth');
    expect(result.location).toBe('New York, NY, US');
    expect(result.comp).toBe('120000-150000');
    expect(result.compPeriod).toBe('Yearly');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('still derives a company name from the URL slug if the Lever API call fails', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.includes('api.lever.co')) return response({ ok: false, status: 500 });
      return response({ body: '<!doctype html><html><head></head><body></body></html>' });
    });

    const result = await fetchJobPostingDetails('https://jobs.lever.co/acme-co/bde27362-0652-4d1a-bb8e-d6100ca20654');
    expect(result.company).toBe('Acme Co');
  });

  it('uses the SmartRecruiters strategy: pulls role/company/location/description from the postings API', async () => {
    const shellHtml = '<!doctype html><html><head></head><body>Redirecting...</body></html>';
    const apiPayload = {
      name: 'Sr. Manager, Growth Marketing',
      company: { name: 'Visa' },
      location: { fullLocation: 'Austin, TX, United States' },
      jobAd: {
        sections: {
          jobDescription: { text: 'Base Pay Range: $120,000 - $160,000 per year. Experience with SQL required.' },
        },
      },
    };

    fetch.mockImplementation(async (url) => {
      if (url.includes('api.smartrecruiters.com')) return response({ json: apiPayload });
      return response({ body: shellHtml });
    });

    const result = await fetchJobPostingDetails('https://jobs.smartrecruiters.com/Visa/744000133907678-sr-manager');

    expect(result.role).toBe('Sr. Manager, Growth Marketing');
    expect(result.company).toBe('Visa');
    expect(result.location).toBe('Austin, TX, US');
    expect(result.comp).toBe('120000-160000');
    expect(result.compPeriod).toBe('Yearly');
    expect(result.stack).toContain('SQL');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('still returns generic results if the SmartRecruiters API call fails', async () => {
    const html = jsonLdShell({
      posting: { '@type': 'JobPosting', title: 'Recruiter', hiringOrganization: { name: 'Some Co' } },
    });
    fetch.mockImplementation(async (url) => {
      if (url.includes('api.smartrecruiters.com')) return response({ ok: false, status: 500 });
      return response({ body: html });
    });

    const result = await fetchJobPostingDetails('https://jobs.smartrecruiters.com/someco/123456-recruiter');
    expect(result.role).toBe('Recruiter');
    expect(result.company).toBe('Some Co');
  });

  it('uses the iCIMS strategy: derives company from the tenant subdomain when generic parsing found none', async () => {
    const html = '<!doctype html><html><head><title>Working at ACME</title></head><body>Job details here.</body></html>';
    fetch.mockResolvedValueOnce(response({ body: html }));

    const result = await fetchJobPostingDetails('https://careers-acme.icims.com/jobs/4566966/software-engineer-intern/job');
    expect(result.company).toBe('Acme');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not override a company name already found by generic parsing on iCIMS pages', async () => {
    const html = jsonLdShell({
      posting: { '@type': 'JobPosting', title: 'Software Engineer Intern', hiringOrganization: { name: 'Acme Corp' } },
    });
    fetch.mockResolvedValueOnce(response({ body: html }));

    const result = await fetchJobPostingDetails('https://careers-acme.icims.com/jobs/4566966/software-engineer-intern/job');
    expect(result.company).toBe('Acme Corp');
  });
});
