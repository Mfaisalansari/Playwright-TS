import { expect, test } from '../../src/fixtures/baseFixture';
import { TestDataManager } from '../../src/data/TestDataManager';

/**
 * Data-driven from Excel (test-data/testdata.xlsx → sheet "Login").
 * Generate the sample workbook first:  npm run generate:testdata
 */
const rows = TestDataManager.excelSync('Login');

test.describe('Login - Excel driven @regression', () => {
  for (const row of rows) {
    test(`${row.TestCaseID} - ${row.Description}`, async ({ loginPage, ui }) => {
      await loginPage.open();
      await loginPage.login(row.Username, row.Password);
      await ui.assert.textContains('login.flashMessage', row.Expected);
    });
  }

  test('lookup a single row by TestCaseID (async)', async ({ testData, ui }) => {
    const data = await testData.excel('TC_001', 'TestData'); // tokens like {{random.email}} already resolved
    expect(data.Email).toMatch(/@/);

    await ui.browser.navigateTo('/dropdown');
    await ui.dropdown.selectByLabel('components.dropdown', data.Dropdown);
    await ui.assert.selectedOption('components.dropdown', data.Dropdown);

    testData.set('createdEmail', data.Email); // share within the test
    expect(testData.get('createdEmail')).toBe(data.Email);
  });
});
