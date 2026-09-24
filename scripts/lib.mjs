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
