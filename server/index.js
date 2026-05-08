import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';

import {fileURLToPath} from 'node:url';
import {initDatabase, pingDatabase} from './db.js';
import {errorHandler} from './middleware/errorHandler.js';

import customerRoutes from './routes/customerRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.API_PORT || 3005;

app.use(cors());
app.use(express.json());

/**
 * Root route — basic textual confirmation that the API is running.
 * Primarily useful for quick manual checks in development.
 */
app.get('/', (_req, res) => {
  res
    .status(200)
    .type('text/plain')
    .send(
      'Slice Hunt API is running. Try /api/health or /api/menu for database-backed menu data.'
    );
});

/**
 * Health-check endpoint used by uptime monitors and CI.
 * Verifies database connectivity by calling `pingDatabase()`.
 * Responds with a small JSON object describing status.
 *
 * @name GET /api/health
 * @async
 * @function
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
app.get('/api/health', async (_req, res, next) => {
  try {
    await pingDatabase();
    res.json({
      status: 'ok',
      db: 'connected',
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/customers', customerRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api', settingsRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../dist');

  app.use(express.static(clientDistPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(errorHandler);

/**
 * Initialize the database and start the Express HTTP server.
 * Exits the process on irrecoverable startup errors.
 *
 * @returns {Promise<void>} Resolves when the server is listening.
 */
async function startServer() {
  await initDatabase();

  const server = app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });

  server.on('error', err => {
    console.error('API server failed to start', err);
    process.exit(1);
  });
}

startServer().catch(err => {
  console.error('Failed to start API server', err);
  process.exit(1);
});