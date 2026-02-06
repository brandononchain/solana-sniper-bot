# Hook Vault Builder

Reverse-engineer viral posts → Extract patterns → Generate calibrated hooks.

## The Philosophy

The first line determines if anyone reads the rest. 90% of LinkedIn content dies because the hook is weak.

---

## Hook Anatomy

```
┌─────────────────────────────────────────┐
│           THE SCROLL STOP               │
├─────────────────────────────────────────┤
│                                         │
│  PATTERN        What type of hook       │
│       +                                 │
│  SPECIFICITY    Concrete details        │
│       +                                 │
│  STAKES         Why should I care       │
│       =                                 │
│  SCROLL STOP    They read the rest      │
│                                         │
└─────────────────────────────────────────┘
```

---

## The 12 Hook Patterns

### 1. The Contrarian
Challenge conventional wisdom.

```
"Most [common belief] is wrong."
"Stop [thing everyone does]."
"[Popular advice] is killing your [outcome]."
```

**Example:**
> "Most networking advice is garbage.
> 'Just add value!'
> Cool. But my rent is due Thursday."

**Why it works:** Creates tension, promises alternative truth.

---

### 2. The Transformation
Before → After story setup.

```
"I went from [bad state] to [good state] in [timeframe]."
"[X time] ago I was [struggling]. Now I [winning]."
"This one change took me from [A] to [B]."
```

**Example:**
> "18 months ago I was making $4k/month freelancing.
> Last month I did $47k.
> Here's the single change that did it:"

**Why it works:** Concrete proof something is possible.

---

### 3. The Listicle
Number-driven promise.

```
"[Number] [things] that [outcome]."
"[Number] lessons from [experience]."
"[Number] mistakes [audience] make with [topic]."
```

**Example:**
> "7 cold email mistakes that killed my reply rate
> (and what I do now instead):"

**Why it works:** Clear scope, easy to consume.

---

### 4. The Story Setup
Pull them into a narrative.

```
"Last [timeframe], something happened..."
"I still remember the day when..."
"The email came at [time]..."
```

**Example:**
> "Last Tuesday, I lost a $50,000 deal.
> On a call that lasted 12 minutes.
> Here's what went wrong:"

**Why it works:** Humans are wired for stories.

---

### 5. The Pattern Interrupt
Say something unexpected.

```
"[Unusual statement that makes them stop]"
"I [did something weird]. Here's why."
"[Thing] isn't what you think it is."
```

**Example:**
> "I fired my best client last month.
> They paid $10k/month.
> It was the best decision I made all year."

**Why it works:** Breaks mental patterns, creates curiosity.

---

### 6. The Data Drop
Lead with specific numbers.

```
"[Specific number] [result] from [action]."
"I analyzed [X] and found [Y]."
"[Percentage] of [audience] [do this wrong]."
```

**Example:**
> "I analyzed 500 viral LinkedIn posts.
> 73% follow the same formula.
> Here it is:"

**Why it works:** Specificity = credibility.

---

### 7. The Direct Address
Call out the audience.

```
"If you're a [audience] who [situation], read this."
"To every [audience] struggling with [problem]:"
"[Audience]: Stop doing [thing]."
```

**Example:**
> "To every founder who thinks LinkedIn is a waste of time:
> You're not wrong.
> But you're missing something."

**Why it works:** Self-selection + relevance.

---

### 8. The Vulnerable Share
Open with honesty.

```
"I failed at [thing]. Here's what I learned."
"I was wrong about [thing]."
"Here's something I don't talk about..."
```

**Example:**
> "I've been lying to you.
> Every 'overnight success' post I've written?
> Took 4 years of failure first."

**Why it works:** Authenticity stands out.

---

### 9. The Hot Take
Strong opinion that divides.

```
"[Controversial opinion]."
"Unpopular opinion: [take]."
"I don't care what anyone says — [belief]."
```

**Example:**
> "Unpopular opinion:
> Hustle culture isn't the problem.
> Hustling on the wrong things is."

**Why it works:** Engagement through agreement OR disagreement.

---

### 10. The Question
Open with genuine curiosity.

```
"Why do [audience] keep [doing thing]?"
"What would happen if [scenario]?"
"Has anyone else noticed [observation]?"
```

**Example:**
> "Why do founders keep hiring salespeople before they can sell themselves?
> 
> I've seen this kill 3 companies this year alone."

**Why it works:** Invites mental participation.

---

### 11. The Framework Reveal
Promise a system.

```
"The [name] framework for [outcome]."
"How I [result] using [method]."
"The exact system I use to [outcome]."
```

**Example:**
> "The 3-3-3 Framework for LinkedIn posts:
> 3 seconds to hook
> 3 minutes to write
> 3x the engagement"

**Why it works:** Systems feel transferable.

---

### 12. The Contrasting Elements
Juxtapose two things.

```
"[Common belief] vs [reality]."
"What they say: [X]. What works: [Y]."
"[Group A] does [X]. [Group B] does [Y]."
```

**Example:**
> "What gurus tell you: 'Post daily!'
> What actually works: Post when you have something to say.
> Here's the difference:"

**Why it works:** Clear contrast creates clarity.

---

## Hook Generation Process

### Step 1: Reverse Engineer Winners

Take top-performing posts (user's own or niche leaders):

```yaml
analysis:
  hook_text: "Original first 1-3 lines"
  pattern: "Which of the 12 patterns"
  specificity: "What concrete details"
  stakes: "Why reader should care"
  audience_match: "How it targets ICP"
  emotional_trigger: "What feeling it creates"
```

### Step 2: Extract Replicable Elements

From each analysis:
- Pattern type
- Specificity technique
- Stakes framing
- Audience signal

### Step 3: Generate Variations

For each pattern that works, create 5-10 variations:
- Same pattern, different topic
- Same topic, different pattern
- Combined patterns

### Step 4: Calibrate to Voice

Run each hook through voice filter:
- Does it match their tone?
- Uses their language?
- Avoids their taboo words?

---

## Hook Vault Structure

```yaml
# vault/hooks.yaml

hooks:
  contrarian:
    - hook: "Most sales advice is garbage."
      topic: "sales"
      tested: true
      performance: "15k impressions"
      notes: "Works with tactical follow-through"
      
    - hook: "[Draft] Stop optimizing your LinkedIn profile."
      topic: "linkedin"
      tested: false
      performance: null
      notes: "Needs payoff about content > profile"
      
  transformation:
    - hook: "6 months ago I was mass applying to jobs..."
      topic: "career"
      tested: true
      performance: "8k impressions"
      
  # ... more categories

ideas_to_test:
  - pattern: "data_drop"
    concept: "I analyzed 100 sales calls and found..."
    topic: "sales"
    priority: "high"
```

---

## Hook Testing Framework

### Before Testing
1. Ensure hook matches voice profile
2. Have full post ready (hook without payoff fails)
3. Choose optimal posting time

### During Test
- Same audience
- Similar posting time
- Track full engagement funnel

### After Test
Grade each hook:
- A: >2x average engagement, save as template
- B: 1-2x average, keep and iterate
- C: <1x average, analyze why
- F: Bombed, understand what went wrong

Update `vault/hooks.yaml` with results.

---

## Anti-Patterns

❌ **Clickbait without payoff** — Hook promises, post delivers nothing
❌ **Overused patterns** — "Here's the thing..." is tired
❌ **Engagement bait** — "Comment YES if you agree!"
❌ **Vague specificity** — "I made more money" vs "I made $47k"
❌ **Wrong audience** — Great hook, wrong ICP
❌ **Voice mismatch** — Hook sounds like someone else
