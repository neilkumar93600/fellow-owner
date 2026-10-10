/** A CSV cell value. Booleans become yes/no, Dates ISO 8601, arrays are joined with "; ". */
export type CsvCell = string | number | boolean | Date | string[] | null | undefined;

/** Cells that start with one of these are run as formulas by spreadsheets. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cellText(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
}

/** One RFC 4180 field: formula guard first, then quote when it holds , " CR or LF. */
export function csvField(value: CsvCell): string {
  let text = cellText(value);
  // Only text is guarded: a number such as -3 is not a formula.
  if (typeof value !== 'number' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Header row, then one line per row in `columns` order, LF line ends and a trailing newline. No
 * BOM: the controller prepends it.
 */
export function toCsv(
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, CsvCell>>,
): string {
  const lines = [columns.map(csvField).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvField(row[column])).join(','));
  return `${lines.join('\n')}\n`;
}
