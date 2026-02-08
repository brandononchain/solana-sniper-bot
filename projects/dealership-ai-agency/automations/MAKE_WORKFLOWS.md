# Make.com Automation Workflows

## Overview

Make.com (formerly Integromat) connects all your tools. It's the "glue" that makes 98% automation possible.

Cost: $9/mo (Core plan) → scales to $16/mo as you grow

---

## Core Workflows to Build

1. **Lead Import Pipeline** — CSV → enrichment → GHL
2. **AI Response Handler** — Custom AI responses outside GHL
3. **Appointment Notifier** — GHL → Slack/Email
4. **Weekly Report Generator** — Pull data → format → send
5. **Outreach Sync** — Apollo → Instantly coordination

---

## Workflow 1: Lead Import Pipeline

### Purpose
Client uploads CSV of old leads → leads get enriched → imported to GHL → automation starts

### Flow
```
[Google Sheets - Watch New Rows]
       ↓
[Router - Split to parallel]
       ↓
[HTTP - Clay API for enrichment]
       ↓
[Filter - Valid email/phone only]
       ↓
[GHL - Create Contact]
       ↓
[GHL - Add to Pipeline Stage]
       ↓
[Slack - Notify "X leads imported"]
```

### Setup Instructions

**Step 1: Create Google Sheet**
- Columns: first_name, last_name, email, phone, vehicle_interest, last_contact_date
- Share with Make.com service account

**Step 2: Build in Make.com**

1. **Trigger: Google Sheets - Watch New Rows**
   - Connect your Google account
   - Select the shared sheet
   - Set to check every 15 minutes

2. **Module: HTTP - Make a Request (Clay API)**
   ```
   URL: https://api.clay.com/v1/enrich
   Method: POST
   Headers: 
     Authorization: Bearer {{CLAY_API_KEY}}
     Content-Type: application/json
   Body:
   {
     "email": "{{email}}",
     "phone": "{{phone}}"
   }
   ```

3. **Module: Filter**
   - Condition: email contains "@" AND phone is not empty
   - This filters out invalid leads

4. **Module: GHL - Create or Update Contact**
   - Connection: Your GHL account
   - Location/Sub-account: Select client
   - First Name: {{first_name}}
   - Last Name: {{last_name}}
   - Email: {{enriched_email}}
   - Phone: {{enriched_phone}}
   - Tags: "reactivation", "ai-import"

5. **Module: GHL - Create Opportunity**
   - Pipeline: Sales Lead Pipeline
   - Stage: New Lead
   - Contact: {{contact_id from previous step}}

6. **Module: Slack - Send Message**
   - Channel: #client-name-alerts
   - Message: "✅ {{bundle_count}} leads imported for [Client Name]"

**Step 3: Test**
- Add a test row to Google Sheet
- Watch the scenario run
- Verify contact appears in GHL

---

## Workflow 2: Custom AI Response Handler

### Purpose
For more control over AI responses than GHL's built-in bot.

### Flow
```
[Webhook - Receive from GHL]
       ↓
[OpenAI - Generate Response]
       ↓
[GHL - Send SMS Reply]
       ↓
[Google Sheets - Log Conversation]
```

### Setup Instructions

**Step 1: Create GHL Webhook**
In GHL, create a workflow that sends a webhook when SMS received:
- Trigger: SMS Received
- Action: Webhook → Your Make.com webhook URL

**Step 2: Build in Make.com**

1. **Trigger: Webhooks - Custom Webhook**
   - Create new webhook
   - Copy URL to GHL workflow

2. **Module: OpenAI - Create Chat Completion**
   ```
   Model: gpt-4o
   Messages:
   [
     {
       "role": "system",
       "content": "You are Alex, an AI assistant for [Dealership]. You help qualify leads and book appointments. Be friendly, concise, and helpful. Never be pushy. If someone isn't interested, thank them politely."
     },
     {
       "role": "user", 
       "content": "{{incoming_message}}"
     }
   ]
   ```

3. **Module: GHL - Send SMS**
   - Contact ID: {{contact_id from webhook}}
   - Phone: {{from_number}}
   - Message: {{openai_response}}

4. **Module: Google Sheets - Add Row**
   - Log: timestamp, contact_id, incoming, outgoing

**Step 3: Add Context (Advanced)**
For smarter responses, include conversation history:
- Store previous messages in a database (Airtable)
- Pull last 5 messages before calling OpenAI
- Include in the messages array

---

## Workflow 3: Appointment Notifier

### Purpose
When appointment is booked in GHL, notify client instantly via Slack.

### Flow
```
[GHL Webhook - Appointment Created]
       ↓
[Formatter - Build Message]
       ↓
[Slack - Send to Channel]
       ↓
[Optional: SMS - Notify Sales Rep]
```

### Setup Instructions

1. **Trigger: Webhooks - Custom Webhook**
   - GHL triggers this when appointment created

