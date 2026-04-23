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

function todayDateISO() {
  return new Date().toLocaleDateString('sv-SE');
}

async function readMenuData() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeMenuData(payload) {
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(DATA_PATH, serialized, 'utf8');
}

function validateIsoDate(value, fieldName) {
  const isIsoLike = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isValidDate = !Number.isNaN(Date.parse(`${value}T00:00:00`));

  if (!isIsoLike || !isValidDate) {
    return `${fieldName} must be valid ISO date (YYYY-MM-DD)`;
  }

  return null;
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

function validateDay(day, pathPrefix = 'day') {
  const errors = [];

  if (!day || typeof day !== 'object') {
    return [`${pathPrefix} must be an object`];
  }

  if (!day.dayId || typeof day.dayId !== 'string') {
    errors.push(`${pathPrefix}.dayId is required and must be string`);
  }

  if (!day.date || typeof day.date !== 'string') {
    errors.push(`${pathPrefix}.date is required and must be string`);
  } else {
    const dateErr = validateIsoDate(day.date, `${pathPrefix}.date`);
    if (dateErr) {
      errors.push(dateErr);
    }
  }

  if (!Array.isArray(day.items)) {
    errors.push(`${pathPrefix}.items must be an array`);
  } else {
    day.items.forEach((item, idx) => {
      errors.push(...validateItem(item, `${pathPrefix}.items[${idx}]`));
    });
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
  try {
    const data = await readMenuData();
    const today = todayDateISO();
    const day = data.days.find(entry => entry.date === today);

    if (!day) {
      throw createHttpError(404, 'DAY_NOT_FOUND', `No menu found for ${today}`);
    }

    res.json({week: data.week, day});
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/menu/:date', async (req, res) => {
  try {
    const {date} = req.params;
    const dateErr = validateIsoDate(date, 'date');
    if (dateErr) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid request', [
        dateErr,
      ]);
    }

    const data = await readMenuData();
    const day = data.days.find(entry => entry.date === date);

    if (!day) {
      throw createHttpError(404, 'DAY_NOT_FOUND', `No menu found for ${date}`);
    }

    res.json({week: data.week, day});
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/menu', requireAdmin, async (req, res) => {
  try {
    const payload = req.body;
    const errors = validateDay(payload, 'day');

    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const data = await readMenuData();
    const idx = data.days.findIndex(entry => entry.date === payload.date);

    if (idx >= 0) {
      data.days[idx] = payload;
    } else {
      data.days.push(payload);
      data.days.sort((a, b) => a.date.localeCompare(b.date));
    }

    await writeMenuData(data);
    res.status(201).json({message: 'Day upserted', day: payload});
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/menu/:date', requireAdmin, async (req, res) => {
  try {
    const {date} = req.params;
    const dateErr = validateIsoDate(date, 'date');
    if (dateErr) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid request', [
        dateErr,
      ]);
    }

    const payload = req.body;
    if (payload.date !== date) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'date mismatch', [
        'Body date must match URL param',
      ]);
    }

    const errors = validateDay(payload, 'day');
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const data = await readMenuData();
    const idx = data.days.findIndex(entry => entry.date === date);

    if (idx < 0) {
      throw createHttpError(404, 'DAY_NOT_FOUND', `No menu found for ${date}`);
    }

    data.days[idx] = payload;
    await writeMenuData(data);

    res.json({message: 'Day updated', day: payload});
  } catch (err) {
    sendError(res, err);
  }
});

app.patch('/api/menu/:date', requireAdmin, async (req, res) => {
  try {
    const {date} = req.params;
    const dateErr = validateIsoDate(date, 'date');
    if (dateErr) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid request', [
        dateErr,
      ]);
    }

    const data = await readMenuData();
    const idx = data.days.findIndex(entry => entry.date === date);
    if (idx < 0) {
      throw createHttpError(404, 'DAY_NOT_FOUND', `No menu found for ${date}`);
    }

    const merged = {
      ...data.days[idx],
      ...req.body,
      date,
      dayId: req.body.dayId || data.days[idx].dayId || date,
      items: req.body.items || data.days[idx].items,
    };

    const errors = validateDay(merged, 'day');
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    data.days[idx] = merged;
    await writeMenuData(data);

    res.json({message: 'Day patched', day: merged});
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/menu/:date', requireAdmin, async (req, res) => {
  try {
    const {date} = req.params;
    const dateErr = validateIsoDate(date, 'date');
    if (dateErr) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid request', [
        dateErr,
      ]);
    }

    const data = await readMenuData();
    const nextDays = data.days.filter(entry => entry.date !== date);

    if (nextDays.length === data.days.length) {
      throw createHttpError(404, 'DAY_NOT_FOUND', `No menu found for ${date}`);
    }

    data.days = nextDays;
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
