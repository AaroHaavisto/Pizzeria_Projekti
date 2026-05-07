import express from 'express';
import {
  getRatings,
  updateRating,
} from '../db.js';
import {requireAdmin} from '../middleware/requireAdmin.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';

const router = express.Router();
const menuItemRatings = [];
const restaurantFeedback = [];

function createFeedbackId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function validateRatingValue(value) {
  const rating = Number(value);

  return Number.isFinite(rating) && rating >= 1 && rating <= 5;
}

function validateMenuRatingPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (!payload.menuItemId || String(payload.menuItemId).trim() === '') {
    errors.push('menuItemId is required');
  }

  if (!validateRatingValue(payload.rating)) {
    errors.push('rating must be between 1 and 5');
  }

  if (payload.comment != null && typeof payload.comment !== 'string') {
    errors.push('comment must be a string');
  }

  return errors;
}

function validateFeedbackPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Body must be an object'];
  }

  if (!payload.customerId || String(payload.customerId).trim() === '') {
    errors.push('customerId is required');
  }

  if (!validateRatingValue(payload.rating)) {
    errors.push('rating must be between 1 and 5');
  }

  if (!payload.message || typeof payload.message !== 'string' || !payload.message.trim()) {
    errors.push('message is required and must be a string');
  }

  if (payload.category != null && typeof payload.category !== 'string') {
    errors.push('category must be a string');
  }

  return errors;
}

router.get('/', async (_req, res) => {
  try {
    const ratings = await getRatings();
    res.json({ratings});
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/menu-items', (_req, res) => {
  res.json({ratings: menuItemRatings});
});

router.post('/menu-items', (req, res) => {
  try {
    const errors = validateMenuRatingPayload(req.body);

    if (errors.length > 0) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid request body', errors);
    }

    const rating = {
      id: createFeedbackId('menu-rating'),
      menuItemId: String(req.body.menuItemId).trim(),
      rating: Number(req.body.rating),
      comment: String(req.body.comment || '').trim(),
      createdAt: new Date().toISOString(),
    };

    menuItemRatings.unshift(rating);

    res.status(201).json({message: 'Rating created', rating});
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/feedback', (_req, res) => {
  res.json({feedback: restaurantFeedback});
});

router.post('/feedback', (req, res) => {
  try {
    const errors = validateFeedbackPayload(req.body);

    if (errors.length > 0) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Invalid request body', errors);
    }

    const feedback = {
      id: createFeedbackId('feedback'),
      customerId: String(req.body.customerId).trim(),
      rating: Number(req.body.rating),
      message: String(req.body.message).trim(),
      category: String(req.body.category || 'general').trim(),
      createdAt: new Date().toISOString(),
    };

    restaurantFeedback.unshift(feedback);

    res.status(201).json({message: 'Feedback created', feedback});
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/:ratingId', requireAdmin, async (req, res) => {
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

    const wasUpdated = await updateRating(ratingId, {
      score,
      description,
    });

    if (!wasUpdated) {
      throw createHttpError(
        404,
        'RATING_NOT_FOUND',
        'Rating not found'
      );
    }

    const updatedRatings = await getRatings();

    res.json({
      message: 'Rating updated',
      ratings: updatedRatings,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;