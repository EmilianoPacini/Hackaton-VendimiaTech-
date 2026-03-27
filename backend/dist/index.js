"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const toml_1 = __importDefault(require("./routes/toml"));
const auth_1 = __importDefault(require("./routes/auth"));
const anchor_1 = __importDefault(require("./routes/anchor"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// Protocolo SEP-1 (Stellar TOML)
app.use('/.well-known', toml_1.default);
// Protocolo SEP-10 (Autenticación)
app.use('/auth', auth_1.default);
// Protocolo SEP-24 (Ancla Interactiva)
app.use('/', anchor_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Tangibl Anchor' });
});
app.listen(PORT, () => {
    console.log(`[Tangibl Anchor] Backend corriendo en http://localhost:${PORT}`);
});
