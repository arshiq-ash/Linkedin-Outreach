# jev-gtm-cookbook

![jev-gtm-cookbook: 15 outbound recipes on TypeSafe Jev](docs/cookbook.svg)

*Open-source go-to-market recipes built on [TypeSafe's Jev](https://docs.typesafe.ai/introduction): code does the work, Jev makes the judgment calls, and each recipe runs locally on data you already own.*

| Stage | Recipe | What it decides |
|---|---|---|
| Who | [01 · LinkedIn network ICP scoring](cookbook/01-linkedin-network-icp.md) | Who in your connections fits your ICP (the full app in this repo) |
| When | [02 · Job-change interpretation](cookbook/02-job-change-interpretation.md) | Promotion, sideways move or reworded title, and whether the new role buys |
| After | [03 · Cold-email reply classification](cookbook/03-reply-classification.md) | Interested, not now, referral, objection, out of office or unsubscribe |
| After | [04 · Inbound lead routing](cookbook/04-inbound-lead-routing.md) | AE, SDR, nurture, vendor pitch or junk, with a confidence gate |
| After | [05 · Connection-request intent](cookbook/05-connection-request-intent.md) | Which LinkedIn invitations are buyers, peers or pitches |
| Who | [06 · Account ICP scoring](cookbook/06-account-icp-scoring.md) | Company fit from a description, with weights you change in code |
| When | [07 · Hiring signals](cookbook/07-hiring-signals.md) | Which job posts mean a company is building an outbound team |
| What | [08 · Personalization fact-check](cookbook/08-personalization-fact-check.md) | Whether an AI-written first line is true, and whether it is too personal |
| What | [09 · First-message scoring](cookbook/09-first-message-scoring.md) | Whether a LinkedIn or email draft is about them, pitchy, templated, or missing an ask |
| Learn | [10 · Learn from your own inbox](cookbook/10-learn-from-inbox.md) | Which opener traits actually get *your* prospects to reply |
| After | [11 · Cold ICP conversations](cookbook/11-cold-icp-conversations.md) | Conversations with buying interest that went quiet, and who owes the reply |
| Who | [12 · Warm-intro finder](cookbook/12-warm-intro-finder.md) | Who in your network can introduce you to the buyer at a target account |
| Who | [13 · Any lead list + enrichment](cookbook/13-any-list-and-enrichment.md) | Score any CSV, keep it fresh with Prospeo, LeadMagic, BlitzAPI or MoltSets |
| When | [14 · Social signal triage](cookbook/14-social-signal-triage.md) | Engage, monitor or ignore a public post about your problem space |
| What | [15 · Pick the follow-up](cookbook/15-pick-the-follow-up.md) | Which of your own follow-up templates fits the thread, or stop |

Every recipe comes with its request file and real saved answers, so you can replay it without a key: `npm run recipe -- cookbook/requests/03-reply-classification.json`. See [the cookbook](cookbook/README.md).

## Recipe: LinkedIn network ICP scoring

**Find out who in your LinkedIn network fits your ideal customer, and get told when one of them changes jobs.**

Most people have thousands of first-degree connections and no idea which of them could buy what they sell. That list is the warmest audience you will ever have, and nobody keeps a pulse on it. This recipe gives you that pulse from the one file LinkedIn lets you download: score every connection against your ICP, see the groups you are actually connected to, and catch the promotions and job moves that are a good reason to start a conversation.

It runs on your own machine, uses a local database, has **zero npm dependencies**, and costs well under a dollar for a network of 16,000 people. The judgments come from [Jev](https://docs.typesafe.ai/introduction), TypeSafe's model that returns typed answers and probabilities instead of text, so code can act on them directly.

![How the network ICP recipe works](docs/how-it-works.svg)

## How Jev fits

Code owns the workflow and the facts. Jev supplies the judgments in the middle.

| Step | What happens | Who does it |
|---|---|---|
| 1. Snapshot | Import your LinkedIn `Connections.csv` and store it by date | Code |
| 2. Classify once | Score each connection: persona group, role fit, seniority, company fit, likely buyer | **Jev** |
| 3. Detect change | Compare today's snapshot with the last one; flag new titles, new companies, new connections | Code |
| 4. Interpret the change | Promotion, sideways move, or just a reworded title? Does the new role buy what you sell? Did they just gain the budget? | **Jev** |
| 5. Route | Your weights and cutoffs decide: reach out, review, or ignore | Code, using Jev's numbers |
| 6. Write the message | Draft the outreach | You, or an LLM. Jev writes no text. |

### Why it stays cheap

- **Free first.** Code skips blank rows, students and job seekers, and ignores every row that did not change. None of that costs a call.
- **Only judge what changed.** Each record gets a fingerprint: job title + company + your ICP + question version. If that fingerprint already has a saved answer, no call is made. A daily run on an unchanged list costs nothing.
- **One request per record.** Every question about a person goes in a single call, including the "what changed?" questions when there is a previous role.
- **Shared answers.** The person is not part of the fingerprint, so two connections with the same title at the same company share one answer.
- **Weights are applied afterwards.** Jev's raw probabilities are saved. Change a weight or cutoff in `icp.json` and the dashboard re-ranks everyone with no new calls.

Jev bills input tokens only ($0.042 per million at the time of writing; [check current pricing](https://docs.typesafe.ai/models)). A request here averages about 1,060 input tokens, so 1,000 connections cost around 4.5 cents. Measured on a real network of **16,711 connections: 16,282 calls, $0.73, 11 minutes** (the time is TypeSafe's 1,200 requests/minute limit, not the model; each call takes about 280 ms). Re-running on the same file: 0 calls, $0.00, under a second.

**Why one request per record, and not ten?** Batching several connections into one request is faster, but on a 300-row test the probabilities drifted about ten times more than Jev's own run-to-run noise (likely-buyer mean difference 0.23 batched vs 0.03 single; only 66–80% of fit scores stayed within 10 points). The persona Choice survived batching; the Noul and Score probabilities did not. So single-call is the default and the speed ceiling is the rate limit.

### What leaves your machine

Only the **job title**, the **company name** and **your ICP description** are sent to TypeSafe. Names, email addresses and profile links stay in the local database and are never sent anywhere.

## Quick start

You need [Node.js](https://nodejs.org) 22.13 or newer. There is nothing to install.

```bash
git clone https://github.com/bcharleson/jev-gtm-cookbook.git
cd jev-gtm-cookbook
npm run demo        # made-up data, made-up answers, no key needed
```

## Score your own connections in three steps

1. **Export your connections from LinkedIn.** Me → Settings & Privacy → Data privacy → Get a copy of your data → choose the **larger data archive** (it is the option that includes connections) → Request archive. LinkedIn emails you a ZIP with `Connections.csv` inside, usually within minutes. Full walkthrough: [docs/export-your-connections.md](docs/export-your-connections.md).
2. **Get a TypeSafe key and describe your ICP.** Create a key at [console.typesafe.ai](https://console.typesafe.ai/settings/keys), copy `.env.example` to `.env` and paste it in. Copy `icp.example.json` to `icp.json` and rewrite it in your own words: what you sell, who buys it, who does not.
3. **Score it.**
   ```bash
   npm run score -- ~/Downloads/Connections.csv
   ```
   Each distinct role is judged once. You get a summary in the terminal and `data/scored-connections.csv`: one row per connection with a 0–100 fit score, persona group and each dimension as a percentage. Open it in any spreadsheet and sort by fit.

Have a lead list rather than your network, or want titles refreshed without re-exporting? See [recipe 13](cookbook/13-any-list-and-enrichment.md): `npm run score -- your-list.csv`, then `npm run enrich -- prospeo`.

Prefer a UI? `npm start` opens the dashboard on http://localhost:4173, where you can upload the CSV, run it, browse the scored list and download it.

Your first import is the baseline, so it produces fit scores but no signals. **Signals appear from the second export onwards**, when there is something to compare against. Re-export every week or two.

![The dashboard, showing made-up sample data](docs/dashboard.png)

## Running it daily

The dashboard has a daily schedule switch. It only fires while `npm start` is running. If you would rather not leave it running, use your system's scheduler:

```cron
30 7 * * *  cd /path/to/jev-gtm-cookbook && /usr/local/bin/node src/cli.js run >> data/cron.log 2>&1
```

A scheduled run picks up any new CSV in `data/`. If there is no new export, it finds nothing changed and makes no calls.

## Tuning

Everything you would want to change is in `icp.json`:

| Setting | What it does | Re-runs Jev? |
|---|---|---|
| `ideal_customer` | What you sell, who buys it, who does not. Jev reads this. | Yes |
| `personas` | The groups connections are sorted into | Yes |
| `weights` | How much each dimension counts towards the 0–100 fit score | No |
| `cutoffs.fit` | Minimum fit score to count as "in your ICP" | No |
| `cutoffs.reach_out` / `review` | How sure Jev must be that a changed connection's new role buys what you sell | No |
| `skip_if_title_matches` | Titles to skip for free, before Jev is called | No |

The default cutoffs are starting points, not recommendations. Look at 50–100 of your own results, decide which ones you agree with, and move the cutoffs until the *reach out* list is one you would actually act on.

The questions themselves live in [`src/questions.js`](src/questions.js). If you reword one, bump `QUESTION_VERSION` so old answers are not reused.

## Honest limits

- **It only knows the title and company name.** That is all the LinkedIn export contains. On a real 16k network Jev answered "cannot tell" for company fit 71% of the time: titles carry the signal, company names mostly do not. That is why `company_fit` has a "cannot tell" answer and a low default weight.
- **Change detection is only as fresh as your last export.** There is no scraping here, on purpose: automating a logged-in LinkedIn session breaks LinkedIn's terms and risks your account.
- **A probability is not a fact.** Jev's answers are calibrated guesses. Check them against people you know before trusting a cutoff.
- **Jev works best in English.**

## Project layout

```
cookbook/          recipes: write-ups, request files and saved Jev answers
src/recipe.js      runs or replays a cookbook request file
src/enrich.js      Prospeo, LeadMagic, BlitzAPI and MoltSets adapters; enrichment becomes a snapshot
src/cli.js         commands: demo, score, import, run, status, serve
src/csv.js         reads LinkedIn's Connections.csv
src/pipeline.js    import + diff (code), then judge only what is new (Jev)
src/questions.js   the state and questions sent to Jev, and the fingerprint
src/jev.js         ~40-line client for POST /v1/systemone, with retries
src/score.js       fit score and routing: plain code over Jev's saved answers
src/views.js       what the dashboard and CLI show
src/server.js      localhost-only dashboard server and daily schedule
src/mock.js        made-up answers for the demo and tests
public/index.html  the dashboard, one file, no build step
```

Run the tests with `npm test`.

## License and disclaimers

MIT. See [LICENSE](LICENSE).

This is an independent, community project. It is not made by, affiliated with, endorsed by, or sponsored by LinkedIn or TypeSafe AI. It uses only the data export LinkedIn provides to every member and TypeSafe's public API. You are responsible for how you use your connections' information and for following the laws and platform terms that apply to you.
