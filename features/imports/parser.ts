import {
  type ImportDefinition,
  normaliseImportHeader,
} from "@/features/imports/definitions";

export type ParsedImportSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ImportColumnMapping = Record<string, string>;

export type HeaderMatch = {
  canonical: string;
  confidence: number;
  header: string;
  kind: "exact" | "manual" | "suggestion";
};

export type ImportPreview = {
  headers: string[];
  mappedRowsPreview: Array<Record<string, string>>;
  matches: HeaderMatch[];
  missingRequired: string[];
  rowCount: number;
  rowErrors: Array<{
    message: string;
    rowNumber: number;
  }>;
  suggestions: HeaderMatch[];
  unknownHeaders: string[];
};

export async function parseImportFile(file: File): Promise<ParsedImportSheet> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("sheet")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), {
      cellDates: false,
      dense: false,
      type: "array",
    });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return { headers: [], rows: [] };
    }

    return parseMatrix(
      XLSX.utils.sheet_to_json<Array<string | number | boolean | Date | null>>(
        workbook.Sheets[sheetName],
        {
          blankrows: false,
          defval: "",
          header: 1,
          raw: false,
        }
      )
    );
  }

  if (name.endsWith(".csv") || type.includes("csv") || type === "text/plain") {
    return parseMatrix(parseCsv(await file.text()));
  }

  throw new Error("Upload a CSV or Excel spreadsheet.");
}

export function buildImportPreview(
  definition: ImportDefinition,
  sheet: ParsedImportSheet,
  mapping: ImportColumnMapping = {},
  validateRow?: (row: Record<string, string>, rowNumber: number) => string[]
): ImportPreview {
  const resolved = resolveImportMapping(definition, sheet.headers, mapping);
  const matchedHeaders = new Set(resolved.matches.map((match) => match.header));
  const mappedRows = mapImportRows(sheet.rows, resolved.mapping);
  const rowErrors =
    validateRow && !resolved.missingRequired.length
      ? mappedRows.flatMap((row, index) =>
          validateRow(row, index + 2).map((message) => ({
            message,
            rowNumber: index + 2,
          }))
        )
      : [];

  return {
    headers: sheet.headers,
    mappedRowsPreview: mappedRows.slice(0, 5),
    matches: resolved.matches,
    missingRequired: resolved.missingRequired,
    rowCount: sheet.rows.length,
    rowErrors,
    suggestions: resolved.suggestions,
    unknownHeaders: sheet.headers.filter((header) => !matchedHeaders.has(header)),
  };
}

export function resolveImportMapping(
  definition: ImportDefinition,
  headers: string[],
  manualMapping: ImportColumnMapping = {}
) {
  const normalizedHeaderMap = new Map(
    headers.map((header) => [normaliseImportHeader(header), header])
  );
  const usedHeaders = new Set<string>();
  const mapping: ImportColumnMapping = {};
  const matches: HeaderMatch[] = [];
  const suggestions: HeaderMatch[] = [];

  for (const field of definition.fields) {
    const manualHeader = manualMapping[field.canonical];
    const validManualHeader =
      manualHeader && headers.includes(manualHeader) ? manualHeader : undefined;

    if (validManualHeader) {
      mapping[field.canonical] = validManualHeader;
      usedHeaders.add(validManualHeader);
      matches.push({
        canonical: field.canonical,
        confidence: 1,
        header: validManualHeader,
        kind: "manual",
      });
      continue;
    }

    const exactHeader = field.aliases
      .map((alias) => normalizedHeaderMap.get(normaliseImportHeader(alias)))
      .find((header): header is string => Boolean(header));

    if (exactHeader) {
      mapping[field.canonical] = exactHeader;
      usedHeaders.add(exactHeader);
      matches.push({
        canonical: field.canonical,
        confidence: 1,
        header: exactHeader,
        kind: "exact",
      });
      continue;
    }

    const suggestion = findHeaderSuggestion(field.aliases, headers, usedHeaders);

    if (suggestion) {
      suggestions.push({
        canonical: field.canonical,
        confidence: suggestion.confidence,
        header: suggestion.header,
        kind: "suggestion",
      });
    }
  }

  const missingRequired = definition.fields
    .filter((field) => field.required && !mapping[field.canonical])
    .map((field) => field.canonical);

  return {
    mapping,
    matches,
    missingRequired,
    suggestions,
  };
}

export function mapImportRows(
  rows: Record<string, string>[],
  mapping: ImportColumnMapping
) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(mapping).map(([canonical, header]) => [
        canonical,
        row[header]?.trim() ?? "",
      ])
    )
  );
}

export function parseImportMapping(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function parseMatrix(matrix: Array<Array<unknown>>): ParsedImportSheet {
  const nonEmptyRows = matrix
    .map((row) => row.map(cellToString))
    .filter((row) => row.some((cell) => cell.trim().length > 0));
  const [headers = [], ...dataRows] = nonEmptyRows;
  const cleanHeaders = headers.map((header) => header.trim());

  return {
    headers: cleanHeaders,
    rows: dataRows.map((row) =>
      Object.fromEntries(
        cleanHeaders.map((header, index) => [header, row[index]?.trim() ?? ""])
      )
    ),
  };
}

function parseCsv(csv: string) {
  return csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(splitCsvLine);
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function cellToString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value === null || value === undefined ? "" : String(value);
}

function findHeaderSuggestion(
  aliases: string[],
  headers: string[],
  usedHeaders: Set<string>
) {
  const normalizedAliases = aliases.map(normaliseImportHeader);
  const candidates = headers
    .filter((header) => !usedHeaders.has(header))
    .map((header) => ({
      confidence: Math.max(
        ...normalizedAliases.map((alias) =>
          similarity(alias, normaliseImportHeader(header))
        )
      ),
      header,
    }))
    .filter((candidate) => candidate.confidence >= 0.82)
    .sort((a, b) => b.confidence - a.confidence);

  return candidates[0];
}

function similarity(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }

  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }

  const distance = levenshteinDistance(a, b);

  return 1 - distance / Math.max(a.length, b.length);
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;

    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[b.length] ?? 0;
}
