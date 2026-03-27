# Contexto Global - Tangibl Wallet

## Visión General
Tangibl Wallet es una billetera cripto con foco en un excelente UI/UX. La aplicación cuenta con flujos de Onboarding, Dashboard, Escaneo de QR, Confirmación de Transacciones, y Funciones Gamificadas (Mascotas 3D, Educación).

## 🔒 ZONAS ESTABLES / NO MODIFICAR
- Dashboard Base y diseño Glassmorphism (index.html).
- Lógica de la Mascota 3D (`mascot3d.js`).
- Estructuras CSS core (`styles.css`).

## Bindings TypeScript (Auto-generados)
Los bindings type-safe de los contratos Soroban están en `front/bindings/`:
- `tangibl/` — Contrato Tangibl (pagos RWA)
- `oracle/` — Oráculo SEP-40 (precios)
- `gold-token/` — Token GOLD (SAC estándar)

**Regenerar:** `bash scripts/generate_bindings.sh`

## Backend Futuro
El backend estará construido sobre la red de **Soroban** (Smart Contracts en Stellar). Toda la UI deberá quedar preparada para invocar contratos o interactuar con un backend de Soroban.

## Extracción de Precios del Oráculo (SEP-40)
La cotización del oro (XAU -> ARS) se extrae mediante contratos en cadena (On-Chain) utilizando un Oráculo estándar SEP-40.
1. El script `scripts/oracle_feeder.sh` se ejecuta off-chain (ej. como cronjob) y consulta APIs externas gratuitas (`gold-api.com` y `dolarapi.com`).
2. Luego, invoca la función `set_price` del contrato ORACLE (`ORACLE_CONTRACT_ID`) inyectando dos pares de forma independiente: `XAU/USD` y `USD/ARS`, con 7 decimales de precisión.
3. El frontend y los smart contracts de pagos (`TANGIBL_CONTRACT_ID`) extraen el precio total leyendo ambos pares (`cross_price(XAU, USD)` y `cross_price(USD, ARS)`) y multiplicándolos para obtener la equivalencia final de 1 gramo de ORO en ARS de forma 100% descentralizada y auditable.
