import type { ColumnMapping, RawDataRow, NormalizedEntry } from "./types";

/* ------------------------------------------------------------------ */
/*  Auto-detect delimiter from the first line of text                    */
/* ------------------------------------------------------------------ */
const CANDIDATE_DELIMITERS = [",", ";", "|", "\t"];

function detectDelimiter(firstLine: string): string {
  // Score each delimiter by: consistency across the line + field count
  let bestDelim = ",";
  let bestScore = -1;

  for (const delim of CANDIDATE_DELIMITERS) {
    // Quick filter: skip if delimiter not present at all
    if (!firstLine.includes(delim)) continue;

    const fields = firstLine.split(delim);
    const count = fields.length;

    // A valid delimiter should produce at least 2 fields
    if (count < 2) continue;

    // Score: field count (more fields = more likely) + consistency bonus
    // Prefer delimiters that produce consistent non-empty fields
    let score = count * 10;
    let nonEmpty = 0;
    for (const f of fields) {
      const t = f.trim();
      if (t.length > 0) nonEmpty++;
    }
    // Deduct for empty fields (less likely for a good delimiter)
    score -= (count - nonEmpty) * 5;

    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

/* ------------------------------------------------------------------ */
/*  CSV Parser (supports auto-detected delimiters)                       */
/* ------------------------------------------------------------------ */
export function parseCSV(text: string): RawDataRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVRow(lines[0], delimiter);
  const rows: RawDataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i], delimiter);
    if (values.length === 0) continue;
    const row: RawDataRow = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j]?.trim();
      if (!key) continue;
      const val = values[j]?.trim() ?? "";
      row[key] = autoType(val);
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (delimiter.length === 1 && ch === delimiter) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function autoType(value: string): string | number {
  if (value === "") return value;
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;
  return value;
}

/* ------------------------------------------------------------------ */
/*  JSON Parser                                                        */
/* ------------------------------------------------------------------ */
export function parseJSON(text: string): RawDataRow[] {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as RawDataRow[];
  if (parsed && typeof parsed === "object") return [parsed as RawDataRow];
  return [];
}

/* ------------------------------------------------------------------ */
/*  Normalize Data                                                     */
/* ------------------------------------------------------------------ */
export function normalizeData(
  rows: RawDataRow[],
  mapping: ColumnMapping
): NormalizedEntry[] {
  return rows
    .map((row) => {
      const entityId = String(row[mapping.entityId] ?? "");
      const timestamp = String(row[mapping.timestamp] ?? "");
      const state = String(row[mapping.state] ?? "");
      const progress = mapping.progress
        ? Number(row[mapping.progress]) || 0
        : 0;
      const sizeValue = mapping.sizeField
        ? Number(row[mapping.sizeField]) || 0
        : 0;
      const condition = mapping.condition
        ? (row[mapping.condition] != null
            ? String(row[mapping.condition])
            : null)
        : null;

      if (!entityId || !timestamp || !state) return null;
      return { entity_id: entityId, timestamp, state, progress, size_value: sizeValue, condition };
    })
    .filter((e): e is NormalizedEntry => e !== null);
}

/* ------------------------------------------------------------------ */
/*  Auto-detect Columns                                                */
/* ------------------------------------------------------------------ */
export function autoDetectColumns(
  rows: RawDataRow[]
): ColumnMapping | null {
  if (rows.length === 0) return null;

  const columns = Object.keys(rows[0]);
  const lower = columns.map((c) => c.toLowerCase());

  const pick = (patterns: RegExp[]): string | undefined => {
    for (const pat of patterns) {
      const idx = lower.findIndex((c) => pat.test(c));
      if (idx >= 0) return columns[idx];
    }
    return undefined;
  };

  const entityId = pick([
    /^vin$/,
    /^vehicle_id$/,
    /^vehicle$/,
    /_id$/,
    /^id$/,
    /^order$/,
    /^user/,
  ]);

  const timestamp = pick([
    /^timestamp$/,
    /^time$/,
    /^date$/,
    /^created/,
    /^updated/,
    /_at$/,
    /_time$/,
  ]);

  const state = pick([
    /^state$/,
    /^status$/,
    /^stage$/,
    /^phase$/,
    /^step$/,
  ]);

  const progress = pick([
    /^progress$/,
    /^pct$/,
    /^percent/,
    /^completion/,
    /^pct_complete$/,
  ]);

  const sizeField = pick([
    /^size$/,
    /^mb$/,
    /^bytes$/,
    /^package/,
    /^file_size$/,
  ]);

  const condition = pick([
    /^error$/,
    /^reason$/,
    /^condition$/,
    /^failure$/,
    /^code$/,
    /^error_code$/,
  ]);

  if (!entityId || !timestamp || !state) return null;

  return {
    entityId,
    timestamp,
    state,
    progress,
    sizeField,
    condition,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: detect file format and parse                               */
/* ------------------------------------------------------------------ */
export function parseFile(
  text: string,
  filename: string
): RawDataRow[] {
  const ext = filename.split(".").pop()?.toLowerCase();
  const trimmed = text.trim();

  if (ext === "json") {
    try {
      return parseJSON(trimmed);
    } catch {
      return [];
    }
  }

  // CSV / TSV / semicolon / pipe — auto-detect delimiter
  const csvResult = parseCSV(trimmed);
  if (csvResult.length > 0) return csvResult;

  // Try JSON as fallback
  try {
    return parseJSON(trimmed);
  } catch {
    return [];
  }
}
