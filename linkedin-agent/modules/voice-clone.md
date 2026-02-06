# Voice Clone Framework

Extract and replicate a user's unique LinkedIn voice.

## Purpose

Generic AI content sounds like generic AI content. This module extracts what makes someone's writing THEIRS — their patterns, phrases, energy, and style.

## The Problem

Most "AI voice matching" does this:
1. "What tone do you want?" → "Professional but friendly"
2. Generates corporate mush that sounds like everyone else

## The Solution

Extract voice from ACTUAL content, not self-description.

---

## Voice Extraction Process

### Step 1: Gather Source Material

Need minimum 5-10 pieces of content:
- LinkedIn posts (best)
- Comments on others' posts
- Articles
- Website copy
- Emails (if available)
- Speaking transcripts

**Prompt to user:**
> "I need to learn your voice. Can you share:
> 1. Your LinkedIn profile URL (I'll pull your posts)
> 2. OR paste 5-10 of your best posts/writings
> 3. Bonus: Any content you've written that you love"

### Step 2: Analyze Patterns

For each piece of content, extract:

```yaml
analysis:
  # Structure
  avg_sentence_length: ""
  paragraph_style: ""      # dense/punchy/single-line
  uses_line_breaks: true/false
  uses_lists: true/false
  uses_headers: true/false
  
  # Tone
  formality: 1-10
  energy: 1-10
  confidence: 1-10
  warmth: 1-10
  humor: 1-10
  
  # Vocabulary
  signature_phrases: []
  power_words: []
  avoided_words: []
  jargon_level: low/medium/high
  
  # Style markers
  starts_with: []          # how posts typically open
  ends_with: []            # how posts typically close
  transition_phrases: []
  uses_questions: true/false
  uses_stories: true/false
  uses_data: true/false
  
  # Formatting
  emoji_usage: none/minimal/moderate/heavy
  hashtag_usage: none/minimal/moderate
  caps_for_emphasis: true/false
  
  # Personality
  contrarian_level: low/medium/high
  vulnerability_level: low/medium/high
  self_deprecation: true/false
```

### Step 3: Find the DNA

After analyzing multiple pieces, identify:

**Consistent patterns** (appears in 70%+ of content):
- These are CORE voice elements
- Must be replicated

**Variable patterns** (appears in 30-70%):
- These are CONTEXTUAL
- Use when appropriate

**Rare patterns** (appears in <30%):
- These are EXCEPTIONS
- Use sparingly for variety

### Step 4: Create Voice Profile

Generate `voice.yaml` with:

```yaml
voice_dna:
  # Core Identity
  who_they_are: "A sales leader who cuts through BS"
  what_they_believe: "Tactics > theory, results > relationships"
  how_they_show_up: "Direct, experienced, slightly irreverent"
  
  # Tone Profile
  tone:
    primary: "direct"
    secondary: "warm underneath"
    energy: "high but grounded"
    humor: "dry, self-aware"
    
  # Writing Mechanics
  mechanics:
    sentences: "Short. Punchy. Then occasionally longer for contrast."
    paragraphs: "1-3 lines max, lots of whitespace"
    structure: "Hook → Setup → Payoff"
    
  # Signature Elements
  signatures:
    opening_moves:
      - "Contrarian statement"
      - "Specific story setup"
      - "Direct challenge"
    closing_moves:
      - "Tactical takeaway"
      - "Soft question CTA"
      - "One-liner landing"
    phrases:
      - "Here's the thing"
      - "Let me be real"
      - "The unsexy truth"
    never_say:
      - "thought leader"
      - "value proposition"
      - "leverage"
      - "synergy"
      
  # Reference Examples
  examples:
    perfect_voice:
      - content: "[actual post]"
        notes: "This captures the exact tone"
    almost_right:
      - content: "[actual post]"
        notes: "Good but slightly too formal"
```

---

## Voice Replication Prompts

### For Content Generation

```
You are writing as {name}.

VOICE PROFILE:
{voice_dna}

KEY RULES:
- Sound like the examples above
- Use their phrases naturally (not forced)
- Match their energy level
- Keep their formatting style
- NEVER use words from their "never_say" list

WRITING TASK:
{task}

Before writing, identify which voice elements are most relevant.
Then write 2-3 options with different approaches.
```

### For Voice Calibration

After generating content, verify:

```
VOICE CHECK:
□ Does this sound like their examples?
□ Are the sentence lengths right?
□ Is the energy level matching?
□ Any forbidden words slip in?
□ Would their audience recognize this as them?

If any NO, revise.
```

---

## Common Voice Patterns

### The Teacher
- Breaks things down simply
- Uses "Here's how..." and "Let me show you..."
- Patient, educational tone
- Lists and frameworks

### The Challenger
- Contrarian statements
- "Stop doing X" and "X is dead"
- Provocative but backed up
- Higher risk, higher reward

### The Storyteller
- Opens with scenes
- "Last week..." and "I remember when..."
- Emotional beats
- Lessons emerge from narrative

### The Operator
- Data and specifics
- "I did X and got Y result"
- Tactical, actionable
- Less fluff, more meat

### The Connector
- Warm, inclusive
- "We" more than "I"
- Questions and engagement
- Community-focused

---

## Voice Drift Prevention

Over time, generated content can drift from true voice. Prevent this:

1. **Regular calibration** — Compare new content to original examples
2. **User feedback loop** — Ask "Does this sound like you?"
3. **Example refresh** — Add new good content to the reference set
4. **Red flag words** — Maintain and expand "never say" list

---

## Anti-Patterns

❌ **Over-extraction** — Not every quirk is a pattern
❌ **Forced phrases** — Signatures should appear naturally
❌ **Tone exaggeration** — "They're casual" doesn't mean slang overload
❌ **Static profiles** — Voice evolves; update the profile
❌ **Self-description reliance** — "I want to sound professional" is useless
