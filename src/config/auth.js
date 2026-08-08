/**
 * Authentication Configuration
 */

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-only-jwt-secret-not-for-production-000000' : 'development-only-jwt-secret-not-for-production-000'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  bcrypt: {
    saltRounds: 10
  },
  cookie: {
    name: 'cmms_token',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }
};
