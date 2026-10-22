import { LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

/**
 * Dropdowns: native <select> (single / multi) and custom (div/ul based, React/Angular/Pega style),
 * plus auto-suggest / type-ahead inputs.
 */
export class DropdownActions extends BaseActions {
  // ───────────────────────────── Native <select> ─────────────────────────────

  async selectByValue(target: Target, value: string, params?: LocatorParams): Promise<void> {
    await this.step(`Select value "${value}" in ${this.describe(target)}`, async () => {
      await this.locate(target, params).selectOption({ value });
    });
  }

  async selectByLabel(target: Target, label: string, params?: LocatorParams): Promise<void> {
    await this.step(`Select "${label}" in ${this.describe(target)}`, async () => {
      await this.locate(target, params).selectOption({ label });
    });
  }

  /** Alias for selectByLabel - "visible text" in Selenium terms. */
  async selectByVisibleText(target: Target, text: string, params?: LocatorParams): Promise<void> {
    await this.selectByLabel(target, text, params);
  }

  async selectByIndex(target: Target, index: number, params?: LocatorParams): Promise<void> {
    await this.step(`Select index ${index} in ${this.describe(target)}`, async () => {
      await this.locate(target, params).selectOption({ index });
    });
  }

  /** Select by partial option text (case-insensitive). */
  async selectByPartialText(target: Target, partial: string, params?: LocatorParams): Promise<void> {
    await this.step(`Select option containing "${partial}" in ${this.describe(target)}`, async () => {
      const select = this.locate(target, params);
      const labels = await select.locator('option').allTextContents();
      const match = labels.find((l) => l.toLowerCase().includes(partial.toLowerCase()));
      if (!match) throw new Error(`No option containing "${partial}". Options: ${labels.join(' | ')}`);
      await select.selectOption({ label: match.trim() });
    });
  }

  /** Multi-select by labels. */
  async selectMultiple(target: Target, labels: string[], params?: LocatorParams): Promise<void> {
    await this.step(`Select [${labels.join(', ')}] in ${this.describe(target)}`, async () => {
      await this.locate(target, params).selectOption(labels.map((label) => ({ label })));
    });
  }

  async deselectAll(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Deselect all in ${this.describe(target)}`, async () => {
      await this.locate(target, params).selectOption([]);
    });
  }

  async selectRandomOption(target: Target, skipFirst = true, params?: LocatorParams): Promise<string> {
    const options = await this.getAllOptions(target, params);
    const pool = skipFirst ? options.slice(1) : options;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    await this.selectByLabel(target, choice, params);
    return choice;
  }

  async getSelectedOption(target: Target, params?: LocatorParams): Promise<string> {
    const texts = await this.getSelectedOptions(target, params);
    return texts[0] ?? '';
  }

  async getSelectedOptions(target: Target, params?: LocatorParams): Promise<string[]> {
    return this.locate(target, params).evaluate((el: HTMLSelectElement) =>
      Array.from(el.selectedOptions).map((o) => o.text.trim()),
    );
  }

  async getSelectedValue(target: Target, params?: LocatorParams): Promise<string> {
    return this.locate(target, params).inputValue();
  }

  async getAllOptions(target: Target, params?: LocatorParams): Promise<string[]> {
    return (await this.locate(target, params).locator('option').allTextContents()).map((t) => t.trim());
  }

  async getAllOptionValues(target: Target, params?: LocatorParams): Promise<string[]> {
    return this.locate(target, params)
      .locator('option')
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  }

  async getOptionCount(target: Target, params?: LocatorParams): Promise<number> {
    return this.locate(target, params).locator('option').count();
  }

  async isOptionPresent(target: Target, label: string, params?: LocatorParams): Promise<boolean> {
    return (await this.getAllOptions(target, params)).includes(label);
  }

  async isMultiple(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).evaluate((el: HTMLSelectElement) => el.multiple);
  }

  // ───────────────────────────── Custom dropdowns ─────────────────────────────

  /**
   * Custom (non-<select>) dropdown: click the trigger, then click the option with matching text.
   * @param optionsLocator selector for option elements, e.g. "li[role=option]" or "ul.menu li"
   */
  async selectCustom(trigger: Target, optionText: string, optionsLocator: Target = '[role="option"]', exact = true): Promise<void> {
    await this.step(`Select "${optionText}" from custom dropdown ${this.describe(trigger)}`, async () => {
      await this.locate(trigger).click();
      const options = this.locate(optionsLocator);
      const option = exact
        ? options.filter({ hasText: new RegExp(`^\\s*${escapeRegex(optionText)}\\s*$`) })
        : options.filter({ hasText: optionText });
      await option.first().click();
    });
  }

  /** Read all options of a custom dropdown (opens it, reads, closes with Escape). */
  async getCustomOptions(trigger: Target, optionsLocator: Target = '[role="option"]'): Promise<string[]> {
    await this.locate(trigger).click();
    const opts = this.locate(optionsLocator);
    await opts.first().waitFor();
    const texts = (await opts.allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    return texts;
  }

  /** Type into an auto-suggest input and choose a suggestion. */
  async selectAutoSuggest(
    input: Target,
    typeText: string,
    suggestionText: string,
    suggestionsLocator: Target = '[role="option"]',
  ): Promise<void> {
    await this.step(`Auto-suggest: type "${typeText}" and pick "${suggestionText}"`, async () => {
      const box = this.locate(input);
      await box.fill('');
      await box.pressSequentially(typeText, { delay: 75 });
      const suggestion = this.locate(suggestionsLocator).filter({ hasText: suggestionText }).first();
      await suggestion.waitFor({ state: 'visible' });
      await suggestion.click();
    });
  }

  /**
   * Keyboard-driven selection: type, then ArrowDown n times + Enter.
   * Pass `suggestionsLocator` to wait for the (often debounced) suggestion list before navigating.
   */
  async selectByKeyboard(input: Target, typeText: string, arrowDownCount = 1, suggestionsLocator?: Target): Promise<void> {
    await this.step(`Keyboard select "${typeText}" (↓×${arrowDownCount})`, async () => {
      const box = this.locate(input);
      await box.pressSequentially(typeText, { delay: 75 });
      if (suggestionsLocator) await this.locate(suggestionsLocator).first().waitFor({ state: 'visible' });
      for (let i = 0; i < arrowDownCount; i++) await box.press('ArrowDown');
      await box.press('Enter');
    });
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
