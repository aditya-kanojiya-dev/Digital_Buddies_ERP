// ============================================================================
// logger.js — environment-aware logging
// ============================================================================
// `error` always logs (production crashes must be diagnosable).
// `warn` / `info` / `debug` are silenced in production builds so we don't leak
// session objects, ids, or noisy diagnostics to end-users' consoles.
//
// Toggle: import.meta.env.PROD is true only in `vite build` output.
// ============================================================================

/* eslint-disable no-console -- this module is the single sanctioned console wrapper */

const isDev = import.meta.env.DEV;

export const logger = {
  error: (...args) => console.error(...args),
  warn:  (...args) => { if (isDev) console.warn(...args); },
  info:  (...args) => { if (isDev) console.info(...args); },
  debug: (...args) => { if (isDev) console.log(...args); },
};

export default logger;
