/**
 * Export CSV côté client. Génère un fichier téléchargeable depuis un tableau
 * d'objets. Séparateur « ; » + BOM UTF-8 pour une ouverture correcte dans Excel
 * (locale française).
 */
export function exportToCsv(filename: string, rows: Array<Record<string, unknown>>): boolean {
  if (!rows.length) return false;

  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ].join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
