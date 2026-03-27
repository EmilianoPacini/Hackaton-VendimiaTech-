# Tangibl - RWA Gold Tokenization on Stellar/Soroban

> **Pagá con oro. Seguro, inmediato, sin intermediarios.**

## ¿Qué es Tangibl? (Video Explicativo)

[![Tangibl Demo](https://img.youtube.com/vi/YOUTUBE_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID)

**[Ver demo en YouTube](#)** ← *Reemplaza este link con tu video explicativo*

---

## Por Qué Tangibl?

En Argentina, **1 gramo de oro = ~$203 ARS** (cambio real). Si comprás café a $1,500, podés usar Tangibl para pagar exactamente esa cantidad EN ORO DIGITAL.

**Ventajas:**
- Seguro: Respaldado por oro físico, no por decisiones políticas
- Instantáneo: Pagos en segundos, sin bancos
- Transparente: Todo registrado en blockchain, auditable
- Sin fronteras: Mismo precio en cualquier país (precio mundial del oro)

## ¿Cómo funciona?

**El flujo en 3 pasos:**

1. **Escanea QR**: El comercio muestra un código QR con el monto: `$1,500 ARS`
2. **Conversión automática**: El sistema busca el precio real del oro (`gold-api.com`) y calcula cuánto ORO necesitas
3. **Transferencia instantánea**: Tu wallet digital envía exactamente ese oro al comerciante

```
QR: "1,500 ARS"
    ↓
¿Cuánto oro es? (busca precio real)
    ↓
Necesitas 0.00739 GOLD
    ↓
Pago completado en blockchain
```

**MVP de tokenización de activos reales (oro) para pagos fraccionados en la red Stellar.**

Un contrato inteligente en Soroban que permite pagar bienes y servicios con fracciones de oro digital, convirtiendo automáticamente montos en fiat (ARS) a la cantidad exacta de GOLD necesaria usando un **oráculo de precios en tiempo real** alimentado desde `gold-api.com`.

---

## Cómo está construido?

Tangibl tiene **3 componentes principales:**

### 1. Token GOLD
Un activo digital en la blockchain Stellar que representa oro real. Cada unidad = oro verificable.

### 2. Oráculo de Precios
Busca el precio real del oro cada minuto y lo sube a la blockchain. Así el contrato siempre sabe el precio exacto.

### 3. Contrato Inteligente
Recibe el monto que querés pagar (ej: 1,500 ARS), consulta el oráculo, calcula cuánto ORO es, y completa la transferencia automáticamente.

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Tangibl v2 - Arquitectura                    │
│                                                                     │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐  │
│  │ gold-api.com │    │ dolarapi.com  │    │                      │  │
│  │ (XAU/USD)    │    │ (USD/ARS)     │    │   Stellar Testnet    │  │
│  └──────┬───────┘    └──────┬────────┘    │                      │  │
│         │                   │              │  ┌────────────────┐  │ │
│         └───────┬───────────┘              │  │ Tangibl Contract │  │ │
│                 ▼                          │  │  pay_with_rwa  │  │ │
│  ┌──────────────────────┐                 │  │  oracle_price  │  │  │
│  │  🔮 Oracle Feeder    │────────────────▸│  │  set_oracle    │  │ │
│  │  (oracle_feeder.sh)  │  set_oracle_    │  └────────┬───────┘  │ │
│  │  Calcula XAU → ARS   │  price()        │           │          │ │
│  └──────────────────────┘                 │  ┌────────▼───────┐  │ │
│                                            │  │ GOLD Token SAC │  │ │
│  ┌──────────┐                             │  │  transfer()    │  │ │
│  │ 📱 QR    │───▸ pay_with_rwa() ────────▸│  └────────────────┘  │ │
│  │ (monto)  │                             │                      │ │
│  └──────────┘                             └──────────────────────┘ │
│                                                                     │
│  Flujo:                                                             │
│  1. Oracle Feeder trae precio real del oro desde internet           │
│  2. Actualiza el contrato con el precio en ARS (7 decimales)       │
│  3. Usuario escanea QR (monto en ARS)                              │
│  4. Contrato calcula GOLD exacto necesario                         │
│  5. Transfiere GOLD del usuario al comerciante                     │
│  6. Emite evento on-chain con detalles del pago                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Con qué tecnologías está hecho?

| Componente | Qué es | Por qué |
|-----------|--------|--------|
| **Smart Contract** | Código Rust que vive en la blockchain | Soroban es la máquina virtual de Stellar para contratos seguros |
| **Blockchain** | Red descentralizada (Stellar Testnet) | Stellar es rápida ($1 por millones de transacciones) y tiene activos nativos |
| **Token GOLD** | Activo digital respaldado | "Stellar Asset Contract" — oro tokenizado verificable |
| **Oráculo** | Script que trae precios reales | Conecta el mundo real (precio del oro) con el blockchain |
| **Wallet** | App donde guardas tus monedas | Freighter — billetera oficial de Stellar (como MetaMask para Stellar) |

> **Para desarrolladores**: Ver [docs/STELLAR_STACK.md](docs/STELLAR_STACK.md) para detalles técnicos completos.

## Tech Stack (Completo)
| Componente | Tecnología | Estado |
|-----------|------------|--------|
| Smart Contract | Rust (no-std) + soroban-sdk 25.3.0 | Implementado |
| Blockchain | Stellar / Soroban (Testnet) | Implementado |
| Token | GOLD (Stellar Asset Contract - SAC) | Implementado |
| Oráculo | gold-api.com + dolarapi.com → Oracle Feeder | Implementado |
| CLI | stellar-cli 25.2.0 | Usado |
| Wallet (Freighter) | @stellar/freighter-api | Diseñado |
| Ancla (SEP-24) | Deposit/Withdraw oro físico | Diseñado |

> Para detalles completos de integración con el Stellar Stack (SEP-10, SEP-24, SEP-31, CAP-46, Freighter), ver **[docs/STELLAR_STACK.md](docs/STELLAR_STACK.md)**

## 📁 Estructura del Proyecto

```
Hackaton-VendimiaTech-/
├── README.md
├── docs/
│   └── STELLAR_STACK.md          # Integración con Stellar Stack
├── contracts/
│   └── tangibl/
│       ├── Cargo.toml             # Dependencias Rust/Soroban
│       └── src/
│           └── lib.rs             # Smart contract Tangibl
├── scripts/
│   ├── setup_env.sh               # Instala Rust + stellar-cli
│   ├── create_assets.sh           # Crea cuentas y token GOLD
│   ├── build_and_deploy.sh        # Compila y deploya el contrato
|   ├── oracle_feeder.sh           # Trae precio REAL del oro
│   ├── test_payment.sh            # Test de pago individual
│   └── demo_flow.sh               # Demo completo (para el pitch)
└── .keys/                         # (auto-generado) Claves y IDs
    ├── addresses.env
    ├── gold_contract_id.txt
    └── tangibl_contract_id.txt
```

## Quick Start

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

### 4. Actualizar oráculo con precio real
```bash
./scripts/oracle_feeder.sh           # Una sola actualización
./scripts/oracle_feeder.sh --dry-run # Ver precio sin actualizar on-chain
./scripts/oracle_feeder.sh --loop 60 # Actualizar cada 60 segundos
```
Trae el precio real del oro desde `gold-api.com`, convierte a ARS con `dolarapi.com`, y actualiza el contrato en testnet.

### 5. Testing
```bash
./scripts/test_payment.sh
```
Ejecuta un pago de prueba y muestra balances antes/después.

### 6. Demo (Pitch)
```bash
./scripts/demo_flow.sh
```
Flujo completo: actualiza oráculo con precio real → ejecuta 3 pagos → muestra balances.

---

## Casos de Uso

**¿A quién le sirve Tangibl?**

### Para Usuarios
- Comprás en un café: pagás en ORO, no en pesos (evitas inflación)
- En una tienda: el comercio recibe oro, vos transferís valor sin intermediario
- Transferencias internacionales: el precio del oro es igual en Argentina, USA y Japón

### Para Comercios
- Cobran el pago al instante sin riesgo de devolución
- El oro sube con la inflación (mejor que guardar pesos)
- Menos costos que procesadores de pago tradicio

## 📜 Funciones del Smart Contract

| Función | Descripción |
|---------|-------------|
| `initialize(admin, gold_token, oracle_price)` | Configura admin, token y precio |
| `set_oracle_price(admin, new_price, source)` | Actualiza tasa con fuente y timestamp |
| `get_oracle_price()` | Consulta tasa actual |
| `get_oracle_last_update()` | Timestamp de última actualización |
| `get_oracle_source()` | Fuente del precio (ej: "gold-api.com") |
| `get_payment_preview(amount_fiat)` | Vista previa: cuánto GOLD necesita |
| `pay_with_rwa(sender, dest, amount_fiat)` | Ejecuta pago con conversión automática |
| `get_admin()` | Consulta admin |
| `get_gold_token()` | Consulta dirección del token |

## 💡 Ejemplo de Pago

```
Precio REAL (gold-api.com): XAU/USD $4,433.39 por onza troy
Tipo de cambio (dolarapi.com): USD/ARS $1,425
Precio calculado: 1 gramo GOLD = $203,105.25 ARS

Compra: Café + medialunas = 1,500 ARS

Cálculo del contrato:
  gold_needed = 1,500 / 203,105.25 = 0.0073863 GOLD

Resultado:
  Se transfieren exactamente 73863 unidades (7 decimales)
  del usuario al comerciante
  Evento on-chain con precio, fuente, y timestamp
```

## Seguridad

- `require_auth()` para autorización de pagos y admin
- `i128` con checked math (overflow/underflow protection)
- Prevención de re-inicialización
- Validaciones de montos positivos
- Eventos enriquecidos para auditoría (precio + fuente + timestamp)
- TTL management para optimización de storage
- Oracle feeder con validación de respuesta de API

## Verificación On-Chain

Tras ejecutar el demo, verificá las transacciones en:
- **Stellar Expert Testnet**: https://stellar.expert/explorer/testnet

---

## Preguntas Frecuentes

### ¿Es seguro confiar en blockchain?
Sí. Cada transacción está registrada en la blockchain de Stellar (red distribuida). No hay servidor central que pueda "perder" tu dinero. **Los datos están respaldados por miles de nodos.**

### ¿Cuánta comisión hay?
En Stellar, enviar dinero cuesta ~0.00001 XLM (~$0.000001 USD). **Prácticamente gratis.**

### ¿Dónde está el oro físico?
En este MVP es un ejemplo técnico. En producción, un "Ancla" (entidad regulada) mantenería el oro en bóvedas certificadas.

### ¿Puedo usar esto hoy?
El contrato está deployado en **Stellar Testnet** (red de pruebas). Para producción necesitarías:
- Licencia financiera como "Ancla"
- Bóveda de oro certificada
- Auditorías de seguridad
- Regulación (BCRA/etc.)

### ¿Y si se cae Stellar?
Stellar está respaldada por Stellar Development Foundation (organización sin fines de lucro). La red ha estado funcionando desde 2014 sin downtime significativo.

### ¿Cómo paso de testnet a mainnet?
Cambias el ID de la red, redeploys el contrato, y listo. Los scripts funcionan igual.

---

## 📝 Licencia

MIT - Hackathon VendimiaTech 2026