# Setup: turn on auto-publishing

Nothing publishes until you finish these steps **and** mark a post `status: approved`.

## 1. Founder profile (self-serve, about 15 minutes)

1. Go to <https://www.linkedin.com/developers/apps> → **Create app**. It has to be linked to the OptiFlowCX company page,
   and you must be a page admin.
2. Under **Products**, add **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**. Both are approved instantly.
3. Under **Auth**, add the redirect URL `http://localhost:3000/callback` and copy the Client ID and Client Secret.
4. On your own computer:
   ```bash
   npm install
   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=yyy node scripts/linkedin-auth.mjs
   ```
   Open the URL it prints and approve. It then prints `LINKEDIN_TOKEN_FOUNDER` and `LINKEDIN_PERSON_URN`.
5. In GitHub, go to **Settings → Secrets and variables → Actions** and add both values as repository secrets.

The token lasts **60 days**. Put a reminder in your calendar and repeat step 4 before it expires.

## 2. Company page (needs LinkedIn approval)

Posting as a company page requires the `w_organization_social` scope, which comes with the **Community Management API**.
Request it from the same app's **Products** tab. LinkedIn reviews these requests, which typically takes a few weeks.

**Until it's approved**, company posts are skipped automatically. Post them yourself from the preview page
(`content/preview.html` → Copy post, download the image), or queue them in Buffer's free plan, which is an
approved LinkedIn partner.

After approval, rerun the auth helper with `SCOPES="w_organization_social"` and add:
- `LINKEDIN_TOKEN_COMPANY`: the new token
- `LINKEDIN_ORG_URN`: `urn:li:organization:<id>` (the number in your company page's admin URL)

## 3. Weekly workflow

```bash
# 1. Write or edit next week's posts in content/posts/<date>-am.yml / -pm.yml
npm run render      # regenerate the images
npm run preview     # rebuild content/preview.html and review everything
# 2. Change status: draft -> approved on each post you're happy with
git add -A && git commit -m "Week of <date> content" && git push
```

The **Publish LinkedIn posts** workflow runs at 12:15 and 16:15 UTC, publishes the approved post for that slot,
adds the first comment, and commits `status: posted` back to the repo. You can also run it by hand from the Actions tab.

> The crons use UTC. When US clocks go back on **Nov 1**, change them to `15 13` and `15 17` so the posts
> still go out at 08:15 and 12:15 ET.

## 4. Daily outreach

```bash
# once: export prospects (Sales Navigator / Apollo) into outreach/prospects.csv, using the columns in prospects.example.csv
npm run queue                    # builds outreach/queue/<today>.html
# open it, send the invites by hand, then:
npm run queue -- --mark-sent
```
`prospects.csv` and the queue pages are git-ignored, so prospect data never ends up in the repo.
