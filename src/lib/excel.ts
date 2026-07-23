/**
 * Minimal .xlsx generation and browser download utility, built on `exceljs`.
 * The library is dynamically imported so it's only loaded when an export is
 * actually triggered, never bundled into the initial page load.
 */

export type ExcelCellValue = string | number | { text: string; hyperlink: string } | null;

export async function downloadExcelWorkbook(
  sheetName: string,
  headers: string[],
  rows: ExcelCellValue[][],
  filename: string,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      row.map((cell) => (cell !== null && typeof cell === 'object' ? { text: cell.text, hyperlink: cell.hyperlink } : cell)),
    );
  }

  headers.forEach((header, index) => {
    let maxLen = header.length;
    for (const row of rows) {
      const cell = row[index];
      const text = cell !== null && typeof cell === 'object' ? cell.text : String(cell ?? '');
      maxLen = Math.max(maxLen, text.length);
    }
    sheet.getColumn(index + 1).width = Math.min(Math.max(maxLen + 2, 10), 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
