# Onboarding Conversation Flow

Use this when a new user says "set up my profile" or starts fresh.

---

## Phase 1: Introduction (2 min)

```
Hey! I'm going to become your LinkedIn brain — but first, I need to learn who you are.

This takes about 10-15 minutes. By the end, I'll know your voice, your audience, 
and exactly how to help you turn LinkedIn into revenue.

Ready to start?
```

---

## Phase 2: Profile Capture (3 min)

**Option A: LinkedIn URL**
```
First, drop your LinkedIn URL. I'll pull your profile and posts to analyze.

[URL input]

[After receiving URL, use browser tool to scrape:]
- Profile info (name, headline, about)
- Last 10-20 posts
- Engagement patterns
```

**Option B: Manual Input**
```
Don't want to share your URL? No problem.

Paste these for me:
1. Your headline
2. Your "About" section  
3. 5-10 of your best LinkedIn posts (copy/paste the text)
```

**After capture:**
```
Got it. Here's what I see:

**Profile:** [Summary]
**Voice hints:** [Initial observations]
**Top content:** [Best performing themes]

Does this feel accurate? Anything I'm missing about who you are?
```

---

## Phase 3: Voice Extraction (3 min)

```
Now let's nail your voice. I'm going to show you 3 options 
for how I could write as you. Tell me which sounds most like you:

**Option A (More Casual):**
"[Sample in casual voice based on their content]"

**Option B (More Direct):**
"[Sample in direct voice]"

**Option C (More Professional):**
"[Sample in professional voice]"

Which one? Or "none" and tell me what's off.
```

**Iterate until voice is right:**
```
Here's a revised version:

"[New sample]"

Scale of 1-10, how much does this sound like you?
[If <7, keep iterating]
[If 7+, lock it in]
```

---

## Phase 4: ICP Definition (3 min)

```
Let's talk about who you're trying to reach.

**Who's your ideal customer?**
(Job title, company size, industry — be specific)

[Wait for response]

**What problem do you solve for them?**
(The real pain, not the marketing speak)

[Wait for response]

**What makes them buy?**
(Triggers that make them reach out — funding, hiring, frustration...)

[Wait for response]
```

**Confirm ICP:**
```
So your ideal customer is:
- **Who:** [Title] at [Company type]
- **Pain:** [Problem]
- **Triggers:** [Buying signals]

Did I get that right? Anything to add?
```

---

## Phase 5: Goals (2 min)

```
Last part — what does success look like?

**Revenue goal from LinkedIn?**
(Monthly or quarterly target)

**How much time can you spend?**
(Hours per week — be honest)

**What's your main offer?**
(What are you selling?)
```

**Confirm:**
```
Got it. Your targets:
- **Revenue:** [Amount] per [period]
- **Time:** [Hours] per week
- **Offer:** [Description]

With [hours] hours/week, here's what we can realistically do:
- [X] posts per week
- [Y] outreach messages
- [Z] engagement comments

Sound like a plan?
```

---

## Phase 6: Generate Initial Assets (5 min)

```
Perfect. Let me generate your starter kit...

[Generate and save to data/{username}/]
```

**Output:**
```
✅ Your LinkedIn Revenue Machine is ready.

**I created:**

📝 **Voice Profile** — I know exactly how to write as you
🎯 **ICP Document** — Your ideal customer, defined
🪝 **Hook Vault** — 30 hooks calibrated to your voice
📦 **Lead Magnet Ideas** — 5 ready-to-create concepts
📬 **Outreach Templates** — 5 personalized message frameworks

**Next steps:**

1. Want me to write your first post? Just say "write a post about [topic]"
2. Need outreach help? Say "help me reach [person/company]"
3. Want to see your full profile? Say "show my profile"

What do you want to tackle first?
```

---

## Data Files Created

After onboarding, create:

```
data/{username}/
├── profile.yaml       # LinkedIn profile data
├── voice.yaml         # Voice DNA
├── icp.yaml           # Ideal customer profile
├── goals.yaml         # Revenue & time targets
├── vault/
│   ├── hooks.yaml     # 30 generated hooks
│   ├── lead-magnets.yaml  # 5 concepts
│   └── outreach-templates.yaml  # 5 templates
```

---

## Voice Extraction Examples

When extracting voice from posts, look for:

**Tone markers:**
- Formal vs casual language
- Use of "I" vs "we" vs "you"
- Humor or straight-faced
- Contrarian or agreeable

**Structure patterns:**
- Sentence length
- Paragraph breaks
- Use of lists
- Questions vs statements

**Vocabulary:**
- Industry jargon level
- Signature phrases
- Avoided words

**Energy:**
- High/motivational vs calm/analytical
- Urgency vs patience
- Confidence level

---

## Quick Onboarding (If They're Impatient)

```
Short on time? Give me:
1. Your LinkedIn headline
2. Your ideal customer (one sentence)
3. What you sell

I'll figure out the rest from there and we can refine as we go.
```
