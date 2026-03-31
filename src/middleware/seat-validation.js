/**
 * Seat Validation Middleware
 * Enforces subscription seat limits for user creation/activation
 */

const { OrganizationSubscription } = require('../models');

/**
 * Validate available seats before creating/inviting a user
 * Use this middleware on routes that create or invite users
 */
const validateAvailableSeats = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    // Check subscription status
    const subscription = await OrganizationSubscription.getWithPlan(organizationId);
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found for this organization',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Check if subscription is active or in trial
    if (!['active', 'trial'].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        message: `Subscription is ${subscription.status}. Cannot add users.`,
        code: 'SUBSCRIPTION_INACTIVE',
        subscription_status: subscription.status
      });
    }

    // Refresh seat count
    await OrganizationSubscription.updateSeatUsage(organizationId);
    
    // Check if the new user would be billable
    const isNewUserBillable = req.body.is_billable !== false && req.body.status !== 'archived';
    
    if (!isNewUserBillable) {
      // Non-billable users don't count against seats
      return next();
    }

    // Check seat availability
    const seatCheck = await OrganizationSubscription.hasAvailableSeats(organizationId, 1);
    
    if (!seatCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Seat limit reached. Please upgrade your subscription to add more users.',
        code: 'SEAT_LIMIT_REACHED',
        seats_available: seatCheck.seatsAvailable,
        seats_used: seatCheck.currentUsage,
        total_seats: seatCheck.totalSeats,
        can_upgrade: true,
        upgrade_options: {
          add_seats: true,
          upgrade_plan: true
        }
      });
    }

    // Attach seat info to request for use in controller
    req.seatInfo = seatCheck;
    next();
    
  } catch (error) {
    console.error('[SEAT VALIDATION] Error:', error);
    next(error);
  }
};

/**
 * Validate multiple seats (for bulk invitations)
 */
const validateMultipleSeats = (requestedCount) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      const subscription = await OrganizationSubscription.getWithPlan(organizationId);
      
      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found',
          code: 'NO_SUBSCRIPTION'
        });
      }

      if (!['active', 'trial'].includes(subscription.status)) {
        return res.status(403).json({
          success: false,
          message: `Subscription is ${subscription.status}`,
          code: 'SUBSCRIPTION_INACTIVE'
        });
      }

      await OrganizationSubscription.updateSeatUsage(organizationId);
      
      const seatCheck = await OrganizationSubscription.hasAvailableSeats(organizationId, requestedCount);
      
      if (!seatCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: `Not enough seats available. You need ${requestedCount} seats but only have ${seatCheck.seatsAvailable} available.`,
          code: 'INSUFFICIENT_SEATS',
          seats_available: seatCheck.seatsAvailable,
          seats_needed: requestedCount,
          seats_used: seatCheck.currentUsage,
          total_seats: seatCheck.totalSeats
        });
      }

      req.seatInfo = seatCheck;
      next();
      
    } catch (error) {
      console.error('[SEAT VALIDATION] Error:', error);
      next(error);
    }
  };
};

/**
 * Validate reactivation of suspended/archived user
 */
const validateReactivation = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    const userId = req.params.id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    // Get the user being reactivated
    const { User } = require('../models');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user belongs to the same organization
    if (user.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'User does not belong to your organization'
      });
    }

    // If user is not billable, no seat check needed
    if (!user.is_billable) {
      return next();
    }

    // If user is already active/invited, no additional seat needed
    if (['active', 'invited'].includes(user.status)) {
      return next();
    }

    // User is suspended/archived and billable - need to check seats
    const subscription = await OrganizationSubscription.getWithPlan(organizationId);
    
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        message: 'Subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    await OrganizationSubscription.updateSeatUsage(organizationId);
    
    const seatCheck = await OrganizationSubscription.hasAvailableSeats(organizationId, 1);
    
    if (!seatCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reactivate user. Seat limit reached.',
        code: 'SEAT_LIMIT_REACHED',
        seats_available: seatCheck.seatsAvailable
      });
    }

    next();
    
  } catch (error) {
    console.error('[SEAT VALIDATION] Error:', error);
    next(error);
  }
};

/**
 * Check if organization needs seat upgrade
 * Returns warning if seats are running low
 */
const checkSeatUsage = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return next();
    }

    const subscription = await OrganizationSubscription.getWithPlan(organizationId);
    
    if (!subscription || subscription.max_users === null) {
      return next(); // Unlimited plan
    }

    const totalSeats = subscription.included_users + subscription.extra_users;
    const seatsUsed = subscription.seats_used || 0;
    const usagePercentage = (seatsUsed / totalSeats) * 100;

    // Attach warning if usage is high
    if (usagePercentage >= 90) {
      req.seatWarning = {
        level: 'critical',
        message: `You are using ${Math.round(usagePercentage)}% of your available seats.`,
        seats_available: totalSeats - seatsUsed,
        total_seats: totalSeats,
        usage_percentage: usagePercentage
      };
    } else if (usagePercentage >= 75) {
      req.seatWarning = {
        level: 'warning',
        message: `You are using ${Math.round(usagePercentage)}% of your available seats.`,
        seats_available: totalSeats - seatsUsed,
        total_seats: totalSeats,
        usage_percentage: usagePercentage
      };
    }

    next();
    
  } catch (error) {
    // Don't block request on warning check failure
    next();
  }
};

module.exports = {
  validateAvailableSeats,
  validateMultipleSeats,
  validateReactivation,
  checkSeatUsage
};
