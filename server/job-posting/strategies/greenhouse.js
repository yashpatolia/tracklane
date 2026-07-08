import { fetchJsonSafe, plainText, shortenLocation } from '../shared.js';

const HOST_RE = /^(boards|job-boards)\.greenhouse\.io$/i;
const PATH_RE = /^\/([^/]+)\/jobs\/(\d+)/;

export function matches(url) {
  return HOST_RE.test(url.hostname) && PATH_RE.test(url.pathname);
}

// Greenhouse board URLs (boards.greenhouse.io/{company}/jobs/{id} and the
// newer job-boards.greenhouse.io variant) frequently redirect to the
// company's own careers site, which loses any structured data along the
// way, and job-boards.greenhouse.io itself is client-rendered. Greenhouse's
// public Job Board API returns clean JSON directly, independent of where the
// posting page actually redirects to.
export async function enrich({ url, result, descriptionText }) {
  const match = url.pathname.match(PATH_RE);
  if (!match) return;
  const [, company, jobId] = match;

  const data = await fetchJsonSafe(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}?content=true`);
  if (!data) return;

  if (data.title) result.role = data.title;
  if (data.company_name) result.company = data.company_name;
  if (data.location?.name) result.location = shortenLocation(data.location.name);
  if (data.content) descriptionText.push(plainText(data.content));
}
