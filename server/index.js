import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  deleteMenuItem,
  getAllMenuItems,
  getMenuItemById,
  initDatabase,
  pingDatabase,
  upsertMenuItem,
} from './db.js';

const app = express();
const PORT = process.env.API_PORT || 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-admin-token';

const ALLOWED_MEAL_TYPES = new Set(['lunch', 'a_la_carte']);

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res
    .status(200)
    .type('text/plain')
    .send(
      'Pizzeria Pro API is running. Try /api/health or /api/menu for database-backed menu data.'
    );
});

function createHttpError(status, code, message, details = []) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function sendError(res, err) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Tuntematon virhe';
  const details = Array.isArray(err.details) ? err.details : [];

  const dbConnectionErrorCodes = new Set([
    'ECONNREFUSED',
    'PROTOCOL_CONNECTION_LOST',
    'ER_ACCESS_DENIED_ERROR',
    'ER_BAD_DB_ERROR',
  ]);

  if (status === 500 && dbConnectionErrorCodes.has(err.code)) {
    code = 'DB_CONNECTION_ERROR';
    message =
      'Tietokantayhteys epäonnistui. Tarkista DB_HOST, DB_PORT, DB_USER, DB_PASSWORD ja DB_NAME.';
  }

  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function validateItem(item, pathPrefix) {
  const errors = [];

  if (!item || typeof item !== 'object') {
    return [`${pathPrefix} must be an object`];
  }

  if (!item.itemId || typeof item.itemId !== 'string') {
    errors.push(`${pathPrefix}.itemId is required and must be string`);
  }

  if (!item.name || typeof item.name !== 'string') {
    errors.push(`${pathPrefix}.name is required and must be string`);
  }

  if (item.description != null && typeof item.description !== 'string') {
    errors.push(`${pathPrefix}.description must be string when provided`);
  }

  if (!Number.isInteger(item.priceCents) || item.priceCents < 0) {
    errors.push(
      `${pathPrefix}.priceCents is required and must be integer >= 0`
    );
  }

  if (!item.currency || typeof item.currency !== 'string') {
    errors.push(`${pathPrefix}.currency is required and must be string`);
  }

  if (!Array.isArray(item.diet) || item.diet.some(d => typeof d !== 'string')) {
    errors.push(`${pathPrefix}.diet must be string[]`);
  }

  if (!ALLOWED_MEAL_TYPES.has(item.mealType)) {
    errors.push(`${pathPrefix}.mealType must be one of: lunch, a_la_carte`);
  }

  if (item.image != null && typeof item.image !== 'string') {
    errors.push(`${pathPrefix}.image must be string when provided`);
  }

  return errors;
}

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');
  if (token !== ADMIN_TOKEN) {
    return sendError(
      res,
      createHttpError(401, 'UNAUTHORIZED', 'Missing or invalid admin token')
    );
  }
  return next();
}

app.get('/api/health', async (_req, res) => {
  try {
    await pingDatabase();
    res.json({status: 'ok', db: 'connected'});
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/menu', async (_req, res) => {
  try {
    const items = await getAllMenuItems();
    res.json({items});
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/menu/today', async (_req, res) => {
  sendError(
    res,
    createHttpError(
      410,
      'DEPRECATED_ENDPOINT',
      'Day-based menu endpoints are removed. Use GET /api/menu.'
    )
  );
});

app.get('/api/menu/:itemId', async (req, res) => {
  try {
    const item = await getMenuItemById(req.params.itemId);

    if (!item) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    res.json({item});
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/menu', requireAdmin, async (req, res) => {
  try {
    const payload = req.body;
    const errors = validateItem(payload, 'item');

    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    await upsertMenuItem(payload);
    res.status(201).json({message: 'Item upserted', item: payload});
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/menu/:itemId', requireAdmin, async (req, res) => {
  try {
    const payload = req.body;
    if (payload.itemId !== req.params.itemId) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'date mismatch', [
        'Body itemId must match URL param',
      ]);
    }

    const errors = validateItem(payload, 'item');
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const existing = await getMenuItemById(req.params.itemId);
    if (!existing) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    await upsertMenuItem(payload);

    res.json({message: 'Item updated', item: payload});
  } catch (err) {
    sendError(res, err);
  }
});

app.patch('/api/menu/:itemId', requireAdmin, async (req, res) => {
  try {
    const existing = await getMenuItemById(req.params.itemId);
    if (!existing) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    const merged = {
      ...existing,
      ...req.body,
      itemId: req.params.itemId,
    };

    const errors = validateItem(merged, 'item');
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    await upsertMenuItem(merged);

    res.json({message: 'Item patched', item: merged});
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/menu/:itemId', requireAdmin, async (req, res) => {
  try {
    const wasDeleted = await deleteMenuItem(req.params.itemId);
    if (!wasDeleted) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
});

app.use((err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  return sendError(res, err);
});

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start API server', err);
  process.exit(1);
});
