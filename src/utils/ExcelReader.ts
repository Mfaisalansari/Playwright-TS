import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { env } from '../config/env';

export type ExcelRow = Record<string, string>;

/**
 * Excel (.xlsx) utilities using ExcelJS.
 * - Async methods for use inside tests / hooks.
 * - readSheetSync() for building data-driven tests at collection time (ExcelJS is async-only,
 *   so it runs the read in a short-lived child process).
 * Relative paths are resolved from /test-data.
 */
export class ExcelReader {
  static resolve(file: string): string {
    return path.isAbsolute(file) ? file : path.join(env.testDataDir, file);
  }

  private static async workbook(file: string): Promise<ExcelJS.Workbook> {
    const full = this.resolve(file);
    if (!fs.existsSync(full)) throw new Error(`Excel file not found: ${full}`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(full);
    return wb;
  }

  private static sheet(wb: ExcelJS.Workbook, sheetName: string): ExcelJS.Worksheet {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) throw new Error(`Sheet "${sheetName}" not found. Sheets: ${wb.worksheets.map((w) => w.name).join(', ')}`);
    return ws;
  }

  /** Convert any ExcelJS cell value (rich text, formula, hyperlink, date) to plain string. */
  static cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'object') {
      const v = value as any;
      if (v.richText) return v.richText.map((r: { text: string }) => r.text).join('');
      if (v.text !== undefined) return String(v.text);
      if (v.result !== undefined) return ExcelReader.cellToString(v.result);
      if (v.error) return String(v.error);
    }
    return String(value).trim();
  }

  static async getSheetNames(file: string): Promise<string[]> {
    return (await this.workbook(file)).worksheets.map((w) => w.name);
  }

  /** Sheet rows as objects keyed by header (first row). Empty rows skipped. */
  static async readSheet<T extends ExcelRow = ExcelRow>(file: string, sheetName: string): Promise<T[]> {
    const ws = this.sheet(await this.workbook(file), sheetName);
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => (headers[col] = this.cellToString(cell.value)));
    const rows: T[] = [];
    ws.eachRow({ includeEmpty: false }, (row, idx) => {
      if (idx === 1) return;
      const obj: ExcelRow = {};
      headers.forEach((h, col) => {
        if (h) obj[h] = this.cellToString(row.getCell(col).value);
      });
      if (Object.values(obj).some((v) => v !== '')) rows.push(obj as T);
    });
    return rows;
  }

  /** Read a single cell by A1 address, e.g. "B3". */
  static async readCell(file: string, sheetName: string, address: string): Promise<string> {
    return this.cellToString(this.sheet(await this.workbook(file), sheetName).getCell(address).value);
  }

  /** Read a cell by 1-based row/column. */
  static async readCellByIndex(file: string, sheetName: string, row: number, col: number): Promise<string> {
    return this.cellToString(this.sheet(await this.workbook(file), sheetName).getRow(row).getCell(col).value);
  }

  static async getRowCount(file: string, sheetName: string): Promise<number> {
    return this.sheet(await this.workbook(file), sheetName).actualRowCount;
  }

  /** Lookup a row by key column (e.g. TestCaseID). */
  static async getRowByKey<T extends ExcelRow = ExcelRow>(file: string, sheetName: string, keyColumn: string, key: string): Promise<T> {
    const row = (await this.readSheet<T>(file, sheetName)).find((r) => r[keyColumn] === key);
    if (!row) throw new Error(`No row with ${keyColumn}="${key}" in ${file} [${sheetName}]`);
    return row;
  }

  /** Write a cell value (e.g. store generated IDs / execution status back to the sheet). */
  static async writeCell(file: string, sheetName: string, address: string, value: string | number | boolean): Promise<void> {
    const wb = await this.workbook(file);
    this.sheet(wb, sheetName).getCell(address).value = value;
    await wb.xlsx.writeFile(this.resolve(file));
  }

  /** Update a column value in the row matching key. */
  static async updateRowByKey(file: string, sheetName: string, keyColumn: string, key: string, column: string, value: string): Promise<void> {
    const wb = await this.workbook(file);
    const ws = this.sheet(wb, sheetName);
    const headers: string[] = [];
    ws.getRow(1).eachCell((c, i) => (headers[i] = this.cellToString(c.value)));
    const keyCol = headers.indexOf(keyColumn);
    const valCol = headers.indexOf(column);
    if (keyCol < 1 || valCol < 1) throw new Error(`Column "${keyColumn}" or "${column}" not found`);
    ws.eachRow((row, idx) => {
      if (idx > 1 && this.cellToString(row.getCell(keyCol).value) === key) row.getCell(valCol).value = value;
    });
    await wb.xlsx.writeFile(this.resolve(file));
  }

  /** Create/overwrite a sheet from an array of objects. */
  static async writeSheet(file: string, sheetName: string, rows: Record<string, unknown>[]): Promise<void> {
    const full = this.resolve(file);
    const wb = new ExcelJS.Workbook();
    if (fs.existsSync(full)) await wb.xlsx.readFile(full);
    const existing = wb.getWorksheet(sheetName);
    if (existing) wb.removeWorksheet(existing.id);
    const ws = wb.addWorksheet(sheetName);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 4) }));
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    fs.mkdirSync(path.dirname(full), { recursive: true });
    await wb.xlsx.writeFile(full);
  }

  /**
   * Synchronous read for data-driven test generation:
   *   for (const row of ExcelReader.readSheetSync('testdata.xlsx', 'Login')) test(row.TestCaseID, ...)
   */
  static readSheetSync<T extends ExcelRow = ExcelRow>(file: string, sheetName: string): T[] {
    const script = `
      const { ExcelReader } = require(${JSON.stringify(__filename.replace(/\.ts$/, ''))});
      ExcelReader.readSheet(process.argv[1], process.argv[2])
        .then(r => process.stdout.write(JSON.stringify(r)))
        .catch(e => { process.stderr.write(e.message); process.exit(1); });`;
    const out = execFileSync(process.execPath, ['-r', 'ts-node/register/transpile-only', '-e', script, this.resolve(file), sheetName], {
      cwd: env.rootDir,
      encoding: 'utf-8',
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' },
    });
    return JSON.parse(out) as T[];
  }
}
