// One-time local OAuth helper: gets a 60-day member token + your person URN.
// Needs a LinkedIn developer app with the "Share on LinkedIn" and
// "Sign In with LinkedIn using OpenID Connect" products, and the redirect URL
// http://localhost:3000/callback added under Auth.
//
//   LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=... node scripts/linkedin-auth.mjs
//   (add SCOPES="w_organization_social" once the Community Management API is approved)
import http from "node:http";
import crypto from "node:crypto";

const { LINKEDIN_CLIENT_ID: id, LINKEDIN_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) throw new Error("Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET");
const redirect = "http://localhost:3000/callback";
const scopes = ["openid", "profile", "w_member_social", ...(process.env.SCOPES || "").split(" ").filter(Boolean)];
const state = crypto.randomBytes(12).toString("hex");

const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
url.search = new URLSearchParams({ response_type: "code", client_id: id, redirect_uri: redirect, scope: scopes.join(" "), state });
console.log(`Open this URL, approve, and come back here:\n\n${url}\n`);

http
  .createServer(async (req, res) => {
    const q = new URL(req.url, redirect).searchParams;
    if (!req.url.startsWith("/callback") || q.get("state") !== state) return res.end("Waiting for LinkedIn…");
    const tok = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: q.get("code"), redirect_uri: redirect, client_id: id, client_secret: secret }),
    }).then((r) => r.json());
    if (!tok.access_token) {
      res.end("Token exchange failed, see terminal.");
      console.error(tok);
      process.exit(1);
    }
    const me = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json());
    res.end("Done. You can close this tab.");
    const days = Math.round(tok.expires_in / 86400);
    console.log(`\nAdd these as GitHub Actions secrets (token expires in ~${days} days):\n`);
    console.log(`LINKEDIN_TOKEN_FOUNDER=${tok.access_token}`);
    console.log(`LINKEDIN_PERSON_URN=urn:li:person:${me.sub}`);
    process.exit(0);
  })
  .listen(3000);
