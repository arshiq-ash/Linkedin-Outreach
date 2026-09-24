// Human-in-the-loop outreach: builds today's short list of connection requests with
// personalised notes. It never touches LinkedIn. You open each profile and click Connect yourself,
// so the account's activity stays human while the research and writing are done for you.
//
//   npm run queue                  -> writes outreach/queue/<date>.html from outreach/prospects.csv
//   npm run queue -- --mark-sent   -> marks today's queued prospects as invited (run after sending)
//
// Caps are deliberately below LinkedIn's weekly invite limit, with room to spare.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib.mjs";

const DAILY_CAP = Number(process.env.DAILY_CAP || 15);
const WEEKLY_CAP = Number(process.env.WEEKLY_CAP || 80);
const CSV = path.join(ROOT, "outreach/prospects.csv");
const QUEUE_DIR = path.join(ROOT, "outreach/queue");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());

// Connection notes stay under 200 characters, the limit for notes on a free account.
const NOTES = {
  logistics: (p) =>
    `Hi ${p.first_name}, ${p.hook || `saw your work at ${p.company}`}. I run a CX ops team that supports delivery companies (90–100 calls/agent/day). Would love to connect.`,
  robotics: (p) =>
    `Hi ${p.first_name}, ${p.hook || `${p.company} caught my eye`}. We built a 15-person 24/7 pre + after-sales team for a robotics brand. Always keen to swap notes with hardware folks.`,
  dtc: (p) =>
    `Hi ${p.first_name}, ${p.hook || `love what ${p.company} is building`}. I help DTC brands run WISMO/returns support 24/7. No pitch, just like connecting with good operators.`,
};

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.some(Boolean));
  return { head, rows: body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""]))) };
}
const toCsv = (head, rows) =>
  [head, ...rows.map((r) => head.map((h) => r[h] ?? ""))]
    .map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))
    .join("\n") + "\n";

if (!fs.existsSync(CSV)) {
  fs.copyFileSync(path.join(ROOT, "outreach/prospects.example.csv"), CSV);
  console.log("Created outreach/prospects.csv from the example. Replace the sample rows with real prospects.");
}
const { head, rows } = parseCsv(fs.readFileSync(CSV, "utf8"));

if (process.argv.includes("--mark-sent")) {
  let n = 0;
  for (const r of rows) if (r.status === "queued" && r.queued_on === today) (r.status = "invited"), (r.invited_on = today), n++;
  fs.writeFileSync(CSV, toCsv(head, rows));
  console.log(`Marked ${n} prospects as invited on ${today}.`);
  process.exit(0);
}

const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const sentThisWeek = rows.filter((r) => r.invited_on && r.invited_on > weekAgo).length;
const room = Math.max(0, Math.min(DAILY_CAP, WEEKLY_CAP - sentThisWeek));
// Rotate segments so each day's list mixes logistics, robotics and DTC.
const fresh = rows.filter((r) => !r.status || r.status === "new");
const bySeg = Object.groupBy(fresh, (r) => r.segment);
const picks = [];
while (picks.length < room && Object.values(bySeg).some((l) => l.length))
  for (const list of Object.values(bySeg)) if (list.length && picks.length < room) picks.push(list.shift());

for (const p of picks) {
  p.note = (NOTES[p.segment] || NOTES.dtc)(p).slice(0, 200);
  p.status = "queued";
  p.queued_on = today;
}
fs.writeFileSync(CSV, toCsv(head, rows));

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
fs.mkdirSync(QUEUE_DIR, { recursive: true });
const out = path.join(QUEUE_DIR, `${today}.html`);
fs.writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Outreach queue ${today}</title>
<style>body{font:16px/1.45 system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;background:#0b111c;color:#e8eef7}
.card{border:1px solid #243149;border-radius:12px;padding:14px 16px;margin:12px 0;background:#111a2b}
.card.done{opacity:.4}.seg{font:12px monospace;color:#5ab4ff;text-transform:uppercase}
textarea{width:100%;box-sizing:border-box;background:#0b111c;color:inherit;border:1px solid #243149;border-radius:8px;padding:8px;font:inherit}
a,button{color:#fff;background:#1e6bff;border:0;border-radius:8px;padding:8px 12px;text-decoration:none;font:inherit;cursor:pointer;margin-right:6px}
button.ghost{background:#243149}</style>
<h1>Outreach queue · ${today}</h1>
<p>${picks.length} requests today (${sentThisWeek} sent in the last 7 days, cap ${WEEKLY_CAP}). Open the profile, <b>read it for 20 seconds</b>, edit the note if something better stands out, then Connect. Space them out; don't send all of them in one burst.</p>
${picks
  .map(
    (p, i) => `<div class="card" id="c${i}"><div class="seg">${esc(p.segment)}</div>
<b>${esc(p.name)}</b> · ${esc(p.title)} @ ${esc(p.company)}
<textarea rows="3" id="n${i}">${esc(p.note)}</textarea>
<p><a href="${esc(p.linkedin_url)}" target="_blank" rel="noopener">Open profile</a>
<button onclick="navigator.clipboard.writeText(document.getElementById('n${i}').value)">Copy note</button>
<button class="ghost" onclick="document.getElementById('c${i}').classList.toggle('done')">Sent ✓</button></p></div>`
  )
  .join("\n")}
<p>After sending: <code>npm run queue -- --mark-sent</code></p>`
);
console.log(`Queued ${picks.length} prospects -> ${path.relative(ROOT, out)}`);
