import * as path from 'path';
import { expect, test } from '../../src/fixtures/baseFixture';
import { env } from '../../src/config/env';
import { TestDataManager } from '../../src/data/TestDataManager';
import { EncryptionUtils } from '../../src/utils/EncryptionUtils';

/** Test data library: JSON / CSV / Excel sources, dynamic tokens, encryption, scenario context. */
test.describe('TestDataManager @demo @data', () => {
  test('resolveFile: env-specific folder overrides the default', async () => {
    expect(TestDataManager.resolveFile('users.json')).toBe(path.join(env.testDataDir, 'users.json'));
    expect(TestDataManager.resolveFile(path.join(env.testDataDir, 'x.json'))).toBe(path.join(env.testDataDir, 'x.json'));
  });

  test('json with dotted path and token resolution', async () => {
    const admin = TestDataManager.json('demo/demo-data.json', 'users.admin');
    expect(admin).toEqual({ username: 'admin', password: 'Admin@123' });

    const reg = TestDataManager.json('demo/demo-data.json', 'registration');
    expect(reg.email).toMatch(/^\S+@\S+$/); // {{random.email}}
    expect(reg.phone).toMatch(/^\d{10}$/); // {{random.phone}}
    expect(reg.hobbies).toEqual(['Reading', 'Sports']); // arrays resolved deeply
  });

  test('csv (Execute=N skipped) and csvRow lookup', async () => {
    const rows = TestDataManager.csv('demo/registrations.csv');
    expect(rows.map((r) => r.TestCaseID)).toEqual(['REG_01', 'REG_02', 'REG_03']);
    expect(rows[1].Email).toContain('@'); // token resolved
    expect(TestDataManager.csvRow('demo/registrations.csv', 'REG_01').City).toBe('Gurugram');
  });

  test('excel: excelSync (collection time), excel row by id, excelSheet', async ({ testData }) => {
    expect(TestDataManager.excelSync('Registration').map((r) => r.TestCaseID)).toEqual(['XL_REG_01', 'XL_REG_02']);

    const row = await testData.excel('XL_REG_01', 'Registration');
    expect(row).toMatchObject({ FirstName: 'Aisha', Country: 'United Arab Emirates' });

    const sheet = await testData.excelSheet('Registration');
    expect(sheet).toHaveLength(3); // excelSheet returns every row, including Execute=N
  });

  test('resolveValue / resolveDeep: date, random, env and encrypted tokens', async () => {
    const year = String(new Date().getFullYear());
    expect(TestDataManager.resolveValue('{{today:yyyy}}')).toBe(year);
    expect(TestDataManager.resolveValue('{{date:+1y:yyyy}}')).toBe(String(Number(year) + 1));
    expect(TestDataManager.resolveValue('POL-{{random.reference:MAR}}')).toMatch(/^POL-MAR-\d{8}-\d{4}$/);
    expect(TestDataManager.resolveValue('{{random.uuid}}')).toMatch(/^[0-9a-f-]{36}$/);
    expect(TestDataManager.resolveValue('{{env.TEST_ENV}}')).toBe(process.env.TEST_ENV ?? '');
    expect(() => TestDataManager.resolveValue('{{random.unknown}}')).toThrow('Unknown data token');

    process.env.SECRET_KEY = 'demo-secret';
    const cipher = EncryptionUtils.encrypt('Admin@123');
    expect(TestDataManager.resolveValue(`ENC(${cipher})`)).toBe('Admin@123');

    const deep = TestDataManager.resolveDeep({ a: ['{{today:yyyy}}'], b: { c: 5 } }) as any;
    expect(deep).toEqual({ a: [year], b: { c: 5 } });
  });

  test('scenario context: set, get, has, clear', async ({ testData }) => {
    testData.set('quoteNo', 'Q-123');
    testData.set('premium', 1500.5);
    expect(testData.has('quoteNo')).toBe(true);
    expect(testData.get('quoteNo')).toBe('Q-123');
    expect(testData.get<number>('premium')).toBe(1500.5);
    testData.clear();
    expect(testData.has('quoteNo')).toBe(false);
    expect(() => testData.get('quoteNo')).toThrow('no key "quoteNo"');
  });
});
