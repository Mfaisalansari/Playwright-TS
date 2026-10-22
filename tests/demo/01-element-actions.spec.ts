import * as fs from 'fs';
import { expect, test } from '../../src/fixtures/baseFixture';
import { CsvReader } from '../../src/utils/CsvReader';

/**
 * ui.element - every ElementActions function against the QA Demo App.
 * Locators come from object-repository/demo/*.json (keys "demo/<page>.<element>").
 */
test.describe('ElementActions @demo @element', () => {
  test.describe('Get element', () => {
    test('get / nth / getAll / child / withText', async ({ ui }) => {
      await ui.browser.navigateTo('/forms.html');

      await expect(ui.element.get('demo/forms.firstName')).toBeVisible();
      await expect(ui.element.nth('demo/forms.allHobbies', 2)).toBeChecked(); // Music pre-checked
      expect(await ui.element.getAll('demo/forms.allHobbies')).toHaveLength(3);
      await expect(ui.element.child('#genderGroup', 'input[type="radio"]')).toHaveCount(3);
      await expect(ui.element.withText('header a', 'Forms')).toHaveCount(1);
    });
  });

  test.describe('Clicks', () => {
    test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/interactions.html'));

    test('click, click with modifiers, doubleClick, rightClick', async ({ ui }) => {
      await ui.element.click('demo/interactions.clickBtn');
      await ui.element.click('demo/interactions.clickBtn', { clickCount: 1 });
      await ui.assert.textEquals('demo/interactions.clickCount', '2');

      await ui.element.click('demo/interactions.modifierBtn', { modifiers: ['Shift'] });
      await ui.assert.textEquals('demo/interactions.modifierResult', 'Shift-click detected');

      await ui.element.doubleClick('demo/interactions.dblClickBtn');
      await ui.assert.textEquals('demo/interactions.dblResult', 'Double clicked');

      await ui.element.rightClick('demo/interactions.contextArea');
      await ui.element.click('demo/interactions.ctxCopy');
      await ui.assert.textEquals('demo/interactions.contextResult', 'Copied from context menu');
    });

    test('forceClick (animating), jsClick (covered), dispatchEvent', async ({ ui }) => {
      await ui.element.forceClick('demo/interactions.movingBtn');
      await ui.assert.textEquals('demo/interactions.movingResult', 'Moving button clicked');

      await ui.element.jsClick('demo/interactions.coveredBtn'); // overlay intercepts real clicks
      await ui.assert.textEquals('demo/interactions.coveredResult', 'Covered button clicked');

      await ui.element.dispatchEvent('demo/interactions.dispatchBtn', 'click');
      await ui.assert.textEquals('demo/interactions.dispatchResult', 'Event dispatched');
    });

    test('clickByText, hover, title / alt locators', async ({ ui }) => {
      await ui.element.hover('demo/interactions.hoverMenu');
      await ui.element.click('demo/interactions.submenuMotor');
      await ui.assert.textEquals('demo/interactions.submenuMotor', 'Motor selected');

      await ui.element.click('demo/interactions.saveBtn'); // located by title attribute
      await ui.assert.textEquals('demo/interactions.saveResult', 'Saved');
      await ui.assert.visible('demo/interactions.logo'); // located by alt text

      await ui.element.clickByText('header a', 'Table');
      await ui.assert.urlContains('/table.html');
    });
  });

  test.describe('Touch', () => {
    test.use({ hasTouch: true });
    test('tap', async ({ ui }) => {
      await ui.browser.navigateTo('/interactions.html');
      await ui.element.tap('demo/interactions.tapBtn');
      await ui.assert.textEquals('demo/interactions.tapResult', 'Tapped');
    });
  });

  test('clickIfVisible - optional cookie banner', async ({ ui }) => {
    await ui.browser.navigateTo('/downloads.html');
    expect(await ui.element.clickIfVisible('demo/downloads.acceptCookies')).toBe(true);
    await ui.assert.hidden('demo/downloads.cookieBanner');
    expect(await ui.element.clickIfVisible('demo/downloads.acceptCookies', 1000)).toBe(false);
  });

  test('clickAndWaitForNavigation / clickAndWaitForResponse', async ({ ui }) => {
    await ui.browser.navigateTo('/index.html');
    await ui.element.clickAndWaitForNavigation('header a[data-nav="waits"]', /waits\.html/);
    await ui.assert.titleContains('Waits');

    const status = await ui.element.clickAndWaitForResponse('demo/waits.loadUsers', '/api/users');
    expect(status).toBe(200);
  });

  test.describe('Text input', () => {
    test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/forms.html'));

    test('enterText, enterSecureText, typeText, appendText, clearText, clearWithKeyboard', async ({ ui }) => {
      await ui.element.enterText('demo/forms.firstName', 'Faisal');
      await ui.assert.valueEquals('demo/forms.firstName', 'Faisal');
      await ui.element.enterText('demo/forms.age', 37); // numbers accepted
      await ui.assert.valueEquals('demo/forms.age', '37');

      await ui.element.enterSecureText('demo/forms.password', 'S3cret!'); // masked in logs/report
      await ui.assert.valueEquals('demo/forms.password', 'S3cret!');

      await ui.element.typeText('demo/forms.comments', 'Hello', 20); // fires key events → counter
      await ui.assert.textEquals('demo/forms.charCount', '5');
      await ui.element.appendText('demo/forms.comments', ' World');
      await ui.assert.valueEquals('demo/forms.comments', 'Hello World');
      await ui.assert.textEquals('demo/forms.charCount', '11');

      await ui.element.clearText('demo/forms.comments');
      await ui.assert.valueEquals('demo/forms.comments', '');
      await ui.element.clearWithKeyboard('demo/forms.firstName');
      await ui.assert.valueEquals('demo/forms.firstName', '');
    });

    test('enterTextAndPress, pressKey, selectText, focus, blur', async ({ ui }) => {
      await ui.element.enterTextAndPress('demo/forms.searchBox', 'POL-1001'); // default Enter
      await ui.assert.textEquals('demo/forms.searchResult', 'Searched: POL-1001');

      await ui.element.enterText('demo/forms.searchBox', 'POL-2002');
      await ui.element.pressKey('demo/forms.searchBox', 'Enter');
      await ui.assert.textEquals('demo/forms.searchResult', 'Searched: POL-2002');

      await ui.element.selectText('demo/forms.reference');
      const selected = await ui.js.executeOn('demo/forms.reference', (el: HTMLInputElement) =>
        el.value.substring(el.selectionStart ?? 0, el.selectionEnd ?? 0),
      );
      expect(selected).toBe('REF-2026-XYZ');

      await ui.element.focus('demo/forms.email');
      await ui.assert.visible('demo/forms.focusHint');
      await ui.element.enterText('demo/forms.email', 'not-an-email');
      await ui.element.blur('demo/forms.email');
      await ui.assert.textEquals('demo/forms.emailError', 'Invalid email');
    });
  });

  test('checkbox & radio: check, uncheck, setChecked, toggle, isChecked, selectRadioByValue', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    const hobby = 'demo/forms.hobby'; // id "hobby{name}"

    await ui.element.check(hobby, { name: 'Reading' });
    expect(await ui.element.isChecked(hobby, { name: 'Reading' })).toBe(true);
    await ui.element.uncheck(hobby, { name: 'Music' });
    expect(await ui.element.isChecked(hobby, { name: 'Music' })).toBe(false);
    await ui.element.setChecked(hobby, true, { name: 'Sports' });
    await ui.element.toggle(ui.element.get(hobby, { name: 'Sports' }));
    expect(await ui.element.isChecked(hobby, { name: 'Sports' })).toBe(false);

    await ui.element.selectRadioByValue('gender', 'female');
    await ui.assert.checked('demo/forms.genderRadio', false, ['female']);
  });

  test('read values: getText, getInnerText, getAllTexts, getValue, getAttribute(s), getCssValue, getInnerHTML, getCount, getBoundingBox', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');

    expect(await ui.element.getText('h1')).toBe('Customer Registration');
    expect(await ui.element.getInnerText('demo/forms.accountId')).toBe(''); // inputs have no inner text
    expect(await ui.element.getAllTexts('#genderGroup label')).toEqual(['Gender', 'Male', 'Female', 'Other']);
    expect(await ui.element.getValue('demo/forms.accountId')).toBe('AUTO-1001');
    expect(await ui.element.getAttribute('demo/forms.email', 'placeholder')).toBe('Email address');
    expect(await ui.element.getAllAttributes('demo/forms.allHobbies', 'value')).toEqual(['reading', 'sports', 'music']);
    expect(await ui.element.getCssValue('demo/forms.submit', 'background-color')).toBe('rgb(154, 165, 177)'); // disabled colour
    expect(await ui.element.getInnerHTML('#genderGroup')).toContain('genderMale');
    expect(await ui.element.getCount('demo/forms.allHobbies')).toBe(3);
    const box = await ui.element.getBoundingBox('demo/forms.submit');
    expect(box?.width).toBeGreaterThan(0);
  });

  test('state checks: isVisible, isVisibleWithin, isHidden, isEnabled, isDisabled, isEditable, exists', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');

    expect(await ui.element.isVisible('demo/forms.firstName')).toBe(true);
    expect(await ui.element.isHidden('demo/forms.focusHint')).toBe(true);
    expect(await ui.element.isVisibleWithin('demo/forms.focusHint', 500)).toBe(false);
    expect(await ui.element.isEnabled('demo/forms.firstName')).toBe(true);
    expect(await ui.element.isDisabled('demo/forms.accountId')).toBe(true);
    expect(await ui.element.isEditable('demo/forms.dob')).toBe(false); // readonly
    expect(await ui.element.exists('demo/forms.firstName')).toBe(true);
    expect(await ui.element.exists('#doesNotExist')).toBe(false);
  });

  test('scrollIntoView, dragAndDrop, dragAndDropByMouse, dragByOffset', async ({ ui }) => {
    await ui.browser.navigateTo('/interactions.html');

    await ui.element.dragAndDrop('demo/interactions.draggable', 'demo/interactions.dropZone');
    await ui.assert.textEquals('demo/interactions.dropZone', 'Dropped!');

    await ui.element.dragAndDropByMouse('demo/interactions.mouseDragBox', 'demo/interactions.mouseDropZone');
    await ui.assert.textEquals('demo/interactions.mouseDropZone', 'Mouse dropped!');

    await ui.element.dragByOffset('demo/interactions.sliderHandle', 150, 0);
    const value = Number(await ui.element.getText('demo/interactions.sliderValue'));
    expect(value).toBeGreaterThan(40);
    expect(value).toBeLessThan(65);

    await ui.js.scrollToTop();
    expect(await ui.js.isInViewport('demo/interactions.signature')).toBe(false);
    await ui.element.scrollIntoView('demo/interactions.signature');
    expect(await ui.js.isInViewport('demo/interactions.signature')).toBe(true);
  });

  test('files: uploadFile (multiple), clearUpload, uploadViaFileChooser, download', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');

    await ui.element.uploadFile('demo/forms.resume', ['files/sample-upload.txt', 'files/policy-schedule.txt']);
    await ui.assert.textEquals('demo/forms.fileList', 'sample-upload.txt, policy-schedule.txt');
    await ui.element.clearUpload('demo/forms.resume');
    await ui.assert.textEquals('demo/forms.fileList', 'none');

    await ui.element.uploadViaFileChooser('demo/forms.chooseFileBtn', 'files/policy-schedule.txt');
    await ui.assert.textEquals('demo/forms.fileList', 'policy-schedule.txt');

    await ui.browser.navigateTo('/downloads.html');
    const csv = await ui.element.download('demo/downloads.csvLink');
    expect(CsvReader.read(csv)).toHaveLength(2);
    const txt = await ui.element.download('demo/downloads.txtLink', 'renamed-notes.txt');
    expect(fs.readFileSync(txt, 'utf-8')).toBe('Sample download notes');
  });

  test('highlight & element screenshot', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    await ui.element.highlight('demo/forms.firstName');
    expect(await ui.element.getCssValue('demo/forms.firstName', 'outline-style')).toBe('solid');
    const png = await ui.element.screenshot('demo/forms.firstName', 'first-name-field');
    expect(png.length).toBeGreaterThan(100);
  });
});
