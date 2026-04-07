/**
 * Payment Routes
 * Stripe payment processing routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const paymentController = require('../controllers/payment.controller');

// API Routes
router.post('/checkout',
  authenticate,
  requirePermission('SUBSCRIPTION', 'UPDATE'),
  paymentController.createCheckout
);

router.post('/extra-seats',
  authenticate,
  requirePermission('SUBSCRIPTION', 'UPDATE'),
  paymentController.createSeatPayment
);

router.get('/history',
  authenticate,
  paymentController.getHistory
);

// Webhook endpoint (public, but validated by Stripe signature)
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Checkout page redirect
router.get('/checkout',
  authenticate,
  paymentController.checkoutPage
);

module.exports = router;
