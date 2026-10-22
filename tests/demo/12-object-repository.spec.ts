import { expect, test } from '../../src/fixtures/baseFixture';
import { LocatorFactory } from '../../src/locators/LocatorFactory';
import { ObjectRepository } from '../../src/locators/ObjectRepository';

/** Object repository + LocatorFactory: strategies, placeholders, fallbacks (self-healing), runtime registration. */
test.describe('Object repository & locators @demo @locators', () => {
  test('ObjectRepository: has, get, keys, register', async ({ ui }) => {
    expect(ObjectRepository.has('demo/login.username')).toBe(true);
    expect(ObjectRepository.has('demo/login.nope')).toBe(false);
    expect(ObjectRepository.get('demo/login.loginButton')).toMatchObject({ strategy: 'testid', value: 'login-submit' });
    expect(ObjectRepository.keys('demo/login.')).toEqual(expect.arrayContaining(['demo/login.username', 'demo/login.password']));

    ObjectRepository.register('runtime.heading', { strategy: 'role', value: 'heading', options: { name: 'Sign in' } });
    await ui.browser.navigateTo('/login.html');
    await ui.assert.visible('runtime.heading');
  });

  test('LocatorFactory: resolve, describe, fromDefinition, fromRawSelector, interpolate', async ({ ui, page }) => {
    await ui.browser.navigateTo('/login.html');

    await expect(LocatorFactory.resolve(page, 'demo/login.username')).toBeVisible(); // repo key
    await expect(LocatorFactory.resolve(page, '#password')).toBeVisible(); // CSS
    await expect(LocatorFactory.resolve(page, '//button[@id="loginBtn"]')).toBeVisible(); // XPath auto-detected
    await expect(LocatorFactory.resolve(page, page.getByText('Remember me'))).toBeVisible(); // Locator passthrough

    expect(LocatorFactory.describe('demo/login.username')).toContain('Username field');
    await expect(LocatorFactory.fromDefinition(page, { strategy: 'placeholder', value: 'Enter username' })).toBeVisible();
    await expect(LocatorFactory.fromRawSelector(page, '(//input)[1]')).toHaveAttribute('id', 'username');
    expect(LocatorFactory.interpolate("//tr[td='{name}']", { name: 'Faisal' })).toBe("//tr[td='Faisal']");
    expect(LocatorFactory.interpolate('#row-{0}-{1}', [3, 'edit'])).toBe('#row-3-edit');
    expect(LocatorFactory.looksLikeRepoKey('demo/login.typoButton')).toBe(true);
    expect(LocatorFactory.looksLikeRepoKey('div.card')).toBe(false); // plain CSS is left alone
  });

  test('every strategy resolves (id, name, css, xpath, label, placeholder, role, testid, text, title, alt)', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    for (const key of ['firstName', 'lastName', 'email', 'phone', 'address', 'terms', 'submit', 'country']) {
      await ui.assert.count(`demo/forms.${key}`, 1);
    }
    await ui.browser.navigateTo('/interactions.html');
    for (const key of ['saveBtn', 'logo', 'ctxCopy']) await ui.assert.count(`demo/interactions.${key}`, 1);
  });

  test('self-healing fallback: broken primary locator still works', async ({ ui }) => {
    await ui.browser.navigateTo('/login.html');
    await ui.element.enterText('demo/login.brokenUsername', 'healed'); // #user-name-old doesn't exist
    await ui.assert.valueEquals('#username', 'healed');
  });

  test('placeholders by name and index', async ({ ui, dashboardPage }) => {
    await ui.browser.navigateTo('/forms.html');
    await ui.element.check('demo/forms.genderRadio', ['other']); // {0}
    await ui.assert.checked('#genderOther');

    await ui.browser.addCookie('x', '1'); // any page works for header nav
    await ui.browser.setStorageItem('token', 'demo-token-123');
    await dashboardPage.open();
    await dashboardPage.navigateVia('alerts'); // header a[data-nav='{page}']
    await ui.assert.urlContains('/alerts.html');
  });

  test('helpful error for an unknown repository key', async ({ ui }) => {
    await ui.browser.navigateTo('/login.html');
    await expect(ui.element.click('demo/login.typoButton', { timeout: 1000 })).rejects.toThrow(
      /not in the object repository.*loginButton/,
    );
  });
});
