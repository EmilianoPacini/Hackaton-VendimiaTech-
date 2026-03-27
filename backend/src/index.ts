import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tomlRouter from './routes/toml';
import authRouter from './routes/auth';
import anchorRouter from './routes/anchor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Protocolo SEP-1 (Stellar TOML)
app.use('/.well-known', tomlRouter);

// Protocolo SEP-10 (Autenticación)
app.use('/auth', authRouter);

// Protocolo SEP-24 (Ancla Interactiva)
app.use('/', anchorRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tangibl Anchor' });
});

app.listen(PORT, () => {
  console.log(`[Tangibl Anchor] Backend corriendo en http://localhost:${PORT}`);
});
