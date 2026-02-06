# Safe Browser Automation for LinkedIn

LinkedIn-compliant scraping that won't get your account flagged.

---

## The Safety Philosophy

LinkedIn actively detects automation. Getting flagged means:
- Account restrictions
- Reduced reach
- Potential ban

**Our approach:** Behave exactly like a human. No shortcuts.

---

## What's Safe vs. Risky

### ✅ SAFE Actions

| Action | Why Safe |
|--------|----------|
| Reading your own profile | It's your data |
| Reading public profiles (slowly) | Normal browsing |
| Reading your feed | Normal usage |
| Reading posts/comments | Normal consumption |
| Copying text manually visible | No hidden data |
| Screenshot for analysis | Local only |

### ⚠️ CAUTION Actions

| Action | Risk | Mitigation |
|--------|------|------------|
| Viewing many profiles | Looks like scraping | Max 20-30/day, random delays |
| Searching repeatedly | Pattern detection | Vary queries, take breaks |
| Exporting data | Against ToS | Only for personal analysis |

### ❌ NEVER DO

| Action | Why |
|--------|-----|
| Auto-connect at scale | Instant flag |
| Auto-message | Account restriction |
| Auto-like/comment | Engagement manipulation |
| Scrape emails/phones | Data harvesting = ban |
| Use headless browser | Detection signatures |
| Rapid-fire any action | Inhuman patterns |

---

## Safe Scraping Principles

### 1. Human-Like Timing

```yaml
delays:
  between_pages: 5-15 seconds (randomized)
  between_actions: 2-5 seconds
  session_length: 15-30 minutes max
  daily_sessions: 2-3 max
  profiles_per_session: 10-15 max
```

### 2. Natural Patterns

- Don't visit 50 profiles in a row
- Mix reading with other actions
- Take breaks (humans do)
- Vary the timing (not clockwork)

### 3. Use Logged-In Browser

- Use existing Chrome session (profile="chrome")
- Never headless mode
- Cookies/session already established
- Looks like normal browsing

### 4. Respect Rate Limits

```
Daily safe limits (conservative):
- Profile views: 30-50
- Searches: 10-15
- Feed scrolls: Normal usage
- Post reads: Unlimited (passive)
```

---

## Implementation: Profile Scraping

### Scrape Your Own Profile

```javascript
// Safe: It's your own data
async function scrapeOwnProfile(page) {
  // Navigate to own profile
  await page.goto('https://www.linkedin.com/in/me/');
  await delay(3000, 5000); // Human delay
  
  // Get visible text only
  const profile = {
    name: await page.$eval('h1', el => el.textContent.trim()),
    headline: await page.$eval('.text-body-medium', el => el.textContent.trim()),
    about: await page.$eval('#about + div', el => el.textContent.trim()),
  };
  
  return profile;
}
```

### Scrape Your Own Posts

```javascript
// Safe: Your content, public anyway
async function scrapeOwnPosts(page, count = 10) {
  await page.goto('https://www.linkedin.com/in/me/recent-activity/all/');
  await delay(3000, 5000);
  
  const posts = [];
  let scrolls = 0;
  
  while (posts.length < count && scrolls < 10) {
    // Get visible posts
    const newPosts = await page.$$eval('.feed-shared-update-v2', elements => 
      elements.map(el => ({
        text: el.querySelector('.feed-shared-text')?.textContent?.trim(),
        reactions: el.querySelector('.social-details-social-counts')?.textContent,
        comments: el.querySelector('.comment-button')?.textContent,
      }))
    );
    
    posts.push(...newPosts);
    
    // Human-like scroll
    await page.evaluate(() => window.scrollBy(0, 800));
    await delay(2000, 4000);
    scrolls++;
  }
  
  return posts.slice(0, count);
}
```

### View Someone's Public Profile

```javascript
// Caution: Do sparingly, with delays
async function viewProfile(page, profileUrl) {
  // Random delay before visiting
  await delay(5000, 15000);
  
  await page.goto(profileUrl);
  await delay(3000, 6000);
  
  // Only get publicly visible info
  const profile = {
    name: await safeExtract(page, 'h1'),
    headline: await safeExtract(page, '.text-body-medium'),
    location: await safeExtract(page, '.text-body-small.inline'),
  };
  
  // Scroll like human reading
  await humanScroll(page);
  
  return profile;
}

async function safeExtract(page, selector) {
  try {
    return await page.$eval(selector, el => el.textContent.trim());
  } catch {
    return null;
  }
}

async function humanScroll(page) {
  const scrolls = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, 300 + Math.random() * 400));
    await delay(1000, 3000);
  }
}
```

