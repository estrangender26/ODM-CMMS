/**
 * SSO Routes
 * For Enterprise plans
 */

const express = require('express');
const router = express.Router();
const ssoController = require('../controllers/sso.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requireFeature, checkSSOLimit } = require('../middleware/feature-access.middleware');

// Public routes (no authentication required)

/**
 * Get SSO metadata for SAML IdP
 * GET /api/sso/metadata/:organizationId
 */
router.get('/metadata/:organizationId', ssoController.getMetadata);

/**
 * Initiate SSO login
 * GET /api/sso/login/:organizationId
 */
router.get('/login/:organizationId', ssoController.initiateLogin);

/**
 * Handle SSO callback (SAML ACS or OIDC callback)
 * POST /api/sso/callback
 */
router.post('/callback', ssoController.handleCallback);

// Protected routes (authentication required)
router.use(authenticate);

/**
 * Get SSO configuration
 * GET /api/sso/config
 */
router.get('/config',
  requireAdmin,
  requireFeature('sso'),
  ssoController.getConfig
);

/**
 * Save SSO configuration
 * POST /api/sso/config
 */
router.post('/config',
  requireAdmin,
  requireFeature('sso'),
  checkSSOLimit,
  ssoController.saveConfig
);

/**
 * Enable/disable SSO
 * PUT /api/sso/config/toggle
 */
router.put('/config/toggle',
  requireAdmin,
  requireFeature('sso'),
  ssoController.toggleSSO
);

/**
 * Delete SSO configuration
 * DELETE /api/sso/config
 */
router.delete('/config',
  requireAdmin,
  requireFeature('sso'),
  ssoController.deleteConfig
);

/**
 * Test SSO configuration
 * POST /api/sso/config/test
 */
router.post('/config/test',
  requireAdmin,
  requireFeature('sso'),
  ssoController.testConfig
);

/**
 * Get SSO users
 * GET /api/sso/users
 */
router.get('/users',
  requireAdmin,
  requireFeature('sso'),
  ssoController.getUsers
);

/**
 * Unlink SSO user
 * DELETE /api/sso/users/:userId
 */
router.delete('/users/:userId',
  requireAdmin,
  requireFeature('sso'),
  ssoController.unlinkUser
);

/**
 * Get SSO statistics
 * GET /api/sso/stats
 */
router.get('/stats',
  requireAdmin,
  requireFeature('sso'),
  ssoController.getStats
);

module.exports = router;
