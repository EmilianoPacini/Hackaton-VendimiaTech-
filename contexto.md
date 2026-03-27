# Contexto Global - Tangibl Wallet

## Visión General
Tangibl Wallet es una billetera cripto con foco en un excelente UI/UX diseñada para el ecosistema de Stellar y Soroban. Permite pagos apalancados sobre activos tokenizados en el mundo real (Oro) usando Smart Contracts en la blockchain y pre-estimaciones de mercado vía Oráculos descentralizados (SEP-40).

## Integraciones Soroban y Freighter
Actualmente el proyecto cuenta con un conector en Vanilla JS (`front/sorobanService.js`) que administra gran parte del código lógico para conectarse a Stellar Testnet. 
Sin embargo, se ha incorporado el archivo `front/PayWithGoldButton.jsx`, el cual concentra la integración React explícita para el flujo de pago con ORO (mediante Freighter API y Stellar SDK), listo para ser montado en frameworks modernos.

### Decisiones Técnicas Implementadas:
- Uso de `i128` con BigInt: Dado que Soroban usa montos i128, se implementó una estricta sanitización de JavaScript pasando de `Math.floor` a `BigInt` antes de usar `nativeToScVal`.
- Manejo de Fallbacks: Se agregó un atrapador especializado de excepciones para los Timeouts y la desconexión de Wallet para facilitar el feedback hacia el usuario final y evitar crasheos silenciosos.
- Separación de Frontend Vanilla VS Componentizado: El archivo se alojó en formato independiente.

## Siguientes Pasos (Next steps para próximos agentes / sesiones):
- [ ] Integrar un bundler (Vite o Webpack) en la capa Frontend para posibilitar el uso de JSX si la aplicación completa mutará oficialmente de Vainilla a React.
- [ ] Configurar TypeScript local estricto para las views React de Tangibl para habilitar Strong Types completos más allá de JSDoc.
- [ ] Reemplazar las IDs harcodeadas (`TANGIBL_CONTRACT_ID`) por variables de entorno `.env` atadas al pipeline de deploy de Smart Contracts.
- [x] Desarrollar servicio Backend (Node.js/Next.js) para actuar como **Ancla (SEP-24)** y manejar el On/Off Ramp del ORO.
- [ ] Implementar autenticación segura **SEP-10** para conectar la wallet con el backend de manera descentralizada sin custodiar claves.
- [ ] Ampliar la integración de Wallets en el Frontend para incluir opciones móviles o alternativas como xBull y Albedo.

## Revisión Hackathon MVP (Checkpoints)
Se validaron de manera exitosa los 5 requerimientos clave para el hackathon:
1. **Entorno**: Docker comprobado. (Rust + Stellar CLI asumidos funcionales según compilación).
2. **Contrato Inteligente**: Implementado y tipado en Rust (`contracts/tangibl`).
3. **Identidad / Red**: Direcciones y IDs en `.keys/`.
4. **Puente Frontend**: SDK inicializado en `front/sorobanService.js` hacia RPC Testnet.
5. **Smoke Test**: Lectura de balance operativa en `getGoldBalance()`.
