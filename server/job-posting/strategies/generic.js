import { findJobPosting, locationText, metaTag, orgName, plainText, salaryFromStructuredData, titleLocation } from '../shared.js';

// Baseline extraction that runs for every URL, regardless of which ATS hosts
// it: reads schema.org JobPosting JSON-LD if present, falls back to Open
// Graph meta tags. This alone is enough for ATS pages that server-render
// their content (Ashby, Lever, most Greenhouse company career pages, etc.);
// site-specific strategies exist for platforms where it isn't, and layer on
// top of this result rather than replacing it.
export function runGeneric(html, url, result, descriptionText) {
  const posting = findJobPosting(html);

  if (posting) {
    result.role = posting.title || '';
    result.company = orgName(posting.hiringOrganization);
    result.location = locationText(posting.jobLocation);
    const salary = salaryFromStructuredData(posting.baseSalary);
    result.comp = salary.comp;
    result.compPeriod = salary.compPeriod;
    if (posting.description) descriptionText.push(plainText(posting.description));
  }

  if (!result.role) result.role = metaTag(html, 'og:title');
  if (!result.company) result.company = metaTag(html, 'og:site_name');
  if (!result.location) result.location = titleLocation(html);

  descriptionText.push(plainText(html));
}
