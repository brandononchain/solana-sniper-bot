# Context Schema — LinkedIn Revenue Machine

This defines how user context is structured and stored for persistent memory across sessions.

## Directory Structure

```
data/{username}/
├── profile.yaml          # LinkedIn profile data
├── voice.yaml            # Voice DNA extraction
├── icp.yaml              # Ideal customer profile
├── goals.yaml            # Revenue and growth targets
├── performance.yaml      # Historical performance data
├── patterns.yaml         # Learned patterns (what works)
├── vault/
│   ├── hooks.yaml        # Proven hooks library
│   ├── frameworks.yaml   # Content frameworks
│   ├── lead-magnets.yaml # Lead magnet ideas/assets
│   ├── case-studies.yaml # Success stories
│   └── testimonials.yaml # Social proof
├── outreach/
│   ├── templates.yaml    # Message templates
│   ├── sequences.yaml    # Follow-up sequences
│   └── tracking.yaml     # Who, when, response
└── engagement/
    ├── targets.yaml      # High-value accounts to engage
    ├── intent-signals.yaml # Buying/hiring signals spotted
    └── history.yaml      # Engagement history
```

---

## Schema Definitions

### profile.yaml
```yaml
# Core identity
name: "John Smith"
headline: "Helping B2B SaaS founders 2x pipeline without cold calls"
about: |
  Full about section text...
  
current_role:
  title: "Founder"
  company: "Pipeline Labs"
  duration: "2 years"

experience:
  - title: "VP Sales"
    company: "TechCorp"
    duration: "3 years"
    highlights:
      - "Built team from 0 to 20"
      - "Scaled ARR to $10M"

skills:
  - Sales
  - LinkedIn
  - B2B Marketing

featured:
  - type: "post"
    url: ""
    engagement: 50000
  - type: "article"
    url: ""
    
connections: 12500
followers: 8000
profile_url: "https://linkedin.com/in/johnsmith"
last_updated: "2024-01-15"
```

### voice.yaml
```yaml
# Voice DNA — what makes them THEM

tone:
  primary: "conversational"      # formal/casual/provocative/warm
  secondary: "slightly irreverent"
  energy: "high but not manic"

cadence:
  sentence_length: "varied"      # short/medium/long/varied
  paragraph_style: "punchy"      # dense/airy/punchy
  uses_line_breaks: true
  uses_lists: true

vocabulary:
  signature_phrases:
    - "Here's the thing..."
    - "Let me be real"
    - "The unsexy truth"
  power_words:
    - "pipeline"
    - "revenue"
    - "actually works"
  avoided_words:
    - "synergy"
    - "leverage"
    - "value proposition"
    - "thought leader"
  swears: false                  # true/false
  
style:
  uses_stories: true
  uses_data: true
  uses_questions: true
  contrarian_level: "medium"     # low/medium/high
  emoji_usage: "minimal"         # none/minimal/moderate/heavy
  hashtag_usage: "none"          # none/minimal/moderate

examples:
  # Actual posts that capture their voice
  - content: |
      Most sales advice is garbage.
      
      "Just add more value!"
      "Be authentic!"
      "Build relationships!"
      
      Cool. My rent is due Thursday.
      
      Here's what actually moves pipeline...
    engagement: 15000
    why_it_worked: "Contrarian opener, real stakes, practical promise"
    
  - content: |
      # Another example
    engagement: 8000
    why_it_worked: ""
```

### icp.yaml
```yaml
# Ideal Customer Profile

primary:
  title: 
    - "Founder"
    - "CEO"
    - "Head of Sales"
  company_size: "10-200 employees"
  industry: "B2B SaaS"
  revenue_range: "$1M-$20M ARR"
  
pain_points:
  - "Pipeline is unpredictable"
  - "Outbound isn't working anymore"
  - "Content takes too long"
  - "Can't find good salespeople"
  
buying_triggers:
  - "Just raised funding"
  - "Hiring for sales roles"
  - "Complaining about pipeline"
  - "Asking for recommendations"
  - "Posting about growth challenges"

objections:
  - objection: "I don't have time for LinkedIn"
    response: "That's exactly why you need a system"
  - objection: "LinkedIn doesn't work for B2B"
    response: "Show competitor success stories"
    
language_they_use:
  - "pipeline"
  - "revenue"
  - "ARR"
  - "MRR"
  - "quota"
  - "close rate"

where_they_hang_out:
  - "SaaS founders groups"
  - "Sales communities"
  - "Startup LinkedIn"
  
influencers_they_follow:
  - "name1"
  - "name2"
```

