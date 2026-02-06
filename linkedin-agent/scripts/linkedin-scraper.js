/**
 * LinkedIn Safe Scraper
 * 
 * Usage: Run through Clawdbot's browser tool
 * This file contains helper functions, not standalone execution
 * 
 * SAFETY FIRST:
 * - Human-like delays built in
 * - Rate limits enforced
 * - Only public/own data extracted
 */

// ============================================
// DELAY UTILITIES
// ============================================

function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay() {
  // 5-15 seconds, feels natural
  await randomDelay(5000, 15000);
}

async function shortDelay() {
  // 2-5 seconds, between small actions
  await randomDelay(2000, 5000);
}

async function pageLoadDelay() {
  // 3-6 seconds, after navigation
  await randomDelay(3000, 6000);
}

// ============================================
// SAFE EXTRACTION HELPERS
// ============================================

function safeText(element) {
  return element?.textContent?.trim() || null;
}

function safeHref(element) {
  return element?.href || null;
}

// ============================================
// PROFILE SCRAPING
// ============================================

/**
 * Scrape your own profile (completely safe)
 * Returns: { name, headline, about, experience[], skills[] }
 */
async function scrapeOwnProfile() {
  // This runs in browser context via Clawdbot's browser.act evaluate
  
  const profile = {
    name: null,
    headline: null,
    about: null,
    location: null,
    connections: null,
    followers: null,
    experience: [],
    scraped_at: new Date().toISOString(),
  };
  
  // Basic info
  profile.name = safeText(document.querySelector('h1'));
  profile.headline = safeText(document.querySelector('.text-body-medium.break-words'));
  profile.location = safeText(document.querySelector('.text-body-small.inline.t-black--light'));
  
  // Connection/follower count
  const connections = document.querySelector('li.text-body-small span.t-bold');
  profile.connections = safeText(connections);
  
  // About section (if visible)
  const aboutSection = document.querySelector('#about');
  if (aboutSection) {
    const aboutText = aboutSection.closest('section')?.querySelector('.inline-show-more-text');
    profile.about = safeText(aboutText);
  }
  
  // Experience (visible items only)
  const expSection = document.querySelector('#experience');
  if (expSection) {
    const expItems = expSection.closest('section')?.querySelectorAll('li.artdeco-list__item');
    profile.experience = Array.from(expItems || []).slice(0, 5).map(item => ({
      title: safeText(item.querySelector('.t-bold span')),
      company: safeText(item.querySelector('.t-normal span')),
      duration: safeText(item.querySelector('.t-black--light span')),
    }));
  }
  
  return profile;
}

/**
 * Scrape your recent posts
 * Navigate to: linkedin.com/in/me/recent-activity/all/
 */
async function scrapeOwnPosts() {
  const posts = [];
  
  const postElements = document.querySelectorAll('.feed-shared-update-v2');
  
  postElements.forEach((el, index) => {
    if (index >= 20) return; // Limit to 20
    
    const textEl = el.querySelector('.feed-shared-inline-show-more-text, .feed-shared-text');
    const reactionsEl = el.querySelector('.social-details-social-counts__reactions-count');
    const commentsEl = el.querySelector('.social-details-social-counts__comments');
    
    const post = {
      text: safeText(textEl)?.slice(0, 1000), // Truncate long posts
      reactions: safeText(reactionsEl),
      comments: safeText(commentsEl),
      index: index,
    };
    
    if (post.text) {
      posts.push(post);
    }
  });
  
  return posts;
}

// ============================================
// FEED MONITORING
// ============================================

/**
 * Scan feed for intent signals
 * Keywords: array of strings to look for
 */
