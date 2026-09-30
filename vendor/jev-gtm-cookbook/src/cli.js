#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR, DB_PATH, ROOT, loadEnv, loadIcp } from './config.js';
import { openDb } from './db.js';
import { importCsv, judge, runOnce } from './pipeline.js';
import { listChanges, listPeople, scoredCsv, summary, usd } from './views.js';
import { startServer } from './server.js';
import { PROVIDERS, enrich } from './enrich.js';
import { fitScore } from './score.js';

const HELP = `jev-gtm-cookbook: score your connections against your ICP and watch for job changes.

  node src/cli.js demo            Try it with made-up sample data. No key needed.
  node src/cli.js score <csv>     Score a LinkedIn Connections.csv and write data/scored-connections.csv
  node src/cli.js import <csv>    Import a LinkedIn Connections.csv without judging yet
  node src/cli.js run             Import any new CSV in data/ and judge what changed
  node src/cli.js status          Show the top fits and the latest signals
  node src/cli.js enrich <provider> [--limit 100] [--max-age-days 30] [--min-fit 60]
                                  Refresh titles from prospeo, leadmagic, blitz or moltsets, then judge what changed
  node src/cli.js serve           Open the dashboard on http://localhost:4173
`;

function printRun(r) {
  console.log(`\nJev calls: ${r.judged}   reused saved answers: ${r.reused}   skipped for free: ${r.skipped}`);
  console.log(`Input tokens: ${r.input_tokens.toLocaleString()}   cost: $${usd(r.input_tokens).toFixed(4)}`);
  for (const e of new Set(r.errors)) console.log(`  error: ${e}`);
}

function printStatus(db, icp, env) {
  const s = summary(db, icp, env);
  console.log(`\n${s.people} connections, ${s.snapshots} snapshot(s), mode: ${s.mode}${s.mode === 'mock' ? ' (answers are made up)' : ''}`);
  console.log(`Total so far: ${s.jev_calls} Jev calls, $${s.cost_usd.toFixed(4)}`);
  console.log('\nTop fits:');
  for (const p of listPeople(db, icp).filter((p) => p.fit !== null).slice(0, 8)) {
    console.log(`  ${String(p.fit).padStart(3)}  ${p.name} - ${p.position} @ ${p.company}  [${p.persona}]`);
  }
  const signals = listChanges(db, icp).filter((c) => c.action !== 'ignore');
  console.log(`\nSignals (${signals.length}):`);
  for (const c of signals.slice(0, 12)) {
    const moved = c.kind === 'new_connection' ? `${c.to.position} @ ${c.to.company}`
      : `${c.from.position} @ ${c.from.company}  ->  ${c.to.position} @ ${c.to.company}`;
    console.log(`  ${c.action.toUpperCase().padEnd(9)} ${c.name}: ${moved}\n            ${c.reason}`);
  }
}

const [command, arg] = process.argv.slice(2);
const env = loadEnv();
const icp = loadIcp();

if (command === 'demo') {
  // Two made-up exports a week apart, judged with made-up answers, in a throwaway database.
  const file = path.join(DATA_DIR, 'demo.db');
  for (const suffix of ['', '-wal', '-shm']) rmSync(file + suffix, { force: true });
  const db = openDb(file);
  const demoEnv = { ...env, mock: true };
  for (const name of ['connections.sample.csv', 'connections.sample.week2.csv']) {
    const result = importCsv(db, readFileSync(path.join(ROOT, 'examples', name), 'utf8'), name);
    console.log(`\n== ${name}: ${result.imported} connections, ${result.changes} changes detected by code`);
    printRun({ errors: [], ...(await judge(db, icp, demoEnv)) });
  }
  printStatus(db, icp, demoEnv);
  console.log('\nThat was mock mode. Add TYPESAFE_API_KEY to .env and run "node src/cli.js run" for real answers.');
} else if (command === 'score') {
  // The shortest path: one export in, one scored spreadsheet out.
  if (!arg || !existsSync(arg)) {
    console.log('Usage: node src/cli.js score path/to/Connections.csv\nHow to get that file: docs/export-your-connections.md');
    process.exit(1);
  }
  if (env.mock) console.log('No TYPESAFE_API_KEY found: running in MOCK MODE, answers are made up.');
  const db = openDb(DB_PATH);
  const result = importCsv(db, readFileSync(arg, 'utf8'), path.basename(arg));
  console.log(result.duplicate ? 'This exact file was already imported; scoring what is there.'
    : `Imported ${result.imported} connections, ${result.changes} changes since your last import.`);
  const started = Date.now();
  printRun({ errors: [], ...(await judge(db, icp, env, console.log)) });
  console.log(`Time: ${((Date.now() - started) / 1000).toFixed(1)}s`);
  const out = path.join(DATA_DIR, 'scored-connections.csv');
  writeFileSync(out, scoredCsv(db, icp));
  printStatus(db, icp, env);
  console.log(`\nScored spreadsheet: ${out}\nDashboard: npm start`);
} else if (command === 'import' && arg) {
  const result = importCsv(openDb(DB_PATH), readFileSync(arg, 'utf8'), path.basename(arg));
  console.log(result.duplicate ? 'Already imported (same file).' : `Imported ${result.imported} connections, ${result.changes} changes.`);
} else if (command === 'run') {
  if (env.mock) console.log('No TYPESAFE_API_KEY found: running in MOCK MODE, answers are made up.');
  const db = openDb(DB_PATH);
  printRun(await runOnce(db, icp, env, { dataDir: DATA_DIR, log: console.log }));
  printStatus(db, icp, env);
} else if (command === 'enrich') {
  const opt = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? Number(process.argv[i + 1]) : fallback; };
  const provider = arg;
  if (!PROVIDERS[provider]) { console.log(`Usage: node src/cli.js enrich <${Object.keys(PROVIDERS).join('|')}> [--limit 100] [--max-age-days 30] [--min-fit 60]`); process.exit(1); }
  const db = openDb(DB_PATH);
  // With --min-fit, spend credits on people who already score well from their last title.
  const fits = new Map(listPeople(db, icp).map((p) => [p.key, p.fit]));
  const started = Date.now();
  const r = await enrich(db, { provider, apiKey: process.env[PROVIDERS[provider].env], limit: opt('limit', 100),
    maxAgeDays: opt('max-age-days', 30), minFit: opt('min-fit', null), fitOf: (p) => fits.get(p.key), log: console.log });
  console.log(`\nLooked up ${r.looked_up} of ${r.candidates}: ${r.found} found (${r.unchanged} unchanged since last time), ${r.not_found} not found, ${r.changes} job changes.`);
  for (const e of new Set(r.errors)) console.log(`  error: ${e}`);
  printRun({ errors: [], ...(await judge(db, icp, env, console.log)) });
  console.log(`Time: ${((Date.now() - started) / 1000).toFixed(1)}s`);
  printStatus(db, icp, env);
} else if (command === 'status') {
  printStatus(openDb(DB_PATH), icp, env);
} else if (command === 'serve') {
  startServer(openDb(DB_PATH), env);
} else {
  console.log(HELP);
}
