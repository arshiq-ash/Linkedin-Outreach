import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { readList, sameText } from './csv.js';
import { buildQuestions, buildState, fingerprint } from './questions.js';
import { askJev, pool } from './jev.js';
import { mockJev } from './mock.js';
import { icpHash } from './config.js';

const now = () => new Date().toISOString();

// Step 1 + 3: store the snapshot and compare it with what we already knew.
// Pure code. No model involved in noticing that something changed.
export function importCsv(db, text, sourceFile = 'upload.csv') {
  const fileHash = createHash('sha256').update(text).digest('hex');
  if (db.prepare('SELECT id FROM snapshots WHERE file_hash = ?').get(fileHash)) {
    return { duplicate: true, imported: 0, changes: 0 };
  }
  return applySnapshot(db, readList(text), sourceFile, fileHash);
}

// Store one snapshot of rows and diff it against what we knew. Used by CSV imports
// and by enrichment, so both get the same change detection.
export function applySnapshot(db, rows, sourceFile, fileHash) {
  const isFirst = !db.prepare('SELECT id FROM snapshots LIMIT 1').get();
  const getPerson = db.prepare('SELECT * FROM people WHERE key = ?');
  const addChange = db.prepare(`INSERT INTO changes
    (person_key, snapshot_id, kind, prev_company, prev_position, new_company, new_position, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  let changes = 0;

  db.exec('BEGIN');
  try {
    const snapshotId = db.prepare('INSERT INTO snapshots (imported_at, source_file, file_hash, row_count) VALUES (?, ?, ?, ?)')
      .run(now(), sourceFile, fileHash, rows.length).lastInsertRowid;

    for (const p of rows) {
      const known = getPerson.get(p.key);
      if (!known) {
        db.prepare(`INSERT INTO people (key, first_name, last_name, url, email, company, position, connected_on, first_seen, last_seen, company_description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(p.key, p.first_name, p.last_name, p.url, p.email, p.company, p.position, p.connected_on, snapshotId, snapshotId, p.company_description ?? null);
        // Everyone is "new" in the first import, so that is a baseline, not a signal.
        if (!isFirst) { addChange.run(p.key, snapshotId, 'new_connection', null, null, p.company, p.position, now()); changes++; }
        continue;
      }
      // Enrichment can add a company description; that is context, not a job change.
      if (p.company_description) db.prepare('UPDATE people SET company_description = ? WHERE key = ?').run(p.company_description, p.key);
      // A blank row usually means the person hid the field, not that they quit.
      const blank = !p.company && !p.position;
      const companyChanged = !blank && !sameText(known.company, p.company);
      const positionChanged = !blank && !sameText(known.position, p.position);
      if (companyChanged || positionChanged) {
        addChange.run(p.key, snapshotId, companyChanged ? 'company_change' : 'role_change',
          known.company, known.position, p.company, p.position, now());
        changes++;
        db.prepare('UPDATE people SET company = ?, position = ?, fingerprint = NULL, skipped = NULL, last_seen = ? WHERE key = ?')
          .run(p.company, p.position, snapshotId, p.key);
      } else {
        db.prepare('UPDATE people SET last_seen = ? WHERE key = ?').run(snapshotId, p.key);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { duplicate: false, imported: rows.length, changes };
}

// The free filter. Anything caught here never costs a Jev call.
export function skipReason(person, icp) {
  if (!person.company && !person.position) return 'no role or company listed';
  const title = (person.position || '').toLowerCase();
  const hit = (icp.skip_if_title_matches || []).find((word) => title.includes(word.toLowerCase()));
  return hit ? `title contains "${hit}"` : null;
}

// Step 2 + 4: ask Jev, but only about records whose fingerprint has no saved answer.
export async function judge(db, icp, env, log = () => {}) {
  const stats = { judged: 0, reused: 0, skipped: 0, input_tokens: 0, errors: [] };
  const hash = icpHash(icp);
  // Made-up answers must never be mistaken for real ones once a key is added.
  const model = env.mock ? 'mock' : env.model;
  const lastRoleChange = db.prepare(`SELECT * FROM changes WHERE person_key = ? AND kind != 'new_connection' ORDER BY id DESC LIMIT 1`);
  const lastChange = db.prepare('SELECT id FROM changes WHERE person_key = ? ORDER BY id DESC LIMIT 1');
  const hasAnswer = db.prepare('SELECT 1 FROM judgments WHERE fingerprint = ?');
  const jobs = new Map(); // fingerprint -> one request, however many people share it

  for (const person of db.prepare('SELECT * FROM people').all()) {
    const reason = skipReason(person, icp);
    db.prepare('UPDATE people SET skipped = ? WHERE key = ?').run(reason, person.key);
    if (reason) { stats.skipped++; continue; }

    // If we have seen this person change jobs, Jev gets the before and after together.
    const change = lastRoleChange.get(person.key);
    const current = { position: person.position, company: person.company, company_description: person.company_description };
    const previous = change ? { position: change.prev_position, company: change.prev_company } : null;
    const fp = fingerprint({ icpHash: hash, model, current, previous });

    db.prepare('UPDATE people SET fingerprint = ? WHERE key = ?').run(fp, person.key);
    db.prepare('UPDATE changes SET fingerprint = ? WHERE person_key = ? AND (fingerprint IS NULL OR id IN (?, ?))')
      .run(fp, person.key, change?.id ?? -1, lastChange.get(person.key)?.id ?? -1);

    if (hasAnswer.get(fp)) { stats.reused++; continue; }
    if (jobs.has(fp)) { stats.reused++; continue; }
    jobs.set(fp, { fp, current, previous });
  }

  const save = db.prepare('INSERT OR REPLACE INTO judgments (fingerprint, model, answers, input_tokens, created_at) VALUES (?, ?, ?, ?, ?)');
  let done = 0;
  await pool([...jobs.values()], 4, async (job) => {
    const request = { state: buildState(icp, job.current, job.previous), questions: buildQuestions(icp, Boolean(job.previous)) };
    try {
      const res = env.mock ? mockJev(request) : await askJev({ apiKey: env.apiKey, model: env.model, ...request });
      save.run(job.fp, res.model, JSON.stringify(res.answers), res.usage?.input_tokens ?? 0, now());
      stats.judged++;
      stats.input_tokens += res.usage?.input_tokens ?? 0;
    } catch (err) {
      stats.errors.push(err.message);
      if (err.status === 401) throw err; // a bad key fails every call, so stop early
    }
    if (++done % 25 === 0) log(`  judged ${done}/${jobs.size}`);
  });
  return stats;
}

// One full pass: pick up any new CSV in data/, then judge what needs judging.
export async function runOnce(db, icp, env, { dataDir, log = () => {} } = {}) {
  const runId = db.prepare('INSERT INTO runs (started_at, mode) VALUES (?, ?)').run(now(), env.mock ? 'mock' : 'jev').lastInsertRowid;
  const totals = { imported: 0, changes: 0 };
  const errors = [];
  if (dataDir) {
    const files = readdirSync(dataDir).filter((f) => f.toLowerCase().endsWith('.csv'))
      .map((f) => path.join(dataDir, f)).sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
    for (const file of files) {
      try {
        const result = importCsv(db, readFileSync(file, 'utf8'), path.basename(file));
        if (result.duplicate) continue;
        log(`Imported ${path.basename(file)}: ${result.imported} connections, ${result.changes} changes`);
        totals.imported += result.imported;
        totals.changes += result.changes;
      } catch (err) { errors.push(`${path.basename(file)}: ${err.message}`); }
    }
  }
  let stats = { judged: 0, reused: 0, skipped: 0, input_tokens: 0, errors: [] };
  try { stats = await judge(db, icp, env, log); } catch (err) { errors.push(err.message); }
  errors.push(...stats.errors);
  db.prepare(`UPDATE runs SET finished_at = ?, imported = ?, changes = ?, judged = ?, reused = ?, skipped = ?, input_tokens = ?, errors = ? WHERE id = ?`)
    .run(now(), totals.imported, totals.changes, stats.judged, stats.reused, stats.skipped, stats.input_tokens,
      errors.length ? JSON.stringify([...new Set(errors)].slice(0, 5)) : null, runId);
  return { runId, ...totals, ...stats, errors };
}
