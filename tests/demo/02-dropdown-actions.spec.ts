import { expect, test } from '../../src/fixtures/baseFixture';

/** ui.dropdown - native single/multi <select>, custom (div/li) dropdowns and auto-suggest. */
test.describe('DropdownActions @demo @dropdown', () => {
  const country = 'demo/forms.country';
  const skills = 'demo/forms.skills';

  test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/forms.html'));

  test('read options: getAllOptions, getAllOptionValues, getOptionCount, isOptionPresent, isMultiple', async ({ ui }) => {
    expect(await ui.dropdown.getAllOptions(country)).toEqual([
      '-- Select country --', 'India', 'United Kingdom', 'United States', 'Germany', 'United Arab Emirates',
    ]);
    expect(await ui.dropdown.getAllOptionValues(country)).toEqual(['', 'IN', 'UK', 'US', 'DE', 'AE']);
    expect(await ui.dropdown.getOptionCount(country)).toBe(6);
    expect(await ui.dropdown.isOptionPresent(country, 'Germany')).toBe(true);
    expect(await ui.dropdown.isOptionPresent(country, 'France')).toBe(false);
    expect(await ui.dropdown.isMultiple(country)).toBe(false);
    expect(await ui.dropdown.isMultiple(skills)).toBe(true);
  });

  test('single select: by value, label, visible text, index, partial text + read selection', async ({ ui }) => {
    await ui.dropdown.selectByValue(country, 'UK');
    expect(await ui.dropdown.getSelectedOption(country)).toBe('United Kingdom');
    expect(await ui.dropdown.getSelectedValue(country)).toBe('UK');

    await ui.dropdown.selectByLabel(country, 'United States');
    await ui.assert.selectedOption(country, 'United States');

    await ui.dropdown.selectByVisibleText(country, 'Germany');
    expect(await ui.dropdown.getSelectedValue(country)).toBe('DE');

    await ui.dropdown.selectByIndex(country, 1);
    expect(await ui.dropdown.getSelectedOption(country)).toBe('India');

    await ui.dropdown.selectByPartialText(country, 'arab'); // case-insensitive contains
    expect(await ui.dropdown.getSelectedValue(country)).toBe('AE');
  });

  test('random option', async ({ ui }) => {
    const picked = await ui.dropdown.selectRandomOption(country); // skips the placeholder by default
    expect(picked).not.toBe('-- Select country --');
    expect(await ui.dropdown.getSelectedOption(country)).toBe(picked);
  });

  test('multi select: selectMultiple, getSelectedOptions, deselectAll', async ({ ui }) => {
    await ui.dropdown.selectMultiple(skills, ['Java', 'SQL']);
    expect(await ui.dropdown.getSelectedOptions(skills)).toEqual(['Java', 'SQL']);
    await ui.dropdown.deselectAll(skills);
    expect(await ui.dropdown.getSelectedOptions(skills)).toEqual([]);
  });

  test('custom dropdown: getCustomOptions, selectCustom (exact & partial)', async ({ ui }) => {
    const trigger = 'demo/forms.lobDropdown';
    const options = 'demo/forms.lobOptions';

    expect(await ui.dropdown.getCustomOptions(trigger, options)).toEqual(['Casualty', 'Property', 'Motor', 'Marine', 'British Marine']);
    await ui.assert.hidden(options); // closed again with Escape

    await ui.dropdown.selectCustom(trigger, 'Marine', options); // exact: must NOT pick "British Marine"
    await ui.assert.textEquals(trigger, 'Marine');

    await ui.dropdown.selectCustom(trigger, 'British', options, false); // partial match
    await ui.assert.textEquals(trigger, 'British Marine');
  });

  test('auto-suggest: selectAutoSuggest and keyboard navigation selectByKeyboard', async ({ ui }) => {
    const city = 'demo/forms.city';
    const suggestions = 'demo/forms.citySuggestions';

    await ui.dropdown.selectAutoSuggest(city, 'Gl', 'Glasgow', suggestions);
    await ui.assert.valueEquals(city, 'Glasgow');

    await ui.element.clearText(city);
    await ui.dropdown.selectByKeyboard(city, 'L', 2, suggestions); // London, Leeds, Liverpool → 2nd
    await ui.assert.valueEquals(city, 'Leeds');
  });
});
