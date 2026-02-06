# Trend Analyzer & Self-Optimizer

Continuously learn what's working and optimize performance.

## Purpose

Turn LinkedIn from guesswork into a data-driven system that gets better over time.

---

## The Optimization Loop

```
┌─────────────────────────────────────────────┐
│           CONTINUOUS IMPROVEMENT             │
├─────────────────────────────────────────────┤
│                                             │
│    ANALYZE         LEARN         APPLY      │
│       │              │              │       │
│   ┌───▼───┐     ┌───▼───┐     ┌───▼───┐   │
│   │ What  │ ──▶ │Extract│ ──▶ │Generate│   │
│   │worked?│     │pattern│     │ better │   │
│   └───────┘     └───────┘     │content │   │
│       ▲                       └───┬───┘   │
│       │                           │       │
│       └───────────────────────────┘       │
│              MEASURE RESULTS              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## What to Analyze

### Your Own Performance

**Content metrics:**
- Impressions
- Engagement rate (likes + comments / impressions)
- Click-through (if links)
- Saves/shares
- Comment quality
- Leads generated

**Outreach metrics:**
- Connection acceptance rate
- Message reply rate
- Meeting conversion rate
- Revenue attribution

**Engagement metrics:**
- Comment → conversation rate
- Profile views → connections
- Content → profile visits

### Competitor/Niche Performance

**Viral content analysis:**
- What topics explode?
- What hooks stop scrolls?
- What formats get engagement?
- What CTAs convert?

**Audience analysis:**
- Who's engaging heavily?
- What questions get asked?
- What pain points repeat?

---

## Pattern Extraction Framework

### Step 1: Gather Data

For each post (yours or analyzed):

```yaml
post_analysis:
  # Basics
  date: "2024-01-15"
  author: "self" # or username
  url: ""
  
  # Content
  hook: "First line of post"
  hook_type: "contrarian"
  topic: "sales"
  format: "text_only" # carousel/video/poll
  word_count: 250
  has_cta: true
  cta_type: "soft"
  
  # Performance
  impressions: 15000
  likes: 450
  comments: 85
  shares: 12
  saves: 34
  engagement_rate: 0.039
  
  # Quality
  comment_quality: "high" # high/medium/low/spam
  leads_generated: 3
  conversations_started: 8
```

### Step 2: Identify Patterns

After analyzing 20+ posts, look for:

**Winning patterns:**
- Hook types with highest engagement
- Topics that resonate
- Formats that perform
- Posting times that work
- CTA styles that convert

**Losing patterns:**
- What consistently underperforms
- Topics that fall flat
- Formats that don't work for your audience

### Step 3: Create Hypotheses

```yaml
hypotheses:
  - hypothesis: "Contrarian hooks perform 2x better than question hooks"
    evidence: "5/7 top posts use contrarian, 0/7 use questions"
    confidence: "high"
    test_plan: "Create A/B: same topic, different hook types"
    
  - hypothesis: "Tactical posts outperform motivational"
    evidence: "Top 10 all tactical, bottom 10 mixed"
    confidence: "high"
    test_plan: "Already confirmed, continue pattern"
    
  - hypothesis: "Posting at 8am EST beats 12pm"
    evidence: "Limited data, 3 posts each"
    confidence: "medium"
    test_plan: "Run 10 posts at each time, same quality"
