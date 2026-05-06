import express from 'express';
import {
  getLunchOffer,
  getOpeningHours,
  updateLunchOffer,
} from '../db.js';
import {requireAdmin} from '../middleware/requireAdmin.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';
import {validateLunchOfferPayload} from '../validators/offerValidators.js';

const router = express.Router();

router.get('/opening-hours', async (_req, res) => {
  try {
    const openingHours = await getOpeningHours();
    res.json({openingHours});
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/lunch-offer', async (_req, res) => {
  try {
    const lunchOffer = await getLunchOffer();
    res.json({lunchOffer});
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/lunch-offer', requireAdmin, async (req, res) => {
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
      throw createHttpError(
        404,
        'LUNCH_OFFER_NOT_FOUND',
        'Lunch offer not found'
      );
    }

    const lunchOffer = await getLunchOffer();

    res.json({
      message: 'Lunch offer updated',
      lunchOffer,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;