2. **Module: Text Parser / Set Variable**
   ```
   Message: "🗓️ NEW APPOINTMENT BOOKED!
   
   Name: {{contact_name}}
   Phone: {{contact_phone}}
   Date: {{appointment_date}}
   Time: {{appointment_time}}
   
   Notes: {{notes}}"
   ```

3. **Module: Slack - Send Message**
   - Channel: #client-alerts
   - Message: {{formatted_message}}

4. **Optional: Twilio - Send SMS**
   - To: Sales manager's phone
   - Message: Short version of above

---

## Workflow 4: Weekly Report Generator

### Purpose
Auto-generate and send weekly performance reports to clients.

### Flow
```
[Schedule - Every Monday 9am]
       ↓
[GHL API - Pull Metrics]
       ↓
[Aggregator - Calculate Stats]
       ↓
[Google Docs - Generate Report]
       ↓
[Email/Slack - Send to Client]
```

### Setup Instructions

1. **Trigger: Schedule**
   - Run every Monday at 9:00am
   - Timezone: Client's timezone

2. **Module: HTTP - GHL API Request**
   ```
   URL: https://rest.gohighlevel.com/v1/opportunities?locationId={{location_id}}
   Method: GET
   Headers:
     Authorization: Bearer {{GHL_API_KEY}}
   ```

3. **Module: Array Aggregator**
   - Count opportunities by stage
   - Calculate this week vs last week

4. **Module: Google Docs - Create from Template**
   - Template with placeholders:
     - {{leads_contacted}}
     - {{appointments_set}}
     - {{response_rate}}
     - {{week_over_week_change}}

5. **Module: Email - Send**
   - To: client@email.com
   - Subject: "Weekly Performance Report - [Date]"
   - Attachment: Generated PDF

---

## Workflow 5: Apollo → Instantly Sync

### Purpose
New leads from Apollo flow into your cold email campaigns.

### Flow
```
[Schedule - Daily]
       ↓
[Apollo API - Export New Leads]
       ↓
[Filter - Match ICP]
       ↓
[Instantly API - Add to Campaign]
       ↓
[Google Sheets - Log]
```

### Setup Instructions

1. **Trigger: Schedule**
   - Run daily at 7:00am

2. **Module: HTTP - Apollo Search**
   ```
   URL: https://api.apollo.io/v1/mixed_people/search
   Method: POST
   Body:
   {
     "person_titles": ["General Manager", "Owner", "Sales Manager"],
     "organization_industries": ["Automotive"],
     "organization_num_employees_ranges": ["1,50"],
     "per_page": 100
   }
   ```

3. **Module: Iterator**
   - Loop through results

4. **Module: HTTP - Instantly Add Lead**
   ```
   URL: https://api.instantly.ai/api/v1/lead/add
   Method: POST
   Body:
   {
     "campaign_id": "{{campaign_id}}",
     "email": "{{email}}",
     "first_name": "{{first_name}}",
     "last_name": "{{last_name}}",
     "company_name": "{{company}}"
   }
   ```

---

## Error Handling

### Add Error Handlers to Every Workflow

1. **After each critical module**, add an error handler:
   - Module: Slack - Send Message
   - Channel: #errors
   - Message: "⚠️ Error in [Workflow Name]: {{error_message}}"

2. **Set up scenario-level error handling:**
   - Settings → Error handling → On
   - Choose: "Commit" (continue with errors logged)

3. **Daily error review:**
   - Check #errors channel
   - Fix issues same day

---

## Optimization Tips

### Reduce Operations (Save Money)
- Use filters early to stop unnecessary processing
- Batch operations where possible
- Use routers instead of multiple scenarios

### Improve Reliability
- Add retry logic for API calls
- Use data stores for temporary storage
- Set up incomplete execution handling

### Monitor Performance
- Check scenario logs weekly
- Track operation usage
- Set up alerts for high volume

---

## API Keys Needed

| Service | How to Get |
|---------|------------|
| Make.com | Account → API |
| GHL | Settings → Business Profile → API Key |
| OpenAI | platform.openai.com → API Keys |
| Clay | Settings → API |
| Apollo | Settings → Integrations → API |
| Instantly | Settings → API |
| Slack | api.slack.com → Create App → OAuth Token |

Store all keys in Make.com's **Connections** or **Data Stores** — never hardcode.

---

## Quick Reference

**Make.com Docs:** make.com/en/help
**GHL API Docs:** highlevel.stoplight.io
**OpenAI API Docs:** platform.openai.com/docs

---

## Cost Estimate

| Plan | Operations | Cost |
|------|------------|------|
| Free | 1,000/mo | $0 |
| Core | 10,000/mo | $9/mo |
| Pro | 40,000/mo | $16/mo |

**Estimate per client:**
- Lead import: ~100 ops/week
- AI responses: ~500 ops/week
- Notifications: ~50 ops/week
- Reports: ~20 ops/week
- **Total:** ~2,500-3,000 ops/month per client

10 clients ≈ 25,000-30,000 ops/month → Pro plan ($16/mo)
