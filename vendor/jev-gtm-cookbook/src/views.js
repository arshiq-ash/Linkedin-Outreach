import { USD_PER_MILLION_INPUT_TOKENS } from './config.js';
import { fitParts, fitScore, routeChange } from './score.js';

const parse = (row) => (row?.answers ? JSON.parse(row.answers) : null);
const name = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)';
// The export is user-supplied text; never let it become a javascript: link in the dashboard.
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);
export const usd = (tokens) => (tokens / 1_000_000) * USD_PER_MILLION_INPUT_TOKENS;

export function listPeople(db, icp) {
  const rows = db.prepare(`SELECT p.*, j.answers FROM people p
    LEFT JOIN judgments j ON j.fingerprint = p.fingerprint`).all();
  return rows.map((r) => {
    const answers = parse(r);
    return {
      key: r.key, name: name(r), url: safeUrl(r.url), company: r.company, position: r.position,
      connected_on: r.connected_on, skipped: r.skipped,
      fit: answers ? fitScore(answers, icp.weights) : null,
      parts: answers ? fitParts(answers) : null,
      persona: answers?.persona.choice ?? null,
      persona_confidence: answers?.persona.confidence ?? null,
    };
  }).sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}

export function listChanges(db, icp) {
  const rows = db.prepare(`SELECT c.*, p.first_name, p.last_name, p.url, j.answers FROM changes c
    JOIN people p ON p.key = c.person_key
    LEFT JOIN judgments j ON j.fingerprint = c.fingerprint
    ORDER BY c.id DESC`).all();
  const order = { reach_out: 0, review: 1, pending: 2, ignore: 3 };
  return rows.map((r) => {
    const answers = parse(r);
    // A role change whose saved answer has no change questions is still waiting to be judged.
    const ready = answers && (r.kind === 'new_connection' || answers.change_type);
    const routed = ready ? routeChange(r, answers, icp) : { action: 'pending', reason: 'Not judged yet' };
    return {
      id: r.id, name: name(r), url: safeUrl(r.url), kind: r.kind, status: r.status, detected_at: r.detected_at,
      from: { position: r.prev_position, company: r.prev_company },
      to: { position: r.new_position, company: r.new_company },
      change_type: answers?.change_type?.choice ?? null,
      ...routed,
    };
  }).sort((a, b) => order[a.action] - order[b.action] || b.id - a.id);
}

export function summary(db, icp, env) {
  const one = (sql) => Object.values(db.prepare(sql).get())[0] ?? 0;
  const real = `FROM judgments WHERE model ${env.mock ? '' : 'NOT '}LIKE 'mock%'`;
  const tokens = one(`SELECT SUM(input_tokens) ${real}`);
  const changes = listChanges(db, icp).filter((c) => c.status === 'new');
  return {
    mode: env.mock ? 'mock' : 'jev',
    model: env.model,
    icp_source: icp.source,
    people: one('SELECT COUNT(*) FROM people'),
    skipped: one('SELECT COUNT(*) FROM people WHERE skipped IS NOT NULL'),
    snapshots: one('SELECT COUNT(*) FROM snapshots'),
    jev_calls: one(`SELECT COUNT(*) ${real}`),
    input_tokens: tokens,
    cost_usd: usd(tokens),
    reach_out: changes.filter((c) => c.action === 'reach_out').length,
    review: changes.filter((c) => c.action === 'review').length,
    last_run: db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get() ?? null,
  };
}

// A spreadsheet-friendly copy of the results. Written locally; nothing is uploaded.
export function scoredCsv(db, icp) {
  const pct = (v) => (v == null ? '' : Math.round(v * 100));
  // Leading = + - @ would run as a formula in Excel or Sheets, so neutralise it.
  const cell = (v) => {
    let t = String(v ?? '');
    if (/^[=+\-@]/.test(t)) t = `'${t}`;
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const header = ['Fit (0-100)', 'Name', 'Position', 'Company', 'Group', 'Role fit %', 'Seniority %',
    'Likely buyer %', 'Company fit %', 'Skipped (free)', 'Connected on', 'URL'];
  const rows = listPeople(db, icp).map((p) => [p.fit ?? '', p.name, p.position, p.company, p.persona ?? '',
    pct(p.parts?.role_fit), pct(p.parts?.seniority), pct(p.parts?.likely_buyer), pct(p.parts?.company_fit),
    p.skipped ?? '', p.connected_on, p.url ?? '']);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
