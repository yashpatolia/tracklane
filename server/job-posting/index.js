import { assertFetchableUrl, cleanRoleTitle, emptyResult, extractSeason, extractStack, fetchText, findSalaryInText, HttpError } from './shared.js';
import { runGeneric } from './strategies/generic.js';
import * as workday from './strategies/workday.js';
import * as greenhouse from './strategies/greenhouse.js';
import * as lever from './strategies/lever.js';
import * as smartrecruiters from './strategies/smartrecruiters.js';
import * as icims from './strategies/icims.js';

export { assertFetchableUrl, HttpError };

// Site-specific strategies layer on top of the generic (JSON-LD / meta tag)
// baseline for ATS platforms that don't server-render enough for the generic
// pass alone: Workday's page is a client-rendered shell, Greenhouse/Lever/
// SmartRecruiters board URLs lack (or redirect away from) a display company
// name, iCIMS tenant branding makes company names noisy. Ashby and most
// other ATS boards already server-render full schema.org data and need no
// strategy here — add one only when a platform is proven to need it (see
// job-posting tests for the cases this was built against).
const STRATEGIES = [workday, greenhouse, lever, smartrecruiters, icims];

export async function fetchJobPostingDetails(rawUrl) {
  const url = assertFetchableUrl(rawUrl);
  const html = await fetchText(url.toString());

  const result = emptyResult(url);
  const descriptionText = [];
  runGeneric(html, url, result, descriptionText);

  const strategy = STRATEGIES.find((s) => s.matches(url));
  if (strategy) {
    await strategy.enrich({ url, result, descriptionText });
  }

  const combinedText = descriptionText.join(' ');

  if (!result.comp) {
    const salary = findSalaryInText(combinedText);
    if (salary) {
      result.comp = salary.comp;
      if (salary.compPeriod) result.compPeriod = salary.compPeriod;
    }
  }

  result.stack = extractStack(combinedText);
  result.season = extractSeason(`${result.role} ${combinedText}`);
  result.role = cleanRoleTitle(result.role);

  return { ok: Boolean(result.role || result.company || result.comp), ...result };
}
