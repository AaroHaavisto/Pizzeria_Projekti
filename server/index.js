import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  addOrderItem,
  createOrder,
  deleteMenuItem,
  getAllMenuItems,
  getFeaturedMenuItems,
  getMenuItemById,
  getOpeningHours,
  getLunchOffer,
  getOrder,
  getRatings,
  initDatabase,
  loginCustomerAccount,
  getUserByEmail,
  pingDatabase,
  registerCustomerAccount,
  updateRating,
  updateLunchOffer,
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
    status = 503;
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

function validateCustomerAuthPayload(payload, mode) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (mode === 'register') {
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      errors.push('name is required and must be string');
    }
  }

  if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
    errors.push('email is required and must be string');
  }

  if (!payload.password || typeof payload.password !== 'string') {
    errors.push('password is required and must be string');
  } else if (mode === 'register' && payload.password.length < 6) {
    errors.push('password must be at least 6 characters');
  }

  if (
    mode === 'register' &&
    payload.confirmPassword != null &&
    payload.password !== payload.confirmPassword
  ) {
    errors.push('confirmPassword must match password');
  }

  return errors;
}

function validateLunchOfferPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (!payload.label || typeof payload.label !== 'string' || !payload.label.trim()) {
    errors.push('label is required and must be string');
  }

  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('title is required and must be string');
  }

  const discountPercent = Number(payload.discountPercent);
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    errors.push('discountPercent must be a number between 0 and 100');
  }

  if (!payload.startTime || typeof payload.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.startTime.trim())) {
    errors.push('startTime must be in HH:MM format');
  }

  if (!payload.endTime || typeof payload.endTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.endTime.trim())) {
    errors.push('endTime must be in HH:MM format');
  }

  if (!payload.activeText || typeof payload.activeText !== 'string' || !payload.activeText.trim()) {
    errors.push('activeText is required and must be string');
  }

  if (!payload.inactiveText || typeof payload.inactiveText !== 'string' || !payload.inactiveText.trim()) {
    errors.push('inactiveText is required and must be string');
  }

  return errors;
}

