import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.js - JavaScriptExecutor style helpers. */
test.describe('JavaScriptActions @demo @js', () => {
  test('execute and executeOn', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    expect(await ui.js.execute(() => document.title)).toBe('Registration Form | QA Demo App');
    expect(await ui.js.execute((n: number) => n * 2, 21)).toBe(42);
    expect(await ui.js.executeOn('demo/forms.firstName', (el: HTMLElement) => el.tagName)).toBe('INPUT');
    expect(await ui.js.executeOn('demo/forms.country', (el: HTMLSelectElement, i: number) => el.options[i].text, 2)).toBe('United Kingdom');
  });

  test('setValue on readonly field, removeAttribute, setAttribute', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    await ui.js.setValue('demo/forms.dob', '15/08/1989');
    await ui.assert.valueEquals('demo/forms.dob', '15/08/1989');

    await ui.js.removeAttribute('demo/forms.dob', 'readonly');
    expect(await ui.element.isEditable('demo/forms.dob')).toBe(true);

    await ui.js.setAttribute('demo/forms.firstName', 'maxlength', '3');
    await ui.element.typeText('demo/forms.firstName', 'Faisal', 0);
    await ui.assert.valueEquals('demo/forms.firstName', 'Fai');
  });

  test('page scrolling: scrollToBottom, scrollToTop, scrollBy, isInViewport', async ({ ui }) => {
    await ui.browser.navigateTo('/browser.html');
    const scrollY = () => ui.js.execute<number>(() => Math.round(window.scrollY));

    expect(await ui.js.isInViewport('demo/browser.footer')).toBe(false);
    await ui.js.scrollToBottom();
    await ui.wait.until(async () => ui.js.isInViewport('demo/browser.footer'), 3000, 'footer visible');

    await ui.js.scrollToTop();
    expect(await scrollY()).toBe(0);
    await ui.js.scrollBy(0, 300);
    expect(await scrollY()).toBe(300);
  });

  test('scrollElement (inner container) and scrollUntilEnd (infinite list)', async ({ ui }) => {
    await ui.browser.navigateTo('/interactions.html');
    await ui.js.scrollElement('demo/interactions.scrollContainer', 10_000);
    const containerBox = (await ui.element.getBoundingBox('demo/interactions.scrollContainer'))!;
    const lastItem = (await ui.element.getBoundingBox('demo/interactions.scrollItem', { n: 40 }))!;
    expect(lastItem.y).toBeLessThan(containerBox.y + containerBox.height); // item 40 scrolled into the container

    await ui.js.scrollUntilEnd(20, 300);
    await ui.assert.textEquals('demo/interactions.loadedCount', '40');
  });

  test('getDocumentReadyState and zoom', async ({ ui }) => {
    await ui.browser.navigateTo('/index.html');
    expect(await ui.js.getDocumentReadyState()).toBe('complete');
    await ui.js.zoom(80);
    expect(await ui.js.execute(() => (document.body.style as any).zoom)).toBe('80%');
  });
});
