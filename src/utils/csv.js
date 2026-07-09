import { EMPTY_ENTRY } from '../constants.js';

const CSV_COLUMNS = Object.keys(EMPTY_ENTRY);

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function applicationsToCsv(applications) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const app of applications) {
    rows.push(CSV_COLUMNS.map((col) => escapeCsvField(app[col])).join(','));
  }
  return rows.join('\r\n');
}

// Hand-rolled parser (not just String.split) since fields like `notes` can
// legitimately contain commas, quotes, and embedded newlines once quoted.
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // handled by the following \n, or ignored for a bare \r
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvToApplications(text) {
  const rows = parseCsvRows(String(text ?? '').trim());
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((cells) => cells.some((cell) => cell !== ''))
    .map((cells) => {
      const entry = { ...EMPTY_ENTRY };
      header.forEach((col, i) => {
        if (Object.prototype.hasOwnProperty.call(EMPTY_ENTRY, col)) {
          const raw = cells[i] ?? '';
          entry[col] = typeof EMPTY_ENTRY[col] === 'boolean' ? raw === 'true' : raw;
        }
      });
      return entry;
    });
}