function parseClockMinutes(timeValue) {
  if (typeof timeValue !== 'string') {
    return null;
  }

  const match = timeValue.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateOfferDiscountPercent(offer, now = new Date()) {
  const startMinutes = parseClockMinutes(offer?.startTime);
  const endMinutes = parseClockMinutes(offer?.endTime);
  const discountPercent = Number(offer?.discountPercent) || 0;

  if (startMinutes == null || endMinutes == null || discountPercent <= 0) {
    return 0;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= startMinutes && currentMinutes < endMinutes ? discountPercent : 0;
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

async function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');
  const adminEmail = req.get('x-admin-email');

  if (token === ADMIN_TOKEN) {
    return next();
  }

  if (!adminEmail) {
    return sendError(
      res,
      createHttpError(401, 'UNAUTHORIZED', 'Missing admin credentials')
    );
  }

  try {
    const user = await getUserByEmail(adminEmail);
    if (!user || String(user.role || '').toLowerCase() !== 'admin') {
      return sendError(
        res,
        createHttpError(403, 'FORBIDDEN', 'Admin access required')
      );
    }

    return next();
  } catch (err) {
    return sendError(res, err);
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pingDatabase();
    res.json({status: 'ok', db: 'connected'});
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/ratings', async (_req, res) => {
  try {
    const ratings = await getRatings();
    res.json({ratings});
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/opening-hours', async (_req, res) => {
  try {
    const openingHours = await getOpeningHours();
    res.json({openingHours});
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/lunch-offer', async (_req, res) => {
  try {
    const lunchOffer = await getLunchOffer();
    res.json({lunchOffer});
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/ratings/:ratingId', requireAdmin, async (req, res) => {
  try {
    const {score, description} = req.body;
    const ratingId = req.params.ratingId;

    if (!score && !description) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'At least one of score or description must be provided'
      );
    }

    const wasUpdated = await updateRating(ratingId, {score, description});

    if (!wasUpdated) {
      throw createHttpError(404, 'RATING_NOT_FOUND', 'Rating not found');
    }

    const updatedRatings = await getRatings();
    res.json({message: 'Rating updated', ratings: updatedRatings});
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/lunch-offer', requireAdmin, async (req, res) => {
  try {
    const errors = validateLunchOfferPayload(req.body);
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const wasUpdated = await updateLunchOffer({
      label: req.body.label,
      title: req.body.title,
      discountPercent: Number(req.body.discountPercent),
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      activeText: req.body.activeText,
      inactiveText: req.body.inactiveText,
    });

    if (!wasUpdated) {
      throw createHttpError(404, 'LUNCH_OFFER_NOT_FOUND', 'Lunch offer not found');
    }

    const lunchOffer = await getLunchOffer();
    res.json({message: 'Lunch offer updated', lunchOffer});
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/customers/register', async (req, res) => {
  try {
    const errors = validateCustomerAuthPayload(req.body, 'register');
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const customer = await registerCustomerAccount({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });

    res.status(201).json({
      message: 'Customer account created',
      customer,
    });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/customers/login', async (req, res) => {
  try {
    const errors = validateCustomerAuthPayload(req.body, 'login');
    if (errors.length > 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        errors
      );
    }

    const customer = await loginCustomerAccount({
      email: req.body.email,
      password: req.body.password,
    });

    if (!customer) {
      throw createHttpError(
        401,
        'INVALID_CREDENTIALS',
        'Tarkista sähköposti ja salasana.'
      );
    }

    res.json({customer});
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

app.get('/api/menu/featured', async (_req, res) => {
  try {
    const items = await getFeaturedMenuItems();
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

app.post('/api/orders', async (req, res) => {
  try {
    const {customerId, locationId, items} = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Order must include at least one item'
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.menuItemId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw createHttpError(
          400,
          'VALIDATION_ERROR',
          'Each order item must have menuItemId and quantity >= 1'
        );
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
        throw createHttpError(
          400,
          'VALIDATION_ERROR',
          'Each order item must have valid unitPrice greater than 0'
        );
      }
    }

    const lunchOffer = await getLunchOffer();
    const discountPercent = calculateOfferDiscountPercent(lunchOffer);

    const pricedItems = items.map(item => {
      const originalUnitPrice = Number(item.unitPrice) / 100;
      const discountAmount = discountPercent > 0
        ? Number((originalUnitPrice * (discountPercent / 100)).toFixed(2))
        : 0;
      const discountedUnitPrice = Number((originalUnitPrice - discountAmount).toFixed(2));
      const lineTotal = Number((discountedUnitPrice * item.quantity).toFixed(2));

      return {
        ...item,
        originalUnitPrice,
        discountPercent,
        discountAmount,
        discountedUnitPrice,
        lineTotal,
      };
    });

    const subtotalAmount = pricedItems.reduce(
      (sum, item) => sum + item.originalUnitPrice * item.quantity,
      0
    );
    const discountAmount = pricedItems.reduce(
      (sum, item) => sum + (item.originalUnitPrice - item.discountedUnitPrice) * item.quantity,
      0
    );
    const totalAmount = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // Create order
    const orderId = await createOrder({
      customerUserId: customerId || null,
      locationId: Number.isInteger(locationId) && locationId > 0 ? locationId : null,
      subtotalAmount,
      discountPercent,
      discountAmount,
      totalAmount,
    });

    // Add order items
    for (const item of pricedItems) {
      await addOrderItem({
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        originalUnitPrice: item.originalUnitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        discountedUnitPrice: item.discountedUnitPrice,
        lineTotal: item.lineTotal,
        unitPrice: item.discountedUnitPrice,
        notes: item.notes,
      });
    }

    // Fetch and return full order
    const order = await getOrder(orderId);

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
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
