# Intent Monitor Module

Surface high-intent prospects by monitoring signals across LinkedIn.

## Purpose

Stop chasing cold leads. Find people who are **already showing** they need what you offer.

---

## The Intent Hierarchy

```
INTENT LEVEL          SIGNAL TYPE                ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 HOT               "Looking for [what you do]"  → DM now
🔥 HOT               Asking for recommendations   → Comment + DM
🟠 WARM              Complaining about problem    → Engage + nurture
🟠 WARM              Hiring for related role      → Strategic outreach
🟡 INTERESTED        Engaged with your content    → Follow up
🟡 INTERESTED        Viewed your profile          → Connect
🔵 AWARE             Following competitor         → Long-term nurture
⚪ COLD              No signal                    → Content only
```

---

## Signal Categories

### Category 1: Active Buying Signals

They're actively looking for solutions.

**Keywords to monitor:**
```
- "looking for a [your service]"
- "anyone recommend"
- "need help with [your expertise]"
- "what [tool/service] do you use for"
- "hiring [role you could fill or serve]"
- "budget for [your category]"
- "evaluating [solutions]"
```

**Where to look:**
- LinkedIn search (posts)
- Group discussions
- Comments on industry posts
- Competitor followers

**Response time:** Same day

---

### Category 2: Pain Expression

They're frustrated with something you solve.

**Keywords to monitor:**
```
- "frustrated with"
- "struggling to"
- "can't figure out"
- "tired of"
- "waste of time"
- "doesn't work"
- "[problem] is killing me"
```

