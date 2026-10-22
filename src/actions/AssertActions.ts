import { expect } from '@playwright/test';
import { LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

/**
 * Assertions with logging + report steps. Every method has a `soft` flag:
 * soft assertions record a failure but let the test continue (all failures reported at the end).
 */
export class AssertActions extends BaseActions {
  private x(soft: boolean) {
    return soft ? expect.soft : expect;
  }

  async visible(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify visible: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params).first()).toBeVisible());
  }

  async hidden(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify hidden: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params).first()).toBeHidden());
  }

  async enabled(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify enabled: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params)).toBeEnabled());
  }

  async disabled(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify disabled: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params)).toBeDisabled());
  }

  async checked(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify checked: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params)).toBeChecked());
  }

  async notChecked(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify not checked: ${this.describe(target)}`, () =>
      this.x(soft)(this.locate(target, params)).not.toBeChecked(),
    );
  }

  async editable(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify editable: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params)).toBeEditable());
  }

  async focused(target: Target, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify focused: ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params)).toBeFocused());
  }

  async textEquals(target: Target, expected: string | RegExp, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify text of ${this.describe(target)} = "${expected}"`, () =>
      this.x(soft)(this.locate(target, params).first()).toHaveText(expected),
    );
  }

  async textContains(target: Target, expected: string, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify text of ${this.describe(target)} contains "${expected}"`, () =>
      this.x(soft)(this.locate(target, params).first()).toContainText(expected),
    );
  }

  /** Verify a list of elements has exactly these texts (in order). */
  async textsEqual(target: Target, expected: (string | RegExp)[], soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify texts of ${this.describe(target)}`, () => this.x(soft)(this.locate(target, params)).toHaveText(expected));
  }

  async valueEquals(target: Target, expected: string | RegExp, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify value of ${this.describe(target)} = "${expected}"`, () =>
      this.x(soft)(this.locate(target, params)).toHaveValue(expected),
    );
  }

  async attributeEquals(target: Target, attr: string, expected: string | RegExp, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify ${attr} of ${this.describe(target)} = "${expected}"`, () =>
      this.x(soft)(this.locate(target, params).first()).toHaveAttribute(attr, expected),
    );
  }

  async hasClass(target: Target, cls: string | RegExp, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify class of ${this.describe(target)} contains "${cls}"`, () =>
      this.x(soft)(this.locate(target, params).first()).toHaveClass(typeof cls === 'string' ? new RegExp(`\\b${cls}\\b`) : cls),
    );
  }

  async cssEquals(target: Target, prop: string, expected: string, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify CSS ${prop} of ${this.describe(target)} = "${expected}"`, () =>
      this.x(soft)(this.locate(target, params).first()).toHaveCSS(prop, expected),
    );
  }

  async count(target: Target, expected: number, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify count of ${this.describe(target)} = ${expected}`, () =>
      this.x(soft)(this.locate(target, params)).toHaveCount(expected),
    );
  }

  async titleContains(expected: string, soft = false): Promise<void> {
    await this.step(`Verify title contains "${expected}"`, () => this.x(soft)(this.page).toHaveTitle(new RegExp(escapeRegex(expected))));
  }

  async urlContains(expected: string, soft = false): Promise<void> {
    await this.step(`Verify URL contains "${expected}"`, () => this.x(soft)(this.page).toHaveURL(new RegExp(escapeRegex(expected))));
  }

  async selectedOption(target: Target, expectedLabel: string, soft = false, params?: LocatorParams): Promise<void> {
    await this.step(`Verify selected option of ${this.describe(target)} = "${expectedLabel}"`, async () => {
      const selected = await this.locate(target, params).evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.text.trim() ?? '');
      this.x(soft)(selected).toBe(expectedLabel);
    });
  }

  /** Visual regression - compare page or element against a stored baseline. */
  async matchesScreenshot(name: string, target?: Target, maxDiffPixelRatio = 0.01): Promise<void> {
    await this.step(`Visual compare "${name}"`, async () => {
      if (target) await expect(this.locate(target)).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio });
      else await expect(this.page).toHaveScreenshot(`${name}.png`, { fullPage: true, maxDiffPixelRatio });
    });
  }

  // ─────────── Plain value assertions (with logging) ───────────

  async equals<T>(actual: T, expected: T, message = 'Values match', soft = false): Promise<void> {
    await this.step(`${message}: expected "${expected}"`, async () => this.x(soft)(actual as unknown, message).toEqual(expected));
  }

  async isTrue(condition: boolean, message: string, soft = false): Promise<void> {
    await this.step(`Verify: ${message}`, async () => this.x(soft)(condition, message).toBe(true));
  }

  async contains(actual: string | unknown[], expected: unknown, message = 'Contains', soft = false): Promise<void> {
    await this.step(`${message}: "${String(expected)}"`, async () => this.x(soft)(actual, message).toContain(expected));
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
