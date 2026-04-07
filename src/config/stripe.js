/**
 * Stripe Configuration
 * Payment processing for ODM-CMMS subscriptions
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
  appInfo: {
    name: 'ODM-CMMS',
    version: '2.0.0'
  }
});

module.exports = stripe;
