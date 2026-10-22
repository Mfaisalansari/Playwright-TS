# Playwright + TypeScript Automation Framework

A ready-to-use, enterprise-style framework: action libraries for every Playwright capability,
object repository (JSON), test-data library (Excel / CSV / JSON + dynamic tokens), page objects,
custom fixtures, API client, logging, custom reporting and CI.

## Quick start

```bash
npm install
npx playwright install            # browsers
cp .env.example .env              # adjust URLs / credentials
npm run generate:testdata         # creates test-data/testdata.xlsx (sample)
npm test                          # chromium + api projects
npm run report                    # open HTML report
```

Offline sanity check of all action libraries (no external site needed):
`npx playwright test tests/framework --project=chromium`

## Sample suite: QA Demo App (every framework function covered)

`demo-app/` is a small bundled web application (Node, no dependencies) built for practising and
demonstrating the framework. Playwright starts it automatically (`webServer` in the config) on
http://localhost:4000. Login: **admin / Admin@123**.

| Page | What it exercises |
|---|---|
| `/login.html`, `/dashboard.html` | page objects, login/logout, session storage, redirects |
| `/forms.html` | text inputs, readonly/disabled fields, radio, checkboxes, native + multi select, custom dropdown, auto-suggest, slider, uploads, validation |
| `/alerts.html` | alert / confirm / prompt / delayed / back-to-back dialogs |
| `/frames.html` | iframe form, nested iframes, rich-text editor iframe |
| `/windows.html` | new tab, popup window, multiple tabs |
| `/table.html` | sortable, filterable table with row actions |
| `/interactions.html` | double/right/modifier clicks, hover menu, drag & drop (HTML5 + mouse), slider, keyboard, clipboard, canvas, scrolling, infinite list |
| `/waits.html` | spinners, delayed enable/text/count/attach/detach, title & URL changes, network calls |
| `/browser.html`, `/downloads.html` | cookies, geolocation, offline, viewport, colour scheme, auth headers, downloads, cookie banner |
| `/api/*` | REST CRUD, login, Bearer + Basic auth, slow endpoint, multipart upload |

Tests live in `tests/demo/` — one spec per library (`01-element` … `11-table`), plus
object repository (`12`), test data (`13`), utilities (`14`), API client (`15`) and end-to-end POM flows
with CSV/Excel data-driven runs (`16`). Locators: `object-repository/demo/*.json`; page objects:
`src/pages/demo/`; data: `test-data/demo/` and the `Registration` sheet in `testdata.xlsx`.

```bash
npm run test:demo                          # whole sample suite
npx playwright test --project=demo -g "@alert"   # one area by tag (@element @dropdown @frame @window ...)
npm run demo:start                         # run the app yourself → http://localhost:4000
npm run coverage:functions                 # which framework functions the suite calls
```

`npm run coverage:functions` scans every public method in `src/actions`, `src/utils`, `src/data`,
`src/api` and `src/locators`, checks each one is called in the sample suite, and writes
`reports/function-coverage.md`. Add `-- --strict` in CI to fail when a new function has no test.

## Project structure

```
├── playwright.config.ts          # projects (chromium/firefox/webkit/edge/mobile/api), reporters, timeouts
├── .env.example                  # environment variables (copy to .env, .env.qa, .env.uat ...)
├── demo-app/                     # bundled QA Demo App (sample application under test)
├── object-repository/            # LOCATORS - one JSON per page  → keys "page.element"
├── test-data/                    # Excel / CSV / JSON / upload files; test-data/<env>/ overrides
├── src/
│   ├── config/env.ts             # typed environment config (TEST_ENV aware)
│   ├── core/                     # PageManager (current tab), global setup/teardown
│   ├── locators/                 # ObjectRepository + LocatorFactory (strategies, frames, fallbacks)
│   ├── actions/                  # ACTION LIBRARIES (see below) + UI facade
│   ├── pages/                    # Page Objects (BasePage, LoginPage, SecureAreaPage)
│   ├── fixtures/baseFixture.ts   # custom test fixtures: ui, testData, api, page objects
│   ├── data/TestDataManager.ts   # TEST DATA LIBRARY
│   ├── utils/                    # Csv/Excel/Json readers, DataGenerator, Date/String/File, Logger, Retry, Encryption
│   ├── api/ApiClient.ts          # REST client + response assertions
│   └── reporters/CustomReporter  # console summary + reports/summary.json
├── tests/
│   ├── ui/                       # page-object & component tests
│   ├── data-driven/              # CSV and Excel driven tests
│   ├── api/                      # API tests
│   ├── demo/                     # SAMPLE SUITE - covers every framework function (QA Demo App)
│   └── framework/                # offline self-check of action libraries
├── scripts/generateSampleExcel.ts / functionCoverage.ts
└── .github/workflows/playwright.yml
```

