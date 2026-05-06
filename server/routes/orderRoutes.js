import express from 'express';
import {
  addOrderItem,
  createOrder,
  getLunchOffer,
  getOrder,
} from '../db.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';
import {calculateOfferDiscountPercent} from '../utils/offerUtils.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const {customerId, locationId, items} = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw createHttpError(
        400,
        'VALIDATION_ERROR',
        'Order must include at least one item'
      );
    }

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

      const discountAmount =
        discountPercent > 0
          ? Number((originalUnitPrice * (discountPercent / 100)).toFixed(2))
          : 0;

      const discountedUnitPrice = Number(
        (originalUnitPrice - discountAmount).toFixed(2)
      );

      const lineTotal = Number(
        (discountedUnitPrice * item.quantity).toFixed(2)
      );

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
      (sum, item) =>
        sum +
        (item.originalUnitPrice - item.discountedUnitPrice) * item.quantity,
      0
    );

    const totalAmount = pricedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    const orderId = await createOrder({
      customerUserId: customerId || null,
      locationId: Number.isInteger(locationId) && locationId > 0 ? locationId : null,
      subtotalAmount,
      discountPercent,
      discountAmount,
      totalAmount,
    });

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
        notes: item.notes,
      });
    }

    const order = await getOrder(orderId);

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;