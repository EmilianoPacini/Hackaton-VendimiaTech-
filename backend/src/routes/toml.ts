import { Router } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

router.get('/stellar.toml', (req, res) => {
  const port = process.env.PORT || 4000;
  // TODO: Para producción, cambiar localhost por el dominio real
  const domain = `http://localhost:${port}`;
  
  const toml = `
# AURUM Anchor Info
ACCOUNTS=["${process.env.SERVER_PUBLIC_KEY || ''}"]
NETWORK_PASSPHRASE="${process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015'}"

# SEP-10
WEB_AUTH_ENDPOINT="${domain}/auth"

# SEP-24
TRANSFER_SERVER_SEP0024="${domain}"

[[CURRENCIES]]
code="GOLD"
issuer="${process.env.GOLD_ISSUER_ID || ''}"
desc="1 Gram of Physical Gold"
is_asset_anchored=true
`;
  res.type('text/plain');
  res.send(toml.trim());
});

export default router;
