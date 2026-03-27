/**
 * ============================================================================
 * AURUM - Servicio de integración con Soroban (Stellar Testnet)
 * Conecta Freighter Wallet, consulta balances y ejecuta pagos RWA on-chain.
 * ============================================================================
 */

// ============================================================================
// Configuración — Editar con los IDs reales tras el deploy
// ============================================================================
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// TODO: Reemplazar con los IDs reales generados por build_and_deploy.sh
const AURUM_CONTRACT_ID = 'CBW2T5Y3WPOSSIBYYTNAQODW57FYGPEMNPONUZDRX7G7XFKMDDENJCWS';
const GOLD_CONTRACT_ID = 'CD7FOEKQELTQGNVJB4J3QABGJY2JV2UONHD2QZ4PKACKYXYYU6BHCAXC';

const TOKEN_DECIMALS = 10_000_000; // 7 decimales estándar Stellar

// ============================================================================
// Helpers internos
// ============================================================================

/**
 * Verifica que Freighter esté instalado en el navegador.
 * @returns {boolean}
 */
function isFreighterInstalled() {
  return typeof window !== 'undefined' && window.freighterApi !== undefined;
}

/**
 * Espera a que las librerías carguen del CDN (polling breve).
 * @param {string} globalName
 * @param {number} maxWaitMs
 * @returns {Promise<object>}
 */
async function waitForGlobal(globalName, maxWaitMs = 5000) {
  const start = Date.now();
  while (!window[globalName]) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error(`${globalName} no cargó a tiempo. Verifica los CDN en el HTML.`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return window[globalName];
}

// ============================================================================
// Servicio Público
// ============================================================================

export const SorobanService = {

  /** Dirección pública del usuario conectado (cache en memoria) */
  _publicKey: null,

  // ==========================================================================
  // 1. Conexión de Wallet
  // ==========================================================================

  /**
   * Conecta con Freighter y obtiene la dirección pública del usuario.
   * @returns {Promise<{address: string}>}
   */
  async connectWallet() {
    if (!isFreighterInstalled()) {
      throw new Error('Freighter Wallet no está instalada. Descárgala en https://freighter.app');
    }

    const freighter = window.freighterApi;

    const { isConnected } = await freighter.isConnected();
    if (!isConnected) {
      throw new Error('Freighter no está conectada. Ábrela y autoriza esta página.');
    }

    const { address } = await freighter.getAddress();
    if (!address) {
      throw new Error('No se pudo obtener la dirección pública de Freighter.');
    }

    this._publicKey = address;
    return { address };
  },

  // ==========================================================================
  // 2. Consulta de Balance GOLD
  // ==========================================================================

  /**
   * Consulta el balance de GOLD (SAC) del usuario.
   * @param {string} publicKey
   * @returns {Promise<{raw: string, formatted: string}>}
   */
  async getGoldBalance(publicKey) {
    const StellarSdk = await waitForGlobal('StellarSdk');
    const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

    const account = new StellarSdk.Address(publicKey);
    const contract = new StellarSdk.Contract(GOLD_CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(publicKey),
      {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(contract.call('balance', account.toScVal()))
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      console.warn('Error simulando balance:', simResult);
      return { raw: '0', formatted: '0.0000000' };
    }

    const rawVal = simResult.result.retval;
    const raw = StellarSdk.scValToNative(rawVal).toString();
    const formatted = (Number(raw) / TOKEN_DECIMALS).toFixed(7);

    return { raw, formatted };
  },

  // ==========================================================================
  // 3. Preview de Pago
  // ==========================================================================

  /**
   * Consulta cuánto GOLD se necesita para pagar un monto fiat.
   * @param {number|string} amountFiat — Monto en ARS con 7 decimales
   * @returns {Promise<{raw: string, formatted: string}>}
   */
  async getPaymentPreview(amountFiat) {
    const StellarSdk = await waitForGlobal('StellarSdk');
    const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

    const publicKey = this._publicKey;
    if (!publicKey) throw new Error('Wallet no conectada.');

    const contract = new StellarSdk.Contract(AURUM_CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(publicKey),
      {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(
        contract.call(
          'get_payment_preview',
          StellarSdk.nativeToScVal(BigInt(amountFiat), { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error('Error obteniendo preview: ' + JSON.stringify(simResult.error));
    }

    const raw = StellarSdk.scValToNative(simResult.result.retval).toString();
    const formatted = (Number(raw) / TOKEN_DECIMALS).toFixed(7);

    return { raw, formatted };
  },

  // ==========================================================================
  // 4. Ejecutar Pago Real (pay_with_rwa)
  // ==========================================================================

  /**
   * Construye, firma vía Freighter y envía la TX de pago on-chain.
   * @param {string} destination — Dirección Stellar del comercio
   * @param {number|string} amountFiat — Monto ARS con 7 decimales
   * @param {number|string} maxGoldToSpend — Límite de slippage con 7 decimales
   * @returns {Promise<{status: string, hash: string}>}
   */
  async executePayment(destination, amountFiat, maxGoldToSpend) {
    const StellarSdk = await waitForGlobal('StellarSdk');
    const freighter = window.freighterApi;
    const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

    const publicKey = this._publicKey;
    if (!publicKey) throw new Error('Wallet no conectada.');

    const contract = new StellarSdk.Contract(AURUM_CONTRACT_ID);
    const senderAddress = new StellarSdk.Address(publicKey);
    const destAddress = new StellarSdk.Address(destination);

    // Construir la transacción
    const account = await server.getAccount(publicKey);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '10000000', // 1 XLM max fee (Soroban puede ser costoso en testnet)
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'pay_with_rwa',
          senderAddress.toScVal(),
          destAddress.toScVal(),
          StellarSdk.nativeToScVal(BigInt(amountFiat), { type: 'i128' }),
          StellarSdk.nativeToScVal(BigInt(maxGoldToSpend), { type: 'i128' })
        )
      )
      .setTimeout(60)
      .build();

    // Simular para obtener footprint y recursos
    const simResult = await server.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error('Simulación fallida: ' + JSON.stringify(simResult.error));
    }

    // Preparar la TX con el footprint de la simulación
    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();

    // Firmar con Freighter
    const { signedTxXdr } = await freighter.signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    // Enviar a la red
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error('Error enviando TX: ' + JSON.stringify(sendResult.errorResult));
    }

    // Esperar confirmación (polling)
    let getResult;
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      getResult = await server.getTransaction(sendResult.hash);
      if (getResult.status !== 'NOT_FOUND') break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!getResult || getResult.status === 'FAILED') {
      throw new Error('La transacción falló on-chain.');
    }

    return {
      status: 'success',
      hash: sendResult.hash,
    };
  },

  // ==========================================================================
  // 5. Parsear QR Payload
  // ==========================================================================

  /**
   * Parsea el contenido de un código QR de pago AURUM.
   * Formato esperado: JSON { dest: "G...", amount: 2450, name: "Comercio" }
   * @param {string} qrPayload
   * @returns {{ recipient: string, amount: number, name: string }}
   */
  parsePaymentIntent(qrPayload) {
    try {
      const data = JSON.parse(qrPayload);
      return {
        recipient: data.dest || '',
        amount: data.amount || 0,
        name: data.name || 'Comercio',
      };
    } catch {
      // Fallback: asumir que es solo una dirección Stellar
      return {
        recipient: qrPayload,
        amount: 0,
        name: 'Desconocido',
      };
    }
  },
};
