/*
 * Excel import and template export for the admin console.
 *
 * Replaces SheetJS (`xlsx`), whose npm releases stopped at a version with two
 * unpatched high-severity advisories (prototype pollution, ReDoS). These two
 * libraries have no known advisories and are ~34 kB gzip together, against
 * ~146 kB for SheetJS. Both are imported on demand: only an admin who actually
 * opens or downloads a spreadsheet pays for them.
 *
 * They read and write .xlsx only. The legacy binary .xls format (Excel 97-2003)
 * is refused up front with a message that says how to convert it, rather than
 * failing later as an unreadable file.
 */

/** The `accept` value for file inputs that take a spreadsheet. */
export const SPREADSHEET_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export class SpreadsheetFormatError extends Error {}

/**
 * Reads the first sheet of an .xlsx file.
 *
 * @param {File} file
 * @returns {Promise<Array<Array<string|number|boolean|Date|null>>>} rows, header row first;
 *   an empty cell is `null`.
 */
export async function readFirstSheet(file) {
  if (/\.xls$/i.test(file.name)) {
    throw new SpreadsheetFormatError(
      'Old .xls files are not supported. Open the file in Excel and use "Save As" → Excel Workbook (.xlsx), then upload that.',
    )
  }
  const { readSheet } = await import('read-excel-file/browser')
  try {
    return await readSheet(file)
  } catch (error) {
    console.error(error)
    throw new SpreadsheetFormatError('Could not read this file. Please upload an Excel workbook (.xlsx).')
  }
}

/**
 * Builds a one-sheet .xlsx file and hands it to the browser as a download.
 *
 * @param {Array<Array<string|number|boolean|Date|null>>} rows  header row first
 * @param {{sheet: string, fileName: string}} options
 */
export async function downloadSheet(rows, { sheet, fileName }) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  await writeXlsxFile(rows, { sheet }).toFile(fileName)
}

/** Spreadsheet header cells as trimmed strings; a blank header becomes ''. */
export function headerLabels(row = []) {
  return Array.from(row, (cell) => (cell === null || cell === undefined ? '' : String(cell).trim()))
}
