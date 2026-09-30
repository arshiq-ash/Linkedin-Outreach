import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY, imported_at TEXT NOT NULL, source_file TEXT, file_hash TEXT UNIQUE, row_count INTEGER
);
-- Facts we observed. Never sent anywhere.
CREATE TABLE IF NOT EXISTS people (
  key TEXT PRIMARY KEY, first_name TEXT, last_name TEXT, url TEXT, email TEXT,
  company TEXT, position TEXT, connected_on TEXT,
  first_seen INTEGER, last_seen INTEGER,
  fingerprint TEXT, skipped TEXT
);
CREATE TABLE IF NOT EXISTS changes (
  id INTEGER PRIMARY KEY, person_key TEXT NOT NULL, snapshot_id INTEGER NOT NULL, kind TEXT NOT NULL,
  prev_company TEXT, prev_position TEXT, new_company TEXT, new_position TEXT,
  detected_at TEXT NOT NULL, fingerprint TEXT, status TEXT NOT NULL DEFAULT 'new'
);
-- What Jev inferred, saved against the fingerprint of what it was shown.
CREATE TABLE IF NOT EXISTS judgments (
  fingerprint TEXT PRIMARY KEY, model TEXT, answers TEXT NOT NULL, input_tokens INTEGER, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY, started_at TEXT, finished_at TEXT, mode TEXT,
  imported INTEGER DEFAULT 0, changes INTEGER DEFAULT 0, judged INTEGER DEFAULT 0,
  reused INTEGER DEFAULT 0, skipped INTEGER DEFAULT 0, input_tokens INTEGER DEFAULT 0, errors TEXT
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
-- What an enrichment provider returned, with a fingerprint of the parts we use, so a
-- re-enrichment that finds nothing new is recognised as "unchanged".
CREATE TABLE IF NOT EXISTS enrichments (
  id INTEGER PRIMARY KEY, person_key TEXT NOT NULL, provider TEXT NOT NULL, fetched_at TEXT NOT NULL,
  found INTEGER NOT NULL, fingerprint TEXT, result TEXT
);
CREATE INDEX IF NOT EXISTS enrichments_person ON enrichments(person_key, fetched_at);
CREATE INDEX IF NOT EXISTS changes_person ON changes(person_key);
`;

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  // Databases created before enrichment existed lack this column.
  const cols = db.prepare('PRAGMA table_info(people)').all().map((c) => c.name);
  if (!cols.includes('company_description')) db.exec('ALTER TABLE people ADD COLUMN company_description TEXT');
  return db;
}

export function getSetting(db, key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : fallback;
}

export function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}
