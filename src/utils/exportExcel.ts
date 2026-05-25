import * as XLSX from 'xlsx';

interface ExportColumn<T> {
  header: string;
  key: keyof T | ((row: T) => string | number | null | undefined);
}

export function exportToExcel<T extends object>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
): void {
  const rows = data.map(row =>
    Object.fromEntries(
      columns.map(col => [
        col.header,
        typeof col.key === 'function' ? (col.key(row) ?? '') : (row[col.key] ?? ''),
      ])
    )
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');

  // Largeur automatique des colonnes
  const colWidths = columns.map(col => ({ wch: Math.max(col.header.length, 14) }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
}
