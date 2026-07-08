import { fetchJsonSafe, plainText, shortenLocation } from '../shared.js';

const HOST_RE = /^jobs\.lever\.co$/i;
const PATH_RE = /^\/([^/]+)\/([0-9a-f-]{36})/i;

export function matches(url) {
  return HOST_RE.test(url.hostname) && PATH_RE.test(url.pathname);
}

function companyFromSlug(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Lever job pages (jobs.lever.co/{company}/{postingId}) are server-rendered,
// but Lever's posting JSON doesn't include a company display name field
// (only team/location), so the generic JSON-LD/OG pass can miss it or pick
// up noise. Lever's public postings API returns clean structured fields
// directly, independent of what the page happens to render.
export async function enrich({ url, result, descriptionText }) {
  const match = url.pathname.match(PATH_RE);
  if (!match) return;
  const [, company, postingId] = match;

  const data = await fetchJsonSafe(`https://api.lever.co/v0/postings/${company}/${postingId}?mode=json`);
  if (!data) {
    if (!result.company) result.company = companyFromSlug(company);
    return;
  }

  if (data.text) result.role = data.text;
  result.company = companyFromSlug(company);
  if (data.categories?.location) result.location = shortenLocation(data.categories.location);
  if (data.descriptionPlain) descriptionText.push(data.descriptionPlain);
  if (data.additionalPlain) descriptionText.push(data.additionalPlain);
  if (data.lists) {
    for (const list of data.lists) {
      if (list.content) descriptionText.push(plainText(list.content));
    }
  }
}
