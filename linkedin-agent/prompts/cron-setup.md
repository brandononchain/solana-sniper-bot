# Cron Job Setup Prompts

Ready-to-use cron job configurations for LinkedIn monitoring.

---

## Quick Setup

When user says "Set up LinkedIn monitoring cron jobs", create these:

### Job 1: Morning Intent Scan

```yaml
label: "linkedin-morning-scan"
schedule: "0 8 * * *"  # 8am daily, adjust timezone
text: |
  LinkedIn Morning Intent Scan for {username}.
  
  Check the user's LinkedIn monitoring priorities:
  1. Load their ICP from linkedin-agent/data/{username}/icp.yaml
  2. Load their intent keywords
  
  Then mentally scan for:
  - Pain signals from ICP matches
  - Buying signals (looking for services)
  - Trigger events (funding, hiring, promotions)
  - Engagement on their content overnight
  
  Report format if signals found:
  🔥 HOT: [High-intent signals requiring action today]
  📊 ENGAGEMENT: [Notable activity on their content]
  📈 TRENDING: [Relevant trends or opportunities]
  
  If nothing notable, respond: "Clear morning - no urgent LinkedIn signals"
  
  Keep response brief and actionable.
```

### Job 2: Engagement Reminder

```yaml
label: "linkedin-engage"
schedule: "0 10,14 * * 1-5"  # 10am and 2pm, Mon-Fri
text: |
  LinkedIn Engagement Reminder for {username}.
  
  Quick nudge to do engagement rounds:
  - Comment on 3-5 posts from target accounts
  - Reply to any new comments on their content
  - Check DMs for responses
  
  Just a brief reminder, not a full analysis.
  
  Say something like: "👋 LinkedIn engagement time - comments, replies, DMs"
```

### Job 3: Weekly Review

```yaml
label: "linkedin-weekly"
schedule: "0 16 * * 5"  # 4pm Friday
text: |
  Weekly LinkedIn Performance Review for {username}.
  
  Analyze their week:
  1. Ask for their metrics if not available (posts, engagement, outreach)
  2. Identify patterns in what worked/didn't
  3. Update patterns.yaml if significant learnings
  
  Provide:
  - Top performer and why
  - What to avoid next week
  - 2-3 content ideas based on performance
  - Any optimization recommendations
  
  Keep actionable and brief.
```

### Job 4: Monthly Analysis

```yaml
label: "linkedin-monthly"
schedule: "0 9 1 * *"  # 9am, 1st of month
text: |
  Monthly LinkedIn Deep Analysis for {username}.
  
  Comprehensive review:
  1. Content performance trends (ask for data if needed)
  2. Outreach effectiveness
  3. Pipeline/revenue impact
  4. Pattern evolution
  
  Update:
  - patterns.yaml with confirmed patterns
  - performance.yaml with monthly stats
  - voice.yaml if adjustments needed
  
  Recommend focus areas for next month.
  
  This is the deep-dive - be thorough but actionable.
```

---

## Setup Commands

### Create All Jobs

```javascript
// Morning scan
cron action=add job={
  "label": "linkedin-morning-scan",
  "schedule": "0 8 * * *",
  "text": "[morning scan prompt]"
}

// Engagement reminder
cron action=add job={
  "label": "linkedin-engage", 
  "schedule": "0 10,14 * * 1-5",
  "text": "[engagement prompt]"
}

// Weekly review
cron action=add job={
  "label": "linkedin-weekly",
  "schedule": "0 16 * * 5", 
  "text": "[weekly review prompt]"
}

// Monthly analysis
cron action=add job={
  "label": "linkedin-monthly",
  "schedule": "0 9 1 * *",
  "text": "[monthly prompt]"
}
```

### Adjust Timezone

Default schedules are server time. Adjust based on user's timezone:

| Timezone | Morning (8am) | Afternoon (2pm) | Friday (4pm) |
|----------|---------------|-----------------|--------------|
| EST | 0 13 * * * | 0 19 * * * | 0 21 * * 5 |
| PST | 0 16 * * * | 0 22 * * * | 0 0 * * 6 |
| UTC | 0 8 * * * | 0 14 * * * | 0 16 * * 5 |

---

## Managing Jobs

### List Active Jobs
```
cron action=list
```

### Pause a Job
```
cron action=update id=linkedin-morning-scan patch={"enabled": false}
```

### Change Schedule
```
cron action=update id=linkedin-morning-scan patch={"schedule": "0 9 * * *"}
```

### Remove Job
```
cron action=remove id=linkedin-morning-scan
```

### Run Manually
```
cron action=run id=linkedin-morning-scan
```

---

## Customization Options

### For Heavy Users (More Monitoring)
```yaml
additional_jobs:
  - label: "linkedin-midday-signals"
    schedule: "0 12 * * 1-5"
    purpose: "Catch lunch-time intent signals"
    
  - label: "linkedin-competitor-watch"
    schedule: "0 9 * * 1"
    purpose: "Weekly competitor content scan"
```

### For Light Users (Minimal Monitoring)
```yaml
reduced_schedule:
  - Keep only: weekly review
  - Make morning scan: 3x/week (Mon/Wed/Fri)
  - Remove: engagement reminders (handle manually)
```

### For Specific Campaigns
```yaml
campaign_jobs:
  - label: "linkedin-launch-monitor"
    schedule: "0 */4 * * *"  # Every 4 hours
    duration: "1 week"
    purpose: "Monitor engagement during product launch"
```

---

## Cost Considerations

Each cron job = API call = tokens.

**Estimated daily cost:**
- Morning scan: ~500-1000 tokens
- Engagement reminders: ~100 tokens each
- Weekly review: ~1500 tokens
- Monthly analysis: ~2000 tokens

**Total monthly estimate:** ~20,000-30,000 tokens for LinkedIn monitoring

**Reduce costs by:**
- Using "if nothing, say X" pattern (short responses when empty)
- Reducing frequency
- Combining jobs where possible
