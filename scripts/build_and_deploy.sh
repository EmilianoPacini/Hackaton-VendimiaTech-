#!/bin/bash
# ============================================================================
# AURUM - Build, Optimize, Deploy, and Initialize Contract
# ============================================================================

set -e
source "$HOME/.cargo/env" 2>/dev/null || true

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACT_DIR="$PROJECT_DIR/contracts/aurum"
KEYS_DIR="$PROJECT_DIR/.keys"

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  AURUM - Build, Deploy & Initialize Contract${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# ============================================================================
# 1. Build the contract
# ============================================================================

echo -e "\n${YELLOW}[1/4] Building contract...${NC}"
cd "$CONTRACT_DIR"
stellar contract build
echo -e "  ✅ Contract compiled"

# ============================================================================
# 2. Optimize WASM
# ============================================================================

echo -e "\n${YELLOW}[2/4] Optimizing WASM binary...${NC}"
WASM_PATH="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/aurum.wasm"

if [ -f "$WASM_PATH" ]; then
    ORIGINAL_SIZE=$(stat --format=%s "$WASM_PATH" 2>/dev/null || stat -f%z "$WASM_PATH")
    stellar contract optimize --wasm "$WASM_PATH"
    OPTIMIZED_PATH="${WASM_PATH%.wasm}.optimized.wasm"
    if [ -f "$OPTIMIZED_PATH" ]; then
        OPTIMIZED_SIZE=$(stat --format=%s "$OPTIMIZED_PATH" 2>/dev/null || stat -f%z "$OPTIMIZED_PATH")
        echo -e "  📦 Original:  ${ORIGINAL_SIZE} bytes"
        echo -e "  📦 Optimized: ${OPTIMIZED_SIZE} bytes"
        echo -e "  ✅ WASM optimized"
    else
        OPTIMIZED_PATH="$WASM_PATH"
        echo -e "  ℹ️  Using unoptimized WASM"
    fi
else
    echo -e "  ${RED}❌ WASM file not found at $WASM_PATH${NC}"
    exit 1
fi

# ============================================================================
# 3. Deploy to Testnet
# ============================================================================

echo -e "\n${YELLOW}[3/4] Deploying to Testnet...${NC}"

AURUM_CONTRACT_ID=$(stellar contract deploy \
    --wasm "$OPTIMIZED_PATH" \
    --source-account issuer \
    --network testnet 2>/dev/null)

echo "$AURUM_CONTRACT_ID" > "$KEYS_DIR/aurum_contract_id.txt"
echo -e "  ✅ Contract deployed!"
echo -e "  📋 Contract ID: ${CYAN}$AURUM_CONTRACT_ID${NC}"

# ============================================================================
# 4. Initialize the contract
# ============================================================================

echo -e "\n${YELLOW}[4/4] Initializing AURUM contract...${NC}"

# Load addresses
source "$KEYS_DIR/addresses.env"
GOLD_CONTRACT_ID=$(cat "$KEYS_DIR/gold_contract_id.txt")

# Oracle price: 1 GOLD = 90,000 ARS (with 7 decimals = 90000_0000000)
ORACLE_PRICE=900000000000

echo -e "  Admin:       ${CYAN}$ISSUER_ADDR${NC}"
echo -e "  GOLD Token:  ${CYAN}$GOLD_CONTRACT_ID${NC}"
echo -e "  Oracle Price: 1 GOLD = 90,000 ARS"

stellar contract invoke \
    --id "$AURUM_CONTRACT_ID" \
    --source-account issuer \
    --network testnet \
    -- \
    initialize \
    --admin "$ISSUER_ADDR" \
    --gold_token "$GOLD_CONTRACT_ID" \
    --oracle_price_fiat $ORACLE_PRICE

echo -e "  ✅ Contract initialized!"

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "  ${CYAN}AURUM Contract:${NC}  $AURUM_CONTRACT_ID"
echo -e "  ${CYAN}GOLD Token SAC:${NC}  $GOLD_CONTRACT_ID"
echo -e "  ${CYAN}Oracle Price:${NC}    1 GOLD = 90,000 ARS"
echo -e ""
echo -e "Next step: Run ${YELLOW}./scripts/test_payment.sh${NC} to test a payment"
