/**
 * Runtime environment validation.
 * Production secrets must be provided by the deployment environment, never files in Git.
 */

const MIN_SECRET_LENGTH = 32;
const EXACT_PLACEHOLDERS = new Set([
  'replace-with-a-long-random-secret',
  'replace-with-a-secret',
  'your-super-secret-jwt-key-change-this-in-production',
  'your-session-secret-change-this-in-production',
  'your_password_here',
  'password',
  'secret',
  'null',
  'undefined'
]);
const PLACEHOLDER_PATTERNS = [
  /^replace-with-/i,
  /^(?:change-me|changeme)(?:[-_].*)?$/i,
  /^your[-_]/i,
  /^(?:example|placeholder)(?:[-_].*)?$/i,
  /^default-secret(?:[-_].*)?$/i
];

const isPlaceholder = (value) => {
  if (!value || !value.trim()) return true;
  const normalized = value.trim().toLowerCase();
  return EXACT_PLACEHOLDERS.has(normalized) || PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
};

const validateSecret = (name, value) => {
  if (isPlaceholder(value)) {
    throw new Error(`Invalid production configuration: ${name} must be set to a non-placeholder secret.`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`Invalid production configuration: ${name} must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
};

const validateProductionConfig = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return;

  validateSecret('JWT_SECRET', env.JWT_SECRET);

  if (isPlaceholder(env.DB_PASSWORD)) {
    throw new Error('Invalid production configuration: DB_PASSWORD must be set to a non-placeholder value.');
  }

  // Stripe is optional. Validate it only when the integration is configured.
  if (env.STRIPE_SECRET_KEY) {
    validateSecret('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY);
  }
};

module.exports = {
  MIN_SECRET_LENGTH,
  isPlaceholder,
  validateProductionConfig
};
