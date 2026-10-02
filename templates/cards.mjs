// Branded 1080x1350 (4:5) LinkedIn card templates.
// Set `theme: light` on a card for a white/blue version; the default is dark.
// Every card is original typography + shapes: no film stills, logos or actor likenesses,
// so pop-culture references stay commentary and never reuse copyrighted imagery.
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const f = (p) => pathToFileURL(path.join(root, p)).href;

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// *word* in card copy becomes an accent-coloured highlight.
const rich = (s = "") => esc(s).replace(/\*(.+?)\*/g, '<em class="hl">$1</em>').replace(/\n/g, "<br>");

const BASE_CSS = `
@font-face{font-family:Inter;src:url(${f("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900}
@font-face{font-family:Fraunces;src:url(${f("node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff2")});font-weight:600}
@font-face{font-family:Fraunces;src:url(${f("node_modules/@fontsource/fraunces/files/fraunces-latin-600-italic.woff2")});font-weight:600;font-style:italic}
@font-face{font-family:JBMono;src:url(${f("node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2")});font-weight:500}
@font-face{font-family:JBMono;src:url(${f("node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2")});font-weight:700}
:root{--bg:#05080F;--panel:#0D1524;--line:#1C2A40;--blue:#1E6BFF;--sky:#5AB4FF;--ice:#A9D8FF;--ink:#F3F7FC;--mute:#8A9BB4;--amber:#FFB547}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px}
body{background:var(--bg);color:var(--ink);font-family:Inter,sans-serif;position:relative;overflow:hidden}
.glow{position:absolute;inset:0;background:
  radial-gradient(900px 600px at 110% -10%,rgba(30,107,255,.35),transparent 60%),
  radial-gradient(700px 500px at -20% 110%,rgba(90,180,255,.18),transparent 60%)}
.grid{position:absolute;inset:0;opacity:.07;background-image:linear-gradient(var(--ice) 1px,transparent 1px),linear-gradient(90deg,var(--ice) 1px,transparent 1px);background-size:60px 60px}
.wrap{position:absolute;inset:80px 80px 170px 80px;display:flex;flex-direction:column}
.kicker{font-family:JBMono;font-weight:700;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:var(--sky);display:flex;align-items:center;gap:18px}
.kicker:before{content:"";width:46px;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--blue),var(--ice))}
.hl{font-style:normal;background:linear-gradient(90deg,var(--sky),var(--ice));-webkit-background-clip:text;color:transparent}
.foot{position:absolute;left:80px;right:80px;bottom:60px;height:70px;display:flex;align-items:center;gap:22px;border-top:2px solid var(--line);padding-top:26px}
.foot img{width:64px;height:64px;border-radius:50%}
.foot .who{font-weight:700;font-size:26px}
.foot .sub{color:var(--mute);font-size:21px;margin-top:3px}
.foot .tag{margin-left:auto;font-family:JBMono;font-size:20px;color:var(--mute)}
/* theme: light — white ground, brand blue ink and a solid blue takeaway panel */
body.light{--bg:#FFFFFF;--panel:#EEF4FF;--line:#D3E1F7;--blue:#1E5FD9;--sky:#1A56DB;--ice:#3B82F6;--ink:#0B1F4D;--mute:#50668C;--amber:#B45309}
body.light .glow{background:radial-gradient(900px 600px at 110% -10%,rgba(30,95,217,.14),transparent 60%),radial-gradient(700px 500px at -20% 110%,rgba(59,130,246,.10),transparent 60%)}
body.light .grid{opacity:.35;background-image:linear-gradient(#E6EEFB 1px,transparent 1px),linear-gradient(90deg,#E6EEFB 1px,transparent 1px)}
body.light .cx{background:linear-gradient(135deg,#1E5FD9,#2F74F0);border:0}
body.light .cx b{color:#CFE0FF}
body.light .cx p,body.light .cx .hl{color:#FFFFFF;background:none;-webkit-background-clip:border-box}
body.light .pn.a{background:linear-gradient(135deg,#1E5FD9,#2F74F0);border:0;color:#FFFFFF}
body.light .pn.a .lab{color:#CFE0FF}
body.light .pn.a .meta{color:#CFE0FF}
body.light .pn.b{background:#EEF4FF;border-color:#D3E1F7}
body.light .pn.b .lab{color:var(--blue)}
body.light .pn.a .hl{color:#FFFFFF;background:none;-webkit-background-clip:border-box;text-decoration:underline;text-decoration-color:#9EC2FF;text-decoration-thickness:4px;text-underline-offset:8px}
body.light .m.c{background:#E3ECFB;color:var(--ink)}
body.light .m.sys{color:var(--blue)}
body.light .m.a .hl{color:#FFFFFF;text-decoration:underline;text-decoration-color:#9EC2FF;text-decoration-thickness:3px;text-underline-offset:6px}
body.light .bar i{background:#C9D8F2}
body.light .cx .hl{text-decoration:underline;text-decoration-color:#9EC2FF;text-decoration-thickness:4px;text-underline-offset:8px}
`;

