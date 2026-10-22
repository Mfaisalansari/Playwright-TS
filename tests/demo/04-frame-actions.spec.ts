import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.frame - single iframe, nested iframes, editable iframe, Frame objects. */
test.describe('FrameActions @demo @frame', () => {
  const nested = ['#outerFrame', '#innerFrame'];

  test.beforeEach(async ({ ui }) => {
    await ui.browser.navigateTo('/frames.html');
    await ui.frame.waitForFrameLoaded(nested, '#innerBtn');
  });

  test('form inside an iframe: enterText, selectOption, click, getText, frame, locateIn', async ({ ui }) => {
    await ui.frame.enterText('#formFrame', '#frameName', 'Faisal');
    await ui.frame.selectOption('#formFrame', '#frameCover', 'Premium');
    await ui.frame.click('#formFrame', '#frameSubmit');
    expect(await ui.frame.getText('#formFrame', '#frameResult')).toBe('Saved Faisal with premium cover');

    // raw FrameLocator / Locator access when you need full Playwright API
    await expect(ui.frame.frame('#formFrame').locator('#frameName')).toHaveValue('Faisal');
    await expect(ui.frame.locateIn('#formFrame', '#frameResult')).toContainText('premium');
  });

  test('nested iframes (outer → inner)', async ({ ui }) => {
    expect(await ui.frame.isVisible(nested, '#innerHeading')).toBe(true);
    await ui.frame.enterText(nested, '#innerInput', 'deep value');
    await ui.frame.click(nested, '#innerBtn');
    expect(await ui.frame.getText(nested, '#innerResult')).toBe('Inner value: deep value');
  });

  test('object-repository locators with "frames" need no frame code in the test', async ({ ui }) => {
    await ui.element.enterText('demo/frames.formFrameName', 'Repo User');
    await ui.dropdown.selectByLabel('demo/frames.formFrameCover', 'Basic');
    await ui.element.click('demo/frames.formFrameSave');
    await ui.assert.textEquals('demo/frames.formFrameResult', 'Saved Repo User with basic cover');
    await ui.assert.textEquals('demo/frames.innerHeading', 'Inner Frame'); // two levels deep
  });

  test('editable iframe (rich-text editor): getBodyText, setBodyText', async ({ ui }) => {
    expect(await ui.frame.getBodyText('#editorFrame')).toBe('Initial editor content');
    await ui.frame.setBodyText('#editorFrame', 'Endorsement wording updated');
    expect(await ui.frame.getBodyText('#editorFrame')).toBe('Endorsement wording updated');
  });

  test('Frame objects: getFrameByName, getFrameByUrl, getFrameByElement, getFrameCount, listFrames', async ({ ui }) => {
    expect(ui.frame.getFrameByName('formFrame').url()).toContain('/frame-form.html');
    expect(await ui.frame.getFrameByUrl('frame-inner').locator('#innerHeading').textContent()).toBe('Inner Frame');
    expect(await ui.frame.getFrameByUrl(/frame-outer/).title()).toBe('Outer Frame');

    const outer = await ui.frame.getFrameByElement('#outerFrame');
    expect(await outer.locator('#outerHeading').textContent()).toBe('Outer Frame');

    expect(ui.frame.getFrameCount()).toBe(4); // form, outer, inner, editor
    expect(ui.frame.listFrames().join('\n')).toContain('innerFrame');
  });
});
