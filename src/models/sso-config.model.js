/**
 * SSO Configuration Model
 * For Enterprise plans
 */

const { pool } = require('../config/database');

class SSOConfig {
  /**
   * Get SSO configuration for an organization
   */
  static async getForOrganization(organizationId) {
    const [rows] = await pool.execute(
      `SELECT sc.*, f.facility_name as default_facility_name
       FROM sso_configurations sc
       LEFT JOIN facilities f ON sc.default_facility_id = f.id
       WHERE sc.organization_id = ?`,
      [organizationId]
    );
    return rows[0] ? this.formatConfig(rows[0]) : null;
  }

  /**
   * Get SSO configuration by ID
   */
  static async getById(id) {
    const [rows] = await pool.execute(
      `SELECT sc.*, f.facility_name as default_facility_name
       FROM sso_configurations sc
       LEFT JOIN facilities f ON sc.default_facility_id = f.id
       WHERE sc.id = ?`,
      [id]
    );
    return rows[0] ? this.formatConfig(rows[0]) : null;
  }

  /**
   * Create SSO configuration
   */
  static async create(data) {
    const {
      organization_id,
      provider_type,
      provider_name,
      saml_entity_id,
      saml_idp_sso_url,
      saml_idp_slo_url,
      saml_idp_certificate,
      saml_sp_entity_id,
      saml_sp_acs_url,
      saml_name_id_format,
      oidc_client_id,
      oidc_client_secret,
      oidc_authorization_endpoint,
      oidc_token_endpoint,
      oidc_userinfo_endpoint,
      oidc_jwks_uri,
      oidc_scopes,
      email_attribute,
      first_name_attribute,
      last_name_attribute,
      groups_attribute,
      role_attribute,
      require_signed_assertions,
      require_encrypted_assertions,
      signature_algorithm,
      auto_provision_users,
      default_role,
      default_facility_id,
      session_duration_minutes,
      enforce_sso_only
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO sso_configurations 
       (organization_id, provider_type, provider_name,
        saml_entity_id, saml_idp_sso_url, saml_idp_slo_url, saml_idp_certificate,
        saml_sp_entity_id, saml_sp_acs_url, saml_name_id_format,
        oidc_client_id, oidc_client_secret, oidc_authorization_endpoint,
        oidc_token_endpoint, oidc_userinfo_endpoint, oidc_jwks_uri, oidc_scopes,
        email_attribute, first_name_attribute, last_name_attribute,
        groups_attribute, role_attribute, require_signed_assertions,
        require_encrypted_assertions, signature_algorithm, auto_provision_users,
        default_role, default_facility_id, session_duration_minutes, enforce_sso_only)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id, provider_type, provider_name,
        saml_entity_id, saml_idp_sso_url, saml_idp_slo_url, saml_idp_certificate,
        saml_sp_entity_id, saml_sp_acs_url, saml_name_id_format,
        oidc_client_id, oidc_client_secret, oidc_authorization_endpoint,
        oidc_token_endpoint, oidc_userinfo_endpoint, oidc_jwks_uri, oidc_scopes,
        email_attribute, first_name_attribute, last_name_attribute,
        groups_attribute, role_attribute, require_signed_assertions,
        require_encrypted_assertions, signature_algorithm, auto_provision_users,
        default_role, default_facility_id, session_duration_minutes, enforce_sso_only
      ]
    );

