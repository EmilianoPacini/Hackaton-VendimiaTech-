# AURUM - RWA Gold Tokenization on Stellar/Soroban

**MVP de tokenización de activos reales (oro) para pagos fraccionados en la red Stellar.**

Un contrato inteligente en Soroban que permite pagar bienes y servicios con fracciones de oro digital, convirtiendo automáticamente montos en fiat (ARS) a la cantidad exacta de GOLD necesaria usando un oráculo de precios simulado.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                       AURUM MVP                              │
│                                                              │
│  ┌──────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │ QR Scan  │───▸│ AURUM Contract│───▸│ GOLD Token (SAC) │  │
│  │ (monto)  │    │  pay_with_rwa │    │  transfer()      │  │
│  └──────────┘    │  oracle_price │    └──────────────────┘  │
│                  └───────────────┘                           │
│                                                              │
│  Flujo:                                                      │
│  1. Usuario escanea QR (monto en ARS)                       │
│  2. Contrato consulta precio oráculo (1 GOLD = X ARS)      │
│  3. Calcula GOLD exacto necesario                           │
│  4. Transfiere GOLD del usuario al comerciante              │
│  5. Emite evento on-chain con detalles del pago             │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Componente | Tecnología |
|-----------|-----------|
| Smart Contract | Rust (no-std) + soroban-sdk 25.3.0 |
| Blockchain | Stellar / Soroban (Testnet) |
| Token | GOLD (Stellar Asset Contract - SAC) |
| CLI | stellar-cli 25.2.0 |
| Oráculo | Simulado (tasa hardcodeada, actualizable) |

## 📁 Estructura del Proyecto

```
Hackaton-VendimiaTech-/
├── README.md
├── contracts/
│   └── aurum/
│       ├── Cargo.toml           # Dependencias Rust/Soroban
│       └── src/
│           └── lib.rs           # Smart contract AURUM
├── scripts/
│   ├── setup_env.sh             # Instala Rust + stellar-cli
│   ├── create_assets.sh         # Crea cuentas y token GOLD
│   ├── build_and_deploy.sh      # Compila y deploya el contrato
│   ├── test_payment.sh          # Test de pago individual
│   └── demo_flow.sh             # Demo completo (para el pitch)
└── .keys/                       # (auto-generado) Claves y IDs
    ├── addresses.env
    ├── gold_contract_id.txt
    └── aurum_contract_id.txt
```

## 🚀 Quick Start

### 1. Setup del entorno
```bash
./scripts/setup_env.sh
```
Instala Rust, wasm32 target, stellar-cli y configura testnet.

### 2. Crear activos y cuentas
```bash
./scripts/create_assets.sh
```
Genera 5 cuentas (issuer, distributor, user1, user2, merchant), emite GOLD y lo distribuye.

### 3. Compilar y deployar contrato
```bash
./scripts/build_and_deploy.sh
```
Compila el WASM, optimiza, deploya a testnet e inicializa con oráculo.

### 4. Testing
```bash
./scripts/test_payment.sh
```
Ejecuta un pago de prueba y muestra balances antes/después.

### 5. Demo (Pitch)
```bash
./scripts/demo_flow.sh
```
Flujo completo con 3 pagos simulados para el pitch de 3 minutos.

## 📜 Funciones del Smart Contract

| Función | Descripción |
|---------|------------|
| `initialize(admin, gold_token, oracle_price)` | Configura admin, token y precio |
| `set_oracle_price(admin, new_price)` | Actualiza tasa de conversión |
| `get_oracle_price()` | Consulta tasa actual |
| `get_payment_preview(amount_fiat)` | Vista previa: cuánto GOLD necesita |
| `pay_with_rwa(sender, dest, amount_fiat)` | **⭐ Ejecuta pago con conversión automática** |
| `get_admin()` | Consulta admin |
| `get_gold_token()` | Consulta dirección del token |

## 💡 Ejemplo de Pago

```
Precio: 1 GOLD = 90,000 ARS
Compra: ☕ Café = 1,500 ARS

Cálculo del contrato:
  gold_needed = 1,500 / 90,000 = 0.0166666 GOLD
  
Resultado:
  ✅ Se transfieren exactamente 166666 unidades (7 decimales)
  ✅ del usuario al comerciante
  ✅ Evento on-chain registrado
```

## 🔒 Seguridad (Skills aplicadas)

- ✅ `require_auth()` para autorización (no owner patterns)
- ✅ `i128` con checked math para overflow protection
- ✅ Prevención de re-inicialización
- ✅ Validaciones de montos positivos
- ✅ Eventos para auditoría completa
- ✅ TTL management para storage

## 🔗 Verificación On-Chain

Tras ejecutar el demo, verificá las transacciones en:
- **Stellar Expert Testnet**: https://stellar.expert/explorer/testnet

## 📝 Licencia

MIT - Hackathon VendimiaTech 2026