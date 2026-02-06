# LinkedIn Revenue Machine - Agent Skill

## Overview

Transform LinkedIn into a predictable revenue pipeline with AI-powered content, outreach, and engagement — all calibrated to the user's voice and ICP.

## When to Use

Activate when user asks about:
- LinkedIn content/posts
- LinkedIn outreach/DMs
- Building LinkedIn presence
- Lead generation via LinkedIn
- Personal branding
- LinkedIn growth strategy

## Core Files

Load these for full context:
- `core/agent.md` — Main agent instructions & philosophy
- `core/context-schema.md` — How user data is structured
- `PLAYBOOK.md` — Daily/weekly/monthly operational routines

## Modules (Load as Needed)

| Module | When to Load |
|--------|--------------|
| `modules/voice-clone.md` | Setting up new user, refining voice |
| `modules/hook-builder.md` | Creating hooks, analyzing viral content |
| `modules/lead-magnet.md` | Creating lead magnets, content offers |
| `modules/outbound.md` | Writing outreach, connection notes |
| `modules/dm-sequences.md` | DM conversations, follow-ups, call bridges |
| `modules/intent-monitor.md` | Finding prospects, monitoring signals |
| `modules/trend-analyzer.md` | Analyzing performance, optimization |
| `modules/profile-optimizer.md` | LinkedIn profile optimization |
| `modules/content-repurposing.md` | Turn 1 piece into 10+ |
| `modules/competitor-intel.md` | Learn from competitor patterns |
| `modules/social-proof.md` | Testimonials, case studies, results |
| `modules/browser-safe.md` | Safe LinkedIn scraping guidelines |
| `modules/cron-monitoring.md` | Automated intent monitoring setup |

## Quick Reference

### Onboarding New User
```
1. Load: prompts/onboarding.md
2. Follow conversation flow
3. Create data/{username}/ files
4. Generate initial content vault
```

### Content Generation
```
1. Load user context: data/{username}/voice.yaml, icp.yaml
2. Load: modules/hook-builder.md (for hooks)
3. Load: templates/post-templates.md (for structure)
4. Generate options (not just one)
5. Explain strategy behind each
```

### Outreach Help
```
1. Load user context: data/{username}/voice.yaml, icp.yaml
2. Load: modules/outbound.md
3. Research target (if URL provided)
4. Generate personalized message
5. Suggest follow-up sequence
```

### Performance Analysis
```
1. Load: modules/trend-analyzer.md
2. Ask for metrics (or use stored)
3. Identify patterns
4. Update data/{username}/patterns.yaml
5. Provide recommendations
```

## Commands Reference

See `prompts/commands.md` for full list.

Quick commands:
- "Set up my profile" → Onboarding
- "Write a post about [X]" → Content
- "Help me reach [person]" → Outreach
- "What's working?" → Analysis
- "Give me hooks for [topic]" → Hook generation

## Data Storage

All user data lives in `data/{username}/`:
```
profile.yaml      — LinkedIn profile
voice.yaml        — Voice DNA
icp.yaml          — Ideal customer
goals.yaml        — Targets
performance.yaml  — Historical data
patterns.yaml     — Learned patterns
vault/            — Content library
outreach/         — Message templates
```

## Key Principles

1. **Voice First** — Never sound generic
2. **ICP Obsessed** — Every piece targets the ideal customer
3. **Pattern-Based** — Learn from what works
4. **Revenue Focused** — Vanity metrics don't pay rent
5. **Continuous Learning** — Get better over time

## Anti-Patterns to Avoid

- Generic corporate speak
- Engagement bait ("Comment YES!")
- Hashtag/emoji spam
- Pitch-first outreach
- Fabricated stories
- Content without strategy

## Browser Integration

When user provides LinkedIn URLs, use browser tool to:
- Scrape profile data (with safe delays)
- Analyze posts
- Research outreach targets
- Monitor intent signals

**SAFETY FIRST:** See `modules/browser-safe.md` for rate limits and safe practices.
- Max 30-50 profile views/day
- 5-15 second delays between pages
- Use logged-in Chrome profile (profile="chrome")
- Never auto-engage (connect/like/comment)

## Cron Jobs for Monitoring

Set up automated monitoring with `modules/cron-monitoring.md`:
- Morning intent scan (8am daily)
- Engagement reminders (10am/2pm weekdays)
- Weekly performance review (Friday 4pm)
- Monthly deep analysis (1st of month)

Quick setup: User says "Set up LinkedIn monitoring cron jobs"

## Cost Optimization

Built for cheap operation:
- Batch similar operations
- Cache user context
- Minimize redundant analysis
- Use templates + customization vs generation from scratch
- Cron jobs use conditional prompts (skip if nothing found)
