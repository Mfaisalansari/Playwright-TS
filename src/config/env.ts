import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment loader.
 * Order: .env  →  .env.<TEST_ENV> (overrides)  →  process.env (highest priority).
 * Usage:  TEST_ENV=qa npx playwright test
 */
const root = path.resolve(__dirname, '../..');
const testEnv = process.env.TEST_ENV || 'qa';

dotenv.config({ path: path.join(root, '.env') });
const envFile = path.join(root, `.env.${testEnv}`);
if (fs.existsSync(envFile)) dotenv.config({ path: envFile, override: true });

const str = (key: string, def = ''): string => process.env[key] ?? def;
const num = (key: string, def: number): number => {
  const v = process.env[key];
  return v !== undefined && v !== '' && !isNaN(Number(v)) ? Number(v) : def;
};
const bool = (key: string, def: boolean): boolean => {
  const v = process.env[key];
  return v === undefined ? def : ['true', '1', 'yes'].includes(v.toLowerCase());
};

export const env = {
  testEnv,
  baseUrl: str('BASE_URL', 'https://the-internet.herokuapp.com'),
  apiBaseUrl: str('API_BASE_URL', 'https://jsonplaceholder.typicode.com'),
  username: str('APP_USERNAME', 'tomsmith'),
  password: str('APP_PASSWORD', 'SuperSecretPassword!'),
  headless: bool('HEADLESS', true),
  slowMo: num('SLOW_MO', 0),
  retries: num('RETRIES', 0),
  workers: num('WORKERS', 2),
  testTimeout: num('TEST_TIMEOUT', 60_000),
  expectTimeout: num('EXPECT_TIMEOUT', 10_000),
  actionTimeout: num('ACTION_TIMEOUT', 15_000),
  navigationTimeout: num('NAVIGATION_TIMEOUT', 30_000),
  testIdAttribute: str('TEST_ID_ATTRIBUTE', 'data-testid'),
  demoPort: num('DEMO_PORT', 4000),
  demoUrl: str('DEMO_URL', `http://localhost:${num('DEMO_PORT', 4000)}`),
  demoUser: str('DEMO_USERNAME', 'admin'),
  demoPassword: str('DEMO_PASSWORD', 'Admin@123'),
  /** Optional: use an installed Chrome/Chromium instead of Playwright's bundled browser. */
  chromePath: str('CHROME_PATH', ''),
  /** off | on | retain-on-failure | on-first-retry */
  video: str('VIDEO', 'retain-on-failure') as 'off' | 'on' | 'retain-on-failure' | 'on-first-retry',
  logLevel: str('LOG_LEVEL', 'info'),
  testDataDir: path.join(root, 'test-data'),
  objectRepoDir: path.join(root, 'object-repository'),
  downloadDir: path.join(root, 'downloads'),
  logDir: path.join(root, 'logs'),
  rootDir: root,
};

export type Env = typeof env;
