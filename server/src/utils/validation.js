/**
 * Validate user registration input.
 *
 * @param {Object} input
 * @param {string} input.email    - User's email address
 * @param {string} input.password - User's chosen password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRegistration({ email, password }) {
  const errors = [];

  // --- Email checks ---
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errors.push('Email must be a valid email address');
    } else if (trimmed.length > 255) {
      errors.push('Email must be 255 characters or fewer');
    }
  }

  // --- Password checks ---
  errors.push(...validatePassword(password));

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check a password against the HeyCiti password rules.
 * Used by registration and by password reset so both follow the same rules.
 *
 * @param {string} password
 * @returns {string[]} A list of problems, empty when the password is fine.
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
      errors.push('Password must be 128 characters or fewer');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  return errors;
}