function scanFeedForSignals(keywords) {
  const signals = [];
  const keywordsLower = keywords.map(k => k.toLowerCase());
  
  const posts = document.querySelectorAll('.feed-shared-update-v2');
  
  posts.forEach(post => {
    const text = post.textContent.toLowerCase();
    const matchedKeywords = keywordsLower.filter(kw => text.includes(kw));
    
    if (matchedKeywords.length > 0) {
      const authorEl = post.querySelector('.feed-shared-actor__name');
      const contentEl = post.querySelector('.feed-shared-inline-show-more-text, .feed-shared-text');
      const linkEl = post.querySelector('a[href*="/feed/update/"]');
      
      signals.push({
        author: safeText(authorEl),
        text: safeText(contentEl)?.slice(0, 500),
        matchedKeywords: matchedKeywords,
        url: safeHref(linkEl),
        scraped_at: new Date().toISOString(),
      });
    }
  });
  
  return signals;
}

// ============================================
// PUBLIC PROFILE VIEWING (USE SPARINGLY)
// ============================================

/**
 * Extract public info from a profile you're viewing
 * CAUTION: Limit to 20-30 profiles per day
 */
function extractPublicProfile() {
  const profile = {
    name: safeText(document.querySelector('h1')),
    headline: safeText(document.querySelector('.text-body-medium.break-words')),
    location: safeText(document.querySelector('.text-body-small.inline.t-black--light')),
    about: null,
    current_role: null,
    scraped_at: new Date().toISOString(),
  };
  
  // About (if visible without clicking "see more")
  const aboutSection = document.querySelector('#about');
  if (aboutSection) {
    const aboutText = aboutSection.closest('section')?.querySelector('.inline-show-more-text');
    profile.about = safeText(aboutText)?.slice(0, 500);
  }
  
  // Current role
  const expSection = document.querySelector('#experience');
  if (expSection) {
    const firstRole = expSection.closest('section')?.querySelector('li.artdeco-list__item');
    if (firstRole) {
      profile.current_role = {
        title: safeText(firstRole.querySelector('.t-bold span')),
        company: safeText(firstRole.querySelector('.t-normal span')),
      };
    }
  }
  
  return profile;
}

// ============================================
// SEARCH RESULTS
// ============================================

/**
 * Extract search results (content search)
 * Navigate to: linkedin.com/search/results/content/?keywords=...
 */
function extractSearchResults() {
  const results = [];
  
  const items = document.querySelectorAll('.search-results-container li.reusable-search__result-container');
  
  items.forEach((item, index) => {
    if (index >= 10) return; // First page only
    
    const authorEl = item.querySelector('.entity-result__title-text a');
    const snippetEl = item.querySelector('.entity-result__summary');
    
    results.push({
      author: safeText(authorEl),
      authorUrl: safeHref(authorEl),
      snippet: safeText(snippetEl)?.slice(0, 300),
      index: index,
    });
  });
  
  return results;
}

// ============================================
// RATE LIMIT HELPERS
// ============================================

/**
 * Check if we should proceed based on daily limits
 * Store limits in localStorage for persistence
 */
function checkDailyLimit(actionType, maxAllowed) {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `linkedin_limits_${today}`;
  
  let limits = {};
  try {
    limits = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (e) {
    limits = {};
  }
  
  const currentCount = limits[actionType] || 0;
  
  if (currentCount >= maxAllowed) {
    return { allowed: false, current: currentCount, max: maxAllowed };
  }
  
  // Increment and save
  limits[actionType] = currentCount + 1;
  localStorage.setItem(storageKey, JSON.stringify(limits));
  
  return { allowed: true, current: currentCount + 1, max: maxAllowed };
}

/**
 * Get current usage stats
 */
function getDailyUsage() {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `linkedin_limits_${today}`;
  
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (e) {
    return {};
  }
}

// ============================================
// EXPORTS (for reference)
// ============================================

// These functions are meant to be run via Clawdbot's browser.act evaluate
// Copy the function you need into the evaluate call

const EXPORTS = {
  scrapeOwnProfile,
  scrapeOwnPosts,
  scanFeedForSignals,
  extractPublicProfile,
  extractSearchResults,
  checkDailyLimit,
  getDailyUsage,
};

// Example usage via Clawdbot:
// browser action=act request.kind=evaluate request.fn="scrapeOwnProfile()"
