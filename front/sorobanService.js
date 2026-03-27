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
const AURUM_CONTRACT_ID = 'CCJUJUBPQA3S3VJ6NWGF2FLYARSPIXWLGMVRHOZDBHSKXYBQMMZZEMZ5';
const GOLD_CONTRACT_ID = 'CD7FOEKQELTQGNVJB4J3QABGJY2JV2UONHD2QZ4PKACKYXYYU6BHCAXC';
const ORACLE_CONTRACT_ID = 'CBMNHAXFDEDNZWQ6FWJNQNCX2L2NLZG6YX4OISMEF42GV5Y2UMF5AULT';

const TOKEN_DECIMALS = 10_000_000; // 7 decimales estándar Stellar

async function getFreighter() {
  return await waitForGlobal(
    'freighterApi', 
    'https://unpkg.com/@stellar/freighter-api@1.6.0/build/index.min.js'
  );
}


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
 * Espera a que las librerías carguen del CDN, inyectando el script si es necesario.
 * @param {string} globalName
 * @param {string} scriptUrl
 * @param {number} maxWaitMs
 * @returns {Promise<object>}
 */
async function waitForGlobal(globalName, scriptUrl = null, maxWaitMs = 5000) {
  if (!window[globalName] && scriptUrl) {
    if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
      const script = document.createElement('script');
      script.src = scriptUrl;
      document.head.appendChild(script);
    }
  }

  const start = Date.now();
  while (!window[globalName]) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error(`${globalName} no cargó a tiempo.`);
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
   * Conecta con Freighter Api mediante la extensión del navegador.
   * @returns {Promise<{address: string}>}
   */
  async connectWallet() {
    const freighter = await getFreighter();

    try {
      const isConnected = await freighter.isConnected();
      if (!isConnected) {
        throw new Error('La extensión Freighter no está instalada o desbloqueada.');
      }

      this._publicKey = await freighter.getPublicKey();
      
      if (!this._publicKey) {
         throw new Error('El usuario rechazó la conexión a Freighter.');
      }

      return { address: this._publicKey };
    } catch (err) {
      console.error('Error conectando wallet:', err);
      throw new Error('No se pudo conectar Freighter...');
    }
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
    const freighter = await getFreighter();
    const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

    // 1. Verificar conexión a Freighter
    const isConn = await freighter.isConnected();
    if (!isConn) {
      throw new Error('WALLET_NOT_CONNECTED_OR_LOCKED');
    }

    // 2. Obtener dirección pública del usuario
    const publicKey = await freighter.getPublicKey();
    if (!publicKey) {
      throw new Error('WALLET_AUTH_ERROR');
    }

    try {
      // 3. Convertir Stroops (maxGoldToSpend) a Decimal String para Native Payment XLM
      const amountXLM = (Number(maxGoldToSpend) / TOKEN_DECIMALS).toFixed(7);

      const account = await server.getAccount(publicKey);

      // 4. Construir Transacción Nativa (XLM)
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: destination,
          asset: StellarSdk.Asset.native(),
          amount: amountXLM
        }))
        .setTimeout(60)
        .build();

      // 5. Firmar vía Freighter
      const freighter = await getFreighter();
      let networkType = 'TESTNET';
      if (NETWORK_PASSPHRASE.includes('Public')) {
         networkType = 'PUBLIC';
      }

      let signedTxXdr;
      try {
          // No necesitamos simulation ni assembler para pagos nativos
          signedTxXdr = await freighter.signTransaction(tx.toXDR(), {
              network: networkType,
              networkPassphrase: NETWORK_PASSPHRASE,
              accountToSign: publicKey
          });
      } catch (signError) {
          throw new Error('SIGNATURE_REJECTED');
      }

      if (!signedTxXdr) {
        throw new Error('SIGNATURE_REJECTED');
      }

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

      // 8. Enviar transacción a la red
      const sendResponse = await server.sendTransaction(signedTx);
      if (sendResponse.status === 'ERROR') {
        throw new Error(`NETWORK_ERROR: ${JSON.stringify(sendResponse.errorResult)}`);
      }

      // 9. Esperar confirmación (polling)
      let getResult;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        getResult = await server.getTransaction(sendResponse.hash);
        if (getResult.status !== 'NOT_FOUND') break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!getResult || getResult.status === 'NOT_FOUND') {
        throw new Error('NETWORK_TIMEOUT');
      }

      if (getResult.status === 'FAILED') {
        const resultXdr = getResult.resultXdr || '';
        if (String(resultXdr).toLowerCase().includes('stale')) {
          throw new Error('STALE_PRICE');
        }
        throw new Error('NETWORK_ERROR: Transacción fallida on-chain.');
      }

      if (getResult.status !== 'SUCCESS') {
        throw new Error(`NETWORK_ERROR: Estado inesperado ${getResult.status}`);
      }

      return {
        status: 'success',
        hash: sendResponse.hash,
      };

    } catch (error) {
      // Clasificar timeouts genéricos
      if (error.message.includes('timeout') || error.message.includes('fetch')) {
        throw new Error('NETWORK_TIMEOUT');
      }
      throw error;
    }
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

  // ==========================================================================
  // 6. Precio del Oro en ARS (vía Oráculo SEP-40 on-chain)
  // ==========================================================================

  /**
   * Consulta el precio cruzado XAU→ARS desde el Oráculo SEP-40 desplegado.
   * Realiza dos llamadas: XAU→USD y USD→ARS, y calcula el cross rate.
   * @returns {Promise<{pricePerGramARS: number, xauUsd: number, usdArs: number}>}
   */
  async getGoldPriceARS() {
    const StellarSdk = await waitForGlobal('StellarSdk');
    const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
    const contract = new StellarSdk.Contract(ORACLE_CONTRACT_ID);

    // Necesitamos una cuenta para simular; usamos la conectada o una dummy
    const sourceKey = this._publicKey || 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
    let account;
    try {
      account = await server.getAccount(sourceKey);
    } catch {
      // Si la cuenta dummy no tiene fondos, generar una TX dummy con keypair efímero
      return { pricePerGramARS: 0, xauUsd: 0, usdArs: 0 };
    }

    /**
     * Helper: invoca cross_price(base_asset, quote_asset, timestamp) y extrae el precio.
     */
    async function fetchCrossPrice(baseSymbol, quoteSymbol) {
      // Construir ScVal para Asset enum (Rust: Other(Symbol))
      // En Soroban XDR, un enum con datos es un Vec([Symbol(Variant), Data...])
      const baseEnum = StellarSdk.xdr.ScVal.scvVec([
        StellarSdk.nativeToScVal('Other', { type: 'symbol' }),
        StellarSdk.nativeToScVal(baseSymbol, { type: 'symbol' }),
      ]);
      const quoteEnum = StellarSdk.xdr.ScVal.scvVec([
        StellarSdk.nativeToScVal('Other', { type: 'symbol' }),
        StellarSdk.nativeToScVal(quoteSymbol, { type: 'symbol' }),
      ]);
      const timestampScVal = StellarSdk.nativeToScVal(0, { type: 'u64' });

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('cross_price', baseEnum, quoteEnum, timestampScVal))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) {
        console.warn(`Error fetching ${baseSymbol}/${quoteSymbol}:`, sim);
        return 0;
      }

      // Resultado es Option<PriceData> — si Some, retorna un Map con {price, timestamp}
      const result = StellarSdk.scValToNative(sim.result.retval);
      if (!result || result.length === 0) return 0;

      // PriceData es un struct con fields price (i128) y timestamp (u64)
      const price = result.price !== undefined ? Number(result.price) : Number(result[0]);
      return price;
    }

    try {
      const xauUsdRaw = await fetchCrossPrice('XAU', 'USD');
      const usdArsRaw = await fetchCrossPrice('USD', 'ARS');

      const xauUsd = xauUsdRaw / TOKEN_DECIMALS;
      const usdArs = usdArsRaw / TOKEN_DECIMALS;
      const pricePerGramARS = xauUsd * usdArs;

      return { pricePerGramARS, xauUsd, usdArs };
    } catch (err) {
      console.error('Error consultando oráculo:', err);
      return { pricePerGramARS: 0, xauUsd: 0, usdArs: 0 };
    }
  },
};
