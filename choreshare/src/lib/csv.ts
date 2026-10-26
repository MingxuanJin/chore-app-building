type Cell = string | number | null | undefined;

function escape(cell: Cell): string {
  const s = cell == null ? "" : String(cell);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
}

/** Save as a file. The BOM makes Excel read UTF-8 (Chinese / Italian) correctly. */
export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
