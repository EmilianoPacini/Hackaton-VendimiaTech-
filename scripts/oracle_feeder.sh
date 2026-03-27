#!/bin/bash
# ============================================================================
# AURUM - Oracle Feeder
# Fetches real gold price from gold-api.com, converts to ARS, and updates
# the AURUM smart contract oracle on Stellar Testnet.
#
# This script implements the SAME PATTERN used by production oracles like
# Chainlink, Band Protocol, and Lightecho: an off-chain feeder that brings
# real-world data into the blockchain.
#
# Usage:
#   ./scripts/oracle_feeder.sh              # One-shot update
#   ./scripts/oracle_feeder.sh --loop 300   # Update every 300 seconds (5 min)
#   ./scripts/oracle_feeder.sh --dry-run    # Show price without updating
# ============================================================================

set -e
source "$HOME/.cargo/env" 2>/dev/null || true

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$PROJECT_DIR/.keys"

# ============================================================================
# Configuration
# ============================================================================

# Gold price API (free, no API key required)
GOLD_API_URL="https://api.gold-api.com/price/XAU"

# USD/ARS exchange rate
# Option 1: Set manually if dolarapi.com is unavailable
USD_ARS_FALLBACK=1200

# Option 2: Try fetching from dolarapi.com (free Argentine peso rates)
DOLAR_API_URL="https://dolarapi.com/v1/dolares/blue"

# Source identifier (stored on-chain for auditing)
ORACLE_SOURCE="gold-api.com"

# ============================================================================
# Parse arguments
# ============================================================================

MODE="oneshot"
LOOP_INTERVAL=300
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --loop)
            MODE="loop"
            if [[ -n "$2" && "$2" =~ ^[0-9]+$ ]]; then
                LOOP_INTERVAL="$2"
                shift
            fi
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# ============================================================================
# Functions
# ============================================================================

fetch_gold_price_usd() {
    # Fetch XAU/USD from gold-api.com
    local response
    response=$(curl -s --max-time 10 "$GOLD_API_URL" 2>/dev/null)

    if [ -z "$response" ]; then
        echo ""
        return 1
    fi

    # Parse price from JSON response
    # api.gold-api.com returns: {"name":"Gold","price":4433.39,"symbol":"XAU",...}
    local price
    price=$(echo "$response" | grep -oP '"price"\s*:\s*\K[0-9]+(\.[0-9]+)?' 2>/dev/null)

    if [ -z "$price" ]; then
        # Fallback: try with python3 json parser
        price=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('price', ''))" 2>/dev/null)
    fi

    # Validate it looks like a number
    if ! echo "$price" | grep -qP '^[0-9]+(\.[0-9]+)?$'; then
        echo ""
        return 1
    fi

    echo "$price"
}

fetch_usd_ars_rate() {
    # Try to get USD/ARS from dolarapi.com
    local response
    response=$(curl -s --max-time 10 "$DOLAR_API_URL" 2>/dev/null)

    if [ -n "$response" ]; then
        local rate
        rate=$(echo "$response" | grep -oP '"venta"\s*:\s*\K[0-9]+(\.[0-9]+)?' 2>/dev/null)
        if [ -z "$rate" ]; then
            rate=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('venta', ''))" 2>/dev/null)
        fi
        if [ -n "$rate" ] && [ "$rate" != "" ]; then
            echo "$rate"
            return 0
        fi
    fi

    # Fallback to manual rate
    echo "$USD_ARS_FALLBACK"
    return 1
}

