// Moves the best-fit people from the network scorer (vendor/jev-gtm-cookbook) into
// outreach/prospects.csv, so `npm run queue` can turn them into daily connection/DM lists.
//
//   npm run network:queue                 -> adds everyone at or above the ICP fit cutoff
//   npm run network:queue -- --min 70     -> a stricter cutoff
//
// Segment (logistics / robotics / dtc) is guessed from the company name and title, because
// LinkedIn's export has no industry column. Anything unclear becomes "general" -- fix it by hand
// in the CSV if you know better.
import fs from "node:fs";
import path from "node:path";
import { ROOT, parseCsv, toCsv } from "./lib.mjs";

const COOKBOOK = path.join(ROOT, "vendor/jev-gtm-cookbook");
const SCORED = path.join(COOKBOOK, "data/scored-connections.csv");
const PROSPECTS = path.join(ROOT, "outreach/prospects.csv");
const HEAD = ["name", "first_name", "title", "company", "segment", "linkedin_url", "hook", "status", "queued_on", "invited_on", "note", "source"];

const icp = JSON.parse(fs.readFileSync(path.join(COOKBOOK, "icp.json"), "utf8"));
const minArg = process.argv.indexOf("--min");
const MIN_FIT = minArg > -1 ? Number(process.argv[minArg + 1]) : icp.cutoffs.fit;

const SEGMENTS = [
  ["logistics", /courier|logistic|freight|cargo|deliver|shipping|3pl|transport|trucking|express|dispatch|fulfil|supply chain|warehous|last.?mile|forward/i],
  ["robotics", /robot|hardware|device|drone|3d|automation|electronic|machine|autonom|iot|gadget/i],
  ["dtc", /shop|store|apparel|fashion|beauty|cosmetic|skincare|brand|e-?commerce|dtc|d2c|goods|wear|jewel|home|pet|supplement|retail/i],
];
const segmentOf = (p) => (SEGMENTS.find(([, re]) => re.test(`${p.Company} ${p.Position}`)) || ["general"])[0];

if (!fs.existsSync(SCORED)) {
  console.error("No scored connections yet. Run: npm run network:score -- ~/Downloads/Connections.csv");
  process.exit(1);
}
const scored = parseCsv(fs.readFileSync(SCORED, "utf8")).rows;
const existing = fs.existsSync(PROSPECTS) ? parseCsv(fs.readFileSync(PROSPECTS, "utf8")) : { head: [...HEAD], rows: [] };
if (!existing.head.includes("source")) existing.head.push("source");
const known = new Set(existing.rows.map((r) => r.linkedin_url).filter(Boolean));

const picks = scored.filter(
  (p) =>
    Number(p["Fit (0-100)"]) >= MIN_FIT &&
    !p["Skipped (free)"] &&
    p.Group !== "outsourcing_competitor" &&
    p.URL &&
    !known.has(p.URL)
);
for (const p of picks)
  existing.rows.push({
    name: p.Name,
    first_name: p.Name.split(" ")[0],
    title: p.Position,
    company: p.Company,
    segment: segmentOf(p),
    linkedin_url: p.URL,
    hook: "",
    status: "new",
    source: "network",
  });

fs.writeFileSync(PROSPECTS, toCsv(existing.head, existing.rows));
const bySeg = Object.entries(Object.groupBy(picks, segmentOf)).map(([s, l]) => `${s} ${l.length}`).join(", ");
console.log(`Added ${picks.length} prospects with fit >= ${MIN_FIT} (${bySeg || "none"}) -> outreach/prospects.csv`);
console.log("These are existing connections: message them (no connect needed). Add a `hook` per person for a better note.");
