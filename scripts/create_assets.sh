#!/bin/bash
# ============================================================================
# AURUM - Create Stellar Assets and Accounts
# Creates issuer, distributor, and user accounts. Emits GOLD token on testnet.
# ============================================================================

set -e
source "$HOME/.cargo/env" 2>/dev/null || true

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$PROJECT_DIR/.keys"

mkdir -p "$KEYS_DIR"

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  AURUM - Create Stellar Assets & Accounts${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# ============================================================================
# 1. Generate Keypairs
# ============================================================================

echo -e "\n${YELLOW}[1/6] Generating keypairs...${NC}"

# Generate keys if they don't exist
for NAME in issuer distributor user1 user2 merchant; do
    if ! stellar keys address "$NAME" &>/dev/null; then
        stellar keys generate "$NAME" --network testnet
        echo -e "  🔑 Generated: ${CYAN}$NAME${NC}"
    else
        echo -e "  ✅ Already exists: ${CYAN}$NAME${NC}"
    fi
done

# ============================================================================
# 2. Fund accounts with Friendbot
# ============================================================================

echo -e "\n${YELLOW}[2/6] Funding accounts with Friendbot (testnet XLM)...${NC}"

for NAME in issuer distributor user1 user2 merchant; do
    ADDR=$(stellar keys address "$NAME")
    echo -e "  💰 Funding ${CYAN}$NAME${NC} ($ADDR)..."
    curl -s "https://friendbot.stellar.org/?addr=$ADDR" > /dev/null 2>&1 || true
    sleep 1
done
echo -e "  ✅ All accounts funded with testnet XLM"

# ============================================================================
# 3. Store addresses for later use
# ============================================================================

echo -e "\n${YELLOW}[3/6] Storing account addresses...${NC}"

ISSUER_ADDR=$(stellar keys address issuer)
DISTRIBUTOR_ADDR=$(stellar keys address distributor)
USER1_ADDR=$(stellar keys address user1)
USER2_ADDR=$(stellar keys address user2)
MERCHANT_ADDR=$(stellar keys address merchant)

cat > "$KEYS_DIR/addresses.env" << EOF
# AURUM Testnet Addresses - Generated $(date -Iseconds)
ISSUER_ADDR=$ISSUER_ADDR
DISTRIBUTOR_ADDR=$DISTRIBUTOR_ADDR
USER1_ADDR=$USER1_ADDR
USER2_ADDR=$USER2_ADDR
MERCHANT_ADDR=$MERCHANT_ADDR
EOF

echo -e "  ✅ Addresses saved to ${CYAN}.keys/addresses.env${NC}"

# ============================================================================
# 4. Create GOLD Trustlines
# ============================================================================

echo -e "\n${YELLOW}[4/6] Creating GOLD trustlines...${NC}"

for NAME in distributor user1 user2 merchant; do
    echo -e "  🔗 Creating trustline for ${CYAN}$NAME${NC}..."
    stellar tx new change-trust \
        --line "GOLD:$ISSUER_ADDR" \
        --source-account "$NAME" \
        --network testnet \
        --build-only \
        2>/dev/null | \
    stellar tx sign --source-account "$NAME" --network testnet --build-only 2>/dev/null | \
    stellar tx send --network testnet 2>/dev/null || \
    echo -e "    ℹ️  Trustline may already exist"
    sleep 1
done
echo -e "  ✅ Trustlines created"

# ============================================================================
# 5. Issue GOLD tokens
# ============================================================================

echo -e "\n${YELLOW}[5/6] Issuing GOLD tokens...${NC}"

# Issue 10,000 GOLD to distributor
echo -e "  🏦 Minting 10,000 GOLD to distributor..."
stellar tx new payment \
    --destination "$DISTRIBUTOR_ADDR" \
    --asset "GOLD:$ISSUER_ADDR" \
    --amount 10000 \
    --source-account issuer \
    --network testnet \
    --build-only 2>/dev/null | \
stellar tx sign --source-account issuer --network testnet --build-only 2>/dev/null | \
stellar tx send --network testnet 2>/dev/null || echo -e "  ⚠️  Payment may have failed"

sleep 2

# Distribute to users
echo -e "  📤 Distributing 100 GOLD to user1..."
stellar tx new payment \
    --destination "$USER1_ADDR" \
    --asset "GOLD:$ISSUER_ADDR" \
    --amount 100 \
    --source-account distributor \
    --network testnet \
    --build-only 2>/dev/null | \
stellar tx sign --source-account distributor --network testnet --build-only 2>/dev/null | \
stellar tx send --network testnet 2>/dev/null || echo -e "  ⚠️  Payment may have failed"

sleep 1

echo -e "  📤 Distributing 50 GOLD to user2..."
stellar tx new payment \
    --destination "$USER2_ADDR" \
    --asset "GOLD:$ISSUER_ADDR" \
    --amount 50 \
    --source-account distributor \
    --network testnet \
    --build-only 2>/dev/null | \
stellar tx sign --source-account distributor --network testnet --build-only 2>/dev/null | \
stellar tx send --network testnet 2>/dev/null || echo -e "  ⚠️  Payment may have failed"

echo -e "  ✅ GOLD tokens issued and distributed"

# ============================================================================
# 6. Wrap GOLD as SAC for Soroban
# ============================================================================

echo -e "\n${YELLOW}[6/6] Wrapping GOLD as Stellar Asset Contract (SAC)...${NC}"

GOLD_CONTRACT_ID=$(stellar contract asset deploy \
    --asset "GOLD:$ISSUER_ADDR" \
    --source-account issuer \
    --network testnet 2>/dev/null || echo "ALREADY_DEPLOYED")

if [ "$GOLD_CONTRACT_ID" = "ALREADY_DEPLOYED" ]; then
    GOLD_CONTRACT_ID=$(stellar contract asset id \
        --asset "GOLD:$ISSUER_ADDR" \
        --network testnet 2>/dev/null)
    echo -e "  ℹ️  SAC already deployed"
fi

echo "$GOLD_CONTRACT_ID" > "$KEYS_DIR/gold_contract_id.txt"
echo -e "  ✅ GOLD SAC Contract ID: ${CYAN}$GOLD_CONTRACT_ID${NC}"

# ============================================================================
# Summary
# ============================================================================

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Asset Creation Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "  ${CYAN}Issuer:${NC}       $ISSUER_ADDR"
echo -e "  ${CYAN}Distributor:${NC}  $DISTRIBUTOR_ADDR"
echo -e "  ${CYAN}User 1:${NC}       $USER1_ADDR (100 GOLD)"
echo -e "  ${CYAN}User 2:${NC}       $USER2_ADDR (50 GOLD)"
echo -e "  ${CYAN}Merchant:${NC}     $MERCHANT_ADDR"
echo -e "  ${CYAN}GOLD SAC ID:${NC}  $GOLD_CONTRACT_ID"
echo -e ""
echo -e "  🔍 View on Stellar Expert:"
echo -e "  ${CYAN}https://stellar.expert/explorer/testnet/asset/GOLD-$ISSUER_ADDR${NC}"
echo -e ""
echo -e "Next step: Run ${YELLOW}./scripts/build_and_deploy.sh${NC} to compile and deploy the contract"
