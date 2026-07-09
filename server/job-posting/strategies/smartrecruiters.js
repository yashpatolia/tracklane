import { fetchJsonSafe, plainText, shortenLocation } from '../shared.js';

const HOST_RE = /^jobs\.smartrecruiters\.com$/i;
const PATH_RE = /^\/([^/]+)\/(\d+)/;

export function matches(url) {
  return HOST_RE.test(url.hostname) && PATH_RE.test(url.pathname);
}

function locationFromDetail(location) {
  if (!location) return '';
  if (location.fullLocation) return shortenLocation(location.fullLocation);
  return shortenLocation([location.city, location.region, location.country].filter(Boolean).join(', '));
}

// SmartRecruiters job pages (jobs.smartrecruiters.com/{company}/{jobId}-{slug})
// are a client-rendered shell, so the generic JSON-LD/OG pass often finds
// little beyond the title. SmartRecruiters' public postings API returns the
// full structured posting (location, company, job ad sections) directly.
export async function enrich({ url, result, descriptionText }) {
  const match = url.pathname.match(PATH_RE);
  if (!match) return;
  const [, company, jobId] = match;

  const data = await fetchJsonSafe(`https://api.smartrecruiters.com/v1/companies/${company}/postings/${jobId}`);
  if (!data) return;

  if (data.name) result.role = data.name;
  if (data.company?.name) result.company = data.company.name;
  const location = locationFromDetail(data.location);
  if (location) result.location = location;

  const sections = data.jobAd?.sections || {};
  for (const section of Object.values(sections)) {
    if (section?.text) descriptionText.push(plainText(section.text));
  }
}
