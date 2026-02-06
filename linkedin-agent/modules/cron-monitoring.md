# Automated Intent Monitoring via Cron

Set-and-forget monitoring that surfaces opportunities without manual work.

---

## Overview

Cron jobs run on schedule to:
1. Check for intent signals
2. Monitor target accounts
3. Analyze content performance
4. Surface opportunities to you

**You don't babysit it.** It pings you when something matters.

---

## The Monitoring Jobs

### Job 1: Morning Intent Scan

**Schedule:** Daily at 8am (before you post)
**Purpose:** Find overnight opportunities, prep for the day

```yaml
job:
  name: "linkedin-morning-scan"
  schedule: "0 8 * * *"  # 8am daily
  task: |
    Morning LinkedIn Intent Scan:
    
    1. Check for high-intent signals from overnight
       - Search for pain keywords in my niche
       - Look for buying signals
       - Note any trigger events
    
    2. Review my notifications
       - Who viewed my profile? (ICP match?)
       - Who engaged with my content?
       - Any new connection requests worth noting?
    
    3. Quick competitor check
       - Any viral content in my space?
       - Topics trending?
    
    Report format:
    🔥 HOT SIGNALS (act today):
    [list any high-intent prospects]
    
    📊 OVERNIGHT ENGAGEMENT:
    [notable engagement on my content]
    
    📈 TRENDING:
    [topics or content doing well]
    
    If nothing notable, just say "Clear morning - no urgent signals"
```

### Job 2: Engagement Reminder

**Schedule:** Daily at 10am and 2pm
**Purpose:** Remind to engage (consistency matters)

```yaml
job:
  name: "linkedin-engage-reminder"
  schedule: "0 10,14 * * 1-5"  # 10am and 2pm, Mon-Fri
  task: |
    Quick LinkedIn engagement check:
    
    Remind me to do my engagement rounds:
    - Comment on 3-5 posts from target accounts
    - Reply to any comments on my content
    - Check DMs
    
    Keep it brief. Just a nudge.
```

### Job 3: Weekly Performance Review

**Schedule:** Friday at 4pm
**Purpose:** Analyze the week, plan next week

```yaml
job:
  name: "linkedin-weekly-review"
  schedule: "0 16 * * 5"  # 4pm Friday
  task: |
    Weekly LinkedIn Performance Review:
    
    Analyze my LinkedIn performance this week.
    
    Check (ask me for data if needed):
    1. Posts published and engagement rates
    2. Top/bottom performers - why?
    3. Outreach sent and reply rates
    4. New conversations started
    5. Pipeline impact
    
    Then provide:
    - What worked this week
    - What didn't
    - 2-3 recommendations for next week
    - Content ideas based on what performed
    
    Update my patterns.yaml with any learnings.
```

### Job 4: Monthly Deep Analysis

**Schedule:** 1st of month at 9am
**Purpose:** Big picture optimization

```yaml
job:
  name: "linkedin-monthly-analysis"
  schedule: "0 9 1 * *"  # 9am, 1st of month
  task: |
    Monthly LinkedIn Deep Analysis:
    
    Full performance review for last month.
    
    Analyze:
    1. Content performance trends
    2. Outreach effectiveness
    3. Revenue attributed to LinkedIn
    4. Follower/connection growth
    5. Top patterns that emerged
    
    Recommend:
    1. Voice adjustments needed?
    2. ICP refinements?
    3. Content strategy changes?
    4. Outreach template updates?
    
    Update all relevant files:
    - patterns.yaml
    - performance.yaml
    - voice.yaml (if needed)
    
    Create next month's focus areas.
```

---

## Setting Up The Jobs

### Via Clawdbot Cron Tool

```bash
# Morning intent scan
cron action=add job='{"text": "[job text]", "schedule": "0 8 * * *", "label": "linkedin-morning-scan"}'

# Engagement reminders
cron action=add job='{"text": "[job text]", "schedule": "0 10,14 * * 1-5", "label": "linkedin-engage"}'

# Weekly review
cron action=add job='{"text": "[job text]", "schedule": "0 16 * * 5", "label": "linkedin-weekly"}'

# Monthly analysis
cron action=add job='{"text": "[job text]", "schedule": "0 9 1 * *", "label": "linkedin-monthly"}'
```

