import type { ColumnMapping, RawDataRow, NormalizedEntry } from "./types";

/* ------------------------------------------------------------------ */
/*  CSV Parser                                                         */
/* ------------------------------------------------------------------ */
export function parseCSV(text: string): RawDataRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const rows: RawDataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
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

function parseCSVRow(line: string): string[] {
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
      } else if (ch === "," || ch === "\t") {
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

  // CSV or TSV
  if (ext === "tsv") {
    return parseCSV(trimmed.replace(/\t/g, ","));
  }

  // Try CSV first, then JSON
  const csvResult = parseCSV(trimmed);
  if (csvResult.length > 0) return csvResult;

  try {
    return parseJSON(trimmed);
  } catch {
    return [];
  }
}
