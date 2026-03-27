import React, { useState } from 'react';
import * as StellarSdk from 'stellar-sdk';
import freighterApi from '@stellar/freighter-api';

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Dirección del contrato AURUM RWA en Testnet
const AURUM_CONTRACT_ID = 'CBW2T5Y3WPOSSIBYYTNAQODW57FYGPEMNPONUZDRX7G7XFKMDDENJCWS';

/**
 * Componente React "Botón de Pagar con Oro".
 * Se encarga de conectarse a la billetera Freighter, simular la transacción en Soroban
 * para pagar un monto Fiat (ARS) respaldado por tokens de Oro (RWA), firmar la transacción 
 * y enviarla a la Testnet.
 *
 * @param {object} props - Propiedades del componente
 * @param {number|string} props.montoEnPesos - Monto a enviar en fiat (ARS)
 * @param {string} props.direccionDestino - Llave pública estelar del receptor
 * @returns {React.JSX.Element}
 */
export const PayWithGoldButton = ({ montoEnPesos, direccionDestino }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);

  /**
   * Ejecuta el flujo principal de pago On-Chain usando Soroban.
   * Maneja errores de timeout, balance vacante, y firma rechazada.
   */
  const handlePayment = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setTxHash(null);

    try {
      // 1. Verificar si Freighter está conectado
      const { isConnected } = await freighterApi.isConnected();
      if (!isConnected) {
        throw new Error('Freighter no está conectado. Abre tu extensión y autoriza la app.');
      }

      // 2. Obtener la llave pública del usuario (getPublicKey interno en Freighter via getAddress)
      const { address: publicKey, error: authError } = await freighterApi.getAddress();
      if (authError || !publicKey) {
        throw new Error('No se pudo obtener la llave pública del usuario (getAddress falló).');
      }

      const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
      const account = await server.getAccount(publicKey);

      // 3. Preparar los tipos de datos requeridos (ScVal) para llamar a `pay_with_rwa`
      const contract = new StellarSdk.Contract(AURUM_CONTRACT_ID);
      const senderScVal = new StellarSdk.Address(publicKey).toScVal();
      const destScVal = new StellarSdk.Address(direccionDestino).toScVal();

      // Convertir el monto en fiat a BigInt (usando 7 decimales de precisión nativos de Stellar)
      const parsedAmount = Number(montoEnPesos);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('El monto en pesos ingresado no es válido.');
      }

      const amountFiatBigInt = BigInt(Math.floor(parsedAmount * 10_000_000));
      const amountFiatScVal = StellarSdk.nativeToScVal(amountFiatBigInt, { type: 'i128' });

      // Calcular el slippage tolerado como máximo oro a gastar (ej. un valor alto seguro para que el oráculo no falle el trade)
      // Idealmente, requeriría leer el oráculo en la UI previamente.
      const slippageTolerance = 2.0; // Tolerar hasta 2x el valor oro equivalente real por fluctuaciones extremas.
      const maxGoldToSpendBigInt = BigInt(Math.floor(parsedAmount * slippageTolerance * 10_000_000));
      const maxGoldScVal = StellarSdk.nativeToScVal(maxGoldToSpendBigInt, { type: 'i128' });

      // 4. Construir Transacción base apuntando a Testnet
      const txBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: '100000', // Fee nominal. Soroban lo calculará exactamente luego del assemble
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      txBuilder.addOperation(
        contract.call('pay_with_rwa', senderScVal, destScVal, amountFiatScVal, maxGoldScVal)
      );
      txBuilder.setTimeout(60);
      const tx = txBuilder.build();

      // 5. Simular la transacción para capturar el footprint de recursos de Soroban
      const simResult = await server.simulateTransaction(tx);
      
      if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
        // Manejo explícito de balance en el error devuelto por `simulation`
        if (simResult.error.toLowerCase().includes('balance') || simResult.error.includes('Insufficient funds')) {
          throw new Error('Balance insuficiente: No posees suficiente oro (tGLD) o XLM para fees.');
        }
        throw new Error(`Error durante la simulación de la transacción: ${simResult.error}`);
      }

      // Ensamblaje exitoso con footprint
      const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();

      // 6. Firmar la transacción final ensamblada usando Freighter
      const { signedTxXdr, error: signError } = await freighterApi.signTransaction(preparedTx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (signError) {
        throw new Error('El usuario rechazó la firma de la transacción en la billetera.');
      }

      // Convertir el string XDR que retorna Freighter a una instancia de transacción firmada
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

      // 7. Enviar la transacción a la red blockchain
      const sendResult = await server.sendTransaction(signedTx);
      
      if (sendResult.status === 'ERROR') {
        throw new Error(`Fallo de red al enviar la transacción: ${JSON.stringify(sendResult.errorResult)}`);
      }

      // 8. Polling para confirmar la escritura definitiva de la transacción
      let txResponse;
      const pollingAttempts = 30; // 30 intentos (aprox. 1 minuto máximo)
      
      for (let i = 0; i < pollingAttempts; i++) {
        txResponse = await server.getTransaction(sendResult.hash);
        if (txResponse.status !== 'NOT_FOUND') break;
        // Esperamos 2 segundos entre intentos
        await new Promise((resolve) => setTimeout(resolve, 2000)); 
      }

      if (txResponse && txResponse.status === 'SUCCESS') {
        setTxHash(sendResult.hash);
      } else if (txResponse && txResponse.status === 'FAILED') {
        throw new Error('El contrato Soroban falló durante su ejecución en cadena (On-Chain).');
      } else {
        throw new Error('Alcanzado tiempo de espera (timeout) confirmando la transacción.');
      }

    } catch (err) {
      console.error('[Soroban Error]', err);
      // Extraer y popular mensaje descriptivo al usuario en UI
      let errorMessage = 'Ocurrió un error inesperado al conectarse con Soroban.';
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('fetch')) {
          errorMessage = 'Timeout: La red Stellar no respondió a tiempo. Revisa tu conexión de red.';
        } else {
          errorMessage = err.message;
        }
      }
      setErrorStatus(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ margin: '20px 0', fontFamily: 'sans-serif' }}>
      <button
        type="button"
        onClick={handlePayment}
        disabled={isLoading || !montoEnPesos || !direccionDestino}
        style={{
          background: 'linear-gradient(135deg, #eab308, #ca8a04)',
          color: '#ffffff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'background 0.3s ease',
        }}
      >
        {isLoading ? 'Procesando Pago on-chain...' : `Pagar con Oro ($${montoEnPesos} ARS)`}
      </button>

      {/* Manejo visual de Feedback de errores */}
      {errorStatus && (
        <div style={{ color: '#ef4444', marginTop: '12px', fontSize: '14px', backgroundColor: '#fee2e2', padding: '8px', borderRadius: '4px' }}>
          <strong>Error en el pago:</strong> {errorStatus}
        </div>
      )}

      {/* Feedback positivo de confirmación */}
      {txHash && (
        <div style={{ color: '#16a34a', marginTop: '12px', fontSize: '14px', backgroundColor: '#dcfce7', padding: '8px', borderRadius: '4px' }}>
          <strong>¡Pago On-Chain Exitoso!</strong> <br />
          Hash TX:{' '}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563eb', textDecoration: 'underline' }}
          >
            {txHash}
          </a>
        </div>
      )}
    </div>
  );
};