### goals.yaml
```yaml
# What success looks like

revenue:
  target_monthly: 50000
  current_monthly: 20000
  primary_offer: "Consulting"
  avg_deal_size: 5000
  
pipeline:
  leads_needed_monthly: 20
  current_leads_monthly: 5
  conversion_rate: 0.25
  
linkedin_metrics:
  followers_target: 20000
  current_followers: 8000
  post_frequency: "3x/week"
  engagement_goal: "2%"
  
time_investment:
  max_hours_weekly: 5
  current_hours_weekly: 10
```

### performance.yaml
```yaml
# What's working (and what isn't)

posts:
  total_analyzed: 50
  avg_engagement: 500
  
top_performers:
  - content_snippet: "Most sales advice is garbage..."
    engagement: 15000
    hook_type: "contrarian"
    topic: "sales"
    cta_type: "soft"
    posted: "2024-01-10"
    leads_generated: 5
    
  - content_snippet: ""
    engagement: 0
    hook_type: ""
    topic: ""
    cta_type: ""
    posted: ""
    leads_generated: 0

worst_performers:
  - content_snippet: "Excited to announce..."
    engagement: 50
    hook_type: "announcement"
    why_failed: "Generic, no value"
    
patterns_identified:
  hooks_that_work:
    - "Contrarian opener"
    - "Specific number"
    - "Story setup"
  hooks_that_fail:
    - "Announcement style"
    - "Generic question"
  topics_that_work:
    - "Tactical sales advice"
    - "Pipeline stories"
  topics_that_fail:
    - "Motivational"
    - "Meta LinkedIn content"
  best_posting_time: "8-9am EST Tue/Wed/Thu"
  best_content_length: "medium (500-800 chars)"

outreach:
  total_sent: 100
  reply_rate: 0.15
  meeting_rate: 0.05
  best_opener_type: "observation-based"
  worst_opener_type: "pitch-first"
```

### patterns.yaml
```yaml
# Learned patterns from analysis

viral_patterns:
  - pattern: "Contrarian + Specific + Stakes"
    example: "Most X advice is garbage. Here's what actually works."
    success_rate: 0.7
    
  - pattern: "Story + Lesson + Framework"
    example: "Last week I lost a $50k deal. Here's what I learned..."
    success_rate: 0.6

hook_patterns:
  tested: 50
  winners:
    - pattern: "[Number] [things] I learned [doing X]"
      success_rate: 0.65
    - pattern: "Stop [common mistake]. Do [this] instead."
      success_rate: 0.6
  losers:
    - pattern: "I'm excited to announce..."
      success_rate: 0.1
      
cta_patterns:
  best: "soft ask in comments"
  worst: "hard pitch in post"
  
engagement_patterns:
  best_comment_style: "add insight + question"
  best_dm_opener: "specific observation from their content"
```

---

## Usage

### Loading Context
```python
# Pseudo-code for context loading
def load_user_context(username):
    base = f"data/{username}"
    return {
        "profile": load_yaml(f"{base}/profile.yaml"),
        "voice": load_yaml(f"{base}/voice.yaml"),
        "icp": load_yaml(f"{base}/icp.yaml"),
        "goals": load_yaml(f"{base}/goals.yaml"),
        "performance": load_yaml(f"{base}/performance.yaml"),
        "patterns": load_yaml(f"{base}/patterns.yaml"),
        "hooks": load_yaml(f"{base}/vault/hooks.yaml"),
    }
```

### Updating Context
After each interaction, update relevant files:
- New post? → Update performance.yaml
- New pattern found? → Update patterns.yaml
- Voice clarification? → Update voice.yaml

### Context Size
Estimated tokens per user:
- profile.yaml: ~500 tokens
- voice.yaml: ~800 tokens  
- icp.yaml: ~400 tokens
- goals.yaml: ~200 tokens
- performance.yaml: ~1000 tokens
- patterns.yaml: ~600 tokens
- vault/*: ~2000 tokens

**Total per user: ~5,500 tokens**

This allows holding multiple users in context simultaneously while staying well under limits.
