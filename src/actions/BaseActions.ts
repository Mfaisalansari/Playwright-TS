import { Locator, Page, test } from '@playwright/test';
import { PageManager } from '../core/PageManager';
import { LocatorFactory, LocatorParams, Target } from '../locators/LocatorFactory';
import { logger } from '../utils/Logger';

/** Common plumbing for every action library: current page, locator resolution, logging & report steps. */
export abstract class BaseActions {
  constructor(protected readonly pm: PageManager) {}

  protected get page(): Page {
    return this.pm.page;
  }

  /** Resolve a Target (repo key / selector / Locator) against the current page. */
  locate(target: Target, params?: LocatorParams): Locator {
    return LocatorFactory.resolve(this.page, target, params);
  }

  protected describe(target: Target): string {
    return LocatorFactory.describe(target);
  }

  /**
   * Run an action as a named step: logged to file/console and shown as a step in the HTML report & trace.
   * Errors are logged and re-thrown with the step name for easier triage.
   */
  protected async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    logger.info(name);
    try {
      return await test.step(name, fn, { box: true });
    } catch (err) {
      logger.error(`FAILED: ${name} -> ${(err as Error).message.split('\n')[0]}`);
      throw err;
    }
  }
}
