/**
 * build-epa-snapshot.ts — ONE-TIME dev tool (NOT run at runtime, PD4-3).
 *
 * Downloads the EPA fueleconomy.gov bulk dataset, keeps only FR-relevant
 * (allow-listed) makes + the 9 columns the EpaAdapter needs, and re-emits a
 * trimmed, SEMICOLON-delimited snapshot to `src/data/epa-vehicles.snapshot.csv`
 * so the committed file parses with the existing `readline` + `split(';')` idiom
 * — NO csv-parse dependency, NO embedded-comma/quote handling at sync time.
 *
 * The raw EPA CSV is comma-delimited with RFC-4180 quoted fields (model names
 * contain commas), so this builder uses an inline quote-aware reader. Any `;`
 * inside a kept field is replaced with a space so `split(';')` cannot mis-align.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/build-epa-snapshot.ts
 *
 * Source: https://www.fueleconomy.gov/feg/epadata/vehicles.csv
 * License: U.S. federal government work → public domain (17 U.S.C. §105).
 *
 * console.log is permitted here (src/scripts is the documented CLI exception).
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const EPA_CSV_URL = 'https://www.fueleconomy.gov/feg/epadata/vehicles.csv';

/** The 9 columns the EpaAdapter reads, in emit order. */
const KEEP_COLUMNS = [
  'make',
  'model',
  'year',
  'fuelType1',
  'fuelType2',
  'atvType',
  'comb08',
  'combE',
  'VClass',
] as const;

/**
 * EPA make spellings of marques sold in France (build-time filter only).
 * The EpaAdapter holds the authoritative make→canonical-brand map; this set
 * just trims the raw file. Keep the two in sync.
 */
const ALLOWLIST_MAKES = new Set<string>([
  'Audi',
  'BMW',
  'MINI',
  'Mercedes-Benz',
  'Volkswagen',
  'Volvo',
  'Porsche',
  'Toyota',
  'Lexus',
  'Honda',
  'Nissan',
  'Mazda',
  'Mitsubishi',
  'Subaru',
  'Hyundai',
  'Kia',
  'Genesis',
  'Land Rover',
  'Jaguar',
  'Fiat',
  'Alfa Romeo',
  'Maserati',
  'Tesla',
  'Ford',
  'Jeep',
  'Smart',
  'Polestar',
]);

/**
 * Inline quote-aware RFC-4180 parser. Reads the full CSV text and yields one
 * string[] per record (handles commas + newlines inside double-quoted fields,
 * and "" escaped quotes). Good enough for a one-time multi-MB download.
 */
function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // ignore; the \n that follows finalizes the row
    } else {
      field += ch;
    }
  }
  // trailing record without a final newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}

/** Replace `;`, newlines and surrounding whitespace so split(';') stays aligned. */
function sanitize(value: string): string {
  return (value ?? '').replace(/[;\r\n]+/g, ' ').trim();
}

async function main(): Promise<void> {
  console.log(`Downloading EPA dataset from ${EPA_CSV_URL} ...`);
  const response = await fetch(EPA_CSV_URL, {
    // fueleconomy.gov returns 406 without a browser-ish UA / wildcard Accept.
    headers: {
      Accept: '*/*',
      'User-Agent':
        'Mozilla/5.0 (verygoodtrip catalog build-epa-snapshot one-time dev tool)',
    },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`EPA download failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  console.log(`Downloaded ${(text.length / 1024 / 1024).toFixed(1)} MB raw.`);

  const records = parseCsv(text);
  if (records.length === 0) throw new Error('EPA CSV parsed to 0 records');

  const header = records[0];
  const colIndex: Record<string, number> = {};
  for (const col of KEEP_COLUMNS) {
    const idx = header.indexOf(col);
    if (idx === -1) {
      throw new Error(`EPA CSV missing expected column "${col}"`);
    }
    colIndex[col] = idx;
  }
  const makeIdx = colIndex['make'];

  const outLines: string[] = [];
  // Provenance header comment (first line).
  const pullDate = new Date().toISOString().slice(0, 10);
  outLines.push(
    `# EPA fueleconomy.gov snapshot | pulled ${pullDate} | source ${EPA_CSV_URL} | ` +
      `columns ${KEEP_COLUMNS.join(',')} | U.S. public domain (17 U.S.C. §105) | ` +
      `allow-listed FR-relevant makes only | ;-delimited, embedded ; sanitized`,
  );
  // Column header line.
  outLines.push(KEEP_COLUMNS.join(';'));

  let kept = 0;
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const make = (rec[makeIdx] ?? '').trim();
    if (!ALLOWLIST_MAKES.has(make)) continue;
    const fields = KEEP_COLUMNS.map((col) => sanitize(rec[colIndex[col]] ?? ''));
    outLines.push(fields.join(';'));
    kept++;
  }

  const outDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'epa-vehicles.snapshot.csv');
  fs.writeFileSync(outPath, outLines.join('\n') + '\n', 'utf8');

  const bytes = fs.statSync(outPath).size;
  console.log(
    `Wrote ${kept} allow-listed rows to ${outPath} (${(bytes / 1024 / 1024).toFixed(2)} MB).`,
  );
}

main().catch((err) => {
  console.error('build-epa-snapshot failed:', err);
  process.exit(1);
});
