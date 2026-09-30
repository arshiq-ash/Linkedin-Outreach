import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const DB_PATH = process.env.JEV_GTM_COOKBOOK_DB || path.join(DATA_DIR, 'jev-gtm-cookbook.db');

// Jev charges per input token; output tokens are free. Check https://docs.typesafe.ai/models
export const USD_PER_MILLION_INPUT_TOKENS = 0.042;

export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
  return {
    apiKey: process.env.TYPESAFE_API_KEY || '',
    model: process.env.JEV_MODEL || 'jev-latest',
    port: Number(process.env.PORT) || 4173,
    mock: process.env.JEV_MOCK === '1' || !process.env.TYPESAFE_API_KEY,
  };
}

export function loadIcp() {
  const own = path.join(ROOT, 'icp.json');
  const file = existsSync(own) ? own : path.join(ROOT, 'icp.example.json');
  const icp = JSON.parse(readFileSync(file, 'utf8'));
  icp.source = path.basename(file);
  return icp;
}

// Only the parts of the ICP that Jev actually reads. Weights and cutoffs are
// applied in code, so changing them must not invalidate saved answers.
export function icpHash(icp) {
  const seen = JSON.stringify([icp.ideal_customer, icp.personas]);
  return createHash('sha256').update(seen).digest('hex').slice(0, 16);
}
