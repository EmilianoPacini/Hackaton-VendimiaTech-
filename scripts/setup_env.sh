#!/bin/bash
# ============================================================================
# AURUM - Setup Environment Script
# Installs Rust, wasm32 target, and stellar-cli
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  AURUM - RWA Gold Tokenization - Environment Setup${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# 1. Check/Install Rust
echo -e "\n${YELLOW}[1/4] Checking Rust installation...${NC}"
if command -v rustc &> /dev/null; then
    echo -e "  ✅ Rust already installed: $(rustc --version)"
else
    echo -e "  📥 Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo -e "  ✅ Rust installed: $(rustc --version)"
fi

# Source cargo env for current session
source "$HOME/.cargo/env" 2>/dev/null || true

# 2. Add wasm32 target
echo -e "\n${YELLOW}[2/4] Adding wasm32-unknown-unknown target...${NC}"
rustup target add wasm32-unknown-unknown
echo -e "  ✅ wasm32 target ready"

# 3. Install/check stellar-cli
echo -e "\n${YELLOW}[3/4] Checking stellar-cli installation...${NC}"
if command -v stellar &> /dev/null; then
    echo -e "  ✅ stellar-cli already installed: $(stellar --version | head -1)"
else
    echo -e "  📥 Installing stellar-cli (this may take a few minutes)..."
    cargo install --locked stellar-cli --features opt
    echo -e "  ✅ stellar-cli installed: $(stellar --version | head -1)"
fi

# 4. Configure Testnet
echo -e "\n${YELLOW}[4/4] Configuring Stellar Testnet...${NC}"
stellar network add \
    --global testnet \
    --rpc-url https://soroban-testnet.stellar.org:443 \
    --network-passphrase "Test SDF Network ; September 2015" \
    2>/dev/null || echo -e "  ℹ️  Testnet network already configured"
echo -e "  ✅ Testnet configured"

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Environment setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "\nNext step: Run ${YELLOW}./scripts/create_assets.sh${NC} to create accounts and GOLD token"
