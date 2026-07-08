export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const BLOCKED_HOST_PREFIXES = ['192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.2', '172.3', '169.254.'];

export function assertFetchableUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'That link is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'Only http(s) links are supported.');
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || BLOCKED_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) {
    throw new HttpError(400, 'That URL is not allowed.');
  }
  return url;
}

const USER_AGENT = 'Mozilla/5.0 (compatible; TracklaneBot/1.0; +https://github.com)';

export async function fetchText(targetUrl) {
  let response;
  try {
    response = await fetch(targetUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new HttpError(504, 'Timed out fetching that page.');
    }
    throw new HttpError(502, 'Could not reach that link.');
  }
  if (!response.ok) {
    throw new HttpError(502, `The job posting page returned a ${response.status}.`);
  }
  return response.text();
}

// Returns null on any failure instead of throwing: used by enrichment strategies
// where a secondary API call is a best-effort improvement, not a hard requirement.
export async function fetchJsonSafe(targetUrl) {
  try {
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ');
}

export function plainText(html) {
  return stripTags(decodeHtmlEntities(String(html ?? '')));
}

export function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // Malformed JSON-LD; skip it.
    }
  }
  return blocks;
}

function flattenJsonLd(nodes) {
  const out = [];
  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== 'object') return;
    if (node['@graph']) visit(node['@graph']);
    out.push(node);
  };
  nodes.forEach(visit);
  return out;
}

export function findJobPosting(html) {
  const nodes = flattenJsonLd(extractJsonLdBlocks(html));
  return nodes.find((node) => {
    const type = node['@type'];
    if (!type) return false;
    return Array.isArray(type) ? type.includes('JobPosting') : type === 'JobPosting';
  });
}

export function orgName(org) {
  if (!org) return '';
  if (typeof org === 'string') return org;
  if (Array.isArray(org)) return orgName(org[0]);
  return org.name || '';
}

export function shortenLocation(location) {
  if (!location) return location;
  const withUS = location
    .replace(/\bUnited States of America\b/gi, 'US')
    .replace(/\bUnited States\b/gi, 'US');

  // Some postings list a city whose name matches its state (e.g. "New York,
  // New York, US"), which is accurate but redundant to show twice in a row.
  const parts = withUS.split(',').map((part) => part.trim());
  const deduped = parts.filter((part, i) => i === 0 || part.toLowerCase() !== parts[i - 1].toLowerCase());
  return deduped.join(', ');
}

export function locationText(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return shortenLocation(loc);
  if (Array.isArray(loc)) return loc.map(locationText).filter(Boolean).join(' / ');
  const addr = loc.address;
  if (typeof addr === 'string') return shortenLocation(addr);
  if (addr && typeof addr === 'object') {
    return shortenLocation([addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', '));
  }
  return shortenLocation(loc.name || '');
}

// Some sites (e.g. DE Shaw) publish a JobPosting with an empty jobLocation
// address but format the page <title> as "Role (Location) - Season Year |
// Company". Only trust the parenthetical when it's immediately followed by a
// season + year, since a bare "(...)" after a title is often something else
// entirely (e.g. Greenhouse's "Account Executive, AI Sales (Grower)").
export function titleLocation(html) {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) return '';
  const title = decodeHtmlEntities(titleMatch[1]);
  const match = title.match(/\(([^)]+)\)\s*[-–—]\s*(?:Summer|Fall|Winter|Spring)\s*\d{4}/i);
  return match ? shortenLocation(match[1].trim()) : '';
}

const UNIT_TO_PERIOD = { HOUR: 'Hourly', DAY: 'Daily', WEEK: 'Weekly', MONTH: 'Monthly', YEAR: 'Yearly' };

