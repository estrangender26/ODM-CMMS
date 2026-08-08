/**
 * Runtime environment validation.
 * Production secrets must be provided by the deployment environment, never files in Git.
 */

const PLACEHOLDER_PATTERN = /^(?:change[-_ ]?me|replace[-_ ]?with|your[-_ ]?|default[-_ ]?secret|example|password|secret|null|undefined)$/i;
const MIN_SECRET_LENGTH = 32;

const isPlaceholder = (value) => !value || PLACEHOLDER_PATTERN.test(value.trim());

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
  validateSecret('SESSION_SECRET', env.SESSION_SECRET);

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
