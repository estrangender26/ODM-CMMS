/**
 * SSO Controller
 * For Enterprise plans
 */

const { SSOConfig } = require('../models');

/**
 * Get SSO configuration for organization
 */
const getConfig = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const config = await SSOConfig.getForOrganization(organizationId);
    
    if (!config) {
      return res.json({
        success: true,
        data: { configuration: null, message: 'SSO not configured' }
      });
    }
    
    res.json({
      success: true,
      data: { configuration: config }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update SSO configuration
 */
const saveConfig = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const {
      provider_type,
      provider_name,
      saml,
      oidc,
      attribute_mapping,
      security,
      provisioning,
      session
    } = req.body;
    
    // Validate required fields
    if (!provider_type || !provider_name) {
      return res.status(400).json({
        success: false,
        message: 'provider_type and provider_name are required'
      });
    }
    
    // Check if config exists
    const existing = await SSOConfig.getForOrganization(organizationId);
    
    const configData = {
      provider_type,
      provider_name,
      
      // SAML
      saml_entity_id: saml?.entity_id,
      saml_idp_sso_url: saml?.idp_sso_url,
      saml_idp_slo_url: saml?.idp_slo_url,
      saml_idp_certificate: saml?.idp_certificate,
      saml_sp_entity_id: saml?.sp_entity_id,
      saml_sp_acs_url: saml?.sp_acs_url,
      saml_name_id_format: saml?.name_id_format,
      
      // OIDC
      oidc_client_id: oidc?.client_id,
      oidc_client_secret: oidc?.client_secret,
      oidc_authorization_endpoint: oidc?.authorization_endpoint,
      oidc_token_endpoint: oidc?.token_endpoint,
      oidc_userinfo_endpoint: oidc?.userinfo_endpoint,
      oidc_jwks_uri: oidc?.jwks_uri,
      oidc_scopes: oidc?.scopes,
      
      // Attribute mapping
      email_attribute: attribute_mapping?.email,
      first_name_attribute: attribute_mapping?.first_name,
      last_name_attribute: attribute_mapping?.last_name,
      groups_attribute: attribute_mapping?.groups,
      role_attribute: attribute_mapping?.role,
      
      // Security
      require_signed_assertions: security?.require_signed_assertions,
      require_encrypted_assertions: security?.require_encrypted_assertions,
      signature_algorithm: security?.signature_algorithm,
      
      // Provisioning
      auto_provision_users: provisioning?.auto_provision_users,
      default_role: provisioning?.default_role,
      default_facility_id: provisioning?.default_facility_id,
      
      // Session
      session_duration_minutes: session?.duration_minutes,
      enforce_sso_only: session?.enforce_sso_only,
      
      is_configured: true
    };
    
    let config;
    if (existing) {
      config = await SSOConfig.update(existing.id, configData);
    } else {
      config = await SSOConfig.create({
        organization_id: organizationId,
        ...configData
      });
    }
    
    res.json({
      success: true,
      message: 'SSO configuration saved successfully',
      data: { configuration: config }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enable/disable SSO
 */
const toggleSSO = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { enabled } = req.body;
    
    const config = await SSOConfig.getForOrganization(organizationId);
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'SSO not configured yet'
      });
    }
    
    const updated = await SSOConfig.update(config.id, {
      is_enabled: enabled
    });
    
    res.json({
      success: true,
      message: `SSO ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: { configuration: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete SSO configuration
 */
const deleteConfig = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const config = await SSOConfig.getForOrganization(organizationId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'SSO configuration not found'
      });
    }
    
    await SSOConfig.delete(config.id);
    
    res.json({
      success: true,
      message: 'SSO configuration deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SSO metadata (for SAML IdP)
 */
const getMetadata = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId;
    
    const config = await SSOConfig.getForOrganization(organizationId);
    
    if (!config || !config.is_enabled) {
      return res.status(404).json({
        success: false,
        message: 'SSO not configured or not enabled'
      });
    }
    
    // Generate SAML Service Provider metadata XML
    const metadata = generateSAMLMetadata(config);
    
    res.setHeader('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate SSO login
 */
const initiateLogin = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    
    const config = await SSOConfig.getForOrganization(organizationId);
    
    if (!config || !config.is_enabled) {
      return res.status(400).json({
        success: false,
        message: 'SSO not enabled for this organization'
      });
    }
    
    // Generate SAML AuthnRequest or OIDC authorize URL
    if (config.provider_type === 'saml') {
      const authUrl = generateSAMLAuthRequest(config);
      res.json({
        success: true,
        data: {
          redirect_url: authUrl
        }
      });
    } else {
      // OIDC
      const authUrl = generateOIDCAuthUrl(config);
      res.json({
        success: true,
        data: {
          redirect_url: authUrl
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Handle SSO callback (SAML ACS or OIDC callback)
 */
const handleCallback = async (req, res, next) => {
  try {
    // This would handle the SAML Response or OIDC token exchange
    // For now, return a placeholder response
    res.json({
      success: false,
      message: 'SSO callback handling not yet implemented'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SSO users
 */
const getUsers = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { pool } = require('../config/database');
    
    const [rows] = await pool.execute(
      `SELECT sum.*, u.username, u.email, u.full_name, u.is_active
       FROM sso_user_mappings sum
       JOIN users u ON sum.user_id = u.id
       WHERE sum.organization_id = ?
       ORDER BY sum.last_login_at DESC`,
      [organizationId]
    );
    
    res.json({
      success: true,
      data: { users: rows }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unlink SSO user
 */
const unlinkUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const organizationId = req.user.organization_id;
    const { pool } = require('../config/database');
    
    // Verify user belongs to organization
    const { User } = require('../models');
    const user = await User.findById(userId);
    
    if (!user || user.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete SSO mapping
    await pool.execute(
      'DELETE FROM sso_user_mappings WHERE organization_id = ? AND user_id = ?',
      [organizationId, userId]
    );
    
    // Update user record
    await pool.execute(
      "UPDATE users SET is_sso_user = FALSE, sso_provider = NULL WHERE id = ?",
      [userId]
    );
    
    res.json({
      success: true,
      message: 'SSO user unlinked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SSO statistics
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const stats = await SSOConfig.getStats(organizationId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test SSO configuration
 */
const testConfig = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const config = await SSOConfig.getForOrganization(organizationId);
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'SSO not configured'
      });
    }
    
    // Perform basic connectivity test
    const testResult = await testSSOConnection(config);
    
    // Update last test result
    await SSOConfig.update(config.id, {
      last_tested_at: new Date(),
      last_test_result: testResult
    });
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      data: { test_result: testResult }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function generateSAMLMetadata(config) {
  // Generate SAML 2.0 Service Provider metadata XML
  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${config.saml.sp_entity_id}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>${config.saml.name_id_format}</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${config.saml.sp_acs_url}" index="0"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

function generateSAMLAuthRequest(config) {
  // Return the IdP SSO URL - actual SAML request generation would require a library
  return config.saml.idp_sso_url;
}

function generateOIDCAuthUrl(config) {
  const params = new URLSearchParams({
    client_id: config.oidc.client_id,
    response_type: 'code',
    scope: config.oidc.scopes,
    redirect_uri: config.oidc.redirect_uri || '',
    state: generateRandomState()
  });
  
  return `${config.oidc.authorization_endpoint}?${params.toString()}`;
}

function generateRandomState() {
  return Math.random().toString(36).substring(2, 15);
}

async function testSSOConnection(config) {
  // Placeholder for actual connection test
  // Would test IdP connectivity, certificate validity, etc.
  
  if (config.provider_type === 'saml') {
    if (!config.saml.idp_sso_url || !config.saml.idp_certificate) {
      return {
        success: false,
        message: 'SAML configuration incomplete - missing IdP URL or certificate'
      };
    }
  } else {
    if (!config.oidc.client_id || !config.oidc.authorization_endpoint) {
      return {
        success: false,
        message: 'OIDC configuration incomplete - missing client ID or authorization endpoint'
      };
    }
  }
  
  return {
    success: true,
    message: 'Configuration appears valid (connectivity test not implemented)'
  };
}

module.exports = {
  getConfig,
  saveConfig,
  toggleSSO,
  deleteConfig,
  getMetadata,
  initiateLogin,
  handleCallback,
  getUsers,
  unlinkUser,
  getStats,
  testConfig
};