**Response approach:**
- Empathize in comments (don't pitch)
- Share genuine insight
- Start relationship before selling

**Response time:** 24-48 hours

---

### Category 3: Trigger Events

Something changed that creates opportunity.

**Events to track:**
```
- Funding announcements
- New executive hires
- Company milestones
- Product launches
- Office expansion
- Awards/recognition
- Role changes (promotions)
- Company acquisitions
```

**Sources:**
- LinkedIn notifications
- Company pages
- News alerts
- Job postings

**Response time:** Within 1 week of event

---

### Category 4: Engagement Signals

They've interacted with you.

**Signals:**
```
- Liked your post
- Commented on your content
- Shared your content
- Viewed your profile
- Accepted connection
- Mentioned you
```

**Response approach:**
- Acknowledge the engagement
- Add value before asking
- Continue conversation naturally

**Response time:** Same day for comments, 24-48 hours for likes/views

---

### Category 5: Competitor Intelligence

They're engaging with competitors.

**Signals:**
```
- Following competitor accounts
- Commenting on competitor posts
- Downloading competitor content
- Attending competitor events
```

**Response approach:**
- Don't bash competitors
- Differentiate through value
- Long-term nurture

---

## Monitoring Workflows

### Daily Monitoring (15 min)

```
1. CHECK NOTIFICATIONS
   □ Profile views
   □ Post engagement
   □ Connection requests
   □ Mentions
   
2. SEARCH INTENT KEYWORDS
   □ Run 2-3 keyword searches
   □ Filter by "Posts" + "Past Week"
   □ Note high-intent matches
   
3. REVIEW TARGET ACCOUNTS
   □ Check saved searches
   □ Any new posts from targets?
   □ Any trigger events?
   
4. LOG & PRIORITIZE
   □ Add signals to tracking
   □ Prioritize by intent level
   □ Queue outreach
```

### Weekly Monitoring (30 min)

```
1. COMPETITOR ANALYSIS
   □ What content is working for them?
   □ Who's engaging heavily?
   □ New followers worth noting?
   
2. TREND SCANNING
   □ What topics are trending?
   □ Any viral posts in niche?
   □ Emerging pain points?
   
3. PIPELINE REVIEW
   □ Status of active outreach
   □ Follow-ups needed
   □ Conversion analysis
   
4. KEYWORD REFINEMENT
   □ Add new keywords discovered
   □ Remove low-signal keywords
   □ Update search strategies
```

---

## Search Strategies

### LinkedIn Search Operators

```
# Find posts with specific keywords
"looking for" AND "sales consultant" 

# Filter by date
[Use filters: Past 24 hours / Past week]

# Find in specific niche
"struggling with" AND "B2B" AND "outbound"

# Find questions
"anyone know" OR "recommendations for" AND "[topic]"
```

### Saved Searches

Create saved searches for:
1. **Pain keywords** in your niche
2. **Buying keywords** for your service
3. **Job titles** of your ICP
4. **Companies** you're targeting
5. **Competitor names** + engagement

### Boolean Combinations

```yaml
searches:
  high_intent_sales:
    query: '"looking for" OR "need help" AND "sales" AND "B2B"'
    frequency: daily
    
  pain_outbound:
    query: '"struggling with" OR "frustrated" AND "outbound" OR "cold email"'
    frequency: daily
    
  hiring_signals:
    query: '"hiring" AND "head of sales" OR "VP sales"'
    frequency: weekly
```

---

## Intent Scoring

Score each prospect to prioritize:

```yaml
scoring:
  signal_weights:
    active_buying: 50
    pain_expression: 30
    trigger_event: 25
    engagement_with_you: 20
    profile_view: 10
    competitor_engagement: 5
    
  icp_match:
    perfect_fit: 50
    good_fit: 30
    partial_fit: 10
    not_fit: 0
    
  recency:
    today: 20
    this_week: 15
    this_month: 10
    older: 5
    
# Total score determines priority
# 80+ = Hot (immediate action)
# 50-79 = Warm (this week)
# 30-49 = Nurture (content + light touch)
# <30 = Watch list
```

---

## Intent Tracking Database

```yaml
# engagement/intent-signals.yaml

signals:
  - id: "sig_001"
    date: "2024-01-15"
    prospect:
      name: "Sarah Johnson"
      title: "VP Sales"
      company: "TechCorp"
      linkedin: "linkedin.com/in/sarahjohnson"
    signal:
      type: "pain_expression"
      source: "post"
      content: "Spent another week on outbound that went nowhere. What are we missing?"
      url: "[post_url]"
    icp_match: "perfect"
    intent_score: 85
    status: "contacted"
    action_taken: "Commented with insight, sent connection"
    next_step: "Follow up after they accept"
    
  - id: "sig_002"
    date: "2024-01-14"
    prospect:
      name: "Mike Chen"
      title: "Founder"
      company: "StartupXYZ"
    signal:
      type: "buying_signal"
      source: "comment"
      content: "Anyone have recommendations for LinkedIn automation?"
    icp_match: "good"
    intent_score: 70
    status: "new"
    action_taken: null
    next_step: "Reply with value, connect"
```

---

## Automation Options

### What Can Be Automated
- Keyword search monitoring
- Notification aggregation
- Basic signal categorization
- Reminder scheduling
- Tracking updates

### What Should Stay Manual
- Actual outreach messages
- Personalization decisions
- Relationship judgment calls
- Response crafting

### Tools That Help
- LinkedIn Sales Navigator (searches, alerts)
- Clawdbot browser automation (monitoring)
- Notification aggregators
- CRM for tracking

---

## Red Flags (Disqualifiers)

Not all signals are good signals:

```yaml
disqualifiers:
  - "We're a startup with no budget"
  - "Looking for free advice"
  - "Hiring interns for [your role]"
  - Company too small/large for ICP
  - Industry outside your expertise
  - Geographic mismatch
  - Previous bad experience
```

---

## Weekly Intent Report Template

```markdown
# Intent Report: Week of [Date]

## Hot Signals (Action Required)
| Name | Company | Signal | Score | Next Step |
|------|---------|--------|-------|-----------|
| ... | ... | ... | ... | ... |

## Warm Signals (This Week)
[List...]

## Patterns Noticed
- Topic X is trending
- Pain point Y mentioned 5x
- Competitor Z getting engagement on [topic]

## Keyword Performance
- "struggling with" → 8 signals
- "looking for" → 3 signals
- "frustrated" → 5 signals

## Recommendations
- Add keyword: "[new term]"
- Monitor: [new competitor]
- Topic opportunity: [trend]
```
