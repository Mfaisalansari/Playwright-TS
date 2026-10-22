import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.keyboard - page-level keyboard, clipboard and raw mouse control. */
test.describe('KeyboardMouseActions @demo @keyboard', () => {
  test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/interactions.html'));

  test('press, pressEnter, pressEscape, pressTab, key combos', async ({ ui }) => {
    await ui.element.click('demo/interactions.keyInput');
    await ui.keyboard.pressEnter();
    await ui.assert.textEquals('demo/interactions.lastKey', 'Enter');
    await ui.keyboard.pressEscape();
    await ui.assert.textEquals('demo/interactions.lastKey', 'Escape');
    await ui.keyboard.press('ArrowDown', 3);
    await ui.assert.textEquals('demo/interactions.lastKey', 'ArrowDown');
    await ui.keyboard.press('ControlOrMeta+S');
    await ui.assert.textEquals('demo/interactions.lastCombo', 'Save shortcut');

    await ui.keyboard.pressTab(); // focus leaves the input
    await ui.assert.attributeEquals(ui.page.locator(':focus'), 'id', 'notes');
  });

  test('type, insertText, keyDown/keyUp', async ({ ui }) => {
    await ui.element.click('demo/interactions.notes');
    await ui.keyboard.type('Policy ', 10);
    await ui.keyboard.insertText('ABC-1');
    await ui.assert.valueEquals('demo/interactions.notes', 'Policy ABC-1');

    await ui.keyboard.keyDown('Shift');
    await ui.keyboard.press('KeyX'); // physical key while Shift is held → upper case
    await ui.keyboard.keyUp('Shift');
    await ui.assert.valueEquals('demo/interactions.notes', 'Policy ABC-1X');
  });

  test('editing shortcuts: selectAll, copy, paste, cut, undo + getClipboardText', async ({ ui }) => {
    await ui.element.click('demo/interactions.notes');
    await ui.keyboard.type('Claim-42');
    await ui.keyboard.selectAll();
    await ui.keyboard.copy();
    expect(await ui.keyboard.getClipboardText()).toBe('Claim-42');

    await ui.keyboard.press('End');
    await ui.keyboard.paste();
    await ui.assert.valueEquals('demo/interactions.notes', 'Claim-42Claim-42');

    await ui.keyboard.selectAll();
    await ui.keyboard.cut();
    await ui.assert.valueEquals('demo/interactions.notes', '');
    await ui.keyboard.undo();
    await ui.assert.valueEquals('demo/interactions.notes', 'Claim-42Claim-42');

    await ui.element.click('demo/interactions.copyBtn'); // app writes to clipboard
    await ui.assert.textEquals('demo/interactions.copyResult', 'Copied');
    expect(await ui.keyboard.getClipboardText()).toBe('REF-CLIP-001');
  });

  test('mouse: moveTo, mouseDown, mouseUp, drawPath on canvas', async ({ ui }) => {
    await ui.element.scrollIntoView('demo/interactions.signature');
    const box = (await ui.element.getBoundingBox('demo/interactions.signature'))!;

    await ui.keyboard.moveTo(box.x + 20, box.y + 20);
    await ui.keyboard.mouseDown();
    await ui.keyboard.moveTo(box.x + 120, box.y + 80, 10);
    await ui.keyboard.mouseUp();
    await ui.assert.textEquals('demo/interactions.strokeCount', '1');

    await ui.keyboard.drawPath([
      { x: box.x + 30, y: box.y + 100 },
      { x: box.x + 80, y: box.y + 30 },
      { x: box.x + 150, y: box.y + 100 },
    ]);
    await ui.assert.textEquals('demo/interactions.strokeCount', '2');
  });

  test('mouse: clickAt, doubleClickAt, wheel', async ({ ui }) => {
    const btn = (await ui.element.getBoundingBox('demo/interactions.clickBtn'))!;
    await ui.keyboard.clickAt(Math.round(btn.x + 5), Math.round(btn.y + 5));
    await ui.assert.textEquals('demo/interactions.clickCount', '1');
    await ui.assert.textEquals('demo/interactions.coords', `${Math.round(btn.x + 5)},${Math.round(btn.y + 5)}`);

    const dbl = (await ui.element.getBoundingBox('demo/interactions.dblClickBtn'))!;
    await ui.keyboard.doubleClickAt(dbl.x + dbl.width / 2, dbl.y + dbl.height / 2);
    await ui.assert.textEquals('demo/interactions.dblResult', 'Double clicked');

    await ui.keyboard.wheel(0, 800);
    await ui.wait.until(async () => (await ui.js.execute<number>(() => window.scrollY)) > 0, 5000, 'page scrolled');
  });
});
