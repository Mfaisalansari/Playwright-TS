import { expect, test } from '../../src/fixtures/baseFixture';
import { env } from '../../src/config/env';

/** ui.window - tabs, popups, switching, closing, isolated sessions, resize. */
test.describe('WindowActions @demo @window', () => {
  test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/windows.html'));

  test('new tab: switchToNewTab, tab info, switch by title/index, close', async ({ ui }) => {
    await ui.window.switchToNewTab(() => ui.element.click('demo/windows.newTabLink'));
    // every library now targets the new tab
    await ui.assert.textEquals('demo/windows.childHeading', 'Policy Details');
    expect(ui.window.getTabCount()).toBe(2);
    expect(ui.window.getCurrentTabIndex()).toBe(1);
    expect(await ui.window.getAllTabTitles()).toEqual(['Windows | QA Demo App', 'Policy Details | QA Demo App']);
    expect(ui.window.getAllTabUrls()[1]).toContain('/child.html');

    await ui.window.switchToMainTab();
    await ui.assert.titleContains('Windows');
    await ui.window.switchToTabByTitle('Policy Details');
    await ui.window.bringToFront();
    expect(await ui.element.getText('demo/windows.policyNo')).toBe('POL-778899');

    await ui.window.closeCurrentTab(); // returns to remaining tab automatically
    expect(ui.window.getTabCount()).toBe(1);
    await ui.assert.titleContains('Windows');
  });

  test('popup window: switchToPopup, interact, popup closes itself, return to main', async ({ ui }) => {
    await ui.window.switchToPopup(() => ui.element.click('demo/windows.popupBtn'));
    await ui.assert.titleContains('Popup Window');
    await ui.element.enterText('demo/windows.popupInput', 'Approved');
    await ui.element.click('demo/windows.popupSend'); // window.close()

    await ui.window.switchToMainTab();
    await ui.assert.textEquals('demo/windows.popupMessage', 'Popup sent: Approved');
  });

  test('multiple tabs: switchToTabByUrl, switchToTabByIndex, closeTabByIndex, closeAllOtherTabs', async ({ ui }) => {
    await ui.element.click('demo/windows.multiTabBtn');
    await ui.wait.until(async () => ui.window.getTabCount() === 3, 10_000, '3 tabs');

    await ui.window.switchToTabByUrl('tab=2');
    expect(ui.page.url()).toContain('tab=2');
    await ui.window.switchToTabByUrl(/tab=1/);
    await ui.assert.urlContains('tab=1');

    await ui.window.switchToTabByIndex(0);
    await ui.window.closeTabByIndex(2);
    expect(ui.window.getTabCount()).toBe(2);

    await ui.window.closeAllOtherTabs();
    expect(ui.window.getTabCount()).toBe(1);
    await ui.assert.titleContains('Windows');
  });

  test('openNewTab with URL', async ({ ui }) => {
    await ui.window.openNewTab('/forms.html');
    await ui.assert.titleContains('Registration Form');
    expect(ui.window.getTabCount()).toBe(2);
  });

  test('openIsolatedWindow: second user session does not share login', async ({ ui, browser, demoLoginPage }) => {
    await demoLoginPage.open();
    await (await demoLoginPage.login(env.demoUser, env.demoPassword)).waitForLoaded();

    const { context, page } = await ui.window.openIsolatedWindow(browser, `${env.demoUrl}/dashboard.html`);
    await expect(page).toHaveURL(/login\.html\?redirected=1/); // not logged in there
    await context.close();
    await ui.assert.urlContains('/dashboard.html'); // original session untouched
  });

  test('resize window', async ({ ui }) => {
    await ui.window.resize(800, 600);
    await ui.browser.navigateTo('/browser.html');
    await ui.element.click('demo/browser.readViewport');
    await ui.assert.textEquals('demo/browser.viewport', '800x600');
  });
});
