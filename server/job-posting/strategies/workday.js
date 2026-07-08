import { fetchJsonSafe, plainText } from '../shared.js';

const HOST_RE = /^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/i;

export function matches(url) {
  return HOST_RE.test(url.hostname);
}

// Workday's JSON-LD `hiringOrganization.name` is often an internal legal-entity
// string like "2100 NVIDIA USA" rather than the plain company name. The job
// posting subdomain (company.wd#.myworkdayjobs.com) is reliably clean, so
// prefer it over the structured-data name.
function companyFromHost(hostname) {
  const match = hostname.match(/^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/i);
  if (!match) return '';
  return match[1]
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Workday job pages are a client-rendered shell: the actual job description
// (including the pay range paragraph, when disclosed) is fetched by the
// browser's JS from a separate JSON API after load, so it never appears in
// the HTML fetched server-side by the generic strategy. Call that same API
// directly instead.
// URL shape: https://{tenant}.wd#.myworkdayjobs.com/{locale}/{site}/job/{slug}
//   -> https://{tenant}.wd#.myworkdayjobs.com/wday/cxs/{tenant}/{site}/job/{slug}
async function fetchJobPostingInfo(url) {
  const tenant = url.hostname.split('.')[0];
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 3) return null;
  const site = segments[1];
  const rest = segments.slice(2).join('/');
  if (!rest) return null;

  const apiUrl = `https://${url.hostname}/wday/cxs/${tenant}/${site}/${rest}`;
  const data = await fetchJsonSafe(apiUrl);
  return data?.jobPostingInfo || null;
}

export async function enrich({ url, result, descriptionText }) {
  const workdayCompany = companyFromHost(url.hostname);
  if (workdayCompany) result.company = workdayCompany;

  const jobInfo = await fetchJobPostingInfo(url);
  if (jobInfo?.jobDescription) descriptionText.push(plainText(jobInfo.jobDescription));
  if (jobInfo?.title && !result.role) result.role = jobInfo.title;
}