---

## Implementation: Feed Monitoring

### Read Your Feed (Safe)

```javascript
// Safe: Normal usage
async function scanFeed(page, lookingFor = []) {
  await page.goto('https://www.linkedin.com/feed/');
  await delay(2000, 4000);
  
  const signals = [];
  let scrolls = 0;
  const maxScrolls = 10; // Don't go crazy
  
  while (scrolls < maxScrolls) {
    // Get visible posts
    const posts = await page.$$eval('.feed-shared-update-v2', (elements, keywords) => {
      return elements.map(el => {
        const text = el.textContent.toLowerCase();
        const matchedKeywords = keywords.filter(kw => text.includes(kw.toLowerCase()));
        
        if (matchedKeywords.length > 0) {
          return {
            author: el.querySelector('.feed-shared-actor__name')?.textContent?.trim(),
            text: el.querySelector('.feed-shared-text')?.textContent?.trim()?.slice(0, 500),
            keywords: matchedKeywords,
            url: el.querySelector('a[href*="/posts/"]')?.href,
          };
        }
        return null;
      }).filter(Boolean);
    }, lookingFor);
    
    signals.push(...posts);
    
    // Human scroll
    await page.evaluate(() => window.scrollBy(0, 600 + Math.random() * 400));
    await delay(3000, 6000); // Longer delays for feed
    scrolls++;
  }
  
  return signals;
}
```

### Search for Intent Signals

```javascript
// Caution: Limited searches per day
async function searchForSignals(page, query) {
  // Encode and search
  const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
  
  await delay(5000, 10000); // Delay before search
  await page.goto(searchUrl);
  await delay(3000, 5000);
  
  // Get results (first page only)
  const results = await page.$$eval('.search-results__list > li', elements => 
    elements.slice(0, 10).map(el => ({
      author: el.querySelector('.entity-result__title-text')?.textContent?.trim(),
      snippet: el.querySelector('.entity-result__summary')?.textContent?.trim(),
      url: el.querySelector('a')?.href,
    }))
  );
  
  return results;
}
```

---

## Delay Utilities

```javascript
// Random delay between min and max milliseconds
function delay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Longer delay with variance (for between major actions)
function humanDelay() {
  // 5-15 seconds, weighted toward middle
  const base = 5000;
  const variance = Math.random() * 10000;
  return delay(base + variance * 0.5, base + variance);
}
```

---

## Session Management

### Safe Session Pattern

```javascript
async function safeSession(tasks) {
  const maxSessionTime = 20 * 60 * 1000; // 20 minutes
  const startTime = Date.now();
  
  for (const task of tasks) {
    // Check session time
    if (Date.now() - startTime > maxSessionTime) {
      console.log('Session time limit reached, stopping');
      break;
    }
    
    // Execute task
    await task();
    
    // Human delay between tasks
    await humanDelay();
  }
}
```

### Daily Limits Tracker

```yaml
# Track in data/{user}/browser-limits.yaml
daily_limits:
  date: "2024-01-15"
  profile_views: 12  # max 30-50
  searches: 3        # max 10-15
  feed_scans: 2      # max 5
  
reset_at: "00:00 UTC"
```

---

## What We Extract (And Don't)

### ✅ Extract

- Profile name, headline, about (public)
- Post text and engagement counts
- Company names and titles
- Public activity

### ❌ Never Extract

- Email addresses
- Phone numbers
- Private messages
- Connection lists
- Hidden profile data
- Anything behind "see more" that requires auth tricks

---

## Red Flags LinkedIn Detects

1. **Timing patterns** — Exact intervals = bot
2. **Volume spikes** — Sudden increase in activity
3. **Headless browsers** — Missing browser fingerprints
4. **API calls** — Unauthorized API usage
5. **Scraping tools** — Known tool signatures
6. **Geographic anomalies** — IP jumping around

### How We Avoid Them

- Use real Chrome with real profile
- Randomized human-like delays
- Conservative volume limits
- No API calls, just DOM reading
- Consistent IP (your normal connection)
- Natural browsing patterns

---

## Emergency: If You Get Flagged

1. **Stop all automation immediately**
2. **Use LinkedIn normally for a week** (manual only)
3. **Reduce limits by 50%** when resuming
4. **Space out sessions more**

Signs you might be flagged:
- CAPTCHA challenges
- "Unusual activity" warnings
- Reduced reach on posts
- Connection requests failing