## Writing a test

```ts
import { test, expect } from '../../src/fixtures/baseFixture';

test('create quote @smoke', async ({ ui, loginPage, testData }) => {
  await loginPage.open();
  await loginPage.login('tomsmith', 'SuperSecretPassword!');
  await ui.element.click('dashboard.newQuote');
  await ui.dropdown.selectByLabel('quote.lineOfBusiness', 'Marine');
  await ui.assert.textContains('quote.status', 'Draft');
});
```

Every action accepts a **Target**: an object-repository key (`'login.username'`), a raw CSS/XPath/Playwright
selector (`'#username'`, `'//button[.="Login"]'`, `'text=Login'`), or a Playwright `Locator`.

## Action libraries (`ui.*`)

| Library | Highlights |
|---|---|
| `ui.element` | click, doubleClick, rightClick, forceClick, jsClick, clickIfVisible, clickAndWaitForNavigation, clickAndWaitForResponse, clickByText, hover, focus, enterText, enterSecureText, typeText, appendText, clearText, clearWithKeyboard, enterTextAndPress, check/uncheck/toggle/setChecked, selectRadioByValue, getText, getInnerText, getAllTexts, getValue, getAttribute, getCssValue, getCount, isVisible/isVisibleWithin/isEnabled/isEditable/exists, scrollIntoView, dragAndDrop, dragAndDropByMouse, dragByOffset, uploadFile, uploadViaFileChooser, download, highlight, screenshot |
| `ui.dropdown` | selectByValue, selectByLabel/VisibleText, selectByIndex, selectByPartialText, selectMultiple, deselectAll, selectRandomOption, getSelectedOption(s), getAllOptions, getOptionCount, isOptionPresent, **selectCustom** (div/li dropdowns), getCustomOptions, **selectAutoSuggest**, selectByKeyboard |
| `ui.alert` | accept, dismiss, getText, answerPrompt, autoAccept, autoDismiss, removeAutoHandler, getHistory |
| `ui.frame` | frame (nested paths), locateIn, click, enterText, getText, selectOption, getBodyText/setBodyText (rich-text editors), getFrameByName/Url/Element, listFrames, waitForFrameLoaded |
| `ui.window` | openNewTab, switchToNewTab, switchToPopup, switchToTabByIndex/Title/Url, switchToMainTab, closeCurrentTab, closeAllOtherTabs, getTabCount, getAllTabTitles/Urls, openIsolatedWindow (2nd user session), resize |
| `ui.browser` | navigateTo, reload, back/forward, title/url, cookies, local/session storage, saveSession, screenshots/PDF, mockResponse, modifyResponse, blockRequests, waitForResponse/Request, captureRequests, captureConsoleErrors, setOffline, geolocation, permissions, colour scheme |
| `ui.wait` | forVisible/Hidden/Attached/Detached/Enabled, forText, forValue, forCount, forAttribute, forSpinner, forPageLoad, forNetworkIdle, forUrl, forTitle, forFunction, until(custom) |
| `ui.assert` | visible, hidden, enabled, disabled, checked, textEquals, textContains, textsEqual, valueEquals, attributeEquals, hasClass, cssEquals, count, titleContains, urlContains, selectedOption, matchesScreenshot (visual), equals, isTrue, contains — every one supports **soft** mode |
| `ui.keyboard` | press, type, insertText, keyDown/Up, tab/enter/escape, selectAll/copy/paste/cut/undo, clipboard, mouse clickAt/moveTo/wheel/drawPath |
| `ui.js` | execute, executeOn, scrollToTop/Bottom/By, scrollElement, scrollUntilEnd, setValue, set/removeAttribute, isInViewport, zoom |
| `ui.table` | getHeaders, getRowCount, getColumnIndex, getCellText (by index or header), getRowTexts, getColumnValues, getTableData (array of objects), findRowIndex, rowWithText, clickInRow, sortBy, isColumnSorted |

**Tab switching works like Selenium:** after `ui.window.switchToNewTab(...)` every library acts on the new tab
until you switch back.

**Alerts:** register the handler around the triggering action:
```ts
const { message } = await ui.alert.accept(() => ui.element.click('page.deleteBtn'));
```

## Object repository

`object-repository/login.json` → keys `login.username`, `login.loginButton`, …