```

### Step 4: Test & Validate

For each hypothesis:
1. Design controlled test
2. Execute (minimum 5 data points)
3. Measure results
4. Confirm or reject
5. Update pattern library

---

## Trend Monitoring

### Niche Trends

**Weekly scan:**
1. What topics are getting unusual engagement?
2. What new formats are emerging?
3. What conversations are happening?
4. What are influencers talking about?

**Monthly review:**
1. What shifted in the last 30 days?
2. What's gaining momentum?
3. What's fading?

### Platform Trends

**Algorithm signals:**
- What content types is LinkedIn pushing?
- Any new features to leverage?
- Changes in reach patterns?

**Format trends:**
- Carousels up or down?
- Video performance?
- Newsletter engagement?
- Poll effectiveness?

---

## Self-Optimization Protocol

### Daily (5 min)

```
□ Check yesterday's post performance
□ Note any outliers (high or low)
□ Quick hypothesis on why
```

### Weekly (30 min)

```
□ Analyze all posts from the week
□ Compare to previous weeks
□ Identify 1-2 patterns
□ Update pattern library
□ Adjust next week's content plan
```

### Monthly (1-2 hours)

```
□ Full performance review
□ Top/bottom analysis
□ Competitor scan
□ Trend assessment
□ Update all models:
  - Voice (any refinements?)
  - Hooks (what's working?)
  - Topics (what resonates?)
  - Outreach (what converts?)
□ Set next month's experiments
```

---

## The Pattern Library

Store learned patterns in `/data/{user}/patterns.yaml`:

```yaml
# patterns.yaml

content_patterns:
  hooks:
    top_performers:
      - type: "contrarian"
        success_rate: 0.73
        avg_engagement: 2.1x_baseline
        examples:
          - "Most [X] advice is garbage"
          - "Stop [common thing]"
        notes: "Works best with tactical follow-through"
        
      - type: "story_setup"
        success_rate: 0.65
        avg_engagement: 1.8x_baseline
        examples:
          - "Last week I lost..."
          - "The email came at 3am..."
        notes: "Needs genuine story, not fabricated"
        
    underperformers:
      - type: "announcement"
        success_rate: 0.15
        notes: "Avoid unless major news"
        
  topics:
    hot:
      - "Sales tactics"
      - "LinkedIn strategy"
      - "Pipeline building"
    cold:
      - "Motivation"
      - "Generic business advice"
      
  formats:
    best: "text_only"
    second: "carousel"
    avoid: "basic_video"
    
  timing:
    best_days: ["Tuesday", "Wednesday", "Thursday"]
    best_times: ["8-9am EST", "11am-12pm EST"]
    avoid: ["Friday afternoon", "Weekend"]
    
outreach_patterns:
  templates:
    - name: "observation_opener"
      reply_rate: 0.22
      best_for: ["pain_signal", "engagement"]
    - name: "value_first"
      reply_rate: 0.18
      best_for: ["buying_signal"]
      
  timing:
    best_response_window: "within 24 hours of signal"
    follow_up_optimal: "3-4 days"
    
engagement_patterns:
  comments_that_work:
    - "Add specific insight"
    - "Share relevant experience"
    - "Ask thoughtful question"
  comments_that_fail:
    - "Generic praise"
    - "Self-promotion"
    
learned_insights:
  - date: "2024-01-15"
    insight: "Posts with specific numbers in hooks get 40% more engagement"
    evidence: "Analyzed 30 posts, r=0.72"
    
  - date: "2024-01-10"
    insight: "DMs with <75 words have 2x reply rate"
    evidence: "A/B tested 50 messages each"
```

---

## A/B Testing Framework

### Variables to Test

**Hooks:**
- Same content, different hook type
- Same hook type, different specificity
- With/without numbers

**Format:**
- Text vs carousel (same content)
- With/without images
- Long vs short form

**CTAs:**
- Soft ask vs direct ask
- In post vs in comments
- Comment prompt type

**Timing:**
- Day of week
- Time of day
- Frequency

### Test Protocol

```yaml
test:
  name: "Hook Type: Contrarian vs Story"
  variable: "hook_type"
  control: "story"
  variant: "contrarian"
  
  methodology:
    sample_size: 10 # posts each
    duration: "4 weeks"
    controls:
      - "Same topics"
      - "Same posting time"
      - "Similar word count"
      
  metrics:
    primary: "engagement_rate"
    secondary: ["comments", "saves", "profile_visits"]
    
  results:
    control_avg: 0.025
    variant_avg: 0.041
    lift: 0.64 # 64% improvement
    confidence: 0.92
    
  conclusion: "Contrarian hooks significantly outperform story hooks for this audience"
  action: "Prioritize contrarian hooks, use story for variety"
```

---

## Benchmarks

### What "Good" Looks Like

```yaml
benchmarks:
  content:
    impressions:
      good: ">500"
      great: ">2000"
      viral: ">10000"
    engagement_rate:
      baseline: "1-2%"
      good: "2-4%"
      excellent: ">4%"
    
  outreach:
    connection_acceptance:
      cold: "30-40%"
      warm: "50-60%"
      hot: "70%+"
    message_reply:
      good: "15-20%"
      excellent: ">25%"
    meeting_conversion:
      good: "5-10%"
      excellent: ">15%"
      
  funnel:
    leads_per_post:
      good: "1-2"
      excellent: "3+"
    revenue_per_1000_followers:
      benchmark: "$100-500/month"
```

---

## Reporting Dashboard

### Weekly Snapshot

```markdown
# Week [X] Performance

## Content
- Posts: 3
- Total impressions: 8,500
- Avg engagement rate: 3.2%
- Best performer: "[Hook]" (4,200 imp, 4.8% ER)
- Worst performer: "[Hook]" (1,100 imp, 1.1% ER)

## Outreach
- Messages sent: 25
- Replies: 6 (24%)
- Meetings booked: 2

## Pipeline Impact
- New conversations: 8
- Leads generated: 3
- Revenue influenced: $5,000

## Patterns Noticed
- [Observation 1]
- [Observation 2]

## Next Week Focus
- Test [hypothesis]
- Double down on [winning pattern]
- Avoid [losing pattern]
```

---

## Self-Improving Prompts

When generating new content, reference patterns:

```
CONTEXT:
Based on performance data, here's what works for {user}:

TOP HOOKS: {patterns.hooks.top_performers}
WINNING TOPICS: {patterns.topics.hot}
AVOID: {patterns.hooks.underperformers}, {patterns.topics.cold}

RECENT LEARNINGS:
{patterns.learned_insights[-3:]}

Generate content that applies these patterns while maintaining voice.
```
