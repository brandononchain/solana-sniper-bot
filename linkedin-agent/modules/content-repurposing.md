# Content Repurposing Engine

Turn 1 piece of content into 10+ without extra work.

---

## The Problem

Creating content from scratch every time is:
- Time consuming
- Mentally draining  
- Inconsistent quality
- Wasted potential

## The Solution

**Every good piece of content contains 5-10 other pieces.**

---

## The Repurposing Matrix

```
           ┌─────────────────────────────────────────────┐
           │            ORIGINAL CONTENT                 │
           │     (Post, Article, Video, Podcast)         │
           └─────────────────┬───────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ EXTRACT │         │ REFRAME │         │ EXPAND  │
   │         │         │         │         │         │
   │• Quotes │         │• New    │         │• Deep   │
   │• Stats  │         │  angle  │         │  dive   │
   │• Tips   │         │• New    │         │• Series │
   │• Lists  │         │  format │         │• Thread │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                   │
        ▼                   ▼                   ▼
   [5-10 micro       [3-5 reframed      [2-3 expanded
    content pieces]   variations]        pieces]
```

---

## Repurposing Playbook

### From a LinkedIn Post → 10 Pieces

**Original post:** A tactical post that performed well

**Extract:**
1. **Quote graphic** — Pull the best 1-2 lines
2. **Single tip post** — Each tip becomes its own post
3. **Question post** — Turn the insight into a question
4. **Poll** — "Which of these resonates most?"

**Reframe:**
5. **Contrarian take** — Flip it and argue the opposite angle
6. **Story version** — Same lesson, wrapped in narrative
7. **Mistake version** — "The opposite of this is why people fail"
8. **Listicle version** — Expand into "7 ways to..."

**Expand:**
9. **Thread/carousel** — Deep dive into each point
10. **Article** — Full long-form with examples

---

### From an Article → 15 Pieces

**Original:** A 1500-word article or blog post

**Direct extracts:**
1. Summary post (key takeaways)
2. Each section → standalone post
3. Quote graphics (3-5 best lines)
4. Stats/data points → individual posts

**Reframes:**
5. Hot take version (controversial angle)
6. Beginner version (simplified)
7. Advanced version (deeper)
8. Industry-specific version (niche down)

**Formats:**
9. Carousel (visual summary)
10. Checklist post
11. Myth-busting post
12. Q&A format
13. Before/after format
14. Day-in-the-life application
15. Tool/resource companion

---

### From a Conversation/DM → 5 Pieces

**Original:** A great question someone asked you

1. **Q&A post** — "Someone asked me [X]. Here's what I said..."
2. **Myth post** — If it reveals a misconception
3. **Tactical post** — The answer, formatted as tips
4. **Story post** — The conversation as narrative
5. **Poll** — "What would YOU have said?"

---

### From Client Results → 8 Pieces

**Original:** A success story or case study

1. **Before/after post** — The transformation
2. **Lesson post** — What made it work
3. **Mistake post** — What they were doing wrong before
4. **Framework post** — The system you used
5. **Quote post** — Client testimonial as graphic
6. **Data post** — Specific numbers and results
7. **Timeline post** — Week-by-week or month-by-month
8. **Objection handler** — Address skepticism with proof

---

## Content Multiplication Formulas

### Formula 1: The Angle Spin

Take one insight, create posts from multiple angles:

```
Original: "Follow up is where deals are won"

Angles:
1. Data angle: "80% of deals close after 5+ follow-ups..."
2. Story angle: "I almost gave up on this prospect..."
3. Mistake angle: "Stop sending 1 email and calling it outreach..."
4. How-to angle: "My 5-touch follow-up sequence..."
5. Contrarian angle: "Follow-up isn't about persistence, it's about value..."
```

### Formula 2: The Audience Shift

Same content, different audience focus:

```
Original: A post about cold email

Shift to:
1. For founders: "Founders: Why you should own outbound before hiring..."
2. For SDRs: "SDRs: The template your manager hasn't shown you..."
3. For leaders: "Sales leaders: Stop blaming reps for bad outbound..."
4. For marketers: "Why marketing should care about cold email..."
```

### Formula 3: The Format Flip

Same insight, different formats:

```
Original: Text post about productivity

Flip to:
1. Carousel — Visual tips
2. Poll — "Which kills your productivity most?"
3. Story — "How I went from scattered to focused"
4. List — "5 productivity killers and fixes"
5. Question — "What's YOUR biggest time waster?"
```

---

## Evergreen Content Calendar

Build a rotation system:

```yaml
content_calendar:
  week_1:
    monday: "Original tactical post"
    wednesday: "Repurposed story version"
    friday: "Repurposed question/poll"
    
  week_2:
    monday: "New original"
    wednesday: "Repurposed from week 1 (different angle)"
    friday: "Best performer expanded"
    
  week_3:
    monday: "Client result post"
    wednesday: "Repurposed tips from result"
    friday: "Q&A from comments/DMs"
```

---

## The Repurposing Queue

Store content for repurposing:

```yaml
# vault/repurpose-queue.yaml

ready_to_repurpose:
  - original:
      type: "post"
      content: "Most sales advice is garbage..."
      performance: 15000
      date: "2024-01-10"
    repurposed:
      - type: "carousel"
        status: "done"
        performance: 8000
      - type: "story_version"
        status: "draft"
      - type: "contrarian_flip"
        status: "idea"
    remaining_angles:
      - "Industry-specific version"
      - "Beginner version"
      - "Data-backed version"

ideas_from_conversations:
  - question: "How do you handle objections?"
    source: "DM from follower"
    potential_posts:
      - "Q&A post"
      - "Framework post"
      - "Common mistakes post"
```

---

## Repurposing Prompts

### "Repurpose this post"

```
Take this content and create:
1. A story-based version
2. A data/numbers version  
3. A question/poll version
4. A contrarian angle

Keep my voice. Make each feel fresh, not repetitive.

Original:
[paste content]
```

### "Extract micro-content"

```
From this post, extract:
1. 3 standalone quotes (1-2 sentences each)
2. 2 individual tips that could be their own post
3. 1 question that could spark discussion

Original:
[paste content]
```

### "Multiply this for the month"

```
Turn this one post into a month of content:
- Week 1: Original + 2 variations
- Week 2: Expanded version + extracted tips
- Week 3: Story version + Q&A
- Week 4: Roundup + fresh angle

Original:
[paste content]
```

---

## Quality Control

Not all repurposing is good repurposing.

**✅ Good repurposing:**
- Feels fresh, not repetitive
- Adds new value or perspective
- Reaches different audience segment
- Appropriate time gap (2-4 weeks)

**❌ Bad repurposing:**
- Copy-paste with minor edits
- Posted too soon after original
- No new angle or value
- Feels lazy/obvious

---

## The 1:10 Rule

Every piece of content you create should have a plan to become 10 pieces.

**Before publishing, ask:**
1. What's the quote-worthy line?
2. What's the contrarian angle?
3. What story could illustrate this?
4. What question does this answer?
5. What format would this work in?

Plan the repurposing BEFORE you post the original.
