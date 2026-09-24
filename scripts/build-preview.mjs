// Builds content/preview.html: every post with its image, copy-ready text and first comment,
// grouped by day. Open it locally, or publish it as a private page for review on your phone.
import fs from "node:fs";
import path from "node:path";
import { loadPosts, fullText, ROOT } from "./lib.mjs";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const posts = loadPosts();
const days = Object.groupBy(posts, (p) => p.date);
const fmtDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const SLOT = { am: "08:15 ET · 17:15 PKT", pm: "12:15 ET · 21:15 PKT" };
const count = (s) => posts.filter((p) => p.status === s).length;

const card = (p) => `
<article class="post" data-account="${p.account}">
  <img src="images/${p.id}.png" alt="${esc(p.alt)}" loading="lazy" width="1080" height="1350">
  <div class="body">
    <div class="meta">
      <span class="acct ${p.account}">${p.account === "founder" ? "Founder profile" : "Company page"}</span>
      <span class="slot">${SLOT[p.slot]}</span>
      <span class="status ${p.status}">${p.status}</span>
    </div>
    <p class="ref"><b>${esc(p.pillar)}</b> · ${esc(p.audience)}<br><span>${esc(p.reference)}</span></p>
    <pre id="t-${p.id}">${esc(fullText(p))}</pre>
    <div class="actions">
      <button type="button" data-copy="t-${p.id}">Copy post</button>
      ${p.first_comment ? `<button type="button" class="ghost" data-copy="c-${p.id}">Copy first comment</button>` : ""}
      <span class="chars">${fullText(p).length} / 3,000 chars</span>
    </div>
    ${p.first_comment ? `<p class="comment"><span>First comment</span><span id="c-${p.id}">${esc(p.first_comment)}</span></p>` : ""}
  </div>
</article>`;

const html = `<title>OptiFlowCX Content Calendar</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
:root{--ground:#F3F6FA;--surface:#FFFFFF;--ink:#0E1726;--muted:#5A6A80;--line:#D8E0EA;--accent:#1E5FD9;--accent-ink:#FFFFFF;
--draft:#9A5B00;--draft-bg:#FFF1D6;--ok:#157347;--ok-bg:#DDF5E7;--done:#1E5FD9;--done-bg:#E1ECFF;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ground:#080E1A;--surface:#101A2C;--ink:#E7EEF8;--muted:#8D9DB4;--line:#1F2C44;--accent:#5AA8FF;--accent-ink:#06101F;
--draft:#FFC266;--draft-bg:#3A2A0E;--ok:#6BDB9C;--ok-bg:#10301F;--done:#8CC4FF;--done-bg:#132846;color-scheme:dark}}
:root[data-theme="dark"]{--ground:#080E1A;--surface:#101A2C;--ink:#E7EEF8;--muted:#8D9DB4;--line:#1F2C44;--accent:#5AA8FF;--accent-ink:#06101F;
--draft:#FFC266;--draft-bg:#3A2A0E;--ok:#6BDB9C;--ok-bg:#10301F;--done:#8CC4FF;--done-bg:#132846;color-scheme:dark}
body{background:var(--ground);color:var(--ink);font:15px/1.55 "IBM Plex Sans",system-ui,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding-inline:20px;padding-block:40px 64px;display:grid;gap:36px}
header{display:grid;gap:10px}
.eyebrow,.meta,.chars,.comment span:first-child,.day h2 small{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.eyebrow{color:var(--accent)}
h1{font:italic 600 clamp(32px,5vw,48px)/1.05 Fraunces,Georgia,serif;margin:0;text-wrap:balance}
.lede{margin:0;color:var(--muted);max-width:65ch}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.filter{display:flex;gap:4px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:4px}
.filter button{background:none;color:var(--muted);border:0;border-radius:7px;padding:6px 12px;font:inherit;cursor:pointer}
.filter button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink)}
.tally{display:flex;gap:8px;flex-wrap:wrap}
.day{display:grid;gap:14px}
.day h2{margin:0;font-size:20px;font-weight:600;display:flex;gap:12px;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:8px}
.day h2 small{color:var(--muted);font-weight:500}
.posts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:16px}
.post{background:var(--surface);border:1px solid var(--line);border-radius:14px;display:grid;grid-template-columns:150px 1fr;gap:16px;padding:14px;min-width:0}
.post img{width:150px;height:auto;border-radius:8px;display:block}
.body{display:grid;gap:10px;min-width:0;align-content:start}
.meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;color:var(--muted)}
.acct{color:var(--ink);font-weight:500}
.acct.company{color:var(--accent)}
.status{padding:2px 8px;border-radius:99px}
.status.draft{color:var(--draft);background:var(--draft-bg)}.status.approved{color:var(--ok);background:var(--ok-bg)}.status.posted{color:var(--done);background:var(--done-bg)}
.ref{margin:0;font-size:13px;color:var(--muted)}.ref b{color:var(--ink);font-weight:600}
pre{margin:0;white-space:pre-wrap;font:inherit;font-size:14px;max-height:220px;overflow:auto;border-top:1px solid var(--line);padding-top:10px}
.actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.actions button{font:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:7px 12px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}
.actions button.ghost{background:none;color:var(--accent)}
.actions button:focus-visible,.filter button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.chars{color:var(--muted);margin-left:auto}
.comment{margin:0;font-size:13px;display:grid;gap:2px}.comment span:first-child{color:var(--muted)}
@media (max-width:560px){.post{grid-template-columns:1fr}.post img{width:100%;max-width:320px}}
</style>
<div class="wrap">
<header>
  <div class="eyebrow">OptiFlowCX × Arshiq Shoib · LinkedIn</div>
  <h1>Content calendar, week of ${fmtDay(posts[0].date)}</h1>
  <p class="lede">Two posts a day: the founder profile in the US morning and the company page at US lunchtime. Each post has its card, the final text with hashtags, and a first comment that carries the link. To approve a post, change its <code>status</code> to <code>approved</code> in <code>content/posts/</code>. The scheduled workflow publishes only approved posts.</p>
  <div class="bar">
    <div class="filter" role="group" aria-label="Show posts for">
      <button type="button" data-f="all" aria-pressed="true">All</button>
      <button type="button" data-f="founder" aria-pressed="false">Founder</button>
      <button type="button" data-f="company" aria-pressed="false">Company</button>
    </div>
    <div class="tally meta"><span class="status draft">${count("draft")} draft</span><span class="status approved">${count("approved")} approved</span><span class="status posted">${count("posted")} posted</span></div>
  </div>
</header>
${Object.entries(days).map(([d, ps]) => `<section class="day"><h2>${fmtDay(d)} <small>${ps.length} posts</small></h2><div class="posts">${ps.map(card).join("")}</div></section>`).join("\n")}
</div>
<script>
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]");
  if (b) {
    const el = document.getElementById(b.dataset.copy), label = b.textContent;
    try { await navigator.clipboard.writeText(el.textContent); b.textContent = "Copied"; }
    catch { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "Selected, press Ctrl+C"; }
    setTimeout(() => (b.textContent = label), 1600);
  }
  const f = e.target.closest("[data-f]");
  if (f) {
    document.querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", x === f));
    document.querySelectorAll(".post").forEach((p) => (p.hidden = f.dataset.f !== "all" && p.dataset.account !== f.dataset.f));
    document.querySelectorAll(".day").forEach((d) => (d.hidden = !d.querySelector(".post:not([hidden])")));
  }
});
</script>`;
fs.writeFileSync(path.join(ROOT, "content/preview.html"), html);
console.log("wrote content/preview.html");
