# Reply Playbook - OptiFlowCX draft templates for the triage loop

Single source of truth for reply drafts. `jev_triage.py` parses the fenced
blocks below (tagged ````draft:key ````) at runtime. Edit the copy here and the
triage loop picks it up. Slots: `{business}`, `{contact}`, `{first}`.

OptiFlowCX copy. Keep it short, specific and honest; no prices until you know their volume.

Voice rules: short, reactive, your voice. Proof where it fits.
No pitchiness, no em dashes.

## Positive: book the call

```draft:book_call
Great to hear, {first}. Could we do 15 minutes this week? I'll walk you through how we set up support for a delivery company (dispatch and package-status calls, 90-100 per agent a day) and what a pilot for {business} could look like. What day and time suit you?
```

## Objection counters

```draft:counter_price
Totally fair, {first}. Most clients start with one or two agents on a 30-day pilot, so you're paying for a small team, not a big contract. If it doesn't pay for itself in missed calls and faster replies, you stop. Worth 15 minutes to size it for {business}?
```

```draft:counter_timing
No pressure on timing, {first}. When would be a better moment to revisit, after peak season or next quarter? I'll put a note in and check back then.
```

```draft:counter_trust
Fair question, {first}, you haven't worked with us before. That's exactly why we start with a small pilot: one or two agents, your SOPs, your tools, and you judge the quality before committing to anything. Happy to walk you through our logistics and e-commerce work too.
```

```draft:counter_has_vendor
Makes sense, {first}. One question: does your current setup cover after-hours and weekend calls, and overflow when volume spikes? That's usually where we help teams that already have support in place. If you're covered there, I'll leave you be.
```

```draft:counter_not_decision_maker
Thanks for pointing me in the right direction, {first}. Who looks after customer support or operations at {business}? Happy to send them a short summary.
```

```draft:counter_diy
Respect that, {first}, keeping it in-house makes sense when the team knows the accounts well. If you ever need cover for nights, weekends or busy weeks without hiring, that's where we fit. Mind if I check back in a few months?
```

```draft:counter_other
I hear you, {first}. What's the main thing holding you back? If we can solve that piece, is it worth a quick conversation?
```

## Question answers

```draft:answer_pricing
It depends on hours and channels, {first}. Most clients start with a 1-2 agent pilot for 30 days with no long contract. If you tell me roughly how many calls, emails or chats you get a day and which hours you need covered, I'll send a clear number for {business}.
```

```draft:answer_how_it_works
We give you dedicated agents trained on your SOPs, working inside your tools (helpdesk, phone system, TMS or Shopify). They handle calls, emails and chats in your brand's voice, we run QA every week, and you can scale up or down as volume changes.
```

```draft:answer_who_are_you
I'm Arshiq, founder of OptiFlowCX. We build and run customer support teams for logistics, robotics and DTC e-commerce companies, from single agents to 15-person 24/7 teams. More at optiflowcx.com/portfolio.
```

```draft:answer_contract
No long lock-in, {first}. We start with a 30-day pilot, and after that it's month to month. You stay because it's working, not because of a contract.
```

```draft:answer_other
Good question, {first}. Let me get you a proper answer rather than a quick one. I'll reply shortly.
```

## Wrong person: reroute

```draft:reroute
Thanks {first}, appreciate you passing this along. I'll reach out to them directly and mention you pointed me their way.
```

## Out of office: note only (no draft sent)

```draft:ooo_note
No worries, I'll follow up when you're back.
```
