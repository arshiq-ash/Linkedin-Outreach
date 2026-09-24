# LinkedIn automation playbook: what to automate and what to keep manual

**Summary:** no automation tool is ban-proof. LinkedIn's User Agreement (section 8.2) prohibits bots, scrapers and
browser extensions that automate activity on the site. "Stealth" tools lower the odds of detection. They don't remove it,
and LinkedIn's detection keeps getting better. The founder profile is the business's most valuable sales asset, so the
rule in this repo is:

> **Automate everything around the click. The click itself stays human.**

Research, writing, image design, scheduling, prospect lists, personalised notes and reminders are automated.
Sending invites, commenting and messaging are done by a person, in small daily batches, from the list this repo prepares.

## Risk tiers

| Tier | What | Examples | Ban risk | Use it? |
|---|---|---|---|---|
| 🟢 Official | LinkedIn's own APIs and scheduler | Posts API (`w_member_social`, `w_organization_social`), LinkedIn's native post scheduler, Sales Navigator saved searches and alerts | None | **Yes, and this repo's publisher uses it** |
| 🟢 Approved partners | Schedulers built on the official API | Buffer, Hootsuite, Metricool, Later | None | Yes: a fallback for company-page posts until your own API approval comes through |
| 🟡 Off-platform tools | Tools that never log in to LinkedIn | Apollo / Clay / Hunter for building prospect lists; email sequences | None to the LinkedIn account | Yes, for finding and researching prospects |
| 🟠 In-browser extensions | Extensions that act inside your logged-in session | Dux-Soup, Waalaxy, Linked Helper | Medium: against the ToS and detectable | Not on the founder account |
| 🔴 Headless / cloud bots | Self-hosted browser bots and unofficial-API clients | OpenOutreach (Playwright + stealth), `linkedin-api` (unofficial Voyager API), Selenium auto-connect scripts, cloud tools like Expandi | High: sudden restrictions, forced ID checks, permanent bans | **No** |

### About the GitHub projects you'll find

Searching GitHub for "LinkedIn automation" mostly turns up tools in the red tier:

- **OpenOutreach** (and its many forks): self-hosted, Playwright with stealth plugins. It finds leads through LinkedIn's
  internal APIs and sends AI-written connection requests. It's well built. It's also exactly the pattern LinkedIn looks for:
  automated browsing from a server IP, calls to internal APIs, and invites sent at a steady rhythm.
- **tomquirk/linkedin-api**: a Python client for LinkedIn's private "Voyager" API. It's widely used for scraping, and it's
  a common cause of accounts getting a "we've restricted your account" notice.
- **Selenium "auto-connect" scripts**: brittle, and the easiest of the three to detect.

If you ever want to try one, run it on a **separate, disposable account**, never on the founder profile or on an admin of
the company page.

## What this repo automates instead

| Tedious task | How it's handled |
|---|---|
| Writing 2 posts a day | `content/posts/*.yml`: written a week ahead, with hook, body, hashtags, first comment and alt text |
| Designing images | `npm run render`: branded 1080×1350 cards from templates, no design tool needed |
| Posting at the right time | GitHub Actions + the official Posts API, twice a day, **only** for posts you've marked `approved` |
| Putting the link in the first comment | Done automatically after each post is published |
| Finding prospects | Export from Sales Navigator / Apollo into `outreach/prospects.csv` |
| Writing connection notes | `npm run queue`: personalised notes by segment, under 200 characters |
| Staying under limits | The queue caps you at 15 a day and 80 a week, and mixes logistics, robotics and DTC |
| Tracking who got what | The CSV records `queued → invited` with dates |

## Safe daily limits for a human-paced account

| Action | Daily | Weekly | Notes |
|---|---|---|---|
| Connection requests | 10–20 | ≤ 80 | LinkedIn's weekly cap is around 100. Stay well under it. |
| Pending invites | – | < 400 total | Withdraw any invite still pending after 3 weeks. A large pending pile is a spam signal. |
| Acceptance rate | – | > 30% | If it drops, tighten your targeting before you raise volume. |
| Messages to new connections | 10–20 | – | No pitch in the first message. |
| Profile views | < 80 | – | Spread through the day. |
| Comments | 10–15 | – | Real comments (2+ sentences) on posts from people you're targeting. They add reach and warm up future invites. |

Also avoid sending identical notes to everyone, working in bursts (send across the day), logging in from several
locations at once, and anything that runs while you're offline.

## The daily 25-minute routine

1. **5 min**: reply to every comment on yesterday's two posts. Replies in the first hour add a lot of reach.
2. **10 min**: open today's `outreach/queue/<date>.html` and send the invites, reading each profile for about 20 seconds first.
3. **10 min**: leave thoughtful comments on 10 posts from logistics, robotics and DTC founders and ops leaders on your target list.

Then run `npm run queue -- --mark-sent`.
