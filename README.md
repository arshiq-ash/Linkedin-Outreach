# LinkedIn Outreach: OptiFlowCX content & outreach engine

This repo runs LinkedIn for **Arshiq Shoib** (founder) and the **OptiFlowCX** company page. It targets
**logistics, robotics/hardware and DTC e-commerce** with 2 posts a day in a pop-culture style
(Friends, The Office, Breaking Bad, Spider-Man, Lanterns…).

The approach: **automate everything around the click; the click stays human.** Content is written, designed and
published through LinkedIn's official API. Outreach is researched and pre-written for you, and you send it by hand in
safe daily batches. See [docs/automation-playbook.md](docs/automation-playbook.md) for why this repo doesn't use bot tools.

## What's inside

| Path | What it is |
|---|---|
| `content/posts/*.yml` | One file per post: text, hashtags, first comment, alt text, image spec, status |
| `content/images/*.png` | Rendered 1080×1350 branded cards (committed, so CI doesn't need a browser) |
| `content/preview.html` | Review page: every post with its image, copy buttons and status |
| `templates/cards.mjs` | 5 card layouts: `scene` (sitcom quote), `split` (expectation vs reality), `stat`, `list`, `chat` |
| `scripts/render-images.mjs` | YAML → PNG with headless Chromium |
| `scripts/publish.mjs` | Official Posts API publisher (image upload, hashtags, first comment) |
| `.github/workflows/publish.yml` | Runs the publisher twice a day |
| `scripts/outreach-queue.mjs` | Daily invite list with personalised notes, capped at 15/day and 80/week |
| `outreach/message-templates.md` | Connection notes + a 3-step follow-up sequence |
| `docs/content-strategy.md` | Audiences, weekly mix, pop-culture formula, image guardrails, page growth |
| `docs/profile-and-page.md` | Headline, About section, and profile/page checklists |
| `docs/setup.md` | Turning on auto-publishing + the weekly and daily routine |
| `docs/pipeline.md` | Network scoring (who to talk to) and deal tracking (reply drafts, follow-ups, which opener books meetings) |
| `vendor/` | Two MIT-licensed tools configured for OptiFlowCX: jev-gtm-cookbook and jev-lead-scorer |
| `scripts/network-to-queue.mjs` | Sends best-fit connections from the network scorer into the outreach queue |

## Quick start

```bash
npm install
npm run render        # build the images
npm run preview       # build content/preview.html
node scripts/publish.mjs --slot am --date 2026-09-25 --dry-run   # see exactly what would be sent
```

Week 1 (Sep 25 – Oct 1) is written and rendered, and every post is marked `draft`. Review, approve, and push.