update_oracle() {
    echo -e "${BOLD}${YELLOW}━━━ AURUM Oracle Feeder ━━━${NC}"
    echo -e "  ⏰ $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # 1. Fetch gold price in USD
    echo -e "  ${CYAN}[1/4]${NC} Fetching XAU/USD from ${MAGENTA}gold-api.com${NC}..."
    local gold_usd
    gold_usd=$(fetch_gold_price_usd)

    if [ -z "$gold_usd" ]; then
        echo -e "  ${RED}❌ Failed to fetch gold price. Using last known price.${NC}"
        return 1
    fi
    echo -e "  📈 XAU/USD: ${BOLD}\$${gold_usd}${NC} per troy ounce"

    # 2. Fetch USD/ARS rate
    echo -e "  ${CYAN}[2/4]${NC} Fetching USD/ARS exchange rate..."
    local usd_ars
    local rate_source="dolarapi.com"
    usd_ars=$(fetch_usd_ars_rate)

    if [ $? -ne 0 ]; then
        rate_source="manual fallback"
    fi
    echo -e "  💱 USD/ARS: ${BOLD}\$${usd_ars}${NC} (source: ${rate_source})"

    # 3. Calculate Soroban prices (7 decimals)
    echo -e "  ${CYAN}[3/4]${NC} Formatting prices for Soroban..."
    local xau_usd_soroban
    xau_usd_soroban=$(echo "scale=0; $gold_usd * 10000000 / 1" | bc)
    
    local usd_ars_soroban
    usd_ars_soroban=$(echo "scale=0; $usd_ars * 10000000 / 1" | bc)

    echo -e "  📦 XAU/USD (Soroban): ${CYAN}${xau_usd_soroban}${NC}"
    echo -e "  📦 USD/ARS (Soroban): ${CYAN}${usd_ars_soroban}${NC}"

    # 4. Update on-chain (or dry-run)
    if [ "$DRY_RUN" = true ]; then
        echo ""
        echo -e "  ${YELLOW}🔸 DRY RUN - No on-chain update performed${NC}"
        echo -e "  Would call set_price XAU/USD: $xau_usd_soroban"
        echo -e "  Would call set_price USD/ARS: $usd_ars_soroban"
        return 0
    fi

    echo -e "  ${CYAN}[4/4]${NC} Updating SEP-40 Oracle on Stellar Testnet..."

    # Load Oracle contract ID
    if [ ! -f "$KEYS_DIR/oracle_contract_id.txt" ]; then
        echo -e "  ${RED}❌ Oracle Contract not deployed yet. Run build_and_deploy.sh first.${NC}"
        return 1
    fi

    local ORACLE_CONTRACT_ID
    ORACLE_CONTRACT_ID=$(cat "$KEYS_DIR/oracle_contract_id.txt")

    # Update XAU/USD
    stellar contract invoke \
        --id "$ORACLE_CONTRACT_ID" \
        --source-account issuer \
        --network testnet \
        -- \
        set_price \
        --base_asset '{"Other":["XAU"]}' \
        --quote_asset '{"Other":["USD"]}' \
        --price "$xau_usd_soroban" \
        2>/dev/null

    # Update USD/ARS
    stellar contract invoke \
        --id "$ORACLE_CONTRACT_ID" \
        --source-account issuer \
        --network testnet \
        -- \
        set_price \
        --base_asset '{"Other":["USD"]}' \
        --quote_asset '{"Other":["ARS"]}' \
        --price "$usd_ars_soroban" \
        2>/dev/null

    echo -e "  ${GREEN}✅ Oracle pairs updated successfully!${NC}"
    echo ""
    echo -e "  ┌────────────────────────────────────────────────┐"
    echo -e "  │  📊 Oracle Update Summary                      │"
    echo -e "  ├────────────────────────────────────────────────┤"
    echo -e "  │  XAU/USD:    \$${gold_usd}                     │"
    echo -e "  │  USD/ARS:    \$${usd_ars}                      │"
    echo -e "  │  Contract:   ${ORACLE_CONTRACT_ID:0:12}...      │"
    echo -e "  └────────────────────────────────────────────────┘"
}

# ============================================================================
# Main Execution
# ============================================================================

echo -e "${BOLD}${GREEN}"
echo -e "╔══════════════════════════════════════════════════════════════╗"
echo -e "║  🔮 AURUM Oracle Feeder - Real Gold Prices on Blockchain   ║"
echo -e "╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$MODE" = "loop" ]; then
    echo -e "  Mode: ${CYAN}CONTINUOUS${NC} (every ${LOOP_INTERVAL}s)"
    echo -e "  Press Ctrl+C to stop"
    echo ""
    while true; do
        update_oracle
        echo -e "  ⏳ Next update in ${LOOP_INTERVAL} seconds..."
        echo ""
        sleep "$LOOP_INTERVAL"
    done
else
    if [ "$DRY_RUN" = true ]; then
        echo -e "  Mode: ${YELLOW}DRY RUN${NC} (no on-chain changes)"
    else
        echo -e "  Mode: ${CYAN}ONE-SHOT${NC}"
    fi
    echo ""
    update_oracle
fi
