export function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(f);
      f = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
    } else f += c;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export type CsvPost = { overlay: string; caption: string; hashtags: string };

/** Reads `overlay, caption, hashtags` (header optional, column names flexible). */
export function parsePostsCSV(text: string): CsvPost[] {
  const rows = parseCSVRows(text);
  if (!rows.length) return [];
  let iO = 0,
    iC = 1,
    iH = 2,
    start = 0;
  const head = rows[0].map((x) => x.trim().toLowerCase());
  if (head.some((h) => /overlay|hook|text/.test(h))) {
    iO = head.findIndex((h) => /overlay|hook|text/.test(h));
    iC = head.findIndex((h) => /caption/.test(h));
    iH = head.findIndex((h) => /hashtag|tags/.test(h));
    start = 1;
  }
  return rows
    .slice(start)
    .map((r) => ({
      overlay: (r[iO] || "").trim(),
      caption: iC >= 0 ? (r[iC] || "").trim() : "",
      hashtags: iH >= 0 ? (r[iH] || "").trim() : "",
    }))
    .filter((p) => p.overlay);
}

export const csvEscape = (v: string) => (/[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);

export function toCSV(header: string[], rows: string[][]): string {
  return [header.join(","), ...rows.map((r) => r.map((v) => csvEscape(v ?? "")).join(","))].join("\n");
}
