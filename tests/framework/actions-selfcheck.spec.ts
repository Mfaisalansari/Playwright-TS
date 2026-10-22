import { expect, test } from '../../src/fixtures/baseFixture';
import { ObjectRepository } from '../../src/locators/ObjectRepository';

const pages: Record<string, string> = {
  '/main': `<html><head><title>Main</title></head><body>
    <input id="username" aria-label="Username"><input id="password" type="password">
    <select id="dd"><option value="">Pick</option><option value="1">Option 1</option><option value="2">Option 2</option></select>
    <select id="multi" multiple><option>A</option><option>B</option><option>C</option></select>
    <div id="custom" role="combobox">Choose</div><ul id="menu" style="display:none"><li role="option">Red</li><li role="option">Green</li></ul>
    <script>document.getElementById('custom').onclick=()=>document.getElementById('menu').style.display='block';
      document.querySelectorAll('#menu li').forEach(li=>li.onclick=()=>{document.getElementById('custom').textContent=li.textContent;document.getElementById('menu').style.display='none'});</script>
    <input type="checkbox" id="cb1"><input type="checkbox" id="cb2" checked>
    <button onclick="alert('Hello alert')">alert</button>
    <button onclick="document.getElementById('r').textContent = confirm('Sure?') ? 'ok':'cancel'">confirm</button>
    <button onclick="document.getElementById('r').textContent = prompt('Name?')">prompt</button>
    <p id="r"></p>
    <a href="/child" target="_blank">open tab</a>
    <iframe id="outer" src="/outer"></iframe>
    <table id="t"><thead><tr><th>Name</th><th>Amount</th></tr></thead><tbody>
      <tr><td>Bob</td><td>20</td></tr><tr><td>Alice</td><td>10</td></tr><tr><td>Carl</td><td>30</td></tr></tbody></table>
    <input type="file" id="f"><div id="drag" draggable="true">drag</div><div id="drop">drop</div>
  </body></html>`,
  '/child': `<html><head><title>Child Tab</title></head><body><h1>Child</h1></body></html>`,
  '/outer': `<html><body><p>outer</p><iframe id="inner" src="/inner"></iframe></body></html>`,
  '/inner': `<html><body><input id="innerInput"><p id="innerText">INNER</p></body></html>`,
};

test.beforeEach(async ({ page }) => {
  await page.context().route('http://local.test/**', (r) => {
    const p = new URL(r.request().url()).pathname;
    return r.fulfill({ contentType: 'text/html', body: pages[p] ?? 'nf' });
  });
});

test('all action libraries work (offline, no external site) @selfcheck', async ({ ui, testData }) => {
  await ui.browser.navigateTo('http://local.test/main');

  // element + repo (with fallback)
  ObjectRepository.register('t.user', { strategy: 'id', value: 'nope', fallbacks: [{ strategy: 'label', value: 'Username' }] });
  await ui.element.enterText('t.user', 'faisal');
  expect(await ui.element.getValue('#username')).toBe('faisal');
  await ui.element.appendText('#username', '_qa');
  expect(await ui.element.getValue('#username')).toBe('faisal_qa');
  await ui.element.clearWithKeyboard('#username');
  expect(await ui.element.getValue('#username')).toBe('');
  await ui.element.enterSecureText('//input[@id="password"]', 'secret');

  // dropdowns
  await ui.dropdown.selectByLabel('#dd', 'Option 2');
  expect(await ui.dropdown.getSelectedOption('#dd')).toBe('Option 2');
  await ui.dropdown.selectByPartialText('#dd', 'ion 1');
  expect(await ui.dropdown.getSelectedValue('#dd')).toBe('1');
  await ui.dropdown.selectMultiple('#multi', ['A', 'C']);
  expect(await ui.dropdown.getSelectedOptions('#multi')).toEqual(['A', 'C']);
  await ui.dropdown.selectCustom('#custom', 'Green');
  await ui.assert.textEquals('#custom', 'Green');

  // checkbox
  await ui.element.check('#cb1');
  await ui.element.toggle('#cb2');
  await ui.assert.checked('#cb1');
  await ui.assert.notChecked('#cb2');

  // alerts
  const a = await ui.alert.accept(() => ui.element.click('text=alert'));
  expect(a.message).toBe('Hello alert');
  await ui.alert.dismiss(() => ui.element.click('button:text-is("confirm")'));
  await ui.assert.textEquals('#r', 'cancel');
  await ui.alert.answerPrompt(() => ui.element.click('button:text-is("prompt")'), 'Faisal');
  await ui.assert.textEquals('#r', 'Faisal');
  ui.alert.autoAccept();
  await ui.element.click('button:text-is("confirm")');
  await ui.assert.textEquals('#r', 'ok');
  ui.alert.removeAutoHandler();

  // frames (nested)
  await ui.frame.enterText(['#outer', '#inner'], '#innerInput', 'in frame');
  expect(await ui.frame.getText(['#outer', '#inner'], '#innerText')).toBe('INNER');
  ObjectRepository.register('t.innerText', { strategy: 'css', value: '#innerText', frames: ['#outer', '#inner'] });
  await ui.assert.textEquals('t.innerText', 'INNER');

  // table
  expect(await ui.table.getHeaders('#t')).toEqual(['Name', 'Amount']);
  expect(await ui.table.getCellText('#t', 1, 'Name')).toBe('Alice');
  expect(await ui.table.findRowIndex('#t', 'Carl', 'Name')).toBe(2);
  expect((await ui.table.getTableData('#t'))[0]).toEqual({ Name: 'Bob', Amount: '20' });

  // upload
  await ui.element.uploadFile('#f', 'files/sample-upload.txt');
  expect(await ui.js.executeOn('#f', (el: HTMLInputElement) => el.files![0].name)).toBe('sample-upload.txt');

  // storage + mock
  await ui.browser.setStorageItem('k', 'v');
  expect(await ui.browser.getStorageItem('k')).toBe('v');

  // tabs
  await ui.window.switchToNewTab(() => ui.element.click('text=open tab'));
  await ui.assert.textEquals('h1', 'Child');
  await ui.assert.titleContains('Child Tab');
  expect(ui.window.getTabCount()).toBe(2);
  await ui.window.switchToTabByTitle('Main');
  await ui.assert.visible('#dd');
  await ui.window.switchToTabByIndex(1);
  await ui.window.closeCurrentTab();
  expect(ui.window.getTabCount()).toBe(1);
  await ui.assert.titleContains('Main');

  // keyboard, waits, data
  await ui.element.click('#username');
  await ui.keyboard.type('abc');
  await ui.wait.forValue('#username', 'abc');
  testData.set('x', 1);
  expect(testData.get<number>('x')).toBe(1);
});
