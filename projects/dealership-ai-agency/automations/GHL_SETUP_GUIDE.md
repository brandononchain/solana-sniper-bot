# GoHighLevel Setup Guide — DealerFlow AI

## Overview

GoHighLevel (GHL) is your all-in-one platform for:
- CRM (manage clients and their leads)
- SMS/Email automation
- Appointment booking
- Client dashboards
- Reporting

Cost: $97/month (Agency Unlimited plan recommended)

---

## Initial Setup

### Step 1: Create Your Agency Account
1. Go to gohighlevel.com
2. Sign up for Agency Unlimited ($97/mo)
3. Complete onboarding wizard
4. Set timezone and business info

### Step 2: Configure Your Agency Settings
1. **Settings → Business Profile**
   - Company name: [Your brand]
   - Logo: Upload
   - Contact info

2. **Settings → Phone Numbers**
   - You'll provision numbers for each client (they pay)
   - Or use a shared pool (more advanced)

3. **Settings → Integrations**
   - Connect OpenAI API (for AI features)
   - Connect Cal.com or use GHL calendars
   - Connect Slack (for notifications)

---

## Sub-Account Structure

Each client gets their own "sub-account" — keeps everything separate.

### Creating a Client Sub-Account
1. Go to **Agency View → Sub-Accounts**
2. Click **+ Add Sub-Account**
3. Fill in:
   - Business name: [Client's dealership]
   - Business type: Automotive
   - Timezone: [Client's timezone]
4. Save

### Sub-Account Setup Checklist
- [ ] Add client's logo and branding
- [ ] Provision phone number (or port theirs)
- [ ] Set up email sending domain
- [ ] Create pipeline and stages
- [ ] Import lead list
- [ ] Build automation workflows
- [ ] Set up calendar
- [ ] Connect to Slack channel

---

## Pipeline Setup

### Standard Dealership Pipeline

**Pipeline Name:** Sales Lead Pipeline

**Stages:**
1. **New Lead** — Just imported, not contacted
2. **Contacted** — AI has sent first message
3. **Engaged** — Lead responded
4. **Qualified** — Lead confirmed interest + timeline
5. **Appointment Set** — Appointment booked
6. **Showed** — Appointment attended
7. **Sold** — Deal closed
8. **Lost** — Did not convert

### Creating the Pipeline
1. Go to **Opportunities → Pipelines**
2. Click **+ Add Pipeline**
3. Add stages in order
4. Set stage colors (optional)
5. Save

---

## SMS Automation Workflow

### Workflow: Lead Reactivation

**Trigger:** Contact added to "New Lead" stage

**Sequence:**

```
STEP 1: Wait 1 minute
STEP 2: Send SMS
   → Message: "Hey {{contact.first_name}}, this is Alex from {{custom.dealership_name}}. I saw you were interested in a vehicle a while back — are you still in the market, or did you find something?"

STEP 3: Move to "Contacted" stage

STEP 4: Wait 24 hours

STEP 5: IF/ELSE - Check for reply
   → IF replied: Move to "Engaged" stage, END workflow
   → ELSE: Continue

STEP 6: Send SMS
   → Message: "No pressure at all! Just wanted to check in. If you're still looking, we have some great options right now. Want me to see what's available in your budget?"

STEP 7: Wait 48 hours

STEP 8: IF/ELSE - Check for reply
   → IF replied: Move to "Engaged" stage, END workflow
   → ELSE: Continue

STEP 9: Send SMS
   → Message: "Last check-in from me! If you're set, no worries. But if timing wasn't right before, let me know — I can get you connected with our team whenever works."

STEP 10: Wait 7 days
STEP 11: Move to "Lost" stage (if no response)
```

### Building in GHL
1. Go to **Automation → Workflows**
2. Click **+ Create Workflow**
3. Start from scratch
4. Add trigger: **Pipeline Stage Changed → New Lead**
5. Build sequence using drag-and-drop
6. Use **Wait** steps for timing
7. Use **IF/ELSE** to check reply status
8. Use **Update Opportunity** to move stages

---

## AI-Powered Responses

### Option 1: GHL's Built-in AI (Conversation AI)

1. Go to **Settings → Conversation AI**
2. Enable AI Bot
3. Set context:
   ```
   You are Alex, an AI assistant for [Dealership Name].
   Your goal is to:
   1. Re-engage leads who previously showed interest
   2. Qualify them (timeline, budget, vehicle type)
   3. Book appointments with the sales team
   
   Be friendly, casual, and helpful. Never be pushy.
   If they're not interested, thank them and move on.
   
   When booking appointments:
   - Ask what day/time works
   - Confirm with available slots
   - Send confirmation
   ```
4. Connect to phone number
5. Test extensively

### Option 2: Custom AI via Make.com + OpenAI

For more control, use Make.com to intercept messages and generate AI responses.

**Workflow:**
```
Trigger: New SMS received in GHL (webhook)
↓
Make.com receives message
↓
Send to OpenAI API with context
↓
Get AI response
↓
Send response back via GHL API
```

(See separate Make.com automation guide)

---

## Appointment Booking

### Using GHL Calendars
1. Go to **Calendars → Calendar Settings**
2. Create calendar: "Sales Appointments"
3. Set availability (dealer's hours)
4. Set buffer time (15-30 min between)
5. Create booking page
6. Get shareable link

### AI Booking Flow
When lead shows interest, AI:
1. Asks: "Great! What day works best for you to come in?"
2. Lead responds: "Thursday afternoon"
3. AI offers: "I have openings at 2pm, 3:30pm, or 4pm on Thursday. Which works?"
4. Lead picks: "3:30"
5. AI books: Creates appointment in GHL calendar
6. AI confirms: "Perfect! You're booked for Thursday at 3:30pm with [Sales Rep]. I'll send you a reminder. Anything else I can help with?"

---

## Reporting Dashboard

### Key Metrics to Track
- Leads imported (this week/month)
- Messages sent
- Response rate
- Appointments booked
- Show rate
- Conversion rate

### Building Reports
1. Go to **Reporting → Dashboards**
2. Create new dashboard
3. Add widgets:
   - Opportunity count by stage (pipeline visual)
   - Appointments this week
   - Response rate (custom metric)
   - SMS sent/received

### Automated Weekly Report
1. Create workflow triggered weekly (Monday 9am)
2. Pull stats via internal variables
3. Format report
4. Send via email or Slack to client

---

## Client Onboarding Flow

### Day 1: Initial Setup
1. Create sub-account
2. Get from client:
   - Logo and branding colors
   - Lead list (CSV)
   - Calendar availability
   - Preferred contact method

### Day 2: Build
1. Set up pipeline
2. Import leads
3. Configure SMS automation
4. Set up AI prompts
5. Connect calendar

### Day 3: Test & Launch
1. Test full workflow (add yourself as test lead)
2. Verify AI responses
3. Test appointment booking
4. Set up Slack notifications
5. Go live

### Day 4+: Monitor & Optimize
1. Check metrics daily (first week)
2. Adjust AI prompts based on conversations
3. Fine-tune timing
4. Weekly report to client

---

## Common Issues & Fixes

**Issue:** Low SMS delivery rate
- Check carrier registration (10DLC for US)
- Verify phone number is properly provisioned
- Check message content for spam triggers

**Issue:** AI giving bad responses
- Review conversation logs
- Refine AI context/instructions
- Add specific examples
- Set guardrails (what NOT to say)

**Issue:** Appointments not syncing
- Verify calendar integration
- Check timezone settings
- Test booking flow manually

**Issue:** Client can't see dashboard
- Check sub-account permissions
- Verify login credentials
- Clear cache/cookies

---

## Quick Reference Links

- GHL Support: support.gohighlevel.com
- GHL Academy: academy.gohighlevel.com
- API Docs: developers.gohighlevel.com
- Community: facebook.com/groups/gohighlevel

---

## Cost Structure Per Client

| Item | Cost | Who Pays |
|------|------|----------|
| Sub-account | Included | You (agency) |
| Phone number | ~$3/mo | You (pass to client) |
| SMS (outbound) | ~$0.0079/msg | You (mark up or include) |
| SMS (inbound) | ~$0.0079/msg | You (include) |
| Email | Included | — |

**Pricing Strategy:**
- Bundle communications into retainer
- Or charge client directly + markup
- Most agencies include up to X messages in retainer
