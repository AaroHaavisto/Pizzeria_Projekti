import express from 'express';
import {
  loginCustomerAccount,
  registerCustomerAccount,
} from '../db.js';
import {createHttpError, sendError} from '../utils/httpErrors.js';
import {validateCustomerAuthPayload} from '../validators/customerValidators.js';

const router = express.Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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

export default router;