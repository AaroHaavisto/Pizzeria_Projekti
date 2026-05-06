import express from 'express';
import {
  getRatings,
  updateRating,
} from '../db.js';
import {requireAdmin} from '../middleware/requireAdmin.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const ratings = await getRatings();
    res.json({ratings});
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