export function salaryFromStructuredData(baseSalary) {
  if (!baseSalary) return { comp: '', compPeriod: '' };
  const value = baseSalary.value;
  const currency = baseSalary.currency || value?.currency || '';
  let amount = '';
  let unit = '';

  if (value && typeof value === 'object') {
    unit = value.unitText || '';
    if (value.minValue != null && value.maxValue != null && value.minValue !== value.maxValue) {
      amount = `${Math.round(value.minValue)}-${Math.round(value.maxValue)}`;
    } else if (value.value != null) {
      amount = `${Math.round(value.value)}`;
    } else if (value.minValue != null) {
      amount = `${Math.round(value.minValue)}`;
    }
  } else if (typeof value === 'number') {
    amount = `${Math.round(value)}`;
  }

  if (!amount) return { comp: '', compPeriod: '' };
  return { comp: currency ? `${amount} ${currency}` : amount, compPeriod: UNIT_TO_PERIOD[unit] || '' };
}

function cleanAmount(str) {
  const n = parseFloat(str.replace(/,/g, ''));
  return Number.isFinite(n) ? `${Math.round(n)}` : '';
}

function normalizeCurrency(token) {
  if (!token) return '';
  return token === '$' ? 'USD' : token.toUpperCase();
}

const CURRENCY_TOKEN = '(?:\\$|USD|CAD|EUR|GBP|AUD)';
const AMOUNT_TOKEN = '[\\d,]+(?:\\.\\d+)?';
const SALARY_RANGE_RE = new RegExp(
  `${CURRENCY_TOKEN}?\\s*(${AMOUNT_TOKEN})\\s*(${CURRENCY_TOKEN})?\\s*(?:-|to|–)\\s*${CURRENCY_TOKEN}?\\s*(${AMOUNT_TOKEN})\\s*(${CURRENCY_TOKEN})?`,
  'i'
);
const SALARY_SINGLE_RE = new RegExp(`${CURRENCY_TOKEN}\\s*(${AMOUNT_TOKEN})|(${AMOUNT_TOKEN})\\s*${CURRENCY_TOKEN}`, 'i');

// Many ATS pages print the pay range as plain text ("Base Pay Range: $80,000 -
// $120,000", "20 USD - 71 USD", "a monthly base salary of $25,000") instead of
// using schema.org baseSalary. Look for an amount near a salary-ish keyword
// rather than scanning the whole page, to avoid picking up unrelated figures
// like bonuses, ESPP terms, or a stated internship duration in months.
export function findSalaryInText(text) {
  const keywordRe = /(pay range|base pay|salary range|compensation range|hourly rate|pay rate|annual salary|base salary)/i;
  const idx = text.search(keywordRe);
  if (idx < 0) return null;

  const window_ = text.slice(idx, idx + 260);
  // Also look a bit behind the keyword for period detection only: phrasing
  // like "a monthly base salary of $X" puts the pay-period word before the
  // matched keyword, not after it. Amount matching stays forward-only so it
  // doesn't pick up an unrelated dollar figure that precedes the keyword.
  const periodWindow = text.slice(Math.max(0, idx - 80), idx + 260);

  const rangeMatch = window_.match(SALARY_RANGE_RE);
  const hasCurrency = rangeMatch && (rangeMatch[2] || rangeMatch[4] || /\$/.test(rangeMatch[0]));

  let amount = '';
  let currency = '';
  if (rangeMatch && hasCurrency) {
    const low = cleanAmount(rangeMatch[1]);
    const high = cleanAmount(rangeMatch[3]);
    if (low && high) {
      amount = `${low}-${high}`;
      currency = normalizeCurrency(rangeMatch[2] || rangeMatch[4]);
    }
  }

  if (!amount) {
    const singleMatch = window_.match(SALARY_SINGLE_RE);
    if (singleMatch) {
      amount = cleanAmount(singleMatch[1] || singleMatch[2]);
      currency = normalizeCurrency((singleMatch[0].match(/\$|USD|CAD|EUR|GBP|AUD/i) || [])[0]);
    }
  }
  if (!amount) return null;

  let compPeriod = '';
  if (/hour/i.test(periodWindow)) compPeriod = 'Hourly';
  else if (/week/i.test(periodWindow)) compPeriod = 'Weekly';
  else if (/month/i.test(periodWindow)) compPeriod = 'Monthly';
  else if (/year|annual/i.test(periodWindow)) compPeriod = 'Yearly';
  else if (/\bday\b/i.test(periodWindow)) compPeriod = 'Daily';

  return { comp: currency ? `${amount} ${currency}` : amount, compPeriod };
}

