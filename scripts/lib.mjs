import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const POSTS_DIR = path.join(ROOT, "content/posts");
export const IMAGES_DIR = path.join(ROOT, "content/images");

export function loadPosts() {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".yml"))
    .sort()
    .map((file) => {
      const post = yaml.load(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"));
      const id = file.replace(/\.yml$/, "");
      const date = post.date instanceof Date ? post.date.toISOString().slice(0, 10) : String(post.date);
      return { ...post, id, date, file: path.join(POSTS_DIR, file), image: path.join(IMAGES_DIR, `${id}.png`) };
    });
}

// Final text as it will appear on LinkedIn: body, blank line, then hashtags.
export function fullText(post) {
  const tags = (post.hashtags || []).map((h) => `#${h}`).join(" ");
  return `${post.text.trim()}\n\n${tags}`.trim();
}

export function setStatus(post, status) {
  const src = fs.readFileSync(post.file, "utf8");
  fs.writeFileSync(post.file, src.replace(/^status: \w+/m, `status: ${status}`));
}

// Minimal RFC-4180 CSV: quoted fields, embedded commas, quotes and newlines.
export function parseCsv(text) {
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
export const toCsv = (head, rows) =>
  [head, ...rows.map((r) => head.map((h) => r[h] ?? ""))]
    .map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))
    .join("\n") + "\n";
