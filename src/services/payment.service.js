/**
 * Payment Service
 * Handles Stripe checkout, payments, and billing
 */

const stripe = require('../config/stripe');
const { pool } = require('../config/database');

class PaymentService {
  /**
   * Create a checkout session for subscription upgrade
   * @param {number} organizationId
   * @param {string} planCode - Plan to upgrade to
   * @param {string} successUrl - Redirect URL after successful payment
   * @param {string} cancelUrl - Redirect URL if payment cancelled
   * @returns {Object} Checkout session
   */
  async createCheckoutSession(organizationId, planCode, successUrl, cancelUrl) {
    // Get plan details
    const [planRows] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE plan_code = ? AND is_active = TRUE',
      [planCode]
    );
    
    if (!planRows[0]) {
      throw new Error('Plan not found');
    }
    
    const plan = planRows[0];
    const priceInCents = Math.round(parseFloat(plan.base_price) * 100);
    
    if (priceInCents === 0) {
      throw new Error('Free plans cannot be purchased');
    }
    
    // Get or create Stripe customer
    const customer = await this.getOrCreateCustomer(organizationId);
    
    // Create Stripe Checkout Session with multiple payment methods
    const session = await stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      mode: 'subscription',
      // Enable multiple payment methods
      // Note: Apple Pay and Google Pay work automatically with 'card' when enabled in Stripe Dashboard
      payment_method_types: [
        'card',           // Credit/Debit cards + Apple Pay + Google Pay (if enabled in Dashboard)
        'paypal',         // PayPal
        'cashapp',        // Cash App Pay
        'amazon_pay',     // Amazon Pay
        'link'            // Stripe Link (1-click checkout)
      ],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.plan_name,
            description: plan.description
          },
          unit_amount: priceInCents,
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organizationId.toString(),
        planCode: planCode
      },
      // Auto-collect tax if needed
      automatic_tax: {
        enabled: false
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Billing address collection
      billing_address_collection: 'required'
    });
    
    return {
      sessionId: session.id,
      url: session.url
    };
  }
  
  /**
   * Get or create Stripe customer for organization
   * @param {number} organizationId
   * @returns {Object} Customer info
   */
  async getOrCreateCustomer(organizationId) {
    // Check if customer already exists
    const [existing] = await pool.execute(
      'SELECT stripe_customer_id FROM stripe_customers WHERE organization_id = ?',
      [organizationId]
    );
    
    if (existing[0]?.stripe_customer_id) {
      return { stripeCustomerId: existing[0].stripe_customer_id };
    }
    
    // Get organization details
    const [orgRows] = await pool.execute(
      'SELECT organization_name, billing_email FROM organizations WHERE id = ?',
      [organizationId]
    );
    
    const org = orgRows[0];
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: org.organization_name,
      email: org.billing_email,
      metadata: {
        organizationId: organizationId.toString()
      }
    });
    
    // Store customer ID
    await pool.execute(
      `INSERT INTO stripe_customers (organization_id, stripe_customer_id, created_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE stripe_customer_id = ?`,
      [organizationId, customer.id, customer.id]
    );
    
    return { stripeCustomerId: customer.id };
  }
  
  /**
   * Create a payment intent for adding extra seats
   * @param {number} organizationId
   * @param {number} seatCount
   * @returns {Object} Payment intent
   */
  async createSeatPaymentIntent(organizationId, seatCount) {
    // Get current subscription for pricing
    const [subRows] = await pool.execute(
      `SELECT os.*, sp.price_per_additional_user
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON os.plan_id = sp.id
       WHERE os.organization_id = ?`,
      [organizationId]
    );
    
    if (!subRows[0]) {
      throw new Error('No subscription found');
    }
    
    const pricePerSeat = parseFloat(subRows[0].price_per_additional_user);
    const amountInCents = Math.round(pricePerSeat * seatCount * 100);
    
    const customer = await this.getOrCreateCustomer(organizationId);
    
    // Create payment intent with multiple payment methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customer.stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      },
      metadata: {
        organizationId: organizationId.toString(),
        type: 'extra_seats',
        seatCount: seatCount.toString()
      }
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents / 100
    };
  }

  /**
   * Create a checkout session for one-time payment (extra seats)
   * @param {number} organizationId
   * @param {number} seatCount
   * @param {string} successUrl
   * @param {string} cancelUrl
   * @returns {Object} Checkout session
   */
  async createSeatCheckoutSession(organizationId, seatCount, successUrl, cancelUrl) {
    // Get current subscription for pricing
    const [subRows] = await pool.execute(
      `SELECT os.*, sp.price_per_additional_user
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON os.plan_id = sp.id
       WHERE os.organization_id = ?`,
      [organizationId]
    );
    
    if (!subRows[0]) {
      throw new Error('No subscription found');
    }
    
    const pricePerSeat = parseFloat(subRows[0].price_per_additional_user);
    const amountInCents = Math.round(pricePerSeat * seatCount * 100);
    
    if (amountInCents === 0) {
      throw new Error('Invalid amount');
    }
    
    const customer = await this.getOrCreateCustomer(organizationId);
    
    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customer.stripeCustomerId,
      mode: 'payment',
      // Note: Apple Pay and Google Pay work automatically with 'card' when enabled in Stripe Dashboard
      payment_method_types: [
        'card',           // Credit/Debit cards + Apple Pay + Google Pay (if enabled in Dashboard)
        'paypal',         // PayPal
        'cashapp',        // Cash App Pay
        'amazon_pay',     // Amazon Pay
        'link'            // Stripe Link (1-click checkout)
      ],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${seatCount} Extra Seat${seatCount > 1 ? 's' : ''}`,
            description: `Additional user seats for your organization`
          },
          unit_amount: amountInCents
        },
        quantity: 1
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organizationId.toString(),
        type: 'extra_seats',
        seatCount: seatCount.toString()
      }
    });
    
    return {
      sessionId: session.id,
      url: session.url
    };
  }
  
  /**
   * Handle Stripe webhook events
   * @param {string} payload
   * @param {string} signature
   * @returns {Object} Event
   */
  async handleWebhook(payload, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }
    
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
    }
    
    return event;
  }
  
  /**
   * Handle successful checkout
   * @param {Object} session
   */
  async handleCheckoutCompleted(session) {
    const organizationId = parseInt(session.metadata.organizationId);
    const paymentType = session.metadata.type;
    
    if (paymentType === 'extra_seats') {
      // Handle extra seats purchase
      const seatCount = parseInt(session.metadata.seatCount);
      await this.handleExtraSeatsPurchase(organizationId, seatCount, session);
    } else {
      // Handle subscription upgrade
      const planCode = session.metadata.planCode;
      await this.handleSubscriptionUpgrade(organizationId, planCode, session);
    }
  }
  
  /**
   * Handle subscription upgrade payment
   */
  async handleSubscriptionUpgrade(organizationId, planCode, session) {
    // Update subscription in database
    const subscriptionService = require('./subscription.service');
    await subscriptionService.changePlan(organizationId, planCode, {
      billingCycle: 'monthly'
    });
    
    // Store payment record
    await pool.execute(
      `INSERT INTO payments 
       (organization_id, stripe_payment_intent_id, stripe_invoice_id, amount, currency, status, type, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'subscription', ?, NOW())`,
      [
        organizationId,
        session.payment_intent,
        session.invoice,
        session.amount_total / 100,
        session.currency.toUpperCase(),
        'completed',
        `Subscription upgrade to ${planCode}`
      ]
    );
    
    console.log(`[PAYMENT] Subscription upgrade completed for org ${organizationId}, plan ${planCode}`);
  }
  
  /**
   * Handle extra seats purchase
   */
  async handleExtraSeatsPurchase(organizationId, seatCount, session) {
    // Add extra seats to subscription
    const [subRows] = await pool.execute(
      'SELECT extra_users FROM organization_subscriptions WHERE organization_id = ?',
      [organizationId]
    );
    
    if (subRows[0]) {
      const currentExtra = subRows[0].extra_users || 0;
      const newExtra = currentExtra + seatCount;
      
      await pool.execute(
        `UPDATE organization_subscriptions 
         SET extra_users = ?, updated_at = NOW()
         WHERE organization_id = ?`,
        [newExtra, organizationId]
      );
      
      // Recalculate seats
      const subscriptionService = require('./subscription.service');
      await subscriptionService.recalculateSeats(organizationId);
      
      // Store payment record
      await pool.execute(
        `INSERT INTO payments 
         (organization_id, stripe_payment_intent_id, amount, currency, status, type, description, created_at)
         VALUES (?, ?, ?, ?, ?, 'extra_seats', ?, NOW())`,
        [
          organizationId,
          session.payment_intent,
          session.amount_total / 100,
          session.currency.toUpperCase(),
          'completed',
          `Purchase of ${seatCount} extra seat${seatCount > 1 ? 's' : ''}`
        ]
      );
      
      console.log(`[PAYMENT] Extra seats purchased: ${seatCount} for org ${organizationId}`);
    }
  }
  
  /**
   * Handle successful payment
   * @param {Object} invoice
   */
  async handlePaymentSucceeded(invoice) {
    console.log(`[PAYMENT] Invoice payment succeeded: ${invoice.id}`);
    
    // Could send receipt email here
  }
  
  /**
   * Handle failed payment
   * @param {Object} invoice
   */
  async handlePaymentFailed(invoice) {
    console.log(`[PAYMENT] Invoice payment failed: ${invoice.id}`);
    
    // Could send notification to admin
  }
  
  /**
   * Handle subscription cancellation
   * @param {Object} subscription
   */
  async handleSubscriptionCancelled(subscription) {
    const organizationId = parseInt(subscription.metadata.organizationId);
    
    // Downgrade to free plan
    const subscriptionService = require('./subscription.service');
    await subscriptionService.changePlan(organizationId, 'free');
    
    console.log(`[PAYMENT] Subscription cancelled for org ${organizationId}`);
  }
  
  /**
   * Get payment history for organization (includes payments and subscription events)
   * @param {number} organizationId
   * @returns {Array} Payment history
   */
  async getPaymentHistory(organizationId) {
    // Get actual payments
    const [paymentRows] = await pool.execute(
      `SELECT * FROM payments 
       WHERE organization_id = ? 
       ORDER BY created_at DESC`,
      [organizationId]
    );
    
    // Get subscription history (plan changes, renewals)
    const [subRows] = await pool.execute(
      `SELECT os.*, sp.plan_name, sp.plan_code
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON os.plan_id = sp.id
       WHERE os.organization_id = ?
       ORDER BY os.created_at DESC
       LIMIT 10`,
      [organizationId]
    );
    
    // Convert payments
    const payments = paymentRows.map(payment => ({
      id: `pay_${payment.id}`,
      amount: parseFloat(payment.amount),
      currency: payment.currency || 'USD',
      status: payment.status,
      type: 'payment',
      description: payment.description || 'Payment',
      created_at: payment.created_at || payment.createdAt
    }));
    
    // Add subscription events (plan changes)
    const subEvents = subRows.map(sub => ({
      id: `sub_${sub.id}`,
      amount: 0.00,
      currency: 'USD',
      status: 'succeeded',
      type: 'subscription',
      description: sub.plan_code === 'free' 
        ? `Free plan activated` 
        : `${sub.plan_name} plan (${sub.billing_cycle || 'monthly'})`,
      created_at: sub.created_at
    }));
    
    // Combine and sort by date
    const allEvents = [...payments, ...subEvents];
    allEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return allEvents;
  }
}

module.exports = new PaymentService();
