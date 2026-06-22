export const STATUS_OPTIONS = ['Not Applied', 'Applied', 'OA', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const EMPTY_ENTRY = {
  company: '',
  role: '',
  location: '',
  stack: '',
  status: 'Not Applied',
  applied: '',
  oa: '',
  interview: '',
  offer: '',
  comp: '',
  platform: '',
  link: '',
  notes: '',
};

export function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

export function fmtDate(d) {
  if (!d) return null;
  const [, m, day] = d.split('-');
  return `${MONTHS[+m - 1]} ${+day}`;
}
