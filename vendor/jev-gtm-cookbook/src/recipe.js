#!/usr/bin/env node
// Runs a cookbook request file against Jev and prints the answers.
//   node src/recipe.js cookbook/requests/03-reply-classification.json          replay saved responses (no key needed)
//   node src/recipe.js cookbook/requests/03-reply-classification.json --live   call Jev and refresh the saved responses
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadEnv } from './config.js';
import { askJev } from './jev.js';

const [file, flag] = process.argv.slice(2);
if (!file) { console.log('Usage: node src/recipe.js cookbook/requests/<recipe>.json [--live]'); process.exit(1); }
const recipe = JSON.parse(readFileSync(file, 'utf8'));
const saved = path.join(ROOT, 'cookbook/responses', path.basename(file));
const cache = existsSync(saved) ? JSON.parse(readFileSync(saved, 'utf8')) : {};
const env = loadEnv();
const live = flag === '--live';
if (live && env.mock) { console.log('--live needs TYPESAFE_API_KEY in .env'); process.exit(1); }

const fmt = (a) => a.type === 'noul' ? `${Math.round(a.noul * 100)}% yes`
  : a.type === 'choice' ? `${a.choice} (confidence ${a.confidence.toFixed(2)})`
  : `${a.score.toFixed(2)} of ${Object.keys(a.probabilities).length - 1} (confidence ${a.confidence.toFixed(2)})`;

let tokens = 0;
for (const c of recipe.cases) {
  let res = cache[c.label];
  if (live || !res) {
    if (!live) { console.log(`${c.label}: no saved response; run with --live`); continue; }
    const t = Date.now();
    res = await askJev({ apiKey: env.apiKey, model: env.model, state: c.state, questions: recipe.questions });
    res.ms = Date.now() - t;
    res.date = new Date().toISOString().slice(0, 10);
    cache[c.label] = res;
  }
  tokens += res.usage?.input_tokens ?? 0;
  console.log(`\n${c.label}${c.expect ? `   (expected: ${c.expect})` : ''}`);
  for (const [k, a] of Object.entries(res.answers)) console.log(`  ${k.padEnd(22)} ${fmt(a)}`);
}
if (live) writeFileSync(saved, JSON.stringify(cache, null, 2) + '\n');
console.log(`\n${recipe.cases.length} cases, ${tokens.toLocaleString()} input tokens, $${(tokens / 1e6 * 0.042).toFixed(5)}${live ? '' : ' (replayed from cookbook/responses)'}`);
