# Outbound Revival System

Intent-based outreach that gets replies, not ignored.

## The Problem

Traditional outbound is dead:
- Generic templates → Ignored
- Pitch-first → Deleted  
- Mass spray → Spam folder
- No personalization → No trust

## The Solution

**Intent-based, voice-matched outreach that earns the right to a conversation.**

---

## The Outbound Philosophy

```
OLD WAY:
"Hi [Name], I help [ICPs] with [thing]. Want to chat?"
→ 2% reply rate, 0.5% meeting rate

NEW WAY:
[Specific observation] + [Value bridge] + [Permission-based ask]
→ 15-25% reply rate, 5-10% meeting rate
```

---

## The 4 Intent Signals

### 1. Pain Signal
They're complaining about something you solve.

**Triggers:**
- Posts about frustrations
- Comments asking for help
- Questions in groups

**Example post:**
> "Spent 3 hours on a proposal that went nowhere. Again."

**Response approach:**
- Empathize genuinely
- Share relevant experience
- Offer specific insight (not pitch)

---

### 2. Buying Signal
They're actively looking for solutions.

**Triggers:**
- "Looking for recommendations..."
- "Anyone know a good [X]..."
- Hiring for roles you could fill
- Comparing tools/services

**Example post:**
> "Scaling our sales team. Anyone have agency recs?"

**Response approach:**
- Be helpful first (give recommendations)
- Mention relevant experience casually
- Don't pitch in the comment

---

### 3. Trigger Event
Something changed in their business.

**Triggers:**
- New funding announced
- New role/promotion
- Company milestone
- Team expansion
- Product launch

**Response approach:**
- Congratulate specifically
- Connect to relevant value
- Time-sensitive angle

---

### 4. Engagement Signal
They've engaged with YOU.

**Triggers:**
- Liked your post
- Commented on your content
- Viewed your profile
- Connected with you

**Response approach:**
- Acknowledge the engagement
- Continue the conversation
- Add value before asking

---

## Message Frameworks

### Framework 1: The Observation Opener

```
Hey [Name],

Your [post/comment] about [specific thing] caught my attention — 
especially [specific point that resonated].

[Brief relevant experience or insight, 1-2 sentences]

[Soft ask or value offer]

[Name]
```

**Example:**
> Hey Sarah,
> 
> Your post about struggling with outbound conversion really hit home — 
> especially the part about "personalization theater" (love that phrase).
> 
> We dealt with the same thing and found that [insight].
> 
> Would you be open to swapping notes? I have some data that might help.
> 
> John

---

### Framework 2: The Value-First

```
Hey [Name],

[Observation that shows you did your homework]

I put together [specific resource] that addresses [their problem].

Want me to send it over? No strings.

[Name]
```

**Example:**
> Hey Mike,
> 
> Saw you're scaling the sales team — congrats on the growth.
> 
> I have a hiring scorecard we used to cut mis-hires by 60% 
> when we went through the same phase.
> 
> Want me to send it? Figured it might save you some headaches.
> 
> Sarah

---

### Framework 3: The Mutual Connection

```
Hey [Name],

[Connection] mentioned you're working on [thing].

I've been [relevant experience] and thought there might be 
some overlap worth exploring.

Would a quick chat make sense?

[Name]
```

---

### Framework 4: The Trigger Response

```
Hey [Name],

Congrats on [specific trigger event] — that's a big milestone.

When [similar companies] hit this stage, they usually face [problem].

If that's on your radar, I have some thoughts that might help.

Worth a 15-min chat?

[Name]
```

---

### Framework 5: The Engagement Follow-Up

```
Hey [Name],

Thanks for [the like/comment/connection] — appreciate you.

Your [content/profile/company] stood out because [specific reason].

[Question or conversation starter]

[Name]
```

---

## The Follow-Up Sequence

Most replies come from follow-ups, not initial messages.

### Sequence Structure

```
Day 0: Initial message
Day 3: Follow-up #1 (add value)
Day 7: Follow-up #2 (different angle)
Day 14: Follow-up #3 (break-up or last try)
```

### Follow-Up Templates

