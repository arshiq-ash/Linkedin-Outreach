// Publishes the scheduled post through LinkedIn's official Posts API.
// Only posts marked `status: approved` go out, so nothing is published without a human sign-off.
//
//   node scripts/publish.mjs --slot am                 # today's AM post (date in Asia/Karachi)
//   node scripts/publish.mjs --date 2026-09-25 --slot pm
//   node scripts/publish.mjs --slot am --dry-run       # print the API payload, send nothing
//
// Env:
//   LINKEDIN_TOKEN_FOUNDER  member token with w_member_social (founder profile)
//   LINKEDIN_PERSON_URN     urn:li:person:xxxx (printed by scripts/linkedin-auth.mjs)
//   LINKEDIN_TOKEN_COMPANY  token with w_organization_social (needs Community Management API approval)
//   LINKEDIN_ORG_URN        urn:li:organization:12345678
//   LINKEDIN_VERSION        API version header, YYYYMM (default below)
import fs from "node:fs";
import { loadPosts, setStatus } from "./lib.mjs";

const API = "https://api.linkedin.com/rest";
const VERSION = process.env.LINKEDIN_VERSION || "202608";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, [])
);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
const date = args.date || today;
const slot = args.slot;
const dryRun = Boolean(args["dry-run"]);
if (!slot) throw new Error("Pass --slot am|pm");

const post = loadPosts().find((p) => p.date === date && p.slot === slot);
if (!post) {
  console.log(`No post scheduled for ${date} ${slot}. Nothing to do.`);
  process.exit(0);
}
if (post.status !== "approved" && !dryRun) {
  console.log(`${post.id} is "${post.status}", not "approved". Skipping (approve it by editing the YAML).`);
  process.exit(0);
}

const creds =
  post.account === "company"
    ? { token: process.env.LINKEDIN_TOKEN_COMPANY, author: process.env.LINKEDIN_ORG_URN }
    : { token: process.env.LINKEDIN_TOKEN_FOUNDER, author: process.env.LINKEDIN_PERSON_URN };

// LinkedIn "little text": reserved characters must be escaped, and hashtags use the
// {hashtag|\#|tag} template. Only the trailing tag line becomes hashtags ("#1 reason" stays text).
const escapeLittle = (t) => t.replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => `\\${c}`);
function commentary(p) {
  const tags = (p.hashtags || []).map((h) => `{hashtag|\\#|${h}}`).join(" ");
  return `${escapeLittle(p.text.trim())}\n\n${tags}`.trim();
}

const headers = (extra = {}) => ({
  Authorization: `Bearer ${creds.token}`,
  "LinkedIn-Version": VERSION,
  "X-Restli-Protocol-Version": "2.0.0",
  ...extra,
});

async function call(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init.method} ${url} -> ${res.status}: ${await res.text()}`);
  return res;
}

async function uploadImage(file) {
  const init = await call(`${API}/images?action=initializeUpload`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ initializeUploadRequest: { owner: creds.author } }),
  }).then((r) => r.json());
  await call(init.value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${creds.token}` },
    body: fs.readFileSync(file),
  });
  return init.value.image; // urn:li:image:...
}

const body = {
  author: creds.author || "<author urn>",
  commentary: commentary(post),
  visibility: "PUBLIC",
  distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
  lifecycleState: "PUBLISHED",
  isReshareDisabledByAuthor: false,
};
const hasImage = fs.existsSync(post.image);

if (dryRun) {
  console.log(`[dry-run] ${post.id} (${post.account}) image=${hasImage ? post.image : "none"}`);
  console.log(JSON.stringify(body, null, 2));
  if (post.first_comment) console.log(`[dry-run] first comment: ${post.first_comment}`);
  process.exit(0);
}
if (!creds.token || !creds.author) {
  console.log(
    `Missing credentials for the ${post.account} account. Post ${post.id} manually ` +
      `(copy from the preview page) or add the secrets described in docs/setup.md.`
  );
  process.exit(post.account === "company" ? 0 : 1);
}

if (hasImage) body.content = { media: { id: await uploadImage(post.image), altText: post.alt || "" } };
const res = await call(`${API}/posts`, {
  method: "POST",
  headers: headers({ "Content-Type": "application/json" }),
  body: JSON.stringify(body),
});
const postUrn = res.headers.get("x-restli-id");
console.log(`Published ${post.id} -> ${postUrn}`);
setStatus(post, "posted");
fs.appendFileSync(post.file, `posted_urn: "${postUrn}"\n`);

// The link lives in the first comment: LinkedIn shows fewer people posts with outbound links in the body.
if (post.first_comment) {
  try {
    await call(`${API}/socialActions/${encodeURIComponent(postUrn)}/comments`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ actor: creds.author, object: postUrn, message: { text: post.first_comment } }),
    });
    console.log("First comment added.");
  } catch (e) {
    console.log(`Post is live but the first comment failed; add it by hand. (${e.message})`);
  }
}