### Quick Setup Command

Tell me: "Set up LinkedIn monitoring cron jobs"

I'll create all four jobs configured to your timezone.

---

## Intent Keywords to Monitor

Default keywords (customize per user):

```yaml
pain_signals:
  - "struggling with"
  - "frustrated by"
  - "can't figure out"
  - "anyone else having trouble"
  - "waste of time"
  - "doesn't work"
  - "need help with"

buying_signals:
  - "looking for recommendations"
  - "anyone know a good"
  - "need a [service]"
  - "hiring for"
  - "budget for"
  - "evaluating"

trigger_events:
  - "excited to announce"
  - "just raised"
  - "we're hiring"
  - "joining as"
  - "promoted to"
```

---

## Notification Preferences

### What Gets Surfaced Immediately

🔥 **Hot signals** (message me now):
- ICP match + buying signal
- Direct ask for what I offer
- Warm lead re-engaging

### What Goes In Daily Digest

📊 **Daily digest** (morning scan):
- Pain expressions from ICP
- Trigger events
- Engagement on my content
- Profile viewers

### What's Weekly

📈 **Weekly summary** (Friday):
- Performance metrics
- Pattern updates
- Competitor activity

---

## Monitoring Without Browser

For times when browser automation isn't needed:

### Notifications-Based Monitoring

```yaml
check_via_notifications:
  - Profile viewers (LinkedIn sends digest)
  - Post engagement (notification stream)
  - Mentions (direct notifications)
  - Connection accepts (notifications)
```

### Manual Data Input

When I ask "How did your posts do this week?":
- You paste metrics from LinkedIn
- I analyze and update tracking
- No scraping needed

### RSS/Email Digests

LinkedIn sends:
- Weekly profile stats
- Engagement digests
- Network updates

I can process these if you forward them.

---

## Smart Batching

Don't run 10 separate checks. Batch them:

**Morning scan** does:
- Intent keyword search (1-2 searches)
- Feed scroll (5 min)
- Notification check
- Competitor glance

**All in one 15-min session** = LinkedIn sees normal usage.

---

## Escalation Rules

```yaml
escalation:
  immediate:
    - conditions: ["buying_signal", "icp_match", "mentions_me"]
      action: "message_now"
      
  same_day:
    - conditions: ["pain_signal", "icp_match"]
      action: "include_in_morning_scan"
      
  weekly:
    - conditions: ["competitor_content_viral"]
      action: "include_in_weekly_review"
      
  ignore:
    - conditions: ["low_icp_match", "generic_content"]
      action: "skip"
```

---

## Cost Optimization

Cron jobs use tokens. Minimize waste:

1. **Specific tasks** — Don't ask for "everything", ask for specific checks
2. **Conditional depth** — "If signals found, then analyze deeper"
3. **Digest format** — Batch findings, don't send 10 messages
4. **Skip if empty** — "If nothing notable, just confirm clear"

### Token-Efficient Prompts

❌ Bad: "Check everything on LinkedIn and give me a full report"

✅ Good: "Check for these 5 keywords. If any matches, list them. If none, say 'clear'."

---

## Disabling/Adjusting

### Pause All Monitoring
```
cron action=update id=linkedin-morning-scan patch='{"enabled": false}'
```

### Change Schedule
```
cron action=update id=linkedin-morning-scan patch='{"schedule": "0 9 * * *"}'
```

### Remove Job
```
cron action=remove id=linkedin-morning-scan
```

---

## Example Output

### Morning Scan Output

```
🌅 LinkedIn Morning Scan - Jan 15

🔥 HOT SIGNALS:
1. Sarah Chen (VP Sales, TechCorp) posted:
   "Our outbound is completely broken. Open to suggestions."
   → Perfect ICP match, pain signal
   → Recommend: Comment with insight, then connect

2. Mike Johnson accepted your connection
   → He engaged with 3 of your posts last week
   → Recommend: Send intro message today

📊 OVERNIGHT ENGAGEMENT:
- Your post got 45 new comments (reply to top 5)
- 12 profile views (3 ICP matches)

📈 TRENDING:
- "AI in sales" getting unusual engagement
- Competitor posted about cold email, doing well

✅ Action items queued for today
```
