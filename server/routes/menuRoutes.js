import express from 'express';
import {
  deleteMenuItem,
  getAllMenuItems,
  getFeaturedMenuItems,
  getMenuItemById,
  upsertMenuItem,
} from '../db.js';
import {requireAdmin} from '../middleware/requireAdmin.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';
import {validateItem} from '../validators/menuValidators.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const items = await getAllMenuItems();
    res.json({items});
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/featured', async (_req, res) => {
  try {
    const items = await getFeaturedMenuItems();
    res.json({items});
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/today', async (_req, res) => {
  sendError(
    res,
    createHttpError(
      410,
      'DEPRECATED_ENDPOINT',
      'Day-based menu endpoints are removed. Use GET /api/menu.'
    )
  );
});

router.get('/:itemId', async (req, res) => {
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

router.post('/', requireAdmin, async (req, res) => {
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

    res.status(201).json({
      message: 'Item upserted',
      item: payload,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:itemId', requireAdmin, async (req, res) => {
  try {
    const payload = req.body;

    if (payload.itemId !== req.params.itemId) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'itemId mismatch', [
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

    res.json({
      message: 'Item updated',
      item: payload,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/:itemId', requireAdmin, async (req, res) => {
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

    res.json({
      message: 'Item patched',
      item: merged,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete('/:itemId', requireAdmin, async (req, res) => {
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

export default router;