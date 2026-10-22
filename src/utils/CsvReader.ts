import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { env } from '../config/env';

export type Row = Record<string, string>;

/**
 * CSV utilities (synchronous - safe to call at test-collection time for data-driven tests).
 * Relative paths are resolved from /test-data.
 */
export class CsvReader {
  static resolve(file: string): string {
    return path.isAbsolute(file) ? file : path.join(env.testDataDir, file);
  }

  /** Rows as objects keyed by header. */
  static read<T extends Row = Row>(file: string, delimiter = ','): T[] {
    const content = fs.readFileSync(this.resolve(file), 'utf-8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true, delimiter, bom: true }) as T[];
  }

  /** Raw rows as string arrays (including header row). */
  static readRaw(file: string, delimiter = ','): string[][] {
    const content = fs.readFileSync(this.resolve(file), 'utf-8');
    return parse(content, { skip_empty_lines: true, trim: true, delimiter, bom: true }) as string[][];
  }

  static getHeaders(file: string): string[] {
    return this.readRaw(file)[0] ?? [];
  }

  /** Rows where column === value. */
  static filter<T extends Row = Row>(file: string, column: string, value: string): T[] {
    return this.read<T>(file).filter((r) => r[column] === value);
  }

  /** First row where column === value (e.g. lookup by TestCaseID). */
  static findRow<T extends Row = Row>(file: string, column: string, value: string): T {
    const row = this.read<T>(file).find((r) => r[column] === value);
    if (!row) throw new Error(`No row with ${column}="${value}" in ${file}`);
    return row;
  }

  /** Only rows flagged to run, e.g. Execute=Y */
  static executable<T extends Row = Row>(file: string, flagColumn = 'Execute', flag = 'Y'): T[] {
    return this.read<T>(file).filter((r) => (r[flagColumn] ?? flag).toUpperCase() === flag.toUpperCase());
  }

  static getColumn(file: string, column: string): string[] {
    return this.read(file).map((r) => r[column]);
  }

  static write(file: string, rows: Row[], append = false): void {
    const full = this.resolve(file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const exists = fs.existsSync(full);
    const out = stringify(rows, { header: !(append && exists) });
    append ? fs.appendFileSync(full, out) : fs.writeFileSync(full, out);
  }
}
