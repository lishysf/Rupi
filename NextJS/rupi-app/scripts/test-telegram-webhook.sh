#!/bin/bash

# Telegram Bot Test Script
# Tests webhook endpoints and functionality

DOMAIN="${NEXTAUTH_URL:-https://fundy.id}"

echo "🧪 Testing Telegram Bot Integration"
echo "===================================="
echo "Domain: $DOMAIN"
echo ""

# Test 1: Check webhook status
echo "Test 1: Checking webhook status..."
echo "-----------------------------------"
response=$(curl -s "$DOMAIN/api/telegram/setup")
echo "$response" | jq '.' || echo "$response"
echo ""

# Test 2: Get webhook info
echo "Test 2: Getting webhook information..."
echo "---------------------------------------"
response=$(curl -s "$DOMAIN/api/telegram/webhook")
echo "$response" | jq '.' || echo "$response"
echo ""

# Test 3: Initialize database
echo "Test 3: Testing database initialization..."
echo "------------------------------------------"
response=$(curl -s -X POST "$DOMAIN/api/telegram/setup" \
  -H "Content-Type: application/json" \
  -d '{"action": "init_database"}')
echo "$response" | jq '.' || echo "$response"
echo ""

# Test 4: Get webhook info via setup endpoint
echo "Test 4: Getting webhook info via setup..."
echo "-----------------------------------------"
response=$(curl -s -X POST "$DOMAIN/api/telegram/setup" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_webhook_info"}')
echo "$response" | jq '.' || echo "$response"
echo ""

echo "===================================="
echo "✅ Tests complete!"
echo ""
echo "Next steps:"
echo "1. If webhook is not set, run: npm run setup-telegram"
echo "2. Open Telegram and message @FundyIDbot"
echo "3. Use /start to begin"

