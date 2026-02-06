# DM Sequences & Conversation Flows

Turn cold connections into warm conversations into revenue.

---

## The DM Philosophy

DMs aren't for pitching. They're for starting conversations.

**The goal:** Get to a real conversation (call/meeting), not close in the DM.

---

## The Connection → Conversation Flow

```
CONNECT (with note)
    ↓ [they accept]
    ↓ wait 24-48 hours
FIRST DM (value, not pitch)
    ↓ [they respond]
CONVERSATION (build rapport)
    ↓ [natural progression]
BRIDGE (to call/meeting)
    ↓ [they agree]
CALL → REVENUE
```

**If no response at any stage → Follow-up sequence**

---

## Connection Request Notes

**The formula:** Specific + Relevant + No Ask

### Template 1: Content-Based
```
Hey [Name] — your post about [specific topic] hit home. 
Especially [specific point]. Would love to connect.
```

### Template 2: Mutual Interest
```
[Name] — noticed we're both in [space/interest]. 
Your take on [thing] was refreshing. Let's connect.
```

### Template 3: Mutual Connection
```
Hey [Name] — [Mutual] and I were talking about [topic], 
and your name came up. Would love to connect.
```

### Template 4: Compliment + Relevance
```
[Name] — been following your content on [topic]. 
Your perspective on [specific thing] is unique. Connecting.
```

**What NOT to do:**
```
❌ "I'd like to add you to my professional network" (default = lazy)
❌ "I help [ICPs] achieve [outcome]..." (pitch = instant ignore)
❌ "Let's connect and explore synergies" (corporate = delete)
```

---

## First DM Sequences

### Sequence A: The Value Lead

**Day 0 (After Accept):** Wait. Don't message immediately.

**Day 1-2 (First Message):**
```
Hey [Name] — thanks for connecting!

I saw your [post/comment] about [topic]. 
[Your brief relevant insight or experience, 1-2 sentences].

[Genuine question about their situation]

Would love to hear your take.
```

**Why it works:**
- References something specific (not generic)
- Adds value before asking
- Open-ended question invites response
- No pitch

---

### Sequence B: The Resource Share

**First Message:**
```
[Name] — saw you're working on [challenge/goal].

I put together a [resource] on exactly that topic.
[1-sentence description of what it covers]

Want me to send it over? No strings.
```

**Why it works:**
- Directly relevant to their situation
- Offers immediate value
- "No strings" reduces resistance
- Opens door to conversation

---

### Sequence C: The Question Start

**First Message:**
```
Hey [Name] — question for you.

[Specific, thoughtful question related to their expertise/situation]

I've been [brief context on why you're asking].

Curious your take.
```

**Why it works:**
- People love answering questions
- Shows genuine interest
- Creates reason for back-and-forth
- Positions them as expert

---

### Sequence D: The Warm Intro

**First Message (when you have mutual connection):**
```
[Name] — [Mutual] mentioned you're doing [interesting thing].

[Specific compliment or observation]

Would love to swap notes sometime if you're open.
```

---

## Follow-Up Sequences

Most conversations die from lack of follow-up.

### No Response Flow

**After 3-4 days:**
```
Hey [Name] — circling back.

[Add something new: resource, insight, or different angle]

Either way, hope [relevant wish: product launch goes well, etc.]
```

**After 7-10 days:**
```
[Name] — last thought on this.

[Different angle or new value add]

If timing's not right, totally get it. 
[Soft close: "Happy to connect down the road"]
```

**After 14 days (break-up):**
```
[Name] — I'll assume timing isn't right, which is fine.

If [situation] ever becomes a priority, happy to reconnect.

Best with [their goal].
```

---

### Response But No Momentum

When they reply but conversation stalls:

**Re-engagement:**
```
Hey [Name] — was just thinking about our conversation on [topic].

[New insight, question, or resource]

How's [thing they mentioned] going?
```

---

## Conversation → Call Bridge

When the conversation is flowing, bridge to a call:

### Soft Bridge
```
This is great — feels like we could riff on this for hours.

Any interest in jumping on a quick call? 
No agenda, just would be good to connect properly.
```

### Value Bridge
```
I have some thoughts on [their challenge] that are easier to explain live.

Open to a 15-20 min chat this week?
```

### Direct Bridge
```
[Name] — I think I might be able to help with [specific thing].

Worth a quick call to see if there's a fit?

No pressure either way.
```

### Calendar Bridge
```
Let's make this easier — here's my calendar: [link]

Grab whatever works for you.
```

---

## Objection Handling in DMs

### "Not interested"
```
Totally fair — appreciate the honesty.

If anything changes, door's always open.

Best of luck with [their goal].
```

### "Too busy right now"
```
Completely understand — timing is everything.

Mind if I check back in [timeframe]?

Either way, no pressure.
```

### "What's this about?"
```
Fair question — I should've been clearer.

[Brief, honest explanation — no pitch]

Thought there might be some overlap worth exploring.
```

### "Send me info"
```
Sure — what specifically would be most helpful?

[Wait for response, then send relevant info only]
```

### "Not a fit"
```
Appreciate you letting me know.

Out of curiosity, what would make it a fit? 
(Just for my own learning)

Either way, all good.
```

---

## DM Templates Vault

```yaml
# outreach/dm-templates.yaml

connection_notes:
  content_based:
    template: "Hey {name} — your post about {topic} hit home..."
    best_for: ["engaged_with_content"]
    reply_rate: 0.55
    
  mutual_interest:
    template: "..."
    best_for: ["shared_niche"]
    reply_rate: 0.48

first_messages:
  value_lead:
    template: "..."
    best_for: ["icp_match", "engaged_prospect"]
    reply_rate: 0.22
    
  resource_share:
    template: "..."
    best_for: ["clear_pain_point"]
    reply_rate: 0.25

follow_ups:
  day_3:
    template: "..."
    reply_rate: 0.15
    
  day_7:
    template: "..."
    reply_rate: 0.12

bridges:
  soft:
    template: "..."
    conversion_rate: 0.30
```

---

## DM Tracking

```yaml
# outreach/dm-tracking.yaml

conversations:
  - prospect: "Sarah Chen"
    company: "TechCorp"
    title: "VP Sales"
    
    timeline:
      - date: "2024-01-15"
        action: "connection_sent"
        note: "Content-based connection note"
        
      - date: "2024-01-16"
        action: "connection_accepted"
        
      - date: "2024-01-17"
        action: "first_dm"
        template: "value_lead"
        
      - date: "2024-01-17"
        action: "response"
        sentiment: "positive"
        notes: "Interested, asked follow-up question"
        
      - date: "2024-01-19"
        action: "bridge_attempted"
        
      - date: "2024-01-20"
        action: "call_scheduled"
        
    status: "call_scheduled"
    call_date: "2024-01-25"
    next_action: "Prep for call"
```

---

## Anti-Patterns

❌ **Pitching in first message** — Earn the conversation first
❌ **Novel-length messages** — Keep it under 100 words
❌ **Multiple asks** — One ask at a time
❌ **Generic follow-ups** — Add new value each time
❌ **Giving up too soon** — Most replies come from follow-up 2-3
❌ **Pushing after rejection** — Graceful exit > burned bridge
❌ **Automation feel** — They can tell, everyone can tell

---

## The Golden Rules

1. **Be human** — Write like you're texting a colleague
2. **Be relevant** — Reference something specific about them
3. **Be patient** — Relationships take time
4. **Be valuable** — Give before asking
5. **Be brief** — Respect their time
6. **Be persistent** — Follow up without being annoying
7. **Be graceful** — Know when to exit