function footer(card) {
  const founder = card.voice === "founder";
  return `<div class="foot"><img src="${f("assets/logo.png")}">
    <div><div class="who">${founder ? "Arshiq Shoib" : "OptiFlowCX"}</div>
    <div class="sub">${founder ? "Founder · OptiFlowCX" : "Customer Experience. Optimized."}</div></div>
    <div class="tag">${esc(card.tag || "optiflowcx.com")}</div></div>`;
}

// "Scene" — a sitcom title card: episode label, the line, then the CX translation.
function scene(c) {
  return `<style>
  .ep{margin-top:70px;font-family:JBMono;font-size:24px;color:var(--mute);letter-spacing:.08em}
  .qb{margin:auto 0}
  .quote{font-family:Fraunces;font-style:italic;font-weight:600;font-size:${c.quoteSize || 92}px;line-height:1.08;letter-spacing:-.01em}
  .quote:before{content:"\\201C";display:block;font-size:180px;line-height:.6;color:var(--blue);margin-bottom:10px}
  .quote .hl{font-style:italic;padding-right:.08em}
  .said{margin-top:26px;font-size:26px;color:var(--mute)}
  .cx{background:var(--panel);border:2px solid var(--line);border-left:8px solid var(--sky);border-radius:22px;padding:38px 42px}
  .cx b{display:block;font-family:JBMono;font-size:21px;letter-spacing:.14em;color:var(--sky);margin-bottom:14px}
  .cx p{font-size:${c.cxSize || 42}px;line-height:1.22;font-weight:650}
  </style>
  <div class="wrap">
    <div class="kicker">${esc(c.kicker)}</div>
    <div class="ep">${esc(c.episode || "")}</div>
    <div class="qb"><div class="quote">${rich(c.quote)}</div>
    ${c.said ? `<div class="said">— ${esc(c.said)}</div>` : ""}</div>
    <div class="cx"><b>${esc(c.cxLabel || "THE CX TRANSLATION")}</b><p>${rich(c.takeaway)}</p></div>
  </div>`;
}

// "Split" — two-panel expectation vs. reality meme, drawn as UI panels.
function split(c) {
  // flip: the second panel gets the highlight (problem first, fix second).
  const panel = (p, i) => `<div class="pn ${(c.flip ? !i : i) ? "b" : "a"}">
      <div class="lab">${esc(p.label)}</div><div class="txt">${rich(p.text)}</div>
      ${p.meta ? `<div class="meta">${esc(p.meta)}</div>` : ""}</div>`;
  return `<style>
  h1{margin-top:44px;font-size:${c.titleSize || 64}px;line-height:1.08;font-weight:800;letter-spacing:-.02em}
  .pns{margin-top:48px;display:flex;flex-direction:column;gap:26px;flex:1}
  .pn{flex:1;border-radius:26px;padding:40px 44px;display:flex;flex-direction:column;border:2px solid var(--line)}
  .pn.a{background:linear-gradient(135deg,#0E2146,#0D1524)}
  .pn.b{background:var(--panel);border-color:#3A2A12}
  .lab{font-family:JBMono;font-weight:700;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:var(--sky)}
  .pn.b .lab{color:var(--amber)}
  .txt{margin-top:18px;font-size:${c.panelSize || 46}px;line-height:1.18;font-weight:700}
  .meta{margin-top:auto;font-family:JBMono;font-size:22px;color:var(--mute)}
  </style>
  <div class="wrap"><div class="kicker">${esc(c.kicker)}</div>
    <h1>${rich(c.title)}</h1>
    <div class="pns">${c.panels.map(panel).join("")}</div></div>`;
}

