// Renders every post's `card` to content/images/<id>.png (1080x1350).
// Usage: npm run render            -> all posts
//        npm run render -- 2026-09-25-am   -> one post
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { renderCard } from "../templates/cards.mjs";
import { loadPosts, IMAGES_DIR, ROOT } from "./lib.mjs";

const only = process.argv[2];
const posts = loadPosts().filter((p) => p.card && (!only || p.id === only));
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const post of posts) {
  const voice = post.card.voice || (post.account === "founder" ? "founder" : "company");
  // Load from a file:// URL so the page may read the local fonts and logo.
  const tmp = path.join(ROOT, ".render.html");
  fs.writeFileSync(tmp, renderCard({ ...post.card, voice }));
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: post.image });
  console.log(`rendered ${post.id}.png`);
}
await browser.close();
fs.rmSync(path.join(ROOT, ".render.html"), { force: true });
