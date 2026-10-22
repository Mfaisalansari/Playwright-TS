import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from '../../src/fixtures/baseFixture';
import { env } from '../../src/config/env';
import { CsvReader } from '../../src/utils/CsvReader';
import { DataGenerator } from '../../src/utils/DataGenerator';
import { DateUtils } from '../../src/utils/DateUtils';
import { EncryptionUtils } from '../../src/utils/EncryptionUtils';
import { ExcelReader } from '../../src/utils/ExcelReader';
import { FileUtils } from '../../src/utils/FileUtils';
import { JsonReader } from '../../src/utils/JsonReader';
import { retry } from '../../src/utils/RetryUtils';
import { StringUtils } from '../../src/utils/StringUtils';

/** Utility library unit-style tests (no browser interaction needed). */
test.describe('Utilities @demo @utils', () => {
  test('CsvReader', async () => {
    const file = 'demo/registrations.csv';
    expect(CsvReader.resolve(file)).toBe(path.join(env.testDataDir, file));
    expect(CsvReader.read(file)).toHaveLength(4);
    expect(CsvReader.readRaw(file)[0][0]).toBe('TestCaseID');
    expect(CsvReader.getHeaders(file)).toContain('LineOfBusiness');
    expect(CsvReader.filter(file, 'Gender', 'male').map((r) => r.TestCaseID)).toEqual(['REG_01', 'REG_04']);
    expect(CsvReader.findRow(file, 'TestCaseID', 'REG_02').Country).toBe('United Kingdom');
    expect(CsvReader.executable(file)).toHaveLength(3);
    expect(CsvReader.getColumn(file, 'City')).toEqual(['Gurugram', 'London', 'Manchester', 'Goa']);

    const out = test.info().outputPath('results.csv');
    CsvReader.write(out, [{ TestCaseID: 'T1', Status: 'PASS' }]);
    CsvReader.write(out, [{ TestCaseID: 'T2', Status: 'FAIL' }], true); // append without header
    expect(CsvReader.read(out)).toEqual([
      { TestCaseID: 'T1', Status: 'PASS' },
      { TestCaseID: 'T2', Status: 'FAIL' },
    ]);
  });

  test('ExcelReader: read', async () => {
    const file = 'testdata.xlsx';
    expect(ExcelReader.resolve(file)).toBe(path.join(env.testDataDir, file));
    expect(await ExcelReader.getSheetNames(file)).toEqual(['Login', 'TestData', 'Registration']);
    expect(await ExcelReader.readSheet(file, 'Registration')).toHaveLength(3);
    expect(await ExcelReader.readCell(file, 'Registration', 'B2')).toBe('Aisha');
    expect(await ExcelReader.readCellByIndex(file, 'Registration', 2, 3)).toBe('Khan');
    expect(await ExcelReader.getRowCount(file, 'Registration')).toBe(4); // incl. header
    expect((await ExcelReader.getRowByKey(file, 'Registration', 'TestCaseID', 'XL_REG_02')).LastName).toBe('Patel');
    expect(ExcelReader.readSheetSync(file, 'Login')).toHaveLength(3);
  });

  test('ExcelReader: write (writeSheet, writeCell, updateRowByKey) and cellToString', async () => {
    const out = test.info().outputPath('execution.xlsx');
    await ExcelReader.writeSheet(out, 'Results', [
      { TestCaseID: 'TC1', Status: 'NOT RUN' },
      { TestCaseID: 'TC2', Status: 'NOT RUN' },
    ]);
    await ExcelReader.updateRowByKey(out, 'Results', 'TestCaseID', 'TC2', 'Status', 'PASSED');
    await ExcelReader.writeCell(out, 'Results', 'B2', 'FAILED');
    expect(await ExcelReader.readSheet(out, 'Results')).toEqual([
      { TestCaseID: 'TC1', Status: 'FAILED' },
      { TestCaseID: 'TC2', Status: 'PASSED' },
    ]);

    expect(ExcelReader.cellToString({ richText: [{ text: 'Rich ' }, { text: 'Text' }] } as any)).toBe('Rich Text');
    expect(ExcelReader.cellToString({ formula: 'A1*2', result: 42 } as any)).toBe('42');
    expect(ExcelReader.cellToString(new Date('2026-10-22T00:00:00Z'))).toBe('2026-10-22');
    expect(ExcelReader.cellToString(null)).toBe('');
  });

  test('JsonReader', async () => {
    const file = 'demo/demo-data.json';
    expect(JsonReader.resolve(file)).toBe(path.join(env.testDataDir, file));
    expect(JsonReader.read(file).users.admin.username).toBe('admin');
    expect(JsonReader.get(file, 'registration.country')).toBe('United Kingdom');
    expect(() => JsonReader.get(file, 'registration.missing')).toThrow('not found');

    const out = test.info().outputPath('runtime.json');
    JsonReader.write(out, { policy: { no: 'P1', status: 'Draft' } });
    JsonReader.update(out, { policy: { status: 'Bound' }, broker: 'Acme' });
    expect(JsonReader.read(out)).toEqual({ policy: { no: 'P1', status: 'Bound' }, broker: 'Acme' });
  });

  test('DataGenerator', async () => {
    DataGenerator.seed(2026);
    const a = DataGenerator.firstName();
    DataGenerator.seed(2026);
    expect(DataGenerator.firstName()).toBe(a); // reproducible with seed

    expect(DataGenerator.lastName()).toBeTruthy();
    expect(DataGenerator.fullName()).toContain(' ');
    expect(DataGenerator.email()).toMatch(/@/);
    expect(DataGenerator.email('coforge.test')).toMatch(/@coforge\.test$/);
    expect(DataGenerator.username()).toMatch(/^\w+$/);
    expect(DataGenerator.password(14)).toMatch(/(?=.*[A-Z])(?=.*\d)(?=.*!)/);
    expect(DataGenerator.phone()).toBeTruthy();
    expect(DataGenerator.mobile10()).toMatch(/^[1-9]\d{9}$/);
    expect(DataGenerator.company()).toBeTruthy();
    expect(DataGenerator.jobTitle()).toBeTruthy();
    expect(Object.keys(DataGenerator.address())).toEqual(['street', 'city', 'state', 'zip', 'country']);
    expect(DataGenerator.number(5, 10)).toBeGreaterThanOrEqual(5);
    expect(String(DataGenerator.decimal(1, 2, 2))).toMatch(/^\d(\.\d{1,2})?$/);
    expect(Number(DataGenerator.amount(100, 200))).toBeLessThanOrEqual(200);
    expect(DataGenerator.alphanumeric(12)).toHaveLength(12);
    expect(DataGenerator.alpha(6)).toMatch(/^[a-zA-Z]{6}$/);
    expect(DataGenerator.numeric(4)).toMatch(/^\d{4}$/);
    expect(DataGenerator.uuid()).toMatch(/^[0-9a-f-]{36}$/);
    expect(DataGenerator.sentence().length).toBeGreaterThan(5);
    expect(DataGenerator.paragraph().length).toBeGreaterThan(20);
    expect(typeof DataGenerator.boolean()).toBe('boolean');
    expect(['Motor', 'Marine']).toContain(DataGenerator.pick(['Motor', 'Marine']));
    expect(DataGenerator.pastDate().getTime()).toBeLessThan(Date.now());
    expect(DataGenerator.futureDate().getTime()).toBeGreaterThan(Date.now());
    const age = new Date().getFullYear() - DataGenerator.dob(30, 40).getFullYear();
    expect(age).toBeGreaterThanOrEqual(29);
    expect(DataGenerator.creditCardNumber()).toMatch(/\d/);
    expect(DataGenerator.iban()).toMatch(/^[A-Z]{2}\d{2}/);
    expect(DataGenerator.reference('CLM')).toMatch(/^CLM-\d{8}-\d{4}$/);
    expect(DataGenerator.user()).toHaveProperty('address.city');
  });

  test('DateUtils', async () => {
    const d = new Date(2026, 9, 22, 14, 5, 9); // 22 Oct 2026 14:05:09 (Thursday)
    expect(DateUtils.format(d)).toBe('22/10/2026');
    expect(DateUtils.format(d, 'dd-MMM-yyyy hh:mm a')).toBe('22-Oct-2026 02:05 PM');
    expect(DateUtils.format(d, 'MMMM d, yy')).toBe('October 22, 26');
    expect(DateUtils.today('yyyy')).toBe(String(new Date().getFullYear()));
    expect(DateUtils.now()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(DateUtils.timestamp()).toMatch(/^\d{8}_\d{6}$/);
    expect(DateUtils.format(DateUtils.addDays(10, d))).toBe('01/11/2026');
    expect(DateUtils.format(DateUtils.addMonths(3, d))).toBe('22/01/2027');
    expect(DateUtils.format(DateUtils.addYears(-1, d))).toBe('22/10/2025');
    expect(DateUtils.relative('+0d', 'yyyy-MM-dd')).toBe(DateUtils.today('yyyy-MM-dd'));
    expect(DateUtils.parse('25/12/2026').getMonth()).toBe(11);
    expect(DateUtils.parse('2026-12-25').getDate()).toBe(25);
    expect(DateUtils.daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe(30);
    expect(DateUtils.isWeekend(new Date(2026, 9, 24))).toBe(true); // Saturday
    expect(DateUtils.format(DateUtils.nextBusinessDay(new Date(2026, 9, 23)))).toBe('26/10/2026'); // Fri → Mon
  });

  test('StringUtils', async () => {
    expect(StringUtils.interpolate('Policy {no} for ${name}', { no: 'P1', name: 'Faisal' })).toBe('Policy P1 for Faisal');
    expect(StringUtils.random(10)).toHaveLength(10);
    expect(StringUtils.normalizeSpaces('  a   b \n c ')).toBe('a b c');
    expect(StringUtils.extractNumber('Total: 1,234.50 GBP')).toBe(1234.5);
    expect(StringUtils.parseCurrency('£1,250.75')).toBe(1250.75);
    expect(StringUtils.formatCurrency(1250.75)).toBe('£1,250.75');
    expect(StringUtils.toCamelCase('line of business')).toBe('lineOfBusiness');
    expect(StringUtils.toTitleCase('british MARINE')).toBe('British Marine');
    expect(StringUtils.equalsIgnoreCase('Motor', 'MOTOR')).toBe(true);
    expect(StringUtils.mask('4111111111111111')).toBe('************1111');
  });

  test('FileUtils', async () => {
    const dir = test.info().outputPath('files');
    FileUtils.ensureDir(dir);
    const file = path.join(dir, 'note.txt');
    FileUtils.writeText(file, 'hello');
    expect(FileUtils.exists(file)).toBe(true);
    expect(FileUtils.readText(file)).toBe('hello');
    expect(FileUtils.sizeInKb(file)).toBe(0);
    expect(FileUtils.listFiles(dir, '.txt')).toEqual([file]);

    const later = path.join(dir, 'later.csv');
    setTimeout(() => fs.writeFileSync(later, 'a,b'), 300);
    await FileUtils.waitForFile(later, 5000);
    expect(FileUtils.latestFile(dir)).toBe(later);

    FileUtils.deleteFile(file);
    expect(FileUtils.exists(file)).toBe(false);
    FileUtils.cleanDir(dir);
    expect(FileUtils.listFiles(dir)).toEqual([]);
  });

  test('EncryptionUtils', async () => {
    process.env.SECRET_KEY = 'demo-secret';
    const cipher = EncryptionUtils.encrypt('P@ssw0rd');
    expect(cipher).not.toContain('P@ssw0rd');
    expect(EncryptionUtils.decrypt(cipher)).toBe('P@ssw0rd');
    expect(EncryptionUtils.resolve(`ENC(${cipher})`)).toBe('P@ssw0rd');
    expect(EncryptionUtils.resolve('plain')).toBe('plain');
    expect(EncryptionUtils.base64Encode('admin:Admin@123')).toBe('YWRtaW46QWRtaW5AMTIz');
    expect(EncryptionUtils.base64Decode('YWRtaW46QWRtaW5AMTIz')).toBe('admin:Admin@123');
  });

  test('retry', async () => {
    let calls = 0;
    const value = await retry(async () => {
      if (++calls < 3) throw new Error('flaky');
      return 'ok';
    }, { attempts: 3, delayMs: 50, label: 'flaky op' });
    expect(value).toBe('ok');
    expect(calls).toBe(3);
    await expect(retry(async () => Promise.reject(new Error('always')), { attempts: 2, delayMs: 10 })).rejects.toThrow('always');
  });
});
