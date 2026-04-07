/**
 * API Key Routes
 * For Professional+ plans
 */

const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/api-key.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requireApiAccess, checkApiKeyLimit } = require('../middleware/feature-access.middleware');

router.use(authenticate);

/**
 * Get all API keys
 * GET /api/api-keys
 */
router.get('/',
  requireAdmin,
  requireApiAccess,
  apiKeyController.getApiKeys
);

/**
 * Create API key
 * POST /api/api-keys
 */
router.post('/',
  requireAdmin,
  requireApiAccess,
  checkApiKeyLimit,
  apiKeyController.createApiKey
);

/**
 * Update API key
 * PUT /api/api-keys/:id
 */
router.put('/:id',
  requireAdmin,
  requireApiAccess,
  apiKeyController.updateApiKey
);

/**
 * Delete API key
 * DELETE /api/api-keys/:id
 */
router.delete('/:id',
  requireAdmin,
  requireApiAccess,
  apiKeyController.deleteApiKey
);

/**
 * Get API usage statistics
 * GET /api/api-keys/stats/usage
 */
router.get('/stats/usage',
  requireAdmin,
  requireApiAccess,
  apiKeyController.getUsageStats
);

module.exports = router;
