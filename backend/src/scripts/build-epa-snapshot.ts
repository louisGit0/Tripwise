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
 *
 * CR-03 hardening — the previous version lost record boundaries at EOF and
 * collapsed dozens of records into one 30 KB field. Three fixes:
 *   1. A `"` only OPENS a quoted field at the START of a field. A `"` appearing
 *      mid-field (e.g. an inch mark like `18"`) is a LITERAL character — not a
 *      quote opener. The old code treated EVERY `"` as a quote toggle, so a
 *      stray inch-mark flipped `inQuotes` on and swallowed every subsequent
 *      record until EOF (the root cause of the corrupted mega-row).
 *   2. Bare `\r` (CR-only) line endings terminate a record; CRLF (`\r\n`) is
 *      handled by consuming the paired `\n`.
 *   3. EOF reached while still `inQuotes` means malformed input → THROW (abort
 *      the build) rather than emit a giant collapsed field.
 */
function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let fieldStart = true; // at the very beginning of the current field?

  const endField = (): void => {
    row.push(field);
    field = '';
    fieldStart = true;
  };
  const endRow = (): void => {
    endField();
    records.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false; // closing quote
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && fieldStart) {
      inQuotes = true; // opening quote — only valid at field start (fix #1)
      fieldStart = false;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch === '\r') {
      endRow(); // bare CR or CRLF — terminate the record (fix #2)
      if (text[i + 1] === '\n') i++; // consume the paired \n of a CRLF
    } else {
      field += ch;
      fieldStart = false;
    }
  }

  if (inQuotes) {
    // fix #3 — never emit a collapsed mega-field from an unterminated quote.
    throw new Error(
      'EPA CSV parse error: unterminated quoted field at EOF (malformed input)',
    );
  }

  // trailing record without a final newline
  if (field.length > 0 || row.length > 0) {
    endField();
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

  // Sanity bound: a real EPA model name is short; anything longer signals a
  // mis-aligned/corrupted record (CR-03). Reject + log rather than emit garbage.
  const MAX_MODEL_LENGTH = 120;
  const modelOutIdx = KEEP_COLUMNS.indexOf('model');

  let kept = 0;
  let rejected = 0;
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const make = (rec[makeIdx] ?? '').trim();
    if (!ALLOWLIST_MAKES.has(make)) continue;
    const fields = KEEP_COLUMNS.map((col) => sanitize(rec[colIndex[col]] ?? ''));
    if (fields[modelOutIdx].length > MAX_MODEL_LENGTH) {
      rejected++;
      console.warn(
        `Rejecting suspiciously long model row (make=${make}, model length=${fields[modelOutIdx].length}) — likely a parse mis-alignment.`,
      );
      continue;
    }
    outLines.push(fields.join(';'));
    kept++;
  }
  if (rejected > 0) {
    console.warn(`Rejected ${rejected} suspicious row(s) by the model-length guard.`);
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
