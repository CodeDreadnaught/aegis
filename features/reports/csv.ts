export function toCsv(rows: Array<Record<string, string | number | null>>) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header])).join(",")
    ),
  ];

  return lines.join("\n");
}

export function csvDataHref(csv: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}
