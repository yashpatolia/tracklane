export const STATUS_OPTIONS = ['Not Applied', 'Applied', 'OA', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
export const SEASON_OPTIONS = ['Summer', 'Fall', 'Winter'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const COMP_PERIOD_OPTIONS = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
export const COMP_PERIOD_SUFFIX = { Hourly: '/hr', Daily: '/day', Weekly: '/wk', Monthly: '/mo', Yearly: '/yr' };

export const EMPTY_ENTRY = {
  company: '',
  role: '',
  season: '',
  location: '',
  stack: '',
  status: 'Not Applied',
  applied: '',
  oa: '',
  interview: '',
  offer: '',
  comp: '',
  compPeriod: 'Hourly',
  platform: '',
  link: '',
  nextAction: '',
  nextActionDue: '',
  updatedAt: '',
  notes: '',
};

export function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

export function companyDomain(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)[0] + '.com';
}

export function fmtDate(d) {
  if (!d) return null;
  const [, m, day] = d.split('-');
  return `${MONTHS[+m - 1]} ${+day}`;
}
