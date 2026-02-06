# Sales Navigator Integration (Optional)

Advanced prospecting with LinkedIn Sales Navigator.

**Note:** Sales Navigator is a paid LinkedIn tool (~$100/mo). This module is optional — the core system works without it.

---

## Why Sales Navigator?

| Free LinkedIn | Sales Navigator |
|---------------|-----------------|
| Basic search | Advanced filters (50+) |
| Limited profile views | More views |
| No saved leads | Lead lists + alerts |
| Basic InMail | More InMail credits |
| No intent data | Buyer intent signals |

**Worth it if:** You're doing serious outbound and need better targeting.

---

## Key Features to Leverage

### 1. Advanced Search Filters

Build hyper-targeted lead lists:

```yaml
search_filters:
  # Company
  company_size: "51-200"
  company_growth: "Growing"
  industry: "Computer Software"
  headquarters: "United States"
  
  # Person
  title: "VP Sales" OR "Head of Sales" OR "Sales Director"
  seniority: "VP" OR "Director"
  years_in_role: "1-2"  # New in role = buying mode
  
  # Engagement
  posted_on_linkedin: "Past 30 days"
  changed_jobs: "Past 90 days"
  
  # Connection
  connection_degree: "2nd"  # Warm intro possible
```

### 2. Lead Lists

Organize prospects:

```yaml
lead_lists:
  - name: "Hot - Active Buyers"
    criteria: "Showed buying intent"
    size: 50
    action: "Prioritize outreach"
    
  - name: "Warm - Engaged"
    criteria: "Engaged with my content"
    size: 150
    action: "Nurture with content"
    
  - name: "ICP Match - No Signal"
    criteria: "Perfect fit, no activity"
    size: 500
    action: "Monitor for signals"
```

### 3. Alerts

Set up notifications:

```yaml
alerts:
  lead_alerts:
    - "When lead posts on LinkedIn"
    - "When lead changes jobs"
    - "When lead's company grows"
    - "When lead views my profile"
    
  account_alerts:
    - "Company news"
    - "New decision makers"
    - "Hiring signals"
    - "Funding announcements"
```

### 4. Buyer Intent

Sales Nav shows intent signals:
- Profile views
- Content engagement
- Company research activity
- InMail acceptance likelihood

---

## Integration with LinkedIn Agent

### Search → Agent Flow

```
1. Build search in Sales Nav
2. Export/note top prospects
3. Feed to LinkedIn Agent for:
   - Personalized outreach drafts
   - Content targeting
   - Engagement prioritization
```

### Lead Tracking

```yaml
# data/{user}/sales-nav-leads.yaml

lead_lists:
  hot_prospects:
    - name: "Sarah Chen"
      title: "VP Sales"
      company: "TechCorp"
      company_size: "100-200"
      connection: "2nd"
      mutual_connections: 5
      recent_activity: "Posted about outbound challenges"
      intent_score: "High"
      sales_nav_url: ""
      status: "outreach_sent"
      
  nurture:
    - name: "Mike Johnson"
      title: "Head of Sales"
      company: "StartupXYZ"
      intent_score: "Medium"
      status: "engaging_with_content"
```

### Daily Sales Nav Routine

```
Morning (15 min):
□ Check lead alerts
□ Note any new signals
□ Identify top 3-5 for today's outreach
□ Feed high-intent leads to agent for message drafts
```

---

## Advanced Searches for Intent

### Search: Ready to Buy

```
Title: VP Sales OR Head of Sales
Company Size: 50-500
Years in Role: < 2 years (new, needs quick wins)
Posted on LinkedIn: Past 30 days
Changed Jobs: Past 90 days
```

### Search: Growing Companies

```
Title: Founder OR CEO
Company Growth: Growing (headcount)
Company Size: 20-100
Industry: SaaS
Funding: Series A or B (past year)
```

### Search: Warm Intros

```
Title: [Your ICP]
Connection: 2nd degree
Mutual Connections: 3+
```

### Search: Engaged Prospects

```
Title: [Your ICP]
Interacted with: Your content (past 30 days)
```

---

## InMail Strategy

Sales Nav includes InMail credits. Use wisely:

### When to Use InMail

✅ Can't connect any other way
✅ High-value prospect
✅ Strong personalization angle
✅ After connection request ignored

### InMail Best Practices

```
Subject: Short, specific, curiosity-inducing
- "Quick question about [their initiative]"
- "Idea for [company name]"
- NOT "Partnership opportunity"

Body: Same principles as DMs
- Specific observation
- Brief value bridge
- Soft ask
- Under 100 words
```

### InMail Template

```
Subject: Re: [Their recent post/initiative]

Hey [Name],

[Specific reference to their content/company].

I've been working on [relevant thing] and noticed [connection].

[One sentence of potential value].

Worth a quick chat?

[Your name]
```

---

## Syncing with Core System

### Weekly Sync

```
1. Export top 20 leads from Sales Nav
2. Update sales-nav-leads.yaml
3. Prioritize for week's outreach
4. Track outcomes back to lead list
```

### Signal → Action

```yaml
signal_actions:
  profile_view:
    action: "Send connection if ICP match"
    urgency: "Same day"
    
  job_change:
    action: "Congratulate + soft pitch"
    urgency: "Within 1 week"
    
  posted_content:
    action: "Engage, then DM"
    urgency: "Within 24 hours"
    
  company_funding:
    action: "Trigger-based outreach"
    urgency: "Within 1 week"
```

---

## Without Sales Navigator

If not using Sales Nav, you can still:

1. **Use free LinkedIn search** — More limited but functional
2. **Manual monitoring** — Check target profiles weekly
3. **Google alerts** — Company news, funding, hiring
4. **Twitter/X** — Often more accessible for engagement
5. **Focus on inbound** — Content-first strategy

The core LinkedIn Agent works without Sales Nav — it just makes prospecting more efficient if you have it.

---

## Cost-Benefit Analysis

```
Sales Navigator: ~$100/month

Worth it if:
- Closing 1 deal/month pays for it
- Outbound is primary channel
- Need advanced targeting
- Doing serious ABM

Not worth it if:
- Inbound/content is primary
- Small target market (manual works)
- Not doing consistent outreach
- Budget constrained
```

---

## Commands for Agent

```
"Import my Sales Nav leads"
→ Agent asks for lead list, creates tracking file

"Draft outreach for my hot prospects"
→ Agent uses lead data to personalize messages

"What signals should I watch for [lead]?"
→ Agent suggests Sales Nav alerts to set

"Analyze my Sales Nav results"
→ Agent reviews lead list performance
```
