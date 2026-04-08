/**
 * Email Service
 * Handles sending emails for invitations, notifications, etc.
 * 
 * In development: logs to console
 * In production: configure with SMTP, SendGrid, Mailgun, etc.
 */

class EmailService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@odm-cmms.com';
    this.appUrl = process.env.APP_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`;
  }

  /**
   * Send invitation email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.organizationName - Organization name
   * @param {string} options.role - Role being invited for
   * @param {string} options.token - Invitation token
   * @param {string} options.invitedBy - Name of person who sent invitation
   */
  async sendInvitation({ to, organizationName, role, token, invitedBy }) {
    const signupUrl = `${this.appUrl}/signup?token=${token}`;
    
    const subject = `You've been invited to join ${organizationName} on ODM-CMMS`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">You're Invited!</h2>
        <p>Hello,</p>
        <p><strong>${invitedBy}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong> on ODM-CMMS.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What is ODM-CMMS?</h3>
          <p>Operator-Driven Maintenance Computerized Maintenance Management System - A mobile-first maintenance platform for managing equipment, inspections, and work orders.</p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${signupUrl}" 
             style="background: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Accept Invitation & Create Account
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link:<br>
          <code style="background: #f5f5f5; padding: 8px; display: block; word-break: break-all;">${signupUrl}</code>
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    const text = `
You've been invited to join ${organizationName} on ODM-CMMS!

${invitedBy} has invited you to join as a ${role}.

Click the link below to accept the invitation and create your account:
${signupUrl}

This invitation expires in 7 days.
    `;

    return this.send({ to, subject, html, text });
  }

  /**
   * Send generic email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content
   */
  async send({ to, subject, html, text }) {
    // In development, just log to console
    if (this.isDevelopment) {
      console.log('\n========================================');
      console.log('📧 EMAIL WOULD BE SENT (Development Mode)');
      console.log('========================================');
      console.log('To:', to);
      console.log('From:', this.fromEmail);
      console.log('Subject:', subject);
      console.log('\nText Body:\n', text);
      console.log('========================================\n');
      
      return { 
        success: true, 
        message: 'Email logged to console (development mode)',
        to,
        subject
      };
    }

    // TODO: Configure production email provider
    // Options:
    // 1. SMTP (nodemailer)
    // 2. SendGrid
    // 3. Mailgun
    // 4. AWS SES
    
    // Example with nodemailer (when configured):
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS
    //   }
    // });
    // return transporter.sendMail({ from: this.fromEmail, to, subject, html, text });

    console.warn('Email service not configured for production');
    return { success: false, message: 'Email service not configured' };
  }
}

module.exports = new EmailService();
