import * as fs from 'fs';
import * as path from 'path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface Row {
  title: string;
  file: string;
  project: string;
  status: string;
  durationMs: number;
  retry: number;
  error?: string;
}

/**
 * Minimal custom reporter: prints a summary table and writes reports/summary.json
 * (easy to push to a dashboard, Teams/Slack webhook, Jira/Xray etc.).
 */
export default class CustomReporter implements Reporter {
  private rows: Row[] = [];
  private start = Date.now();

  onTestEnd(test: TestCase, result: TestResult): void {
    this.rows.push({
      title: test.titlePath().slice(2).join(' › '),
      file: path.basename(test.location.file),
      project: test.parent.project()?.name ?? '',
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      error: result.error?.message?.split('\n')[0],
    });
  }

  onEnd(result: FullResult): void {
    // keep only final attempt of each test
    const final = new Map<string, Row>();
    for (const r of this.rows) final.set(`${r.project}|${r.file}|${r.title}`, r);
    const rows = [...final.values()];
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    const summary = {
      status: result.status,
      total: rows.length,
      passed: count('passed'),
      failed: count('failed') + count('timedOut'),
      skipped: count('skipped'),
      flaky: rows.filter((r) => r.status === 'passed' && r.retry > 0).length,
      durationSec: Math.round((Date.now() - this.start) / 1000),
      env: process.env.TEST_ENV ?? 'qa',
      finishedAt: new Date().toISOString(),
      tests: rows,
    };
    const out = path.resolve('reports', 'summary.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(summary, null, 2));

    if (!rows.length) return;
    console.log('\n──────────── Execution Summary ────────────');
    console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped} | Flaky: ${summary.flaky}`);
    console.log(`Duration: ${summary.durationSec}s | Summary: ${out}`);
    console.log('───────────────────────────────────────────\n');
  }

  printsToStdio(): boolean {
    return false;
  }
}
