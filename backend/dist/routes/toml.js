"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
router.get('/stellar.toml', (req, res) => {
    const port = process.env.PORT || 4000;
    // TODO: Para producción, cambiar localhost por el dominio real
    const domain = `http://localhost:${port}`;
    const toml = `
# Tangibl Anchor Info
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
exports.default = router;