```json
{
  "username":    { "strategy": "id", "value": "username",
                   "fallbacks": [{ "strategy": "label", "value": "Username" }] },
  "loginButton": { "strategy": "role", "value": "button", "options": { "name": "Login" } },
  "rowByName":   { "strategy": "xpath", "value": "//tr[td[text()='{name}']]" },
  "editorBody":  { "strategy": "css", "value": "body", "frames": ["#outerFrame", "#editorFrame"] }
}
```

- Strategies: `css, xpath, id, name, text, exactText, role, label, placeholder, testid, alt, title, playwright`
- `{0}` / `{name}` placeholders → `ui.element.click('grid.rowByName', { params: { name: 'Bob' } })`
  (most methods take `params` as last argument directly)
- `frames` → element is located inside the iframe chain automatically
- `fallbacks` → tried if the primary locator doesn't match (self-healing via `locator.or()`)
- `hasText`, `nth` (`first` / `last` / number) filters
- Sub-folders allowed: `object-repository/policy/quote.json` → `policy/quote.premium`
- Runtime registration: `ObjectRepository.register('key', {...})`

## Test data library

```ts
// JSON (dotted path)
const user = TestDataManager.json('users.json', 'validUser');

// CSV - data-driven (rows with Execute=N skipped)
for (const row of TestDataManager.csv('login-data.csv')) test(row.TestCaseID, async () => { ... });

// Excel - data-driven at collection time
for (const row of TestDataManager.excelSync('Login')) test(row.TestCaseID, async () => { ... });

// Excel - single row inside a test (fixture)
const data = await testData.excel('TC_001', 'TestData');      // sheet, file default testdata.xlsx

// Share values between steps of one test
testData.set('policyNo', no);  testData.get('policyNo');
```

Dynamic tokens resolved automatically in any data file:
`{{random.email}} {{random.firstName}} {{random.lastName}} {{random.phone}} {{random.number}} {{random.uuid}}
{{random.alphanumeric}} {{random.reference:POL}} {{today}} {{today:yyyy-MM-dd}} {{date:+30d}} {{date:-1y:dd-MMM-yyyy}} {{env.VAR}}`

Encrypted secrets: store `ENC(<cipher>)` and set `SECRET_KEY`; see `src/utils/EncryptionUtils.ts`.

Environment overrides: put a file with the same name in `test-data/<TEST_ENV>/`.

## Utilities

| Utility | Purpose |
|---|---|
| `CsvReader` | read (objects), readRaw, getHeaders, filter, findRow, executable, getColumn, write/append |
| `ExcelReader` | readSheet, readSheetSync, readCell, readCellByIndex, getSheetNames, getRowCount, getRowByKey, writeCell, updateRowByKey, writeSheet |
| `JsonReader` | read, get (dotted path), write, update (deep merge) |
| `DataGenerator` | Faker wrappers: names, email, password, phone, address, company, numbers, amounts, dates, uuid, reference, full `user()` |
| `DateUtils` | format (dd/MM/yyyy, MMM, hh:mm a…), today, now, timestamp, addDays/Months/Years, relative('+30d'), parse, daysBetween, nextBusinessDay |
| `StringUtils` | interpolate, random, normalizeSpaces, extractNumber, parseCurrency, formatCurrency, case helpers, mask |
| `FileUtils` | ensureDir, cleanDir, listFiles, latestFile, waitForFile, read/write |
| `retry()` | retry async operations with backoff |
| `EncryptionUtils` | AES-256 encrypt/decrypt, base64 |
| `logger` | winston → console + `logs/execution.log` + `logs/error.log` |

## Running

```bash
npm test                               # chromium + api + demo
npm run test:demo                      # sample suite only (offline)
npm run test:all-browsers              # every project in config
npm run test:smoke                     # @smoke tag
npm run test:regression                # @regression tag
npm run test:api
TEST_ENV=uat npm test                  # loads .env.uat + test-data/uat/
HEADLESS=false SLOW_MO=300 npm test    # watch it run
CHROME_PATH=/path/to/chrome npm test   # use an installed Chrome instead of Playwright's
VIDEO=off npm test                     # video: off | on | retain-on-failure | on-first-retry
npx playwright test -g "TC_LOGIN_02"   # single test
```

Reports: `reports/html` (Playwright HTML with steps, screenshots, video, trace on failure),
`reports/junit/results.xml`, `reports/json/results.json`, `reports/summary.json`, logs in `logs/`.

Login once and reuse the session: `SAVE_AUTH=true npm test`, then in a spec
`test.use({ storageState: '.auth/user.json' })`.

## Adding a new page

1. `object-repository/quote.json` with the page's locators
2. `src/pages/QuotePage.ts` extends `BasePage` (`repo = 'quote'`, `path = '/quote'`)
3. Register a fixture in `src/fixtures/baseFixture.ts` → use `quotePage` in tests
