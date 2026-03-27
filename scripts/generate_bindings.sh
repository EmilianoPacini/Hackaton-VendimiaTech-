#!/bin/bash
# ============================================================================
# Tangibl — Generador de Bindings TypeScript para Soroban
# Lee los Contract IDs desde .keys/ y genera paquetes NPM type-safe.
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
KEYS_DIR="$PROJECT_DIR/.keys"
BINDINGS_DIR="$PROJECT_DIR/front/bindings"

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Tangibl — TypeScript Bindings Generator${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# ============================================================================
# Validar que stellar CLI esté disponible
# ============================================================================
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}❌ stellar CLI no está instalado.${NC}"
    echo -e "   Instálalo con: winget install --id Stellar.StellarCLI"
    exit 1
fi

echo -e "  🔧 stellar CLI: $(stellar --version | head -1)"

# ============================================================================
# Leer Contract IDs
# ============================================================================
TANGIBL_ID=$(cat "$KEYS_DIR/tangibl_contract_id.txt" | tr -d '[:space:]')
ORAC LE_ID=$(cat "$KEYS_DIR/oracle_contract_id.txt" | tr -d '[:space:]')
GOLD_ID=$(cat "$KEYS_DIR/gold_contract_id.txt" | tr -d '[:space:]')

echo -e "\n${YELLOW}Contract IDs:${NC}"
echo -e "  Tangibl:    ${CYAN}$TANGIBL_ID${NC}"
echo -e "  Oracle:     ${CYAN}$ORACLE_ID${NC}"
echo -e "  GOLD Token: ${CYAN}$GOLD_ID${NC}"

# ============================================================================
# 1. Generar bindings para Tangibl
# ============================================================================
echo -e "\n${YELLOW}[1/3] Generando bindings para Tangibl...${NC}"
stellar contract bindings typescript \
    --contract-id "$TANGIBL_ID" \
    --network testnet \
    --output-dir "$BINDINGS_DIR/tangibl" \
    --overwrite
echo -e "  ✅ Tangibl bindings generados"

# ============================================================================
# 2. Generar bindings para Oracle
# ============================================================================
echo -e "\n${YELLOW}[2/3] Generando bindings para Oracle...${NC}"
stellar contract bindings typescript \
    --contract-id "$ORACLE_ID" \
    --network testnet \
    --output-dir "$BINDINGS_DIR/oracle" \
    --overwrite
echo -e "  ✅ Oracle bindings generados"

# ============================================================================
# 3. Generar bindings para GOLD Token (SAC)
# ============================================================================
echo -e "\n${YELLOW}[3/3] Generando bindings para GOLD Token...${NC}"
stellar contract bindings typescript \
    --contract-id "$GOLD_ID" \
    --network testnet \
    --output-dir "$BINDINGS_DIR/gold-token" \
    --overwrite
echo -e "  ✅ GOLD Token bindings generados"

# ============================================================================
# Resumen
# ============================================================================
echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Bindings generados exitosamente!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "  📁 Output: ${CYAN}$BINDINGS_DIR/${NC}"
echo -e "     ├── tangibl/       (Contrato de pagos RWA)"
echo -e "     ├── oracle/      (Oráculo SEP-40)"
echo -e "     └── gold-token/  (Token GOLD SAC)"
echo -e ""
echo -e "  📦 Cada directorio es un paquete NPM que se puede:"
echo -e "     1. Importar como dependencia local en un proyecto Node.js"
echo -e "     2. Usar como referencia de tipos para el frontend"
echo -e ""