    return this.getById(result.insertId);
  }

  /**
   * Update SSO configuration
   */
  static async update(id, data) {
    const allowedFields = [
      'provider_name', 'saml_entity_id', 'saml_idp_sso_url', 'saml_idp_slo_url',
      'saml_idp_certificate', 'saml_sp_entity_id', 'saml_sp_acs_url',
      'saml_name_id_format', 'oidc_client_id', 'oidc_client_secret',
      'oidc_authorization_endpoint', 'oidc_token_endpoint', 'oidc_userinfo_endpoint',
      'oidc_jwks_uri', 'oidc_scopes', 'email_attribute', 'first_name_attribute',
      'last_name_attribute', 'groups_attribute', 'role_attribute',
      'require_signed_assertions', 'require_encrypted_assertions',
      'signature_algorithm', 'auto_provision_users', 'default_role',
      'default_facility_id', 'session_duration_minutes', 'enforce_sso_only',
      'is_enabled', 'is_configured', 'last_tested_at', 'last_test_result'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'last_test_result' && data[field]) {
          updates.push(`${field} = ?`);
          values.push(JSON.stringify(data[field]));
        } else {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      }
    }

    if (updates.length === 0) return null;

    values.push(id);

    await pool.execute(
      `UPDATE sso_configurations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  /**
   * Delete SSO configuration
   */
  static async delete(id) {
    await pool.execute('DELETE FROM sso_configurations WHERE id = ?', [id]);
    return true;
  }

  /**
   * Get or create SSO configuration
   */
  static async getOrCreate(organizationId, defaults = {}) {
    let config = await this.getForOrganization(organizationId);
    
    if (!config) {
      config = await this.create({
        organization_id: organizationId,
        provider_type: defaults.provider_type || 'saml',
        provider_name: defaults.provider_name || 'SSO Provider',
        ...defaults
      });
    }

    return config;
  }

  /**
   * Create SSO user mapping
   */
  static async createUserMapping(data) {
    const {
      organization_id,
      user_id,
      external_user_id,
      external_email,
      provider_type
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO sso_user_mappings 
       (organization_id, user_id, external_user_id, external_email, provider_type)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       external_email = VALUES(external_email),
       updated_at = NOW()`,
      [organization_id, user_id, external_user_id, external_email, provider_type]
    );

    return result.insertId || result.insertId === 0;
  }

  /**
   * Get user by external ID
   */
  static async getUserByExternalId(organizationId, externalUserId) {
    const [rows] = await pool.execute(
      `SELECT u.*, sum.external_user_id, sum.external_email, sum.last_login_at
       FROM sso_user_mappings sum
       JOIN users u ON sum.user_id = u.id
       WHERE sum.organization_id = ? AND sum.external_user_id = ?`,
      [organizationId, externalUserId]
    );
    return rows[0];
  }

  /**
   * Update last login for SSO mapping
   */
  static async updateUserMappingLogin(organizationId, externalUserId) {
    await pool.execute(
      `UPDATE sso_user_mappings 
       SET last_login_at = NOW(), login_count = login_count + 1
       WHERE organization_id = ? AND external_user_id = ?`,
      [organizationId, externalUserId]
    );
  }

  /**
   * Create SSO session
   */
  static async createSession(data) {
    const {
      organization_id,
      user_id,
      sso_config_id,
      session_token,
      idp_session_id,
      ip_address,
      user_agent,
      expires_at
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO sso_sessions 
       (organization_id, user_id, sso_config_id, session_token, 
        idp_session_id, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [organization_id, user_id, sso_config_id, session_token,
       idp_session_id, ip_address, user_agent, expires_at]
    );

    return result.insertId;
  }

  /**
   * Get valid session
   */
  static async getValidSession(sessionToken) {
    const [rows] = await pool.execute(
      `SELECT ss.*, sc.provider_type, sc.provider_name
       FROM sso_sessions ss
       JOIN sso_configurations sc ON ss.sso_config_id = sc.id
       WHERE ss.session_token = ? AND ss.expires_at > NOW() AND ss.ended_at IS NULL`,
      [sessionToken]
    );
    return rows[0];
  }

  /**
   * End session
   */
  static async endSession(sessionToken, reason = 'logout') {
    await pool.execute(
      `UPDATE sso_sessions 
       SET ended_at = NOW(), ended_reason = ?
       WHERE session_token = ? AND ended_at IS NULL`,
      [reason, sessionToken]
    );
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    await pool.execute(
      `UPDATE sso_sessions 
       SET ended_at = NOW(), ended_reason = 'timeout'
       WHERE expires_at < NOW() AND ended_at IS NULL`
    );
  }

  /**
   * Get SSO statistics
   */
  static async getStats(organizationId) {
    const [mappings] = await pool.execute(
      `SELECT COUNT(*) as total_users,
              COUNT(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_users_30d
       FROM sso_user_mappings
       WHERE organization_id = ?`,
      [organizationId]
    );

    const [sessions] = await pool.execute(
      `SELECT COUNT(*) as active_sessions
       FROM sso_sessions
       WHERE organization_id = ? AND expires_at > NOW() AND ended_at IS NULL`,
      [organizationId]
    );

    const [logins] = await pool.execute(
      `SELECT DATE(last_login_at) as date, COUNT(*) as count
       FROM sso_user_mappings
       WHERE organization_id = ? AND last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(last_login_at)
       ORDER BY date`,
      [organizationId]
    );

    return {
      total_sso_users: mappings[0].total_users,
      active_users_30d: mappings[0].active_users_30d,
      active_sessions: sessions[0].active_sessions,
      login_trend: logins
    };
  }

  // Helper method to format configuration
  static formatConfig(row) {
    return {
      id: row.id,
      organization_id: row.organization_id,
      provider_type: row.provider_type,
      provider_name: row.provider_name,
      
      // SAML settings
      saml: {
        entity_id: row.saml_entity_id,
        idp_sso_url: row.saml_idp_sso_url,
        idp_slo_url: row.saml_idp_slo_url,
        idp_certificate: row.saml_idp_certificate ? '[REDACTED]' : null,
        sp_entity_id: row.saml_sp_entity_id,
        sp_acs_url: row.saml_sp_acs_url,
        name_id_format: row.saml_name_id_format
      },
      
      // OIDC settings
      oidc: {
        client_id: row.oidc_client_id,
        client_secret: row.oidc_client_secret ? '[REDACTED]' : null,
        authorization_endpoint: row.oidc_authorization_endpoint,
        token_endpoint: row.oidc_token_endpoint,
        userinfo_endpoint: row.oidc_userinfo_endpoint,
        jwks_uri: row.oidc_jwks_uri,
        scopes: row.oidc_scopes
      },
      
      // Attribute mapping
      attribute_mapping: {
        email: row.email_attribute,
        first_name: row.first_name_attribute,
        last_name: row.last_name_attribute,
        groups: row.groups_attribute,
        role: row.role_attribute
      },
      
      // Security settings
      security: {
        require_signed_assertions: row.require_signed_assertions === 1,
        require_encrypted_assertions: row.require_encrypted_assertions === 1,
        signature_algorithm: row.signature_algorithm
      },
      
      // Provisioning
      provisioning: {
        auto_provision_users: row.auto_provision_users === 1,
        default_role: row.default_role,
        default_facility_id: row.default_facility_id,
        default_facility_name: row.default_facility_name
      },
      
      // Session settings
      session: {
        duration_minutes: row.session_duration_minutes,
        enforce_sso_only: row.enforce_sso_only === 1
      },
      
      // Status
      is_enabled: row.is_enabled === 1,
      is_configured: row.is_configured === 1,
      last_tested_at: row.last_tested_at,
      last_test_result: row.last_test_result ? JSON.parse(row.last_test_result) : null,
      
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

module.exports = SSOConfig;
