#!/bin/bash

# LinkedIn Revenue Machine - Quick Start
# This script helps you get started with a new user profile

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$BASE_DIR/data"

echo "🎯 LinkedIn Revenue Machine - Quick Start"
echo "=========================================="
echo ""

# Get username
read -p "Enter username (lowercase, no spaces): " USERNAME

if [[ -z "$USERNAME" ]]; then
    echo "❌ Username is required"
    exit 1
fi

# Validate username format
if [[ ! "$USERNAME" =~ ^[a-z0-9_-]+$ ]]; then
    echo "❌ Username must be lowercase letters, numbers, hyphens, or underscores"
    exit 1
fi

USER_DIR="$DATA_DIR/$USERNAME"

# Check if already exists
if [[ -d "$USER_DIR" ]]; then
    echo "⚠️  User '$USERNAME' already exists at $USER_DIR"
    read -p "Overwrite? (y/N): " OVERWRITE
    if [[ "$OVERWRITE" != "y" && "$OVERWRITE" != "Y" ]]; then
        echo "Aborted."
        exit 0
    fi
    rm -rf "$USER_DIR"
fi

# Create directories
echo "📁 Creating user directory structure..."
mkdir -p "$USER_DIR/vault"
mkdir -p "$USER_DIR/outreach"
mkdir -p "$USER_DIR/engagement"

# Copy templates
echo "📝 Copying template files..."
cp "$DATA_DIR/_example/profile.yaml" "$USER_DIR/profile.yaml"
cp "$DATA_DIR/_example/voice.yaml" "$USER_DIR/voice.yaml"
cp "$DATA_DIR/_example/icp.yaml" "$USER_DIR/icp.yaml"
cp "$DATA_DIR/_example/vault/hooks.yaml" "$USER_DIR/vault/hooks.yaml"

# Create goals file
cat > "$USER_DIR/goals.yaml" << 'EOF'
# Revenue & Growth Goals

revenue:
  target_monthly: 0  # Fill in
  current_monthly: 0
  primary_offer: ""  # What you sell
  avg_deal_size: 0

pipeline:
  leads_needed_monthly: 0
  current_leads_monthly: 0
  conversion_rate: 0.25  # Adjust based on data

linkedin_metrics:
  followers_target: 0
  current_followers: 0
  post_frequency: "3x/week"
  engagement_goal: "2%"

time_investment:
  max_hours_weekly: 5
  current_hours_weekly: 0
EOF

# Create performance file
cat > "$USER_DIR/performance.yaml" << 'EOF'
# Performance Tracking

posts:
  total_analyzed: 0
  avg_engagement: 0

top_performers: []
# Add your best posts here as you track them
# - content_snippet: "First line..."
#   engagement: 0
#   hook_type: ""
#   topic: ""
#   leads_generated: 0

worst_performers: []

patterns_identified:
  hooks_that_work: []
  hooks_that_fail: []
  topics_that_work: []
  topics_that_fail: []
  best_posting_time: ""
  best_content_length: ""

outreach:
  total_sent: 0
  reply_rate: 0
  meeting_rate: 0
EOF

# Create patterns file
cat > "$USER_DIR/patterns.yaml" << 'EOF'
# Learned Patterns - Updated as you learn what works

content_patterns:
  hooks:
    top_performers: []
    underperformers: []
  topics:
    hot: []
    cold: []
  formats:
    best: ""
    avoid: ""
  timing:
    best_days: []
    best_times: []

outreach_patterns:
  templates:
    - name: ""
      reply_rate: 0
      best_for: []

learned_insights: []
# Add insights as you discover them
# - date: "2024-01-15"
#   insight: "What you learned"
#   evidence: "How you know"
EOF

echo ""
echo "✅ User '$USERNAME' created successfully!"
echo ""
echo "📂 Location: $USER_DIR"
echo ""
echo "Next steps:"
echo "1. Edit profile.yaml with your LinkedIn data"
echo "2. Edit voice.yaml with your actual voice patterns"
echo "3. Edit icp.yaml with your ideal customer"
echo "4. Set your goals in goals.yaml"
echo ""
echo "Or just start chatting with the agent and say:"
echo "  'Set up my profile'"
echo ""
echo "The agent will guide you through everything."
