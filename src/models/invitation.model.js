/**
 * Invitation Model
 * Manages organization invitations for users
 */

const BaseModel = require('./base.model');
const crypto = require('crypto');

class InvitationModel extends BaseModel {
  constructor() {
    super('invitations');
  }

  /**
   * Generate a unique invitation token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new invitation
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createInvitation(data) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitationData = {
      organization_id: data.organization_id,
      email: data.email.toLowerCase(),
      role: data.role || 'operator',
      invited_by: data.invited_by,
      token,
      status: 'pending',
      expires_at: expiresAt
    };

    const result = await this.create(invitationData);
    return { ...invitationData, id: result.id };
  }

  /**
   * Find invitation by token
   * @param {string} token
   * @returns {Promise<Object|null>}
   */
  async findByToken(token) {
    const sql = `
      SELECT i.*, 
        o.organization_name,
        u.full_name as invited_by_name,
        u.email as invited_by_email
      FROM ${this.tableName} i
      JOIN organizations o ON i.organization_id = o.id
      JOIN users u ON i.invited_by = u.id
      WHERE i.token = ? AND i.status = 'pending' AND i.expires_at > NOW()
    `;
    const [row] = await this.query(sql, [token]);
    return row || null;
  }

  /**
   * Find pending invitations by email
   * @param {string} email
   * @returns {Promise<Array>}
   */
  async findByEmail(email) {
    const sql = `
      SELECT i.*, o.organization_name
      FROM ${this.tableName} i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.email = ? AND i.status = 'pending' AND i.expires_at > NOW()
      ORDER BY i.created_at DESC
    `;
    return this.query(sql, [email.toLowerCase()]);
  }

  /**
   * Get all invitations for an organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getByOrganization(organizationId, filters = {}) {
    let sql = `
      SELECT i.*, 
        u.full_name as invited_by_name,
        u.email as invited_by_email,
        au.username as accepted_by_username
      FROM ${this.tableName} i
      JOIN users u ON i.invited_by = u.id
      LEFT JOIN users au ON i.accepted_by_user_id = au.id
      WHERE i.organization_id = ?
    `;
    const params = [organizationId];

    if (filters.status) {
      sql += ' AND i.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY i.created_at DESC';
    return this.query(sql, params);
  }

  /**
   * Accept an invitation
   * @param {number} invitationId
   * @param {number} userId
   */
  async accept(invitationId, userId) {
    return this.update(invitationId, {
      status: 'accepted',
      accepted_at: new Date(),
      accepted_by_user_id: userId
    });
  }

  /**
   * Cancel an invitation
   * @param {number} invitationId
   */
  async cancel(invitationId) {
    return this.update(invitationId, {
      status: 'cancelled'
    });
  }

  /**
   * Expire old pending invitations
   */
  async expireOldInvitations() {
    const sql = `
      UPDATE ${this.tableName} 
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at <= NOW()
    `;
    return this.query(sql);
  }

  /**
   * Check if email has pending invitation for organization
   * @param {string} email
   * @param {number} organizationId
   */
  async hasPendingInvitation(email, organizationId) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE email = ? AND organization_id = ? AND status = 'pending' AND expires_at > NOW()
    `;
    const [result] = await this.query(sql, [email.toLowerCase(), organizationId]);
    return result.count > 0;
  }

  /**
   * Get invitation statistics for organization
   * @param {number} organizationId
   */
  async getStats(organizationId) {
    const sql = `
      SELECT 
        COUNT(CASE WHEN status = 'pending' AND expires_at > NOW() THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status = 'expired' OR (status = 'pending' AND expires_at <= NOW()) THEN 1 END) as expired_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(*) as total_count
      FROM ${this.tableName}
      WHERE organization_id = ?
    `;
    const [result] = await this.query(sql, [organizationId]);
    return result;
  }
}

module.exports = new InvitationModel();
