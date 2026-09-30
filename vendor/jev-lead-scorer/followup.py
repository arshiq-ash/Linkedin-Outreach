#!/usr/bin/env python3
"""Follow-up engine for the Jev lead scorer.

5 touches over ~21 days, each a new angle (never a rehash):
  touch 1 (day 0):  opener (logged via outreach.py send)
  touch 2 (day 3):  coverage question or pilot outline
  touch 3 (day 7):  proof point from a matching client
  touch 4 (day 14): timing check
  touch 5 (day 21): breakup ("should I close your file?")

Stop the sequence on any of: positive_reply, meeting_set, meeting_held,
closed_won, closed_lost, opt_out, not_interested, or lead skipped.

Nothing sends itself. `draft` produces the day's batch for a human's green light;
`log` records a send after he approves it.

Usage:
  python3 followup.py due              # leads due for their next touch
  python3 followup.py draft            # draft copy for everything due
  python3 followup.py log --lead 12 --touch 2 --channel fb_dm
"""

import argparse
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB = Path(__file__).parent / "outreach.db"

# days after touch 1 when each follow-up is due
SCHEDULE = {2: 3, 3: 7, 4: 14, 5: 21}

STOP_KINDS = {"positive_reply", "meeting_set", "meeting_held", "closed_won",
              "closed_lost", "opt_out", "not_interested"}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


def due_leads(con):
    """Leads owed their next touch, oldest first."""
    out = []
    leads = con.execute(
        "SELECT id,business,contact,channel,contact_path,website,facebook,notes,skipped"
        " FROM leads WHERE skipped=0").fetchall()
    for lead in leads:
        lid = lead["id"]
        sends = con.execute(
            "SELECT id,touch,sent_at FROM sends WHERE lead_id=? ORDER BY touch",
            (lid,)).fetchall()
        if not sends:
            continue
        last_touch = max(s["touch"] for s in sends)
        if last_touch >= 5:
            continue
        nxt = last_touch + 1
        # stop on any terminal outcome
        stop = con.execute(
            """SELECT 1 FROM outcomes o JOIN sends s ON s.id=o.send_id
               WHERE s.lead_id=? AND o.kind IN ({}) LIMIT 1""".format(
                ",".join("?" * len(STOP_KINDS))),
            (lid, *STOP_KINDS)).fetchone()
        if stop:
            continue
        last_sent = max(datetime.fromisoformat(s["sent_at"]) for s in sends)
        if last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)
        # absolute schedule: touch N is due when days since FIRST send >= SCHEDULE[N]
        first_sent = min(datetime.fromisoformat(s["sent_at"]) for s in sends)
        if first_sent.tzinfo is None:
            first_sent = first_sent.replace(tzinfo=timezone.utc)
        days_out = (datetime.now(timezone.utc) - first_sent).days
        if days_out >= SCHEDULE[nxt]:
            out.append((dict(lead), nxt, days_out))
    out.sort(key=lambda x: -x[2])
    return out


def asset_line(lead):
    if lead.get("website"):
        return "your website"
    if lead.get("facebook"):
        return "your page"
    return "your setup"


# OptiFlowCX copy: CX outsourcing for logistics, robotics and DTC brands.
def draft_copy(lead, touch):
    """Draft text for a touch. Varied structure per touch, no Mad-Libs skeleton."""
    b = lead["business"]
    variant = (lead["id"] + touch) % 2
    if touch == 2:
        if variant:
            return (f"Quick one for {b}: how are after-hours and weekend inquiries handled right now? "
                    f"That's where most growing teams we work with were losing customers before we started.")
        return (f"Following up on {b}. I sketched what a 1-2 agent pilot could look like for you: "
                f"which hours and channels we'd cover, and what we'd need from your team. Want me to send it?")
    if touch == 3:
        if variant:
            return (f"One data point that might be useful for {b}: for a delivery company we support, "
                    f"each agent handles 90-100 calls a day on dispatch and package status. "
                    f"The team grew from 3 to 6 as volume grew. Worth 15 minutes to see how it'd map to {b}?")
        return (f"For a DTC brand we started with one agent. Once the SOPs were in place the team grew "
                f"to six, covering 24/7. Happy to share how that could work for {b}.")
    if touch == 4:
        if variant:
            return (f"Checking in on {b}. Is the timing just off, or is support coverage not a priority "
                    f"right now? Either is fine, just tell me when to circle back.")
        return (f"Don't want to be a pest about {b}. Should I check back after peak season, "
                f"or is this a no for now? Happy either way.")
    if touch == 5:
        if variant:
            return (f"Last note from me on {b}: should I close this out for now? If after-hours cover or "
                    f"overflow support becomes a priority, I'm one message away.")
        return (f"I'll take the hint and stop reaching out about {b}. If you ever need extra hands on "
                f"support without hiring, you know where to find me.")
    raise ValueError(f"no angle for touch {touch}")


def cmd_due(a):
    con = db()
    due = due_leads(con)
    con.close()
    if not due:
        print("nothing due")
        return
    for lead, nxt, days in due:
        print(f"lead {lead['id']} | {lead['business']} | touch {nxt} "
              f"({days}d since first touch) | {lead['contact_path'] or lead['channel'] or '?'}")


def cmd_draft(a):
    con = db()
    due = due_leads(con)
    con.close()
    if not due:
        print("nothing due")
        return
    for lead, nxt, days in due:
        print(f"--- lead {lead['id']} | {lead['business']} | TOUCH {nxt} "
              f"| channel: {lead['contact_path'] or lead['channel'] or 'fb_dm'} ---")
        print(draft_copy(lead, nxt))
        print()


def cmd_log(a):
    con = db()
    lead = con.execute("SELECT id FROM leads WHERE id=?", (a.lead,)).fetchone()
    if not lead:
        sys.exit(f"no lead {a.lead}")
    vid = f"FU_T{a.touch}"
    if not con.execute("SELECT 1 FROM variants WHERE id=?", (vid,)).fetchone():
        con.execute(
            "INSERT INTO variants(id,name,opener,status,created_at) VALUES(?,?,?,?,?)",
            (vid, f"Follow-up touch {a.touch}", draft_copy(
                {"id": a.lead, "business": "?", "website": None, "facebook": None}, a.touch),
             "active", now()))
    cur = con.execute(
        "INSERT INTO sends(lead_id,variant_id,channel,touch,daypart,batch,sent_at)"
        " VALUES(?,?,?,?,?,?,?)",
        (a.lead, vid, a.channel, a.touch, a.daypart, a.batch, now()))
    con.commit()
    con.close()
    print(f"logged send {cur.lastrowid}: lead {a.lead} touch {a.touch}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("due")
    sub.add_parser("draft")
    s = sub.add_parser("log")
    s.add_argument("--lead", type=int, required=True)
    s.add_argument("--touch", type=int, required=True, choices=[2, 3, 4, 5])
    s.add_argument("--channel", default="fb_dm")
    s.add_argument("--daypart", default=None)
    s.add_argument("--batch", default=None)
    a = ap.parse_args()
    {"due": cmd_due, "draft": cmd_draft, "log": cmd_log}[a.cmd](a)


if __name__ == "__main__":
    main()