// Intern job titles are often formatted as "<Role> Intern, <team/season details>".
// The part after "Intern" is usually cohort/team noise, so trim there when present.
export function cleanRoleTitle(title) {
  if (!title) return '';
  const match = title.match(/^(.*?\bintern(?:ship)?\b)/i);
  return (match ? match[1] : title).trim();
}

// Curated so it favors precision over recall: short/ambiguous tokens (bare "C",
// "R", lowercase "go", etc.) are deliberately excluded or made case-sensitive
// to avoid matching ordinary English words in the posting text.
const STACK_KEYWORDS = [
  [/C\+\+/, 'C++'],
  [/C#/, 'C#'],
  [/\bGolang\b/i, 'Go'],
  [/\bGo\b/, 'Go'],
  [/\bPython\b/i, 'Python'],
  [/\bJava\b(?!Script)/i, 'Java'],
  [/\bJavaScript\b/i, 'JavaScript'],
  [/\bTypeScript\b/i, 'TypeScript'],
  [/\bRuby\b/i, 'Ruby'],
  [/\bPHP\b/i, 'PHP'],
  [/\bSwift\b/i, 'Swift'],
  [/\bKotlin\b/i, 'Kotlin'],
  [/\bScala\b/i, 'Scala'],
  [/\bRust\b/i, 'Rust'],
  [/\bClojure\b/i, 'Clojure'],
  [/React(?:\.js)?\b/i, 'React'],
  [/Angular\b/i, 'Angular'],
  [/Vue(?:\.js)?\b/i, 'Vue'],
  [/Node\.?js\b/i, 'Node.js'],
  [/Next\.?js\b/i, 'Next.js'],
  [/Django\b/i, 'Django'],
  [/Flask\b/i, 'Flask'],
  [/Spring(?:\s?Boot)?\b/i, 'Spring'],
  [/Express(?:\.js)?\b/i, 'Express'],
  [/\.NET\b/i, '.NET'],
  [/\bAWS\b/, 'AWS'],
  [/\bAzure\b/i, 'Azure'],
  [/\bGCP\b/, 'GCP'],
  [/\bDocker\b/i, 'Docker'],
  [/\bKubernetes\b/i, 'Kubernetes'],
  [/\bSQL\b/, 'SQL'],
  [/\bMySQL\b/i, 'MySQL'],
  [/\bPostgreSQL\b/i, 'PostgreSQL'],
  [/\bMongoDB\b/i, 'MongoDB'],
  [/\bRedis\b/i, 'Redis'],
  [/\bGraphQL\b/i, 'GraphQL'],
  [/\bHTML5?\b/i, 'HTML'],
  [/\bCSS3?\b/i, 'CSS'],
  [/\bLinux\b/i, 'Linux'],
  [/\bUnix\b/i, 'Unix'],
  [/\bBash\b/i, 'Bash'],
  [/\bTensorFlow\b/i, 'TensorFlow'],
  [/\bPyTorch\b/i, 'PyTorch'],
];

export function extractStack(text) {
  const found = [];
  for (const [re, label] of STACK_KEYWORDS) {
    if (re.test(text) && !found.includes(label)) found.push(label);
  }
  return found.join(', ');
}

export function extractSeason(text) {
  const match = text.match(/\b(Summer|Fall|Winter)\b/i);
  if (!match) return '';
  const word = match[1].toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function metaTag(html, prop) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${prop}["']`, 'i'),
  ];
  for (const re of patterns) {
    const found = html.match(re);
    if (found) return decodeHtmlEntities(found[1]);
  }
  return '';
}

export function emptyResult(url) {
  return {
    role: '',
    company: '',
    location: '',
    comp: '',
    compPeriod: '',
    season: '',
    stack: '',
    platform: url.hostname.replace(/^www\./, ''),
  };
}
