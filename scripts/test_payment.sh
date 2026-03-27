#!/bin/bash
# ============================================================================
# AURUM - Test Payment Flow
# Simulates a complete RWA payment: QR scan → calculate → pay → verify
# ============================================================================

set -e
source "$HOME/.cargo/env" 2>/dev/null || true

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$PROJECT_DIR/.keys"

# Load addresses
source "$KEYS_DIR/addresses.env"
GOLD_CONTRACT_ID=$(cat "$KEYS_DIR/gold_contract_id.txt")
AURUM_CONTRACT_ID=$(cat "$KEYS_DIR/aurum_contract_id.txt")

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  AURUM - Test RWA Payment Flow${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# ============================================================================
# 1. Show initial balances
# ============================================================================

echo -e "\n${YELLOW}[1/5] Querying initial GOLD balances...${NC}"

USER1_BALANCE_BEFORE=$(stellar contract invoke \
    --id "$GOLD_CONTRACT_ID" \
    --network testnet \
    --source-account user1 \
    -- \
    balance \
    --id "$USER1_ADDR" 2>/dev/null | tr -d '"')

MERCHANT_BALANCE_BEFORE=$(stellar contract invoke \
    --id "$GOLD_CONTRACT_ID" \
    --network testnet \
    --source-account merchant \
    -- \
    balance \
    --id "$MERCHANT_ADDR" 2>/dev/null | tr -d '"')

echo -e "  ${CYAN}User 1 GOLD balance:${NC}    $USER1_BALANCE_BEFORE (raw, 7 decimals)"
echo -e "  ${CYAN}Merchant GOLD balance:${NC}  $MERCHANT_BALANCE_BEFORE (raw, 7 decimals)"

# ============================================================================
# 2. Simulate QR Code scan
# ============================================================================

echo -e "\n${YELLOW}[2/5] 📱 Simulating QR Code scan...${NC}"

FIAT_AMOUNT=50000000000  # 5,000 ARS with 7 decimals
FIAT_DISPLAY="5,000 ARS"

echo -e "  📋 QR Data: {\"dest\": \"$MERCHANT_ADDR\", \"monto_fiat\": $FIAT_DISPLAY}"

# ============================================================================
# 3. Preview payment
# ============================================================================

echo -e "\n${YELLOW}[3/5] 🔍 Payment preview (how much GOLD needed)...${NC}"

GOLD_PREVIEW=$(stellar contract invoke \
    --id "$AURUM_CONTRACT_ID" \
    --network testnet \
    --source-account user1 \
    -- \
    get_payment_preview \
    --amount_fiat $FIAT_AMOUNT 2>/dev/null | tr -d '"')

echo -e "  💰 To pay ${MAGENTA}$FIAT_DISPLAY${NC}, you need ${MAGENTA}$GOLD_PREVIEW${NC} GOLD (raw)"
echo -e "  💡 That's approximately $(echo "scale=7; $GOLD_PREVIEW / 10000000" | bc) grams of gold"

# ============================================================================
# 4. Execute payment
# ============================================================================

echo -e "\n${YELLOW}[4/5] 💳 Executing pay_with_rwa...${NC}"

MAX_GOLD=$(echo "$GOLD_PREVIEW * 1.01 / 1" | bc)
echo -e "  🛡️  Slippage max spend (+1%): ${CYAN}$MAX_GOLD${NC}"

GOLD_USED=$(stellar contract invoke \
    --id "$AURUM_CONTRACT_ID" \
    --network testnet \
    --source-account user1 \
    -- \
    pay_with_rwa \
    --sender "$USER1_ADDR" \
    --destination "$MERCHANT_ADDR" \
    --amount_fiat $FIAT_AMOUNT \
    --max_gold_to_spend "$MAX_GOLD" 2>/dev/null | tr -d '"')

echo -e "  ✅ Payment executed!"
echo -e "  🪙 GOLD transferred: ${MAGENTA}$GOLD_USED${NC} (raw)"

# ============================================================================
# 5. Verify final balances
# ============================================================================

echo -e "\n${YELLOW}[5/5] 📊 Verifying final balances...${NC}"

USER1_BALANCE_AFTER=$(stellar contract invoke \
    --id "$GOLD_CONTRACT_ID" \
    --network testnet \
    --source-account user1 \
    -- \
    balance \
    --id "$USER1_ADDR" 2>/dev/null | tr -d '"')

MERCHANT_BALANCE_AFTER=$(stellar contract invoke \
    --id "$GOLD_CONTRACT_ID" \
    --network testnet \
    --source-account merchant \
    -- \
    balance \
    --id "$MERCHANT_ADDR" 2>/dev/null | tr -d '"')

echo -e ""
echo -e "  ┌──────────────────────────────────────────────────────┐"
echo -e "  │             💰 BALANCE COMPARISON (GOLD)             │"
echo -e "  ├──────────────────────────────────────────────────────┤"
echo -e "  │  Account    │   Before         │   After            │"
echo -e "  ├─────────────┼──────────────────┼────────────────────┤"
echo -e "  │  User 1     │ $USER1_BALANCE_BEFORE │ $USER1_BALANCE_AFTER │"
echo -e "  │  Merchant   │ $MERCHANT_BALANCE_BEFORE │ $MERCHANT_BALANCE_AFTER │"
echo -e "  └──────────────────────────────────────────────────────┘"
echo -e ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Payment Test Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "  Payment: ${MAGENTA}$FIAT_DISPLAY${NC} paid with ${MAGENTA}$GOLD_USED${NC} GOLD"
echo -e ""
echo -e "  🔍 Verify on Stellar Expert:"
echo -e "  ${CYAN}https://stellar.expert/explorer/testnet/contract/$AURUM_CONTRACT_ID${NC}"
echo -e "  ${CYAN}https://stellar.expert/explorer/testnet/account/$USER1_ADDR${NC}"
echo -e ""