**Follow-Up #1: Add Value**
```
Hey [Name],

Following up — also wanted to share [relevant resource/insight] 
that might be useful regardless.

[Brief description]

Let me know if helpful.
```

**Follow-Up #2: Different Angle**
```
Hey [Name],

Different thought — I noticed [new observation about them].

[New relevant connection or insight]

Worth connecting?
```

**Follow-Up #3: The Break-Up**
```
Hey [Name],

I'll assume timing isn't right — totally get it.

If [problem] ever becomes a priority, happy to reconnect.

Best with [their goal].
```

---

## Intent Monitoring System

### Daily Routine
1. Check profile viewers (who's looking at you?)
2. Check post engagement (who's engaging?)
3. Search for pain keywords in niche
4. Monitor target accounts for triggers

### Keywords to Monitor
```yaml
pain_keywords:
  - "struggling with"
  - "frustrated by"
  - "anyone have experience"
  - "need help with"
  - "looking for recommendations"
  
trigger_keywords:
  - "excited to announce"
  - "just raised"
  - "we're hiring"
  - "promoted to"
  - "joining [company]"
```

### Tracking Template
```yaml
# outreach/tracking.yaml

active_outreach:
  - name: "Sarah Johnson"
    company: "TechCorp"
    title: "VP Sales"
    intent_signal: "pain_post"
    signal_detail: "Posted about outbound struggles"
    first_contact: "2024-01-15"
    status: "follow_up_1"
    messages:
      - date: "2024-01-15"
        template: "observation_opener"
        opened: true
        replied: false
      - date: "2024-01-18"
        template: "add_value"
        opened: true
        replied: true
        notes: "Interested, asked for resource"
    next_action: "Send resource, propose call"
    next_date: "2024-01-19"
```

---

## Connection Request Strategy

### Before Connecting
- Have a reason (not just "expand my network")
- Check for mutual connections
- Read their recent content

### Connection Note Template
```
Hey [Name] — [specific reason you're connecting].
[Brief credibility or mutual interest].
Would love to connect.
```

**Example:**
> Hey Sarah — loved your take on sales automation vs personalization. 
> Running into similar debates with our team.
> Would love to connect.

### After They Accept
- Don't pitch immediately
- Engage with their content first
- Wait 2-3 days before messaging
- Reference something specific

---

## Personalization at Scale

### Tier 1: High-Value (Full Custom)
- Dream accounts
- 5-10 per week
- Deep research
- Fully customized message

### Tier 2: Warm Leads (Template + Custom)
- Good fit, some intent signal
- 20-30 per week
- Template framework + personalized opener
- 2-3 custom elements

### Tier 3: Qualified (Smart Template)
- Right ICP, no specific signal
- 50+ per week
- Strong template with merge fields
- 1 personalized element

---

## Anti-Patterns

❌ **Pitch in first message** — Earn the right first
❌ **Fake personalization** — "I love your content" (which content?)
❌ **The novel** — Keep it short, under 100 words
❌ **All about you** — Focus on them
❌ **No follow-up** — Most replies come from F/U 2 or 3
❌ **Generic connection requests** — "I'd like to add you to my network"
❌ **Immediate pitch after connect** — Let them breathe

---

## Metrics to Track

```yaml
outreach_metrics:
  connection_requests:
    sent: 100
    accepted: 45
    rate: 0.45
    
  initial_messages:
    sent: 45
    opened: 38
    replied: 8
    reply_rate: 0.18
    
  follow_ups:
    sent: 37
    replied: 6
    
  total_conversations: 14
  meetings_booked: 5
  meeting_rate: 0.11  # from accepted connections
  
  revenue_attributed: 25000
```

---

## Templates Vault

Store templates in `/outreach/templates.yaml`:

```yaml
templates:
  observation_opener:
    name: "Observation Opener"
    best_for: "pain_signal"
    reply_rate: 0.22
    template: |
      Hey {name},
      
      Your {content_type} about {topic} caught my attention —
      especially {specific_point}.
      
      {relevant_insight}
      
      {soft_ask}
      
      {my_name}
      
  value_first:
    name: "Value-First"
    best_for: "buying_signal"
    reply_rate: 0.19
    template: |
      ...
```
