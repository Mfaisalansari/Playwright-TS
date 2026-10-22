import { expect, test } from '../../src/fixtures/baseFixture';
import { env } from '../../src/config/env';
import { TestDataManager } from '../../src/data/TestDataManager';
import { RegistrationData } from '../../src/pages/demo';

/**
 * End-to-end business flows using Page Objects + test data library.
 * This is the style to copy for real application tests.
 */
test.describe('E2E flows @demo @e2e @smoke', () => {
  test('login fails with invalid password, then succeeds and logs out', async ({ demoLoginPage, dashboardPage, ui }) => {
    const invalid = TestDataManager.json('demo/demo-data.json', 'users.invalid');
    await demoLoginPage.open();
    await demoLoginPage.login(invalid.username, invalid.password);
    expect(await demoLoginPage.getError()).toBe('Invalid username or password');

    await demoLoginPage.login(env.demoUser, env.demoPassword, true);
    await dashboardPage.waitForLoaded();
    expect(await dashboardPage.getWelcomeText()).toBe('Welcome, admin');
    expect(await ui.browser.getStorageItem('remember')).toBe('yes');

    await dashboardPage.logout();
    expect(await ui.browser.getStorageItem('token')).toBeNull();
  });

  test('protected page redirects to login when not authenticated', async ({ dashboardPage, ui }) => {
    await ui.browser.navigateTo('/dashboard.html');
    await ui.assert.urlContains('login.html?redirected=1');
    expect(await dashboardPage.isAt()).toBe(false);
  });

  test('login → register customer (JSON data) → verify submitted payload', async ({ demoLoginPage, dashboardPage, registrationPage }) => {
    const data = TestDataManager.json<RegistrationData>('demo/demo-data.json', 'registration');

    await demoLoginPage.open();
    await (await demoLoginPage.login(env.demoUser, env.demoPassword)).waitForLoaded();
    await dashboardPage.goToRegistration();
    await registrationPage.waitForLoaded();

    const message = await registrationPage.register(data);
    expect(message).toBe(`Registration successful for ${data.firstName} ${data.lastName}`);

    expect(await registrationPage.getSubmittedData()).toMatchObject({
      firstName: data.firstName,
      email: data.email,
      gender: 'female',
      hobbies: ['reading', 'sports'],
      country: 'UK',
      skills: ['java', 'ts'],
      lob: 'BMA',
      city: 'Glasgow',
      dob: data.dob,
    });
  });

  test('employee management: search, edit, delete', async ({ employeesPage, ui }) => {
    await employeesPage.open();
    await employeesPage.search('Underwriting');
    expect(await employeesPage.getDisplayedCount()).toBe(2);
    await employeesPage.editEmployee('Aditi Rao');
    await ui.assert.textEquals('demo/table.actionMsg', 'Editing Aditi Rao');
    await employeesPage.search('');
    await employeesPage.deleteEmployee('Zara Ahmed');
    await ui.assert.textEquals('demo/table.actionMsg', 'Deleted Zara Ahmed');
    expect(await employeesPage.getDisplayedCount()).toBe(5);
  });
});

test.describe('Data-driven registration - CSV @demo @e2e @regression', () => {
  for (const row of TestDataManager.csv('demo/registrations.csv')) {
    test(`${row.TestCaseID} - ${row.Description}`, async ({ registrationPage }) => {
      await registrationPage.open();
      const msg = await registrationPage.register({
        firstName: row.FirstName,
        lastName: row.LastName,
        email: row.Email,
        gender: row.Gender,
        country: row.Country,
        lineOfBusiness: row.LineOfBusiness,
        city: row.City,
      });
      expect(msg).toBe(`Registration successful for ${row.FirstName} ${row.LastName}`);
      expect(await registrationPage.getSubmittedData()).toMatchObject({ city: row.City, gender: row.Gender });
    });
  }
});

test.describe('Data-driven registration - Excel @demo @e2e @regression', () => {
  for (const row of TestDataManager.excelSync('Registration')) {
    test(`${row.TestCaseID} - ${row.Country}`, async ({ registrationPage }) => {
      await registrationPage.open();
      await registrationPage.fillPersonalDetails({ firstName: row.FirstName, lastName: row.LastName, email: row.Email });
      await registrationPage.fillChoices({
        firstName: row.FirstName, lastName: row.LastName, email: row.Email,
        country: row.Country,
        skills: row.Skills.split('|'),
        lineOfBusiness: row.LineOfBusiness,
      });
      await registrationPage.acceptTermsAndSubmit();
      expect(await registrationPage.getSuccessMessage()).toContain(row.FirstName);
    });
  }
});