// "Stat" — a before → after journey number, for case-study posts.
function stat(c) {
  return `<style>
  h1{margin-top:44px;font-size:58px;line-height:1.1;font-weight:800;letter-spacing:-.02em}
  .big{margin-top:60px;display:flex;align-items:center;gap:40px;font-weight:800;letter-spacing:-.04em}
  .big .n{font-size:260px;line-height:.9}
  .big .n.to{background:linear-gradient(180deg,var(--ice),var(--blue));-webkit-background-clip:text;color:transparent}
  .big .arr{font-size:120px;color:var(--mute);font-weight:300}
  .unit{margin-top:18px;font-size:34px;color:var(--mute);font-weight:600}
  .rows{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .row{background:var(--panel);border:2px solid var(--line);border-radius:20px;padding:26px 30px}
  .row b{display:block;font-size:44px;font-weight:800}
  .row span{font-size:22px;color:var(--mute)}
  .note{margin-top:18px;font-size:18px;color:var(--mute)}
  </style>
  <div class="wrap"><div class="kicker">${esc(c.kicker)}</div>
    <h1>${rich(c.title)}</h1>
    <div class="big"><span class="n">${esc(c.from)}</span><span class="arr">→</span><span class="n to">${esc(c.to)}</span></div>
    <div class="unit">${esc(c.unit)}</div>
    <div class="rows">${(c.rows || []).map((r) => `<div class="row"><b>${esc(r.value)}</b><span>${esc(r.label)}</span></div>`).join("")}</div>
    ${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}</div>`;
}

// "List" — a numbered checklist; the single-image stand-in for a carousel.
function list(c) {
  return `<style>
  h1{margin-top:44px;font-size:${c.titleSize || 62}px;line-height:1.08;font-weight:800;letter-spacing:-.02em}
  ol{list-style:none;margin-top:50px;display:flex;flex-direction:column;gap:22px}
  li{display:flex;gap:28px;align-items:flex-start;background:var(--panel);border:2px solid var(--line);border-radius:22px;padding:28px 32px}
  li i{font-style:normal;font-family:JBMono;font-weight:700;font-size:30px;color:var(--bg);background:linear-gradient(135deg,var(--sky),var(--ice));min-width:62px;height:62px;border-radius:16px;display:grid;place-items:center}
  li div b{display:block;font-size:34px;font-weight:750;line-height:1.15}
  li div span{display:block;margin-top:6px;font-size:24px;color:var(--mute);line-height:1.3}
  </style>
  <div class="wrap"><div class="kicker">${esc(c.kicker)}</div>
    <h1>${rich(c.title)}</h1>
    <ol>${c.items.map((it, i) => `<li><i>${String(i + 1).padStart(2, "0")}</i><div><b>${rich(it.head)}</b>${it.body ? `<span>${esc(it.body)}</span>` : ""}</div></li>`).join("")}</ol></div>`;
}

// "Chat" — a helpdesk conversation; fictional customers, real support patterns.
function chat(c) {
  return `<style>
  h1{margin-top:44px;font-size:${c.titleSize || 60}px;line-height:1.08;font-weight:800;letter-spacing:-.02em}
  .win{margin-top:44px;flex:1;background:var(--panel);border:2px solid var(--line);border-radius:28px;padding:30px 34px;display:flex;flex-direction:column;gap:18px}
  .bar{display:flex;gap:10px;align-items:center;font-family:JBMono;font-size:20px;color:var(--mute);padding-bottom:16px;border-bottom:2px solid var(--line)}
  .bar i{width:14px;height:14px;border-radius:50%;background:#2A3A55}
  .bar span{margin-left:14px}
  .m{max-width:78%;padding:20px 26px;border-radius:24px;font-size:31px;line-height:1.3;font-weight:550}
  .m small{display:block;font-family:JBMono;font-size:17px;color:var(--mute);margin-bottom:6px;font-weight:500}
  .m.c{background:#16233A;border-bottom-left-radius:6px}
  .m.a{align-self:flex-end;background:linear-gradient(135deg,var(--blue),#3D8BFF);border-bottom-right-radius:6px}
  .m.a small{color:#CFE3FF}
  .m.a .hl{background:none;color:#FFE2A8}
  .m.sys{align-self:center;max-width:none;background:none;font-family:JBMono;font-size:20px;color:var(--amber);padding:4px}
  </style>
  <div class="wrap"><div class="kicker">${esc(c.kicker)}</div>
    <h1>${rich(c.title)}</h1>
    <div class="win"><div class="bar"><i></i><i></i><i></i><span>${esc(c.channel || "support inbox")}</span></div>
    ${c.messages.map((m) => `<div class="m ${m.from}">${m.meta ? `<small>${esc(m.meta)}</small>` : ""}${rich(m.text)}</div>`).join("")}
    </div></div>`;
}

