/**
 * Function coverage report for the framework's own libraries.
 * Lists every public method of the action libraries, utilities, data manager and API client,
 * and checks each one is called somewhere in the sample suite (tests/demo + demo page objects).
 *
 *   npm run coverage:functions            → prints table, writes reports/function-coverage.md
 *   npm run coverage:functions -- --strict → exits 1 if anything is uncovered (use in CI)
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');

/** source file → how the methods are called in tests (accessor regex prefix) */
const targets: { file: string; label: string; callPrefix: string }[] = [
  { file: 'src/actions/ElementActions.ts', label: 'ui.element', callPrefix: '\\.element\\.' },
  { file: 'src/actions/DropdownActions.ts', label: 'ui.dropdown', callPrefix: '\\.dropdown\\.' },
  { file: 'src/actions/AlertActions.ts', label: 'ui.alert', callPrefix: '\\.alert\\.' },
  { file: 'src/actions/FrameActions.ts', label: 'ui.frame', callPrefix: '\\.frame\\.' },
  { file: 'src/actions/WindowActions.ts', label: 'ui.window', callPrefix: '\\.window\\.' },
  { file: 'src/actions/BrowserActions.ts', label: 'ui.browser', callPrefix: '\\.browser\\.' },
  { file: 'src/actions/WaitActions.ts', label: 'ui.wait', callPrefix: '\\.wait\\.' },
  { file: 'src/actions/AssertActions.ts', label: 'ui.assert', callPrefix: '\\.assert\\.' },
  { file: 'src/actions/KeyboardMouseActions.ts', label: 'ui.keyboard', callPrefix: '\\.keyboard\\.' },
  { file: 'src/actions/JavaScriptActions.ts', label: 'ui.js', callPrefix: '\\.js\\.' },
  { file: 'src/actions/TableActions.ts', label: 'ui.table', callPrefix: '\\.table\\.' },
  { file: 'src/data/TestDataManager.ts', label: 'TestDataManager / testData', callPrefix: '(TestDataManager|testData)\\.' },
  { file: 'src/utils/CsvReader.ts', label: 'CsvReader', callPrefix: 'CsvReader\\.' },
  { file: 'src/utils/ExcelReader.ts', label: 'ExcelReader', callPrefix: 'ExcelReader\\.' },
  { file: 'src/utils/JsonReader.ts', label: 'JsonReader', callPrefix: 'JsonReader\\.' },
  { file: 'src/utils/DataGenerator.ts', label: 'DataGenerator', callPrefix: 'DataGenerator\\.' },
  { file: 'src/utils/DateUtils.ts', label: 'DateUtils', callPrefix: 'DateUtils\\.' },
  { file: 'src/utils/StringUtils.ts', label: 'StringUtils', callPrefix: 'StringUtils\\.' },
  { file: 'src/utils/FileUtils.ts', label: 'FileUtils', callPrefix: 'FileUtils\\.' },
  { file: 'src/utils/EncryptionUtils.ts', label: 'EncryptionUtils', callPrefix: 'EncryptionUtils\\.' },
  { file: 'src/api/ApiClient.ts', label: 'ApiClient / demoApi', callPrefix: '(ApiClient|demoApi|api|client)\\.' },
  { file: 'src/locators/ObjectRepository.ts', label: 'ObjectRepository', callPrefix: 'ObjectRepository\\.' },
  { file: 'src/locators/LocatorFactory.ts', label: 'LocatorFactory', callPrefix: 'LocatorFactory\\.' },
];

const SKIP = new Set(['constructor', 'if', 'for', 'while', 'switch', 'catch', 'return', 'function']);

function publicMethods(src: string): string[] {
  const names = new Set<string>();
  // class methods: "  async name(", "  name<T>(", "  static name(", "  static async name("
  const methodRe = /^ {2}(?:static\s+)?(?:async\s+)?([a-zA-Z]\w*)\s*(?:<[^>(]*>)?\s*\(/gm;
  // arrow-function statics: "  static name = (" / "  static name = <T>("
  const arrowRe = /^ {2}static\s+([a-zA-Z]\w*)\s*=\s*(?:<[^>]*>)?\s*\(/gm;
  for (const re of [methodRe, arrowRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const lineStart = src.lastIndexOf('\n', m.index) + 1;
      const line = src.slice(lineStart, src.indexOf('\n', m.index));
      if (/^\s*(private|protected)\b/.test(line) || SKIP.has(m[1])) continue;
      names.add(m[1]);
    }
  }
  return [...names];
}

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? collectFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

const suite = [...collectFiles(path.join(root, 'tests/demo')), ...collectFiles(path.join(root, 'src/pages/demo'))]
  .map((f) => fs.readFileSync(f, 'utf-8'))
  .join('\n');

let total = 0;
let covered = 0;
const lines: string[] = ['# Function coverage (sample suite: tests/demo)', '', '| Library | Covered | Missing |', '|---|---|---|'];
const missingAll: string[] = [];

for (const t of targets) {
  const methods = publicMethods(fs.readFileSync(path.join(root, t.file), 'utf-8'));
  const missing = methods.filter((m) => !new RegExp(`${t.callPrefix}${m}\\b`).test(suite));
  total += methods.length;
  covered += methods.length - missing.length;
  missing.forEach((m) => missingAll.push(`${t.label}.${m}`));
  lines.push(`| ${t.label} | ${methods.length - missing.length}/${methods.length} | ${missing.join(', ') || '—'} |`);
}

const pct = ((covered / total) * 100).toFixed(1);
lines.push('', `**Total: ${covered}/${total} functions (${pct}%)**`);
const out = path.join(root, 'reports', 'function-coverage.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));

console.log(lines.join('\n'));
if (missingAll.length && process.argv.includes('--strict')) {
  console.error(`\nUncovered: ${missingAll.join(', ')}`);
  process.exit(1);
}
