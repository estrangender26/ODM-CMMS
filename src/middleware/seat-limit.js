/**
 * Seat Limit Middleware
 * 
 * Validates seat availability before allowing user creation, invitation, or reactivation.
 */

const subscriptionService = require('../services/subscription.service');

/**
 * Check if organization has available seats for adding a new user
 */
const checkSeatAvailability = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    const canAdd = await subscriptionService.canAddUser(organizationId);
    
    if (!canAdd) {
      const usage = await subscriptionService.getSeatUsage(organizationId);
      
      return res.status(403).json({
        success: false,
        message: 'Seat limit reached',
        data: {
          activeUsers: usage.activeUsers,
          allowedUsers: usage.totalAllowedUsers,
          availableSeats: usage.availableSeats,
          upgradeRequired: true
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check seat availability for reactivating a suspended/archived user
 */
const checkSeatAvailabilityForReactivation = async (req, res, next) => {
  try {
    const { is_active, status } = req.body;
    const userId = req.params.id;
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    // Only check if trying to activate/reactivate
    if ((is_active === true) || (status === 'active')) {
      const { User } = require('../models');
      const user = await User.findById(userId);
      
      // Check if user is currently not active (suspended, archived, or invited)
      if (user && user.organization_id === organizationId && user.status !== 'active') {
        const canAdd = await subscriptionService.canAddUser(organizationId);
        
        if (!canAdd) {
          const usage = await subscriptionService.getSeatUsage(organizationId);
          
          return res.status(403).json({
            success: false,
            message: 'Cannot reactivate user: seat limit reached',
            data: {
              activeUsers: usage.activeUsers,
              allowedUsers: usage.totalAllowedUsers,
              availableSeats: usage.availableSeats,
              upgradeRequired: true
            }
          });
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Get current seat usage for the organization
 */
const getSeatUsage = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    const usage = await subscriptionService.getSeatUsage(organizationId);
    
    if (!usage) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    req.seatUsage = usage;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkSeatAvailability,
  checkSeatAvailabilityForReactivation,
  getSeatUsage
};
