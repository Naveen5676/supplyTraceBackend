import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDriver } from './utils/db.js';
import { sendFail } from './utils/errors.js';
import productsRouter from './routes/products.js';
import suppliersRouter from './routes/suppliers.js';
import partsRouter from './routes/parts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/parts', partsRouter);

app.use((_req, res) => {
  sendFail(res, 404, 'not_found', 'Route not found.');
});

app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  sendFail(res, 500, 'internal_error', 'Unexpected server error.');
});

const server = app.listen(PORT, () => {
  console.log(`SupplyTrace API listening on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close();
  await closeDriver();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
