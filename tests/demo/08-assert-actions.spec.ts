import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.assert - logged, report-visible assertions (hard and soft). */
test.describe('AssertActions @demo @assert', () => {
  test('element state assertions', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');

    await ui.assert.visible('demo/forms.firstName');
    await ui.assert.hidden('demo/forms.focusHint');
    await ui.assert.enabled('demo/forms.firstName');
    await ui.assert.disabled('demo/forms.submit'); // until terms accepted
    await ui.assert.checked('demo/forms.hobby', false, { name: 'Music' });
    await ui.assert.notChecked('demo/forms.terms');
    await ui.assert.editable('demo/forms.lastName');

    await ui.element.focus('demo/forms.email');
    await ui.assert.focused('demo/forms.email');
  });

  test('text, value, attribute, class, css, count', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');

    await ui.assert.textEquals('h1', 'Customer Registration');
    await ui.assert.textEquals('h1', /Customer/);
    await ui.assert.textContains('demo/forms.lobDropdown', 'line of business');
    await ui.assert.valueEquals('demo/forms.accountId', 'AUTO-1001');
    await ui.assert.attributeEquals('demo/forms.email', 'placeholder', 'Email address');
    await ui.assert.hasClass('demo/forms.emailError', 'error');
    await ui.assert.cssEquals('demo/forms.submit', 'cursor', 'not-allowed');
    await ui.assert.count('demo/forms.allHobbies', 3);
    await ui.assert.selectedOption('demo/forms.country', '-- Select country --');
  });

  test('list texts, title, url', async ({ ui }) => {
    await ui.browser.navigateTo('/table.html');
    await ui.assert.textsEqual('demo/table.nameCells', [
      'Zara Ahmed', 'Mohit Sharma', 'Emma Brown', 'Faisal Ansari', 'Liam Wilson', 'Aditi Rao',
    ]);
    await ui.assert.titleContains('Employees');
    await ui.assert.urlContains('/table.html');
  });

  test('value assertions: equals, isTrue, contains', async ({ ui }) => {
    await ui.browser.navigateTo('/table.html');
    const count = Number(await ui.element.getText('demo/table.rowCount'));
    await ui.assert.equals(count, 6, 'Employee count');
    await ui.assert.isTrue(count > 0, 'Table has rows');
    await ui.assert.contains(await ui.table.getHeaders('demo/table.employees'), 'Salary', 'Headers include Salary');
    await ui.assert.contains('Faisal Ansari', 'Ansari');
  });

  test('soft assertions collect failures without stopping the test', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    // passes: soft mode just records instead of throwing
    await ui.assert.textContains('h1', 'Registration', true);
    await ui.assert.visible('demo/forms.firstName', true);
    await ui.assert.equals('a', 'a', 'soft equality', true);
    expect(test.info().errors).toHaveLength(0);
  });

  test('visual comparison: matchesScreenshot (element and page)', async ({ ui }) => {
    await ui.browser.navigateTo('/interactions.html');
    await ui.assert.matchesScreenshot('company-logo', 'demo/interactions.logo'); // first run writes the baseline
    await ui.browser.navigateTo('/index.html');
    await ui.assert.matchesScreenshot('home-page', undefined, 0.02);
  });
});
