import { expect, test } from '../../src/fixtures/baseFixture';

/**
 * Demonstrates every action library against https://the-internet.herokuapp.com
 */
test.describe('Action library showcase @regression', () => {
  test('dropdown - native select', async ({ ui }) => {
    await ui.browser.navigateTo('/dropdown');
    const dd = 'components.dropdown';

    expect(await ui.dropdown.getAllOptions(dd)).toEqual(['Please select an option', 'Option 1', 'Option 2']);
    await ui.dropdown.selectByLabel(dd, 'Option 1');
    await ui.assert.selectedOption(dd, 'Option 1');
    await ui.dropdown.selectByValue(dd, '2');
    expect(await ui.dropdown.getSelectedOption(dd)).toBe('Option 2');
    await ui.dropdown.selectByIndex(dd, 1);
    expect(await ui.dropdown.getSelectedValue(dd)).toBe('1');
  });

  test('checkboxes - parameterised repo locator', async ({ ui }) => {
    await ui.browser.navigateTo('/checkboxes');
    await ui.element.check('components.checkboxByIndex', { index: 1 });
    await ui.element.uncheck('components.checkboxByIndex', { index: 2 });
    await ui.assert.checked('components.checkboxByIndex', false, { index: 1 });
    await ui.assert.notChecked('components.checkboxByIndex', false, { index: 2 });
  });

  test('alerts - alert / confirm / prompt', async ({ ui }) => {
    await ui.browser.navigateTo('/javascript_alerts');

    const alert = await ui.alert.accept(() => ui.element.click('components.jsAlertBtn'));
    expect(alert.message).toBe('I am a JS Alert');
    await ui.assert.textEquals('components.alertResult', 'You successfully clicked an alert');

    const confirm = await ui.alert.dismiss(() => ui.element.click('components.jsConfirmBtn'));
    expect(confirm.type).toBe('confirm');
    await ui.assert.textEquals('components.alertResult', 'You clicked: Cancel');

    await ui.alert.answerPrompt(() => ui.element.click('components.jsPromptBtn'), 'Playwright');
    await ui.assert.textEquals('components.alertResult', 'You entered: Playwright');

    // auto-handle any unexpected dialogs
    ui.alert.autoAccept();
    await ui.element.click('components.jsConfirmBtn');
    await ui.assert.textEquals('components.alertResult', 'You clicked: Ok');
    ui.alert.removeAutoHandler();
  });

  test('frames - nested frames & iframe editor', async ({ ui }) => {
    await ui.browser.navigateTo('/nested_frames');
    expect(await ui.frame.getText(['frame[name="frame-top"]', 'frame[name="frame-middle"]'], 'body')).toBe('MIDDLE');
    expect(await ui.frame.getBodyText('frame[name="frame-bottom"]')).toBe('BOTTOM');

    await ui.browser.navigateTo('/iframe');
    // repo locator with "frames" defined - no frame handling needed in the test:
    await expect(ui.element.get('components.editorBody')).toBeVisible();
    expect(ui.frame.getFrameCount()).toBeGreaterThan(0);
  });

  test('tabs / windows - switch and come back', async ({ ui }) => {
    await ui.browser.navigateTo('/windows');
    await ui.window.switchToNewTab(() => ui.element.click('components.newWindowLink'));

    expect(ui.window.getTabCount()).toBe(2);
    await ui.assert.textEquals('components.newWindowHeading', 'New Window'); // runs on new tab automatically
    await ui.assert.titleContains('New Window');

    await ui.window.closeCurrentTab(); // auto-switches back
    await ui.assert.textEquals('components.newWindowHeading', 'Opening a new window');

    await ui.window.openNewTab('/checkboxes');
    await ui.window.switchToTabByUrl('/windows');
    expect(ui.window.getCurrentTabIndex()).toBe(0);
  });

  test('file upload & download', async ({ ui }) => {
    await ui.browser.navigateTo('/upload');
    await ui.element.uploadFile('components.fileInput', 'files/sample-upload.txt');
    await ui.element.click('components.fileSubmit');
    await ui.assert.textContains('components.uploadedFiles', 'sample-upload.txt');

    await ui.browser.navigateTo('/download');
    const firstLink = ui.element.get('#content a').first();
    const file = await ui.element.download(firstLink);
    expect(file).toBeTruthy();
  });

  test('drag & drop, hover, keyboard', async ({ ui }) => {
    await ui.browser.navigateTo('/drag_and_drop');
    await ui.element.dragAndDrop('components.columnA', 'components.columnB');
    await ui.assert.textEquals('components.columnA', 'B');

    await ui.browser.navigateTo('/hovers');
    await ui.element.hover('components.hoverFigure');
    await ui.assert.visible('components.hoverCaption');

    await ui.browser.navigateTo('/key_presses');
    await ui.element.click('components.keyInput');
    await ui.keyboard.press('Tab');
    await ui.assert.textEquals('components.keyResult', 'You entered: TAB');
  });

  test('web table', async ({ ui }) => {
    await ui.browser.navigateTo('/tables');
    const t = 'components.table1';
    expect(await ui.table.getHeaders(t)).toContain('Last Name');
    expect(await ui.table.getRowCount(t)).toBe(4);
    expect(await ui.table.getCellText(t, 0, 'Last Name')).toBe('Smith');

    const rowIdx = await ui.table.findRowIndex(t, 'jdoe@hotmail.com', 'Email');
    expect(await ui.table.getCellText(t, rowIdx, 'First Name')).toBe('Jason');

    const data = await ui.table.getTableData(t);
    expect(data.find((r) => r['Last Name'] === 'Conway')?.Due).toBe('$50.00');

    await ui.table.sortBy(t, 'Last Name');
    expect(await ui.table.isColumnSorted(t, 'Last Name')).toBe(true);
  });

  test('browser - storage, cookies, network mock', async ({ ui }) => {
    await ui.browser.navigateTo('/');
    await ui.browser.setStorageItem('token', 'abc');
    expect(await ui.browser.getStorageItem('token')).toBe('abc');

    await ui.browser.addCookie('qa', 'yes');
    expect((await ui.browser.getCookie('qa'))?.value).toBe('yes');

    await ui.browser.mockResponse('**/api/mocked', { mocked: true });
    const body = await ui.js.execute(() => fetch('/api/mocked').then((r) => r.json()));
    expect(body).toEqual({ mocked: true });
  });
});
