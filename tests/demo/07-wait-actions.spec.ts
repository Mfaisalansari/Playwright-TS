import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.wait - explicit synchronisation for dynamic content. */
test.describe('WaitActions @demo @wait', () => {
  test.beforeEach(async ({ ui }) => {
    await ui.browser.navigateTo('/waits.html');
    await ui.wait.forPageLoad('domcontentloaded');
  });

  test('forSpinner then forVisible', async ({ ui }) => {
    await ui.element.click('demo/waits.startLoading');
    await ui.wait.forSpinner('demo/waits.spinner');
    await ui.wait.forVisible('demo/waits.loadedContent', 5000);
    await ui.assert.textEquals('demo/waits.loadedContent', 'Data loaded successfully');
  });

  test('forEnabled', async ({ ui }) => {
    await ui.element.click('demo/waits.enableLater');
    await ui.wait.forEnabled('demo/waits.delayedBtn');
    await ui.element.click('demo/waits.delayedBtn');
    await ui.assert.textEquals('demo/waits.delayedResult', 'Delayed action done');
  });

  test('forText and forAttribute', async ({ ui }) => {
    await ui.element.click('demo/waits.changeStatus');
    await ui.wait.forText('demo/waits.status', 'Completed');
    await ui.wait.forAttribute('demo/waits.status', 'data-state', 'done');
  });

  test('forCount', async ({ ui }) => {
    await ui.element.click('demo/waits.addItems');
    await ui.wait.forCount('demo/waits.items', 5);
  });

  test('forDetached, forHidden, forAttached', async ({ ui }) => {
    await ui.element.click('demo/waits.removeElement');
    await ui.wait.forDetached('demo/waits.toRemove');
    expect(await ui.element.exists('demo/waits.toRemove')).toBe(false);

    await ui.element.click('demo/waits.hideElement');
    await ui.wait.forHidden('demo/waits.notice');

    await ui.element.click('demo/waits.attachElement');
    await ui.wait.forAttached('demo/waits.lateElement');
  });

  test('forValue, forTitle, forUrl, forFunction', async ({ ui }) => {
    await ui.element.click('demo/waits.fillValue');
    await ui.wait.forValue('demo/waits.autoValue', 'AUTO-123');

    await ui.element.click('demo/waits.changeTitle');
    await ui.wait.forTitle('Updated Title');

    await ui.element.click('demo/waits.changeUrl');
    await ui.wait.forUrl(/step=2/);

    await ui.element.click('demo/waits.setReady');
    await ui.wait.forFunction(() => (window as any).appReady === true);
  });

  test('forNetworkIdle, sleep, until (custom condition)', async ({ ui }) => {
    await ui.element.click('demo/waits.slowBtn');
    await ui.wait.forNetworkIdle();
    await ui.assert.textEquals('demo/waits.networkStatus', 'Waited 1200ms');

    await ui.wait.sleep(100); // hard wait - avoid in real tests

    await ui.element.click('demo/waits.addItems');
    await ui.wait.until(async () => (await ui.element.getCount('demo/waits.items')) === 5, 5000, '5 items rendered');
  });

  test('until throws a clear error on timeout', async ({ ui }) => {
    await expect(ui.wait.until(async () => false, 500, 'something impossible')).rejects.toThrow(
      'Timed out after 500ms waiting for something impossible',
    );
  });
});
