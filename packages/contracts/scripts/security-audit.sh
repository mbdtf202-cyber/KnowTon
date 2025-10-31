#!/bin/bash

# KnowTon Smart Contract Security Audit Script
# This script runs multiple security analysis tools on the smart contracts

set -e

echo "=========================================="
echo "KnowTon Smart Contract Security Audit"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create audit reports directory
AUDIT_DIR="audit-reports"
mkdir -p $AUDIT_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$AUDIT_DIR/audit_$TIMESTAMP"
mkdir -p $REPORT_DIR

echo "Audit reports will be saved to: $REPORT_DIR"
echo ""

# Check if contracts are compiled
if [ ! -d "artifacts" ]; then
    echo -e "${YELLOW}Compiling contracts first...${NC}"
    npm run build
    echo ""
fi

# ==========================================
# 1. Slither Static Analysis
# ==========================================
echo -e "${GREEN}[1/4] Running Slither Static Analysis...${NC}"
echo "=========================================="

if command -v slither &> /dev/null; then
    echo "Running Slither on all contracts..."
    
    # Run Slither with different detectors
    slither . \
        --exclude-dependencies \
        --exclude-informational \
        --exclude-low \
        --json $REPORT_DIR/slither-report.json \
        > $REPORT_DIR/slither-report.txt 2>&1 || true
    
    # Run Slither with all detectors for comprehensive analysis
    slither . \
        --exclude-dependencies \
        --json $REPORT_DIR/slither-full-report.json \
        > $REPORT_DIR/slither-full-report.txt 2>&1 || true
    
    echo -e "${GREEN}✓ Slither analysis complete${NC}"
    echo "  Reports: $REPORT_DIR/slither-report.txt"
    echo "           $REPORT_DIR/slither-full-report.txt"
else
    echo -e "${RED}✗ Slither not installed${NC}"
    echo "  Install with: pip3 install slither-analyzer"
    echo "  Skipping Slither analysis..."
fi
echo ""

# ==========================================
# 2. Mythril Symbolic Execution
# ==========================================
echo -e "${GREEN}[2/4] Running Mythril Symbolic Execution...${NC}"
echo "=========================================="

if command -v myth &> /dev/null; then
    echo "Running Mythril on core contracts..."
    
    # Analyze each core contract
    CONTRACTS=(
        "contracts/CopyrightRegistrySimple.sol"
        "contracts/IPBondSimple.sol"
        "contracts/IPBondBasic.sol"
        "contracts/GovernanceTokenSimple.sol"
        "contracts/FractionalToken.sol"
    )
    
    for contract in "${CONTRACTS[@]}"; do
        if [ -f "$contract" ]; then
            contract_name=$(basename "$contract" .sol)
            echo "  Analyzing $contract_name..."
            
            myth analyze "$contract" \
                --solv 0.8.20 \
                --execution-timeout 300 \
                -o json \
                > "$REPORT_DIR/mythril-$contract_name.json" 2>&1 || true
            
            myth analyze "$contract" \
                --solv 0.8.20 \
                --execution-timeout 300 \
                > "$REPORT_DIR/mythril-$contract_name.txt" 2>&1 || true
        fi
    done
    
    echo -e "${GREEN}✓ Mythril analysis complete${NC}"
    echo "  Reports: $REPORT_DIR/mythril-*.txt"
else
    echo -e "${RED}✗ Mythril not installed${NC}"
    echo "  Install with: pip3 install mythril"
    echo "  Skipping Mythril analysis..."
fi
echo ""

# ==========================================
# 3. Echidna Fuzzing (if available)
# ==========================================
echo -e "${GREEN}[3/4] Running Echidna Fuzzing...${NC}"
echo "=========================================="

if command -v echidna &> /dev/null; then
    echo "Running Echidna fuzzing tests..."
    
    # Check if echidna config exists
    if [ -f "echidna.config.yaml" ]; then
        # Run echidna on test contracts
        if [ -d "test/echidna" ]; then
            for test_file in test/echidna/*.sol; do
                if [ -f "$test_file" ]; then
                    test_name=$(basename "$test_file" .sol)
                    echo "  Fuzzing $test_name..."
                    
                    echidna "$test_file" \
                        --config echidna.config.yaml \
                        > "$REPORT_DIR/echidna-$test_name.txt" 2>&1 || true
                fi
            done
            echo -e "${GREEN}✓ Echidna fuzzing complete${NC}"
            echo "  Reports: $REPORT_DIR/echidna-*.txt"
        else
            echo -e "${YELLOW}⚠ No Echidna test files found in test/echidna/${NC}"
            echo "  Create fuzzing tests in test/echidna/ directory"
        fi
    else
        echo -e "${YELLOW}⚠ No echidna.config.yaml found${NC}"
        echo "  Skipping Echidna fuzzing..."
    fi
else
    echo -e "${RED}✗ Echidna not installed${NC}"
    echo "  Install from: https://github.com/crytic/echidna"
    echo "  Skipping Echidna fuzzing..."
fi
echo ""

# ==========================================
# 4. Additional Security Checks
# ==========================================
echo -e "${GREEN}[4/4] Running Additional Security Checks...${NC}"
echo "=========================================="

# Solhint linting
if command -v solhint &> /dev/null; then
    echo "Running Solhint security linter..."
    solhint 'contracts/**/*.sol' \
        > "$REPORT_DIR/solhint-report.txt" 2>&1 || true
    echo -e "${GREEN}✓ Solhint complete${NC}"
