#!/bin/bash

# Quick Security Audit - Runs available tools only
# This script checks which tools are installed and runs only those

set -e

echo "=========================================="
echo "KnowTon Quick Security Audit"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create reports directory
AUDIT_DIR="audit-reports"
mkdir -p $AUDIT_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$AUDIT_DIR/quick_audit_$TIMESTAMP"
mkdir -p $REPORT_DIR

echo "Reports will be saved to: $REPORT_DIR"
echo ""

# Compile contracts
echo -e "${GREEN}Compiling contracts...${NC}"
npm run build > /dev/null 2>&1 || true
echo ""

# Track what ran
TOOLS_RUN=0

# Check and run Slither
if command -v slither &> /dev/null; then
    echo -e "${GREEN}✓ Running Slither...${NC}"
    slither . \
        --exclude-dependencies \
        --json $REPORT_DIR/slither-report.json \
        > $REPORT_DIR/slither-report.txt 2>&1 || true
    echo "  Report: $REPORT_DIR/slither-report.txt"
    TOOLS_RUN=$((TOOLS_RUN + 1))
else
    echo -e "${YELLOW}⚠ Slither not installed (pip3 install slither-analyzer)${NC}"
fi
echo ""

# Check and run Mythril
if command -v myth &> /dev/null; then
    echo -e "${GREEN}✓ Running Mythril on IPBondSimple...${NC}"
    myth analyze contracts/IPBondSimple.sol \
        --solv 0.8.20 \
        --execution-timeout 120 \
        > $REPORT_DIR/mythril-ipbond.txt 2>&1 || true
    echo "  Report: $REPORT_DIR/mythril-ipbond.txt"
    TOOLS_RUN=$((TOOLS_RUN + 1))
else
    echo -e "${YELLOW}⚠ Mythril not installed (pip3 install mythril)${NC}"
fi
echo ""

# Check and run Solhint
if command -v solhint &> /dev/null; then
    echo -e "${GREEN}✓ Running Solhint...${NC}"
    solhint 'contracts/**/*.sol' \
        > $REPORT_DIR/solhint-report.txt 2>&1 || true
    echo "  Report: $REPORT_DIR/solhint-report.txt"
    TOOLS_RUN=$((TOOLS_RUN + 1))
else
    echo -e "${YELLOW}⚠ Solhint not installed (npm install -g solhint)${NC}"
fi
echo ""

# Run gas reporter (always available)
echo -e "${GREEN}✓ Running gas analysis...${NC}"
REPORT_GAS=true npm run test > $REPORT_DIR/gas-report.txt 2>&1 || true
echo "  Report: $REPORT_DIR/gas-report.txt"
TOOLS_RUN=$((TOOLS_RUN + 1))
echo ""

# Run contract sizer (always available)
echo -e "${GREEN}✓ Checking contract sizes...${NC}"
npx hardhat size-contracts > $REPORT_DIR/contract-sizes.txt 2>&1 || true
echo "  Report: $REPORT_DIR/contract-sizes.txt"
TOOLS_RUN=$((TOOLS_RUN + 1))
echo ""

# Generate summary
cat > "$REPORT_DIR/QUICK_AUDIT_SUMMARY.md" << EOF
# Quick Security Audit Summary

**Date:** $(date)
**Tools Run:** $TOOLS_RUN/5

## Tools Status

- Slither: $(command -v slither &> /dev/null && echo "✓ Run" || echo "✗ Not Installed")
- Mythril: $(command -v myth &> /dev/null && echo "✓ Run" || echo "✗ Not Installed")
- Solhint: $(command -v solhint &> /dev/null && echo "✓ Run" || echo "✗ Not Installed")
- Gas Reporter: ✓ Run
- Contract Sizer: ✓ Run

## Reports Generated

$(ls -1 $REPORT_DIR/*.txt 2>/dev/null | sed 's/^/- /' || echo "No reports")

## Next Steps

1. Review generated reports
2. Install missing tools (see AUDIT_SETUP.md)
3. Run full audit with: npm run audit
4. Address any critical/high findings

## Installation Commands

\`\`\`bash
# Install Slither
pip3 install slither-analyzer

# Install Mythril
pip3 install mythril

# Install Solhint
npm install -g solhint
\`\`\`

---
Generated: $(date)
EOF

echo "=========================================="
echo -e "${GREEN}Quick Audit Complete!${NC}"
echo "=========================================="
echo ""
echo "📁 Reports: $REPORT_DIR"
echo "📋 Summary: $REPORT_DIR/QUICK_AUDIT_SUMMARY.md"
echo ""
echo "Tools run: $TOOLS_RUN/5"
echo ""

if [ $TOOLS_RUN -lt 3 ]; then
    echo -e "${YELLOW}⚠️  Install more tools for comprehensive audit${NC}"
    echo "   See AUDIT_SETUP.md for installation guide"
fi

echo ""
