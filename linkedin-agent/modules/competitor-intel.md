# Competitor Intelligence Module

Learn from what's working for others without copying.

---

## The Philosophy

Competitors aren't enemies — they're free R&D.

**What we're doing:**
- Learning what resonates with shared audience
- Extracting patterns, not copying content
- Finding gaps they're missing
- Identifying differentiation opportunities

**What we're NOT doing:**
- Plagiarizing content
- Stalking or harassment
- Anything sketchy

---

## Competitor Analysis Framework

### Step 1: Identify Competitors

**Direct competitors:**
- Same offer to same audience
- Fighting for same customers

**Content competitors:**
- Different offer, same audience
- Competing for attention, not deals

**Aspirational competitors:**
- Where you want to be in 2 years
- Learn their trajectory

```yaml
competitors:
  direct:
    - name: "@competitor1"
      url: ""
      what_they_sell: ""
      followers: 50000
      priority: "high"
      
  content:
    - name: "@thought_leader"
      url: ""
      niche: "Same audience, different angle"
      followers: 100000
      priority: "medium"
      
  aspirational:
    - name: "@industry_giant"
      url: ""
      notes: "Where I want to be"
      followers: 500000
      priority: "low"
```

### Step 2: Content Audit

For each competitor, analyze:

```yaml
content_audit:
  competitor: "@name"
  date: "2024-01-15"
  
  posting_patterns:
    frequency: "4x/week"
    best_days: ["Tuesday", "Thursday"]
    best_times: ["8am EST"]
    
  content_types:
    tactical_posts: 40%
    story_posts: 30%
    engagement_posts: 20%
    promotional: 10%
    
  top_performers:
    - content: "[Hook of their viral post]"
      engagement: 50000
      why_it_worked: "Specific number + contrarian take"
      pattern: "data_drop + challenge"
      
    - content: "[Another top post]"
      engagement: 35000
      why_it_worked: ""
      pattern: ""
      
  hooks_they_use:
    common_patterns:
      - "Story setup (40% of posts)"
      - "Contrarian (30%)"
      - "List (20%)"
    signature_phrases:
      - "Here's the truth..."
      - "Nobody talks about this..."
      
  topics_that_work:
    hot:
      - "Tactical sales advice"
      - "Personal stories"
    cold:
      - "Motivational content"
      - "Generic tips"
      
  engagement_patterns:
    avg_likes: 500
    avg_comments: 50
    comment_quality: "High - lots of discussion"
    
  weaknesses:
    - "Never posts carousels"
    - "Weak CTAs"
    - "Doesn't respond to comments"
```

### Step 3: Gap Analysis

Find what they're NOT doing:

```yaml
gaps:
  content_gaps:
    - "No one is talking about [topic]"
    - "Everyone does [X], no one does [Y]"
    - "Missing the [audience segment] angle"
    
  format_gaps:
    - "No one does video well"
    - "Carousels underutilized"
    - "No newsletters in niche"
    
  voice_gaps:
    - "Everyone is too [formal/casual]"
    - "No one brings [humor/data/stories]"
    - "Missing [vulnerability/confidence]"
    
  engagement_gaps:
    - "No one responds to comments"
    - "No community building"
    - "No collaboration"
```

### Step 4: Differentiation Strategy

Based on gaps, define your edge:

```yaml
differentiation:
  content:
    they_do: "Generic tips"
    you_do: "Specific frameworks with numbers"
    
  voice:
    they_are: "Corporate and polished"
    you_are: "Direct and slightly irreverent"
    
  format:
    they_use: "Text posts only"
    you_use: "Mix of text, carousels, stories"
    
  engagement:
    they_do: "Post and ghost"
    you_do: "Respond to every comment, build relationships"
    
  positioning:
    they_claim: "Expert"
    you_claim: "Practitioner who shares what's working now"
```

---

## Competitive Monitoring

### Weekly Check (15 min)

```
□ Scan top 3 competitors' recent posts
□ Note any viral content (what made it work?)
□ Note any new topics/angles
□ Check their engagement patterns
```

### Monthly Deep Dive (1 hour)

```
□ Full content audit of 1 competitor
□ Update competitive analysis files
□ Identify new gaps/opportunities
□ Adjust strategy if needed
```

### Trigger-Based Monitoring

Watch for:
- New lead magnets they launch
- New content series
- Positioning changes
- Viral moments
- Failures/backlash

---

## Pattern Extraction

### What to Extract (Ethical)

✅ **Patterns:**
- Hook structures that work
- Content formats
- Posting cadence
- Topic selection

✅ **Insights:**
- What the audience responds to
- Common questions in comments
- Objections people raise

✅ **Gaps:**
- What they're not covering
- Where they're weak

### What NOT to Do

❌ Copy their content
❌ Steal their frameworks (create your own)
❌ Imitate their voice
❌ Screenshot and repost
❌ Plagiarize with minor changes

---

## Reverse Engineering Viral Posts

When a competitor has a hit, dissect it:

```yaml
viral_breakdown:
  original:
    author: "@competitor"
    hook: "Most sales advice is garbage."
    engagement: 100000
    
  analysis:
    hook_pattern: "Contrarian"
    hook_elements:
      - Challenges common belief
      - Creates tension
      - Promises alternative
      
    structure:
      - Hook (contrarian claim)
      - Examples of bad advice
      - Pivot ("Here's what works")
      - Tactical breakdown
      - Landing line
      
    why_it_worked:
      - Universal pain point
      - Specific and tactical
      - Not just criticism, offers solution
      - Good formatting (easy to read)
      - Posted at optimal time
      
  how_to_apply:
    angle_for_me: "Apply same pattern to [my topic]"
    my_version_hook: "[My contrarian take on my niche]"
    differentiation: "Add data/proof they didn't include"
```

---

## Competitor Content Ideas

Turn competitor analysis into your content:

### "Better than" Content
They posted something good → You post something better
- More specific
- Better examples
- Different angle
- Updated information

### "Response" Content
They made a claim → You offer alternative perspective
- Not attacking them
- Adding to the conversation
- Showing your expertise

### "Gap filler" Content
They missed something → You cover it
- Topic they avoided
- Audience they ignored
- Format they don't use

### "Remix" Content
Their pattern + Your topic + Your voice
- Same structure, different substance
- Inspired by, not copied from

---

## Tracking File

```yaml
# data/{user}/competitors.yaml

competitors:
  - handle: "@competitor1"
    name: "John Smith"
    url: "linkedin.com/in/johnsmith"
    followers: 50000
    niche: "B2B sales"
    priority: "track_closely"
    
    top_content:
      - hook: "..."
        engagement: 0
        date: ""
        
    patterns:
      hooks: []
      topics: []
      formats: []
      
    weaknesses:
      - ""
      
    last_analyzed: "2024-01-15"

opportunities:
  gaps_to_fill:
    - ""
  angles_to_try:
    - ""
  differentiation:
    - ""
```

---

## Ethical Guidelines

**Compete on value, not imitation.**

1. Learn patterns, create original content
2. Credit when appropriate
3. Don't bash competitors publicly
4. Focus on being better, not tearing down
5. Build your own thing

**Remember:** Your competitors can see your content too. Post things you'd be proud of if they read it.
