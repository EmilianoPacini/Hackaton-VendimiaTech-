import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper de auth para endpoints protegidos
const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    // Para simplificar test de SEP-24 sin auth rígido por ahora, lo dejamos pasar como admin temporal
    // res.sendStatus(401); 
    req.user = { sub: 'mocked_client_public_key' };
    next();
  }
};

// SEP-24: /info endpoint
// Describe qué monedas soporta el ancla y su estatus para depósitos y retiros.
router.get('/info', (req, res) => {
  res.json({
    receive: {
      GOLD: {
        enabled: true,
        fee_fixed: 0.1,
        fee_percent: 1.0,
        min_amount: 1,
        max_amount: 1000,
        desc: "Convert ARS to physical GOLD backed tokens"
      }
    },
    withdraw: {
      GOLD: {
        enabled: true,
        fee_fixed: 0.5,
        fee_percent: 2.0,
        min_amount: 1,
        max_amount: 1000,
        desc: "Sell GOLD backed tokens for ARS payout"
      }
    },
    fee: {
      enabled: false
    },
    transactions: {
      enabled: true,
      authentication_required: true
    },
    transaction: {
      enabled: true,
      authentication_required: true
    }
  });
});

// SEP-24: Interactive Deposit
// Inicia el proceso de On-Ramp donde el usuario debe ver una UI para hacer su transferencia.
router.post('/transactions/deposit/interactive', authenticateJWT, (req, res) => {
  const asset_code = req.body.asset_code;
  // @ts-ignore
  const account = req.body.account || req.user?.sub;
  
  if (asset_code !== 'GOLD') {
    return res.status(400).json({ error: 'unsupported_asset' });
  }

  // En un ancla real, crearíamos un registro en Base de Datos de estado "incomplete" 
  // y generaríamos una URL única para el KYC/Deposit.
  const transactionId = Math.random().toString(36).substring(7);
  const domain = `http://localhost:${process.env.PORT || 4000}`;
  
  res.json({
    type: 'interactive_customer_info_needed',
    url: `${domain}/kyc-deposit?id=${transactionId}&account=${account}`,
    id: transactionId
  });
});

// SEP-24: Interactive Withdraw
router.post('/transactions/withdraw/interactive', authenticateJWT, (req, res) => {
  const asset_code = req.body.asset_code;
  // @ts-ignore
  const account = req.body.account || req.user?.sub;
  
  if (asset_code !== 'GOLD') {
    return res.status(400).json({ error: 'unsupported_asset' });
  }

  const transactionId = Math.random().toString(36).substring(7);
  const domain = `http://localhost:${process.env.PORT || 4000}`;
  
  res.json({
    type: 'interactive_customer_info_needed',
    url: `${domain}/kyc-withdraw?id=${transactionId}&account=${account}`,
    id: transactionId
  });
});

export default router;
