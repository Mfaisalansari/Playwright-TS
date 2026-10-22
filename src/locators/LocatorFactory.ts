import { FrameLocator, Locator, Page } from '@playwright/test';
import { LocatorDefinition, ObjectRepository } from './ObjectRepository';

/**
 * A "Target" is anything an action can work on:
 *   - an Object Repository key        → "login.username"
 *   - a raw CSS / XPath / PW selector → "#username", "//button[text()='Login']", "text=Login"
 *   - a Playwright Locator            → page.getByRole('button', { name: 'Login' })
 */
export type Target = string | Locator;

/** Values for {0} / {name} placeholders in locator values. */
export type LocatorParams = (string | number)[] | Record<string, string | number>;

type Scope = Page | FrameLocator;

export class LocatorFactory {
  static resolve(scope: Scope, target: Target, params?: LocatorParams): Locator {
    if (typeof target !== 'string') return target;
    if (ObjectRepository.has(target)) return this.fromDefinition(scope, ObjectRepository.get(target), params);
    if (this.looksLikeRepoKey(target)) {
      const page = target.slice(0, target.lastIndexOf('.'));
      const known = ObjectRepository.keys(`${page}.`).map((k) => k.slice(page.length + 1));
      throw new Error(
        `Locator "${target}" is not in the object repository.` +
          (known.length ? ` Elements defined for "${page}": ${known.join(', ')}` : ` No page "${page}" found (check the JSON file name).`),
      );
    }
    return this.fromRawSelector(scope, this.interpolate(target, params));
  }

  /** Human-readable description of a target for logs/reports. */
  static describe(target: Target): string {
    if (typeof target !== 'string') return target.toString();
    if (ObjectRepository.has(target)) {
      const d = ObjectRepository.get(target);
      return `${target}${d.description ? ` (${d.description})` : ''} [${d.strategy}=${d.value}]`;
    }
    return target;
  }

  static fromDefinition(scope: Scope, def: LocatorDefinition, params?: LocatorParams): Locator {
    let root: Scope = scope;
    for (const frameSel of def.frames ?? []) root = root.frameLocator(frameSel);

    let locator = this.build(root, def, params);
    for (const fb of def.fallbacks ?? []) locator = locator.or(this.build(root, fb, params));
    return locator;
  }

  private static build(scope: Scope, def: Omit<LocatorDefinition, 'fallbacks'>, params?: LocatorParams): Locator {
    const v = this.interpolate(def.value, params);
    const o = def.options ?? {};
    let loc: Locator;
    switch (def.strategy) {
      case 'css':
      case 'playwright':
        loc = scope.locator(v);
        break;
      case 'xpath':
        loc = scope.locator(`xpath=${v}`);
        break;
      case 'id':
        loc = scope.locator(`[id="${v}"]`);
        break;
      case 'name':
        loc = scope.locator(`[name="${v}"]`);
        break;
      case 'text':
        loc = scope.getByText(v, { exact: o.exact });
        break;
      case 'exactText':
        loc = scope.getByText(v, { exact: true });
        break;
      case 'role':
        loc = scope.getByRole(v as Parameters<Page['getByRole']>[0], {
          name: o.name !== undefined ? this.interpolate(o.name, params) : undefined,
          exact: o.exact,
          checked: o.checked,
          level: o.level,
          includeHidden: o.includeHidden,
        });
        break;
      case 'label':
        loc = scope.getByLabel(v, { exact: o.exact });
        break;
      case 'placeholder':
        loc = scope.getByPlaceholder(v, { exact: o.exact });
        break;
      case 'testid':
        loc = scope.getByTestId(v);
        break;
      case 'alt':
        loc = scope.getByAltText(v, { exact: o.exact });
        break;
      case 'title':
        loc = scope.getByTitle(v, { exact: o.exact });
        break;
      default:
        throw new Error(`Unsupported locator strategy: ${(def as LocatorDefinition).strategy}`);
    }
    if (def.hasText) loc = loc.filter({ hasText: this.interpolate(def.hasText, params) });
    if (def.nth === 'first') loc = loc.first();
    else if (def.nth === 'last') loc = loc.last();
    else if (typeof def.nth === 'number') loc = loc.nth(def.nth);
    return loc;
  }

  /** "folder/page.element" shape - never a valid CSS/XPath selector, so treat it as a missing repo key. */
  static looksLikeRepoKey(target: string): boolean {
    return /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)+\.[A-Za-z0-9_]+$/.test(target);
  }

  static fromRawSelector(scope: Scope, selector: string): Locator {
    const s = selector.trim();
    if (s.startsWith('//') || s.startsWith('(//') || s.startsWith('./')) return scope.locator(`xpath=${s}`);
    return scope.locator(s);
  }

  static interpolate(value: string, params?: LocatorParams): string {
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (match, key: string) => {
      const p = params as Record<string, string | number>;
      return p[key] !== undefined ? String(p[key]) : match;
    });
  }
}
