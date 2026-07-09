const HOST_RE = /\.icims\.com$/i;
const TENANT_RE = /^(?:careers-|jobs-)?([a-z0-9-]+)\.icims\.com$/i;

export function matches(url) {
  return HOST_RE.test(url.hostname);
}

function companyFromHost(hostname) {
  const match = hostname.match(TENANT_RE);
  if (!match) return '';
  return match[1]
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// iCIMS job pages are server-rendered and usually carry enough schema.org/OG
// data for the generic pass alone, but the tenant career-site branding often
// makes JSON-LD/OG company names noisy or absent (e.g. "Working at ACME").
// The tenant subdomain (careers-{company}.icims.com) is a reliable fallback,
// same idea as the Workday strategy's subdomain-derived company name.
export async function enrich({ url, result }) {
  if (result.company) return;
  const company = companyFromHost(url.hostname);
  if (company) result.company = company;
}
