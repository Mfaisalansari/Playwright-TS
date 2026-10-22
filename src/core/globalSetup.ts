import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/Logger';

/**
 * Runs once before all tests:
 *  - prepares output folders
 *  - optionally logs in once and saves the session to .auth/user.json (set SAVE_AUTH=true)
 *    then use `test.use({ storageState: '.auth/user.json' })` to skip UI login in tests.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  for (const dir of ['reports/screenshots', 'reports/pdf', 'downloads', 'logs', '.auth']) {
    fs.mkdirSync(path.join(env.rootDir, dir), { recursive: true });
  }
  logger.info(`══ Test run starting | ENV=${env.testEnv} | BASE_URL=${env.baseUrl} | headless=${env.headless}`);

  if (process.env.SAVE_AUTH === 'true') {
    const browser = await chromium.launch();
    const page = await browser.newPage({ baseURL: env.baseUrl });
    await page.goto('/login');
    await page.fill('#username', env.username);
    await page.fill('#password', env.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/secure');
    await page.context().storageState({ path: path.join(env.rootDir, '.auth', 'user.json') });
    await browser.close();
    logger.info('Saved authenticated session to .auth/user.json');
  }
}
