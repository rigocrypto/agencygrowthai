#!/usr/bin/env node
/*
Compares a Playwright JSON report against the named baseline in tests/known-failures.ts.

Exit codes
  0  the run matches the baseline exactly
  1  a test outside the baseline failed        -> regression
  1  a baselined test passed                   -> baseline is stale, remove the entry

Usage
  npx playwright test --config=playwright.prod.config.ts --reporter=json > report.json
  node scripts/check-baseline.mjs report.json
*/

import { readFileSync } from 'node:fs';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('usage: node scripts/check-baseline.mjs <playwright-json-report>');
  process.exit(2);
}

// The baseline is TypeScript but contains only data; pull the titles out directly rather
// than adding a build step for one array.
const baselineSource = readFileSync(new URL('../tests/known-failures.ts', import.meta.url), 'utf8');
const known = new Set([...baselineSource.matchAll(/\{\s*title:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]));

const report = JSON.parse(readFileSync(reportPath, 'utf8'));

const results = [];
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    const failed = spec.tests?.some((t) => t.status !== 'expected' && t.status !== 'skipped');
    results.push({ title: spec.title, failed: Boolean(failed) });
  }
  for (const child of suite.suites ?? []) walk(child);
};
for (const suite of report.suites ?? []) walk(suite);

if (results.length === 0) {
  console.error('the report contained no test results');
  process.exit(2);
}

const regressions = results.filter((r) => r.failed && !known.has(r.title));
const fixed = results.filter((r) => !r.failed && known.has(r.title));
const stillFailing = results.filter((r) => r.failed && known.has(r.title));
const missing = [...known].filter((title) => !results.some((r) => r.title === title));

console.log(`total ${results.length}  ·  baseline ${known.size}  ·  still failing ${stillFailing.length}`);

if (regressions.length) {
  console.error(`\nREGRESSION — ${regressions.length} test(s) failed that are not in the baseline:`);
  for (const r of regressions) console.error(`  ${r.title}`);
}

if (fixed.length) {
  console.error(`\nSTALE BASELINE — ${fixed.length} baselined test(s) now pass. Remove them from tests/known-failures.ts:`);
  for (const r of fixed) console.error(`  ${r.title}`);
}

if (missing.length) {
  console.error(`\nSTALE BASELINE — ${missing.length} baselined test(s) no longer exist:`);
  for (const title of missing) console.error(`  ${title}`);
}

const ok = !regressions.length && !fixed.length && !missing.length;
console.log(ok ? '\nbaseline matches' : '');
process.exit(ok ? 0 : 1);
