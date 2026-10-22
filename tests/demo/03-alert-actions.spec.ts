import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.alert - alert(), confirm(), prompt(), delayed and repeated dialogs. */
test.describe('AlertActions @demo @alert', () => {
  const result = 'demo/alerts.result';

  test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/alerts.html'));

  test('accept a simple alert and read its message', async ({ ui }) => {
    const dialog = await ui.alert.accept(() => ui.element.click('demo/alerts.alertBtn'));
    expect(dialog).toMatchObject({ type: 'alert', message: 'This is a simple alert' });
    await ui.assert.textEquals(result, 'Alert closed');

    expect(await ui.alert.getText(() => ui.element.click('demo/alerts.alertBtn'))).toBe('This is a simple alert');
  });

  test('confirm: accept (OK) and dismiss (Cancel)', async ({ ui }) => {
    await ui.alert.accept(() => ui.element.click('demo/alerts.confirmBtn'));
    await ui.assert.textEquals(result, 'You pressed OK');

    const d = await ui.alert.dismiss(() => ui.element.click('demo/alerts.confirmBtn'));
    expect(d.message).toBe('Do you want to proceed?');
    await ui.assert.textEquals(result, 'You pressed Cancel');
  });

  test('prompt: answer, read default value, cancel', async ({ ui }) => {
    const d = await ui.alert.answerPrompt(() => ui.element.click('demo/alerts.promptBtn'), 'Faisal');
    expect(d).toMatchObject({ type: 'prompt', defaultValue: 'Guest' });
    await ui.assert.textEquals(result, 'Hello, Faisal');

    await ui.alert.dismiss(() => ui.element.click('demo/alerts.promptBtn'));
    await ui.assert.textEquals(result, 'Prompt cancelled');
  });

  test('alert that appears after a delay', async ({ ui }) => {
    const d = await ui.alert.accept(() => ui.element.click('demo/alerts.delayedAlertBtn'));
    expect(d.message).toBe('Delayed alert');
    await ui.assert.textEquals(result, 'Delayed alert closed');
  });

  test('auto handlers: autoAccept, autoDismiss, removeAutoHandler, getHistory, getLast', async ({ ui }) => {
    ui.alert.autoAccept('Auto user');
    await ui.element.click('demo/alerts.doubleAlertBtn'); // two alerts in a row
    await ui.assert.textEquals(result, 'Both alerts closed');
    await ui.element.click('demo/alerts.promptBtn');
    await ui.assert.textEquals(result, 'Hello, Auto user');

    ui.alert.autoDismiss();
    await ui.element.click('demo/alerts.confirmBtn');
    await ui.assert.textEquals(result, 'You pressed Cancel');
    ui.alert.removeAutoHandler();

    const history = ui.alert.getHistory();
    expect(history.map((h) => h.message)).toEqual(['First alert', 'Second alert', 'Enter your name', 'Do you want to proceed?']);
    expect(ui.alert.getLast()?.type).toBe('confirm');
  });
});