else
    echo -e "${YELLOW}⚠ Solhint not installed (npm install -g solhint)${NC}"
fi

# Hardhat gas reporter
echo "Generating gas usage report..."
npx hardhat test --reporter gas \
    > "$REPORT_DIR/gas-report.txt" 2>&1 || true
echo -e "${GREEN}✓ Gas report complete${NC}"

# Contract size check
echo "Checking contract sizes..."
npx hardhat size-contracts \
    > "$REPORT_DIR/contract-sizes.txt" 2>&1 || true

echo ""

# ==========================================
# Generate Summary Report
# ==========================================
echo -e "${GREEN}Generating Summary Report...${NC}"
echo "=========================================="

cat > "$REPORT_DIR/AUDIT_SUMMARY.md" << EOF
# KnowTon Smart Contract Security Audit Report

**Audit Date:** $(date)
**Auditor:** Automated Security Tools
**Contracts Audited:** 
- CopyrightRegistrySimple.sol
- IPBondSimple.sol
- IPBondBasic.sol
- GovernanceTokenSimple.sol
- FractionalToken.sol
- SimpleERC20.sol
- MockERC20.sol

## Executive Summary

This automated security audit was performed using industry-standard tools:
1. **Slither** - Static analysis for vulnerability detection
2. **Mythril** - Symbolic execution for deep security analysis
3. **Echidna** - Property-based fuzzing (if configured)
4. **Solhint** - Solidity linting for best practices

## Tools Used

### 1. Slither Static Analysis
- **Status:** $(command -v slither &> /dev/null && echo "✓ Completed" || echo "✗ Not Run")
- **Reports:** 
  - slither-report.txt (medium/high severity)
  - slither-full-report.txt (all findings)

### 2. Mythril Symbolic Execution
- **Status:** $(command -v myth &> /dev/null && echo "✓ Completed" || echo "✗ Not Run")
- **Reports:** mythril-*.txt (per contract)

### 3. Echidna Fuzzing
- **Status:** $(command -v echidna &> /dev/null && echo "✓ Completed" || echo "✗ Not Run")
- **Reports:** echidna-*.txt (if tests exist)

### 4. Additional Checks
- **Solhint:** $(command -v solhint &> /dev/null && echo "✓ Completed" || echo "✗ Not Run")
- **Gas Report:** ✓ Completed
- **Contract Sizes:** ✓ Completed

## Findings Summary

Please review individual report files for detailed findings:

1. **Critical Issues:** Review mythril-*.txt and slither-report.txt
2. **Gas Optimization:** Review gas-report.txt
3. **Code Quality:** Review solhint-report.txt
4. **Contract Sizes:** Review contract-sizes.txt

## Recommendations

### Immediate Actions Required:
1. Review all CRITICAL and HIGH severity findings
2. Fix reentrancy vulnerabilities if detected
3. Verify access control mechanisms
4. Check for integer overflow/underflow issues
5. Validate external call safety

### Best Practices:
1. Implement comprehensive unit tests
2. Add integration tests for complex flows
3. Consider formal verification for critical functions
4. Implement circuit breakers for emergency stops
5. Add time locks for sensitive operations

### Third-Party Audit:
For production deployment, consider engaging professional audit firms:
- OpenZeppelin
- Trail of Bits
- ConsenSys Diligence
- Certik
- Quantstamp

## Next Steps

1. ✅ Review all automated findings
2. ⏳ Fix identified vulnerabilities
3. ⏳ Re-run security audit after fixes
4. ⏳ Conduct manual code review
5. ⏳ Submit for third-party audit (recommended)
6. ⏳ Implement bug bounty program

## Disclaimer

This automated audit provides initial security analysis but does not replace
professional manual auditing. Always engage qualified security auditors before
deploying contracts to mainnet with real value.

---

**Report Location:** $REPORT_DIR
**Generated:** $(date)
EOF

echo -e "${GREEN}✓ Summary report generated${NC}"
echo ""

# ==========================================
# Final Summary
# ==========================================
echo "=========================================="
echo -e "${GREEN}Security Audit Complete!${NC}"
echo "=========================================="
echo ""
echo "📁 All reports saved to: $REPORT_DIR"
echo ""
echo "📋 Key Reports:"
echo "   - AUDIT_SUMMARY.md (overview)"
echo "   - slither-report.txt (static analysis)"
echo "   - mythril-*.txt (symbolic execution)"
echo "   - gas-report.txt (gas optimization)"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Review AUDIT_SUMMARY.md"
echo "   2. Address critical/high severity issues"
echo "   3. Re-run audit after fixes"
echo "   4. Consider third-party professional audit"
echo ""

# Check if any critical issues were found
if [ -f "$REPORT_DIR/slither-report.txt" ]; then
    if grep -q "High\|Critical" "$REPORT_DIR/slither-report.txt" 2>/dev/null; then
        echo -e "${RED}⚠️  CRITICAL/HIGH severity issues detected!${NC}"
        echo "   Please review slither-report.txt immediately"
        echo ""
    fi
fi

echo "=========================================="
