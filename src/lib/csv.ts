export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const length = text.length;

  while (i < length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => !(cells.length === 1 && cells[0].trim() === ""));
}

export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = (row[index] ?? "").trim();
    });
    return record;
  });
}
