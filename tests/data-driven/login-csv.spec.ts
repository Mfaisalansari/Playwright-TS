import { test } from '../../src/fixtures/baseFixture';
import { TestDataManager } from '../../src/data/TestDataManager';

/**
 * Data-driven from CSV: one test generated per row (rows with Execute=N are skipped).
 */
const rows = TestDataManager.csv('login-data.csv');

test.describe('Login - CSV driven @regression', () => {
  for (const row of rows) {
    test(`${row.TestCaseID} - ${row.Description}`, async ({ loginPage, ui }) => {
      await loginPage.open();
      await loginPage.login(row.Username, row.Password);
      await ui.assert.textContains('login.flashMessage', row.ExpectedMessage);
    });
  }
});
