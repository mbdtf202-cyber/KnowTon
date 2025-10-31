#!/bin/bash

# Lighthouse Performance Audit Script
# Runs Lighthouse CI to audit frontend performance

set -e

echo "🚀 Starting Lighthouse Performance Audit..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    echo -e "${YELLOW}Lighthouse not found. Installing...${NC}"
    npm install -g @lhci/cli lighthouse
fi

# Build the application
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Start preview server in background
echo -e "${YELLOW}Starting preview server...${NC}"
npm run preview &
SERVER_PID=$!

# Wait for server to start
echo -e "${YELLOW}Waiting for server to start...${NC}"
sleep 5

# Run Lighthouse CI
echo -e "${YELLOW}Running Lighthouse audit...${NC}"
npx lhci autorun

# Kill preview server
kill $SERVER_PID

echo -e "${GREEN}✅ Lighthouse audit complete!${NC}"

# Run individual Lighthouse audit for detailed report
echo -e "${YELLOW}Generating detailed Lighthouse report...${NC}"
npm run preview &
SERVER_PID=$!
sleep 5

lighthouse http://localhost:4173 \
  --output html \
  --output json \
  --output-path ./lighthouse-report \
  --chrome-flags="--headless" \
  --preset=desktop

kill $SERVER_PID

echo -e "${GREEN}✅ Detailed report saved to lighthouse-report.html${NC}"
echo -e "${GREEN}📊 Open lighthouse-report.html to view the full report${NC}"
