"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || stellar_sdk_1.Keypair.random().secret(); // Fallback temporal para dev
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const serverKeypair = stellar_sdk_1.Keypair.fromSecret(SERVER_PRIVATE_KEY);
// 1. GET /auth -> Emite la Challenge Transaction
router.get('/', (req, res) => {
    try {
        const account = req.query.account;
        if (!account) {
            return res.status(400).json({ error: 'account is required' });
        }
        // El ancla crea una transaction origen desde SU cuenta, con sequence 0, 
        // y un timeout de 15 minutos en el futuro (TimeBounds) con un manageData (el challenge).
        // Usamos el helper de la librería standard Utils.buildChallengeTx (pseudo-implementación) o manual.
        // NOTA: Para simplificar el hackathon simulamos una Tx sencilla.
        // Forma correcta recomendada por Stellar SDK:
        // Pero asumiendo q usamos stellar-sdk basico:
        const networkPassphrase = process.env.NETWORK_PASSPHRASE || stellar_sdk_1.Networks.TESTNET;
        // Aquí implementamos un memo aleatorio como challenge.
        // Retornamos un XDR dummy como si fuera la Challenge Transaction.
        const mockTx = 'AAAAA...'; // Pseudocodigo corto por brevedad en este MVP manual
        const randomBuffer = crypto_1.default.randomBytes(32);
        const sourceAccount = new stellar_sdk_1.Account(serverKeypair.publicKey(), "0");
        // Para simplificar esta integración, Stellar provee funciones completas de SEP-10
        // Normalmente se extrae a una clase, pero aquí dejaremos un esqueleto para ilustrar:
        res.json({
            transaction: 'XDR_TRANSACTION_BASE64_HERE',
            network_passphrase: networkPassphrase
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'server_error' });
    }
});
// 2. POST /auth -> Valida firma y otorga JWT
router.post('/', (req, res) => {
    try {
        const { transaction } = req.body;
        if (!transaction) {
            return res.status(400).json({ error: 'transaction is required' });
        }
        // 1. Decodificar transaction (XDR)
        // 2. Verificar que las signatures incluyan al SERVER y al CLIENT
        // 3. Confirmar que los timebounds son vigentes
        // Si la validacion pasa:
        const clientPublicKey = 'G_CLIENT_PUBLIC_KEY_EXTRACTED_FROM_TX'; // Mock
        const token = jsonwebtoken_1.default.sign({ sub: clientPublicKey }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'server_error' });
    }
});
exports.default = router;
