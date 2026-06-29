// ============================================================================
// validation.js — tiny, dependency-free field validators
//
// Each validator returns an error string (truthy) or '' (valid). Compose with
// `validate(value, [required(), email()])` which returns the first error.
// Used by the <Field> primitive and form submit handlers.
// ============================================================================

export const required = (label = 'This field') => (v) =>
  v === null || v === undefined || String(v).trim() === ''
    ? `${label} is required.`
    : '';

export const email = () => (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())
    ? ''
    : 'Enter a valid email address.';

export const number = (label = 'Value') => (v) =>
  v === '' || v === null || v === undefined || !isNaN(Number(v))
    ? ''
    : `${label} must be a number.`;

export const positive = (label = 'Value') => (v) =>
  v === '' || v === null || v === undefined || Number(v) > 0
    ? ''
    : `${label} must be greater than zero.`;

export const minLen = (n, label = 'This field') => (v) =>
  !v || String(v).length >= n ? '' : `${label} must be at least ${n} characters.`;

/** Run a value through validators, returning the first error or ''. */
export const validate = (value, validators = []) => {
  for (const fn of validators) {
    const err = fn(value);
    if (err) return err;
  }
  return '';
};

/**
 * Validate a whole form. `spec` maps field name → validators array.
 * Returns { ok: boolean, errors: { field: msg } }.
 */
export const validateForm = (values = {}, spec = {}) => {
  const errors = {};
  for (const [field, validators] of Object.entries(spec)) {
    const err = validate(values[field], validators);
    if (err) errors[field] = err;
  }
  return { ok: Object.keys(errors).length === 0, errors };
};
