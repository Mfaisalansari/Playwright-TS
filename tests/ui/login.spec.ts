import { expect, test } from '../../src/fixtures/baseFixture';
import { TestDataManager } from '../../src/data/TestDataManager';

test.describe('Login @smoke', () => {
  test('valid user can log in and out (Page Object + JSON data)', async ({ loginPage }) => {
    const user = TestDataManager.json<{ username: string; password: string }>('users.json', 'validUser');

    await loginPage.open();
    const secure = await loginPage.login(user.username, user.password);
    await secure.waitForLoaded();

    expect(await secure.getHeading()).toContain('Secure Area');
    expect(await loginPage.getFlashMessage()).toContain('You logged into a secure area!');

    await secure.logout();
    expect(await loginPage.getFlashMessage()).toContain('You logged out');
  });

  test('invalid user sees error (dynamic data tokens)', async ({ loginPage, ui }) => {
    const user = TestDataManager.json('users.json', 'invalidUser'); // username contains {{random.alphanumeric}}
    await loginPage.open();
    await loginPage.login(user.username, user.password);
    await ui.assert.textContains('login.flashMessage', 'Your username is invalid!');
    await ui.assert.urlContains('/login');
  });
});
