import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';
import { CsvReader } from '../utils/CsvReader';
import { DataGenerator } from '../utils/DataGenerator';
import { DateUtils } from '../utils/DateUtils';
import { EncryptionUtils } from '../utils/EncryptionUtils';
import { ExcelReader } from '../utils/ExcelReader';
import { JsonReader } from '../utils/JsonReader';

export type DataRow = Record<string, string>;

/**
 * Test Data Library
 * -----------------
 * • Environment-aware: test-data/<TEST_ENV>/<file> overrides test-data/<file>
 * • Sources: Excel, CSV, JSON
 * • Dynamic tokens resolved on read:
 *     {{random.email}} {{random.firstName}} {{random.lastName}} {{random.phone}} {{random.number}}
 *     {{random.alphanumeric}} {{random.uuid}} {{random.reference}}
 *     {{today}}  {{today:yyyy-MM-dd}}  {{date:+30d}}  {{date:-1y:dd-MMM-yyyy}}
 *     {{env.BASE_URL}}  (any environment variable)
 * • Encrypted values ENC(...) decrypted automatically (needs SECRET_KEY).
 * • Scenario context (set/get) to share values between steps of one test.
 */
export class TestDataManager {
  private context = new Map<string, unknown>();

  // ───────────── File resolution ─────────────

  static resolveFile(file: string): string {
    if (path.isAbsolute(file)) return file;
    const envSpecific = path.join(env.testDataDir, env.testEnv, file);
    return fs.existsSync(envSpecific) ? envSpecific : path.join(env.testDataDir, file);
  }

  // ───────────── Excel ─────────────

  /** Row for a test case from an Excel sheet (key column default "TestCaseID"). */
  async excel(testCaseId: string, sheet = 'TestData', file = 'testdata.xlsx', keyColumn = 'TestCaseID'): Promise<DataRow> {
    const row = await ExcelReader.getRowByKey(TestDataManager.resolveFile(file), sheet, keyColumn, testCaseId);
    return TestDataManager.resolveRow(row);
  }

  async excelSheet(sheet: string, file = 'testdata.xlsx'): Promise<DataRow[]> {
    return (await ExcelReader.readSheet(TestDataManager.resolveFile(file), sheet)).map((r) => TestDataManager.resolveRow(r));
  }

  /** Sync version - for generating data-driven tests at collection time. Only rows with Execute != N. */
  static excelSync(sheet: string, file = 'testdata.xlsx'): DataRow[] {
    return ExcelReader.readSheetSync(this.resolveFile(file), sheet)
      .filter((r) => (r.Execute ?? 'Y').toUpperCase() !== 'N')
      .map((r) => this.resolveRow(r));
  }

  // ───────────── CSV ─────────────

  static csv(file: string): DataRow[] {
    return CsvReader.read(this.resolveFile(file))
      .filter((r) => (r.Execute ?? 'Y').toUpperCase() !== 'N')
      .map((r) => this.resolveRow(r));
  }

  static csvRow(file: string, testCaseId: string, keyColumn = 'TestCaseID'): DataRow {
    return this.resolveRow(CsvReader.findRow(this.resolveFile(file), keyColumn, testCaseId));
  }

  // ───────────── JSON ─────────────

  static json<T = any>(file: string, dottedPath?: string): T {
    const full = this.resolveFile(file);
    const data = dottedPath ? JsonReader.get(full, dottedPath) : JsonReader.read(full);
    return this.resolveDeep(data) as T;
  }

  // ───────────── Scenario context ─────────────

  set<T>(key: string, value: T): void {
    this.context.set(key, value);
  }

  get<T = string>(key: string): T {
    if (!this.context.has(key)) throw new Error(`Test context has no key "${key}"`);
    return this.context.get(key) as T;
  }

  has(key: string): boolean {
    return this.context.has(key);
  }

  clear(): void {
    this.context.clear();
  }

  // ───────────── Token resolution ─────────────

  static resolveRow<T extends Record<string, string>>(row: T): T {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) out[k] = this.resolveValue(v);
    return out as T;
  }

  static resolveDeep(value: unknown): unknown {
    if (typeof value === 'string') return this.resolveValue(value);
    if (Array.isArray(value)) return value.map((v) => this.resolveDeep(v));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.resolveDeep(v)]));
    }
    return value;
  }

  static resolveValue(raw: string): string {
    if (raw === undefined || raw === null) return raw;
    const value = EncryptionUtils.resolve(String(raw));
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, token: string) => this.token(token));
  }

  private static token(token: string): string {
    const [head, ...rest] = token.split(':');
    if (head.startsWith('random.')) {
      const gen: Record<string, () => string> = {
        email: () => DataGenerator.email(),
        firstName: DataGenerator.firstName,
        lastName: DataGenerator.lastName,
        fullName: DataGenerator.fullName,
        phone: DataGenerator.mobile10,
        number: () => String(DataGenerator.number()),
        alphanumeric: () => DataGenerator.alphanumeric(),
        uuid: DataGenerator.uuid,
        company: DataGenerator.company,
        reference: () => DataGenerator.reference(rest[0] ?? 'REF'),
        password: () => DataGenerator.password(),
      };
      const fn = gen[head.slice(7)];
      if (!fn) throw new Error(`Unknown data token {{${token}}}`);
      return fn();
    }
    if (head === 'today') return DateUtils.today(rest.join(':') || 'dd/MM/yyyy');
    if (head === 'now') return DateUtils.now(rest.join(':') || 'yyyy-MM-dd HH:mm:ss');
    if (head === 'date') return DateUtils.relative(rest[0], rest.slice(1).join(':') || 'dd/MM/yyyy');
    if (head.startsWith('env.')) return process.env[head.slice(4)] ?? '';
    throw new Error(`Unknown data token {{${token}}}`);
  }
}
