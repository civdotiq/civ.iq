#!/bin/bash

# Upstash Redis Setup Script for Vercel
# This script helps configure Upstash Redis for production deployment

set -e

echo "================================================"
echo "   Upstash Redis Setup for Vercel Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must be run from project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Upstash Account Setup${NC}"
echo "1. Go to: https://upstash.com/"
echo "2. Sign up with GitHub"
echo "3. Create a new Redis database:"
echo "   - Name: civiq-production"
echo "   - Type: Regional"
echo "   - Region: US East (N. Virginia)"
echo "   - TLS: Enabled"
echo "   - Eviction: noeviction"
echo ""
read -p "Press Enter when you have created the database..."

echo ""
echo -e "${BLUE}Step 2: Get Redis Connection URL${NC}"
echo "From your Upstash dashboard, copy the Redis URL."
echo "It should look like: redis://default:PASSWORD@INSTANCE.upstash.io:6379"
echo ""
read -p "Enter your Upstash Redis URL: " REDIS_URL

if [ -z "$REDIS_URL" ]; then
    echo -e "${RED}Error: Redis URL cannot be empty${NC}"
    exit 1
fi

# Validate Redis URL format
if [[ ! "$REDIS_URL" =~ ^redis:// ]]; then
    echo -e "${RED}Error: Invalid Redis URL format. Should start with 'redis://'${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Generate Cron Secret${NC}"
echo "Generating secure cron secret..."

# Generate secure random secret
if command -v openssl &> /dev/null; then
    CRON_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}Generated CRON_SECRET: ${CRON_SECRET}${NC}"
else
    echo -e "${YELLOW}OpenSSL not found. Please generate a random 32-character secret.${NC}"
    read -p "Enter your CRON_SECRET: " CRON_SECRET
fi

echo ""
echo -e "${BLUE}Step 4: Update Local Environment${NC}"

# Backup existing .env.local
if [ -f ".env.local" ]; then
    echo "Backing up .env.local to .env.local.backup..."
    cp .env.local .env.local.backup
fi

# Update .env.local
if [ -f ".env.local" ]; then
    # Remove old Redis variables
    sed -i.bak '/^REDIS_HOST=/d' .env.local
    sed -i.bak '/^REDIS_PORT=/d' .env.local
    sed -i.bak '/^REDIS_DB=/d' .env.local

    # Add new Redis URL if not exists
    if ! grep -q "^REDIS_URL=" .env.local; then
        echo "" >> .env.local
        echo "# Upstash Redis (Serverless)" >> .env.local
        echo "REDIS_URL=$REDIS_URL" >> .env.local
    else
        # Update existing REDIS_URL
        sed -i.bak "s|^REDIS_URL=.*|REDIS_URL=$REDIS_URL|" .env.local
    fi

    # Add CRON_SECRET if not exists
    if ! grep -q "^CRON_SECRET=" .env.local; then
        echo "CRON_SECRET=$CRON_SECRET" >> .env.local
    else
        sed -i.bak "s|^CRON_SECRET=.*|CRON_SECRET=$CRON_SECRET|" .env.local
    fi

    # Clean up backup files
    rm -f .env.local.bak

    echo -e "${GREEN}✓ Updated .env.local${NC}"
else
    echo -e "${YELLOW}Warning: .env.local not found. Creating new file...${NC}"
    echo "REDIS_URL=$REDIS_URL" > .env.local
    echo "CRON_SECRET=$CRON_SECRET" >> .env.local
fi

echo ""
echo -e "${BLUE}Step 5: Configure Vercel Environment Variables${NC}"
echo ""
echo "Choose your method:"
echo "1) Vercel CLI (automated)"
echo "2) Vercel Dashboard (manual)"
read -p "Enter choice (1 or 2): " method

if [ "$method" = "1" ]; then
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
        npm install -g vercel
    fi

    echo ""
    echo "Setting Vercel environment variables..."

    # Add REDIS_URL to all environments
    echo "$REDIS_URL" | npx vercel env add REDIS_URL production --force
    echo "$REDIS_URL" | npx vercel env add REDIS_URL preview --force
    echo "$REDIS_URL" | npx vercel env add REDIS_URL development --force

    # Add CRON_SECRET to production only
    echo "$CRON_SECRET" | npx vercel env add CRON_SECRET production --force

    # Remove old variables (will fail if not exist, that's okay)
    npx vercel env rm REDIS_HOST production --yes 2>/dev/null || true
    npx vercel env rm REDIS_PORT production --yes 2>/dev/null || true
    npx vercel env rm REDIS_DB production --yes 2>/dev/null || true

    echo -e "${GREEN}✓ Vercel environment variables configured${NC}"

elif [ "$method" = "2" ]; then
    echo ""
    echo "Manual setup instructions:"
    echo "1. Go to: https://vercel.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to Settings → Environment Variables"
    echo "4. Add these variables:"
    echo ""
    echo -e "${YELLOW}Variable: REDIS_URL${NC}"
    echo "Value: $REDIS_URL"
    echo "Environments: Production, Preview, Development"
    echo ""
    echo -e "${YELLOW}Variable: CRON_SECRET${NC}"
    echo "Value: $CRON_SECRET"
    echo "Environments: Production"
    echo ""
    echo "5. Remove these old variables:"
    echo "   - REDIS_HOST"
    echo "   - REDIS_PORT"
    echo "   - REDIS_DB"
    echo ""
    read -p "Press Enter when you have configured Vercel..."
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 6: Deploy to Vercel${NC}"
echo ""
read -p "Deploy now? (y/n): " deploy

if [ "$deploy" = "y" ] || [ "$deploy" = "Y" ]; then
    if command -v vercel &> /dev/null; then
        echo "Deploying to production..."
        npx vercel --prod
        echo -e "${GREEN}✓ Deployed to Vercel${NC}"
    else
        echo "Vercel CLI not found. Triggering deployment via git push..."
        git add .env.local.backup 2>/dev/null || true
        git commit --allow-empty -m "chore: configure Upstash Redis for production"
        git push origin main
        echo -e "${GREEN}✓ Pushed to GitHub. Vercel will auto-deploy.${NC}"
    fi
else
    echo -e "${YELLOW}Skipping deployment. Deploy manually when ready:${NC}"
    echo "  git push origin main"
    echo "  # or"
    echo "  npx vercel --prod"
fi

echo ""
echo "================================================"
echo -e "${GREEN}   Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Wait for Vercel deployment to complete (~2 minutes)"
echo "2. Verify cache status:"
echo "   curl https://www.civdotiq.org/api/cache/status"
echo ""
echo "3. Manually trigger RSS aggregator:"
echo "   curl -X POST https://www.civdotiq.org/api/cron/rss-aggregator \\"
echo "     -H \"Authorization: Bearer $CRON_SECRET\""
echo ""
echo "4. Verify Google News is working:"
echo "   curl https://www.civdotiq.org/api/representative/K000367/news"
echo "   # Look for: \"dataSource\": \"google-news\""
echo ""
echo "Documentation: docs/deployment/UPSTASH_REDIS_SETUP.md"
echo ""
echo -e "${BLUE}Your credentials (save securely):${NC}"
echo "REDIS_URL: $REDIS_URL"
echo "CRON_SECRET: $CRON_SECRET"
echo ""
