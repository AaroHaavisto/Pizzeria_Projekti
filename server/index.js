import cors from 'cors';
import express from 'express';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-admin-token';
const DATA_PATH = path.join(__dirname, 'data', 'menu.json');

const ALLOWED_MEAL_TYPES = new Set(['lunch', 'a_la_carte']);

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res
    .status(200)
    .type('text/plain')
    .send(
      'Pizzeria Pro API is running. Try /api/health or /api/menu for JSON data.'
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
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Tuntematon virhe';
  const details = Array.isArray(err.details) ? err.details : [];

  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

async function readMenuData() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed.items)) {
    return {items: parsed.items};
  }

  if (Array.isArray(parsed.days)) {
    return {
      items: parsed.days.flatMap(day =>
        Array.isArray(day.items) ? day.items : []
      ),
    };
  }

  return {items: []};
}

async function writeMenuData(payload) {
  const serialized = `${JSON.stringify({items: payload.items || []}, null, 2)}\n`;
  await fs.writeFile(DATA_PATH, serialized, 'utf8');
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

app.get('/api/health', (_req, res) => {
  res.json({status: 'ok'});
});

app.get('/api/menu', async (_req, res) => {
  try {
    const data = await readMenuData();
    res.json(data);
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
    const data = await readMenuData();
    const item = data.items.find(entry => entry.itemId === req.params.itemId);

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

    const data = await readMenuData();
    const idx = data.items.findIndex(entry => entry.itemId === payload.itemId);

    if (idx >= 0) {
      data.items[idx] = payload;
    } else {
      data.items.push(payload);
    }

    await writeMenuData(data);
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

    const data = await readMenuData();
    const idx = data.items.findIndex(
      entry => entry.itemId === req.params.itemId
    );

    if (idx < 0) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    data.items[idx] = payload;
    await writeMenuData(data);

    res.json({message: 'Item updated', item: payload});
  } catch (err) {
    sendError(res, err);
  }
});

app.patch('/api/menu/:itemId', requireAdmin, async (req, res) => {
  try {
    const data = await readMenuData();
    const idx = data.items.findIndex(
      entry => entry.itemId === req.params.itemId
    );
    if (idx < 0) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    const merged = {
      ...data.items[idx],
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

    data.items[idx] = merged;
    await writeMenuData(data);

    res.json({message: 'Item patched', item: merged});
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/menu/:itemId', requireAdmin, async (req, res) => {
  try {
    const data = await readMenuData();
    const nextItems = data.items.filter(
      entry => entry.itemId !== req.params.itemId
    );

    if (nextItems.length === data.items.length) {
      throw createHttpError(404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    data.items = nextItems;
    await writeMenuData(data);
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
