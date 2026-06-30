// ============================================================================
// caseConvert.js — top-level key case conversion between JS (camelCase) and
// Postgres/Supabase (snake_case). Pure, dependency-free, unit-tested.
// ============================================================================

/** camelCase → snake_case (single key) */
export const camelToSnake = (key) =>
  key.replace(/([A-Z])/g, '_$1').toLowerCase();

/** snake_case → camelCase (single key) */
export const snakeToCamel = (key) =>
  key.replace(/(_[a-z])/g, (m) => m[1].toUpperCase());

/** Convert a plain object's top-level keys camelCase → snake_case. */
export const toSnake = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
};

/** Convert a plain object's top-level keys snake_case → camelCase. */
export const toCamel = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
};
