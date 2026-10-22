import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.table - reading, searching, sorting and acting on web tables. */
test.describe('TableActions @demo @table', () => {
  const t = 'demo/table.employees';

  test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/table.html'));

  test('structure: getHeaders, getRowCount, getColumnCount, getColumnIndex, rows', async ({ ui }) => {
    expect(await ui.table.getHeaders(t)).toEqual(['Name', 'Department', 'Salary', 'Email', 'Actions']);
    expect(await ui.table.getRowCount(t)).toBe(6);
    expect(await ui.table.getColumnCount(t)).toBe(5);
    expect(await ui.table.getColumnIndex(t, 'salary')).toBe(2); // case-insensitive
    await expect(ui.table.rows(t)).toHaveCount(6);
  });

  test('cells: cell, getCellText (index / header), getRowTexts, getColumnValues', async ({ ui }) => {
    await expect(ui.table.cell(t, 0, 0)).toHaveText('Zara Ahmed');
    expect(await ui.table.getCellText(t, 3, 'Name')).toBe('Faisal Ansari');
    expect(await ui.table.getCellText(t, 3, 2)).toBe('90000');
    expect((await ui.table.getRowTexts(t, 1)).slice(0, 4)).toEqual(['Mohit Sharma', 'Claims', '58000', 'mohit@demo.test']);
    expect(await ui.table.getColumnValues(t, 'Department')).toEqual(['Underwriting', 'Claims', 'Finance', 'QA', 'Claims', 'Underwriting']);
  });

  test('getTableData as objects', async ({ ui }) => {
    const data = await ui.table.getTableData(t);
    expect(data).toHaveLength(6);
    expect(data.find((r) => r.Name === 'Emma Brown')).toMatchObject({ Department: 'Finance', Salary: '81000' });
    const total = data.reduce((sum, r) => sum + Number(r.Salary), 0);
    expect(total).toBe(429000);
  });

  test('search: findRowIndex (by column / any column), rowWithText', async ({ ui }) => {
    expect(await ui.table.findRowIndex(t, 'emma@demo.test', 'Email')).toBe(2);
    expect(await ui.table.findRowIndex(t, 'Claims')).toBe(1); // first row containing it
    expect(await ui.table.findRowIndex(t, 'Nobody')).toBe(-1);
    await expect(ui.table.rowWithText(t, 'Liam Wilson')).toContainText('61000');
  });

  test('actions: clickInRow, sortBy, isColumnSorted', async ({ ui, employeesPage }) => {
    await ui.table.clickInRow(t, 'Aditi Rao', '.edit-btn');
    await ui.assert.textEquals('demo/table.actionMsg', 'Editing Aditi Rao');

    await ui.table.sortBy(t, 'Name');
    expect(await ui.table.isColumnSorted(t, 'Name', 'asc')).toBe(true);
    await ui.table.sortBy(t, 'Name');
    expect(await ui.table.isColumnSorted(t, 'Name', 'desc')).toBe(true);
    await ui.table.sortBy(t, 'Salary');
    expect(await ui.table.isColumnSorted(t, 2)).toBe(true); // numeric-aware

    // page object combines table + alert libraries
    expect(await employeesPage.deleteEmployee('Mohit Sharma')).toBe('Delete Mohit Sharma?');
    expect(await ui.table.getRowCount(t)).toBe(5);
    await employeesPage.search('claims');
    expect(await employeesPage.getDisplayedCount()).toBe(1);
    await employeesPage.editEmployee('Liam Wilson');
    await ui.assert.textEquals('demo/table.actionMsg', 'Editing Liam Wilson');
  });

  test('parameterised row locator from object repository', async ({ ui }) => {
    await ui.assert.textContains('demo/table.rowByName', 'QA', false, { name: 'Faisal Ansari' });
  });
});
