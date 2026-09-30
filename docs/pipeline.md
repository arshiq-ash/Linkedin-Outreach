# Sales pipeline: network scoring + deal tracking

Two open-source tools, vendored in `vendor/` (both MIT) and configured for OptiFlowCX:

| Tool | Job | Where |
|---|---|---|
| [jev-gtm-cookbook](https://github.com/bcharleson/jev-gtm-cookbook) | **Who to talk to.** Scores every LinkedIn connection against the OptiFlowCX ideal customer and flags promotions and job moves. | `vendor/jev-gtm-cookbook` (config: `icp.json`) |
| [jev-lead-scorer](https://github.com/LiamSherline/jev-lead-scorer) | **What to do next in each deal.** Logs every conversation, classifies replies, suggests the matching reply, drafts follow-ups, and shows which opener gets meetings. | `vendor/jev-lead-scorer` (config: `icp.json`, `REPLY_PLAYBOOK.md`, follow-up copy in `followup.py`) |

Neither tool logs in to LinkedIn or sends anything. The cookbook reads the data export LinkedIn gives every member.
The deal tracker only drafts messages; you send them yourself.

Both use **Jev** (TypeSafe) for the judgment calls. It costs cents: about $0.04 per 1,000 scored connections.
Without a key, both run in demo mode with made-up answers.

## One-time setup

1. **Get a Jev key** at <https://console.typesafe.ai/settings/keys>. Then, in your terminal:
   ```bash
   export TYPESAFE_API_KEY=ts_...      # or put it in vendor/jev-gtm-cookbook/.env for the cookbook
   ```
2. **Export your LinkedIn data:** Me → Settings & Privacy → Data privacy → Get a copy of your data →
   *larger data archive* → Request archive. The ZIP usually arrives within about 10 minutes. You need `Connections.csv` (and
   `messages.csv` later). Full walkthrough: `vendor/jev-gtm-cookbook/export-your-connections.md`.
3. **Try the demos first (no key needed):**
   ```bash
   npm run network:demo
   npm run deals:demo
   ```

## 1. Score your network (every 1–2 weeks)

```bash
npm run network:score -- ~/Downloads/Connections.csv
```

This writes `vendor/jev-gtm-cookbook/data/scored-connections.csv`: every connection with a 0–100 fit score and
a group (founder/owner, operations leader, CX/support leader, e-commerce leader, outsourcing competitor, other).
Only job title and company name are sent to TypeSafe. Names, emails and URLs stay on your machine.

- `npm run network:dashboard` opens a local dashboard at http://localhost:4173.
- **Job-change signals start with your second export.** Re-export every week or two and score it again. Only people
  whose title or company changed are sent to Jev again.
- Tune `vendor/jev-gtm-cookbook/icp.json`. Changing `weights` or `cutoffs` re-ranks people for free.
  Changing `ideal_customer` or `personas` re-asks Jev.

## 2. Send the best fits to the daily queue

```bash
npm run network:queue            # everyone at or above the fit cutoff (60)
npm run network:queue -- --min 75
npm run queue                    # today's list (15 max), as before
```

Network prospects are **existing connections**, so the queue gives them a DM opener (one question, no pitch) instead of
a connection note. The segment (logistics / robotics / dtc) is guessed from company name and title.
Brand names with no clue in them (e.g. "Yarbo") land in `general`; fix the `segment` column by hand if you know better.
A `hook` per person ("congrats on the new warehouse") makes every message better.

## 3. Track every live deal

Add a lead the moment a conversation starts, and log each message you send:

```bash
npm run deals -- add-lead --business "Company" --contact "First name" --channel linkedin_dm --segment logistics --notes "why they're a fit"
npm run deals -- add-variant --id Q1 --name "Question first" --opener "Curious how support is set up today..."   # once per opener you test
npm run deals -- send --lead 1 --variant Q1 --channel linkedin_dm
npm run deals -- score                  # Jev fit score + best angle for every new lead
npm run deals -- leads --top 10
```

When they reply, paste the reply in:

```bash
npm run deals -- triage --lead 1 --send 1 --channel linkedin_dm --text "What does pricing look like for 2 agents?"
```

It classifies the reply (interested, question, objection type, not now, referral, out of office) and prints the matching
draft from `REPLY_PLAYBOOK.md` for you to edit and send. Uncertain calls are flagged for you to judge.

Log what happened, so the funnel learns:

```bash
npm run deals -- outcome --send 1 --kind positive_reply     # reply | positive_reply | meeting_set | meeting_held | closed_won | closed_lost | not_interested | opt_out
npm run deals -- funnel                                     # reply / positive / booking rate per opener
npm run deals -- inbox --hot                                # replies that need you
```

### Follow-ups

```bash
npm run followups -- due                         # who is owed their next touch today
npm run followups -- draft                       # the draft for each
npm run followups -- log --lead 1 --touch 2 --channel linkedin_dm
```

There are 5 touches over 21 days, each with a new angle: opener → coverage question or pilot outline → proof point →
timing check → close-the-file. A lead drops out of the sequence once you log `positive_reply`, `meeting_set`, `meeting_held`, `closed_won`, `closed_lost`, `not_interested` or `opt_out`. A plain `reply` doesn't stop it.

## Where the data lives

`vendor/jev-gtm-cookbook/data/`, `vendor/jev-lead-scorer/outreach.db` and `outreach/prospects.csv` are **git-ignored**:
prospects' names and conversations stay on your computer and never go into the repo. Back them up yourself.

## Editing the copy

- **Reply drafts:** `vendor/jev-lead-scorer/REPLY_PLAYBOOK.md` (one fenced `draft:key` block per situation).
- **Follow-up touches:** `draft_copy()` in `vendor/jev-lead-scorer/followup.py`.
- **Angles the scorer can pick:** `angles` in `vendor/jev-lead-scorer/icp.json`.
- **Connection notes and DM openers:** `NOTES` and `DMS` in `scripts/outreach-queue.mjs`.
