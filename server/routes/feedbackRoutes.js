import express from 'express';
import {pool} from '../db/pool.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const {userId, customerName, customerEmail, rating, message} = req.body;

    const normalizedRating = Number(rating);
    const normalizedMessage = String(message || '').trim();
    const normalizedEmail = String(customerEmail || '').trim().toLowerCase();
    const normalizedName = String(customerName || '').trim();

    if (!normalizedEmail) {
      return res.status(400).json({
        error: {message: 'Customer email is required.'},
      });
    }

    if (!normalizedMessage) {
      return res.status(400).json({
        error: {message: 'Feedback message is required.'},
      });
    }

    if (
      !Number.isInteger(normalizedRating) ||
      normalizedRating < 1 ||
      normalizedRating > 5
    ) {
      return res.status(400).json({
        error: {message: 'Rating must be between 1 and 5.'},
      });
    }

    const [result] = await pool.query(
      `INSERT INTO customer_feedback (
        user_id,
        customer_name,
        customer_email,
        rating,
        message
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        userId || null,
        normalizedName || null,
        normalizedEmail,
        normalizedRating,
        normalizedMessage,
      ]
    );

    res.status(201).json({
      message: 'Feedback saved',
      feedback: {
        id: result.insertId,
        userId: userId || null,
        customerName: normalizedName,
        customerEmail: normalizedEmail,
        rating: normalizedRating,
        message: normalizedMessage,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/customer/:customerId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        feedback_id,
        user_id,
        customer_name,
        customer_email,
        rating,
        message,
        created_at
       FROM customer_feedback
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.customerId]
    );

    res.json({
      feedbackItems: rows.map(row => ({
        id: row.feedback_id,
        userId: row.user_id,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        rating: row.rating,
        message: row.message,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;