// "Tree" — one symptom that branches into its real causes, each with its own fix.
function tree(c) {
  return `<style>
  h1{margin-top:40px;font-size:${c.titleSize || 60}px;line-height:1.06;font-weight:800;letter-spacing:-.02em}
  .root{margin-top:40px;align-self:flex-start;position:relative;background:var(--blue);color:#fff;border-radius:28px 28px 28px 8px;padding:24px 34px;font-size:42px;font-weight:750}
  .root small{display:block;font-family:JBMono;font-size:19px;letter-spacing:.12em;color:#CFE0FF;margin-bottom:6px;font-weight:700}
  .branches{margin-top:30px;margin-left:46px;border-left:4px solid var(--line);display:flex;flex-direction:column;gap:20px;padding:6px 0}
  .br{position:relative;margin-left:34px;display:grid;grid-template-columns:1fr 56px 1fr;align-items:stretch}
  .br:before{content:"";position:absolute;left:-38px;top:50%;width:34px;border-top:4px solid var(--line)}
  .cause,.fix{border-radius:18px;padding:20px 22px;min-height:118px;display:flex;flex-direction:column;justify-content:center}
  .cause{background:var(--panel);border:2px solid var(--line)}
  .fix{background:#FFFFFF;border:2px solid var(--blue)}
  body.dark .fix{background:#0E2146}
  .cause b,.fix b{display:block;font-family:JBMono;font-size:16px;letter-spacing:.12em;color:var(--mute);margin-bottom:6px}
  .fix b{color:var(--blue)}
  .cause span,.fix span{font-size:27px;line-height:1.2;font-weight:650}
  .arrow{align-self:center;text-align:center;font-size:40px;color:var(--blue);font-weight:300}
  .stats{margin-top:auto;display:flex;gap:16px}
  .stat{flex:1;border-top:4px solid var(--blue);padding-top:14px}
  .stat b{display:block;font-size:44px;font-weight:800;letter-spacing:-.02em}
  .stat span{font-size:21px;color:var(--mute)}
  </style>
  <div class="wrap"><div class="kicker">${esc(c.kicker)}</div>
    <h1>${rich(c.title)}</h1>
    <div class="root"><small>${esc(c.rootLabel || "WHAT THE CUSTOMER SAYS")}</small>${rich(c.root)}</div>
    <div class="branches">${c.branches.map((b) => `<div class="br">
      <div class="cause"><b>${esc(b.causeLabel || "WHAT'S REALLY WRONG")}</b><span>${rich(b.cause)}</span></div>
      <div class="arrow">→</div>
      <div class="fix"><b>${esc(b.fixLabel || "THE RIGHT PATH")}</b><span>${rich(b.fix)}</span></div></div>`).join("")}</div>
    <div class="stats">${(c.stats || []).map((t) => `<div class="stat"><b>${esc(t.value)}</b><span>${esc(t.label)}</span></div>`).join("")}</div>
  </div>`;
}

const LAYOUTS = { scene, split, stat, list, chat, tree };

export function renderCard(card) {
  const layout = LAYOUTS[card.layout];
  if (!layout) throw new Error(`Unknown card layout "${card.layout}" (use: ${Object.keys(LAYOUTS).join(", ")})`);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head>
  <body class="${card.theme === "light" ? "light" : "dark"}"><div class="glow"></div><div class="grid"></div>${layout(card)}${footer(card)}</body></html>`;
}
