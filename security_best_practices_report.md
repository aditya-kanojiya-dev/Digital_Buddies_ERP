# Security Audit Report — Digital Buddies ERP

**Date:** 2026-07-20  
**Stack:** React 19 + Supabase (PostgREST/RLS + Edge Functions + Auth) + Vercel  
**Audit scope:** Frontend code, Edge Functions, deployment config, auth flow

---

## Executive Summary

The app has a **solid foundation** — Supabase Auth with RLS is the right architecture, DOMPurify is correctly used for user content, CORS is locked to `APP_URL` in Edge Functions, and secrets (`SERVICE_ROLE_KEY`, `RESEND_API_KEY`) stay server-side. However, several gaps remain that could allow session theft, email-based credential exposure, or missing defense-in-depth layers. The most urgent items are the **plaintext passwords in welcome emails** and the **absence of security headers** (CSP, clickjacking, nosniff).

---

## Critical Findings

### CRIT-001: Temporary passwords are sent in plaintext email

- **Severity:** Critical
- **Location:** `supabase/functions/send-welcome-email/Index.ts:81`
- **Evidence:** `body: JSON.stringify({ name, email, password })` — the user's temporary password is embedded in the HTML email body (`buildWelcomeEmail` at line 127).
- **Impact:** Email is inherently insecure (stored in plaintext on mail servers, transmitted unencrypted between some providers). An attacker with access to the mailbox or a compromised email provider can read the password. This is the employee's initial credential.
- **Fix:** Never email passwords. Instead: (a) generate a random one-time token URL (already done with invite links), or (b) require the user to set their password on first visit via the invite link (which already exists — just stop including the password in the email).
- **Mitigation:** The invite flow already supports setting a password via `validate-invite`. The email should only contain the link, not the password.

### CRIT-002: Supabase `persistSession: true` stores refresh tokens in localStorage

- **Severity:** Critical
- **Location:** `src/data/auth.js:15`
- **Evidence:** `persistSession: true` — Supabase JS client defaults to storing the access token + refresh token in `localStorage` under `sb-<project-ref>-auth-token`.
- **Impact:** A single XSS vulnerability (even a minor one) can exfiltrate the refresh token, which gives the attacker persistent access to the user's account until the token is revoked. This undermines the entire session model.
- **Fix:** Set `persistSession: false` on the Supabase client. The app already manages its own session via `sessionStorage` (8-hour expiry). Supabase's internal session persistence is redundant and creates an unnecessary attack surface.  
  ```js
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
  ```
- **Mitigation:** If you need "remember me" functionality, implement it with a server-side token rotation mechanism, not client-side localStorage persistence.

---

## High Findings

### HIGH-001: No security headers configured (CSP, clickjacking, nosniff)

- **Severity:** High
- **Location:** No `vercel.json` exists, `index.html` (no meta CSP)
- **Evidence:** No `vercel.json` for header configuration. No `<meta http-equiv="Content-Security-Policy">` in `index.html`. The existing `netlify.toml` is dead config (not used by Vercel).
- **Impact:** Without CSP, any XSS vulnerability has full impact (no defense-in-depth). Without `X-Frame-Options` / `frame-ancestors`, the app can be framed for clickjacking attacks. Without `X-Content-Type-Options: nosniff`, MIME-sniffing attacks are possible.
- **Fix:** Create `vercel.json` with security headers (see the file created in this repo). Also delete the unused `netlify.toml`.
- **Mitigation:** Start with report-only CSP to catch violations before enforcing. Adjust the policy based on actual resource needs.

### HIGH-002: No rate limiting on Edge Functions

- **Severity:** High
- **Location:** `supabase/functions/validate-invite/index.ts`, `supabase/functions/send-welcome-email/Index.ts`
- **Evidence:** Neither Edge Function implements rate limiting. The `validate-invite` function allows unlimited token validation attempts.
- **Impact:** An attacker can brute-force invite tokens (7-character expiry window, but tokens are likely guessable if not cryptographically random). The `send-welcome-email` function can be abused to send spam or enumerate valid employee emails.
- **Fix:** Implement rate limiting via Supabase's built-in rate limiting (Edge Function rate limits) or add a simple counter-based check using a Supabase table or Upstash Redis. For `validate-invite`, limit to ~5 attempts per IP per minute.
- **Mitigation:** Ensure invite tokens are cryptographically random (UUID4 or similar). Verify the token generation in the HR component uses `crypto.randomUUID()` or equivalent.

### HIGH-003: `X-Frame-Options` / clickjacking protection absent

- **Severity:** High  
- **Location:** No `vercel.json`, no `X-Frame-Options` configured
- **Impact:** The ERP app can be embedded in an iframe on a malicious site, enabling clickjacking attacks where users are tricked into clicking UI elements they can't see.
- **Fix:** Set `X-Frame-Options: DENY` and/or CSP `frame-ancestors 'none'` via `vercel.json` headers (see HIGH-001 fix).

---

## Medium Findings

### MED-001: Legacy plaintext password column in employees table

- **Severity:** Medium
- **Location:** Database schema (migration files)
- **Evidence:** The employees table has a `password` column with default `'password123'`. While the app now uses Supabase Auth, this column still exists.
- **Impact:** If the database is compromised (e.g., via a Supabase misconfiguration or SQL injection in a poorly-scoped query), default passwords are exposed. The column is also a confusion vector — new developers might accidentally use it.
- **Fix:** Drop the `password` column via a migration. The `validate-invite` function already sets `password: null` on activation (line 309), so this is a cleanup task.
- **Mitigation:** Until dropped, ensure the column is not exposed via PostgREST (add it to `exposed_columns` exclusion or remove it from the API).

### MED-002: Client-side session validation is the only auth gate

- **Severity:** Medium
- **Location:** `src/data/auth.js:202-231` (getCurrentUser), `src/App.jsx:61`
- **Evidence:** The app reads `sessionStorage` to determine if a user is logged in. The 8-hour expiry is enforced purely in JavaScript (`Date.now() - user.loginAt > SESSION_DURATION_MS`). No server-side session check exists for data reads.
- **Impact:** A user can extend their session indefinitely by modifying `sessionStorage` or the `loginAt` value. More importantly, RLS is the actual security boundary, but the client-side session check creates a false sense of security.
- **Fix:** This is acceptable as long as RLS is correctly enforced on all tables. However, add a comment in the code clarifying that RLS is the true auth boundary, and the session check is UX-only. Consider verifying the Supabase JWT is still valid periodically (e.g., call `supabase.auth.getUser()` every 30 minutes).

### MED-003: Invite token expiry check uses client-side timestamp calculation

- **Severity:** Medium
- **Location:** `supabase/functions/validate-invite/index.ts:106-118`
- **Evidence:** `const age = Date.now() - new Date(invite.created_at).getTime()` — this compares against the Edge Function's server time, which is correct. However, `invite.created_at` is stored as a database timestamp, so timezone consistency matters.
- **Impact:** Low risk — the server-side check is fundamentally sound. But if `created_at` is stored without timezone info, edge cases around DST could extend the window slightly.
- **Fix:** Ensure `created_at` is always stored as ISO 8601 with timezone (`new Date().toISOString()`).

### MED-004: Google Fonts loaded without Subresource Integrity (SRI)

- **Severity:** Medium
- **Location:** `index.html:9-11`
- **Evidence:** `<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">` — no `integrity` attribute.
- **Impact:** If Google's CDN is compromised, an attacker could inject malicious CSS/JS. Fonts are loaded with `crossorigin`, but without SRI the browser can't verify integrity.
- **Fix:** Use SRI hashes for the font stylesheet, or self-host the fonts. Since Google Fonts uses dynamic URLs with hash-based integrity, the easiest fix is to use the `font-display: swap` approach with self-hosted fonts, or add a strict CSP `style-src` allowlist.
- **Mitigation:** The risk is low since Google Fonts is a highly-trusted CDN, but defense-in-depth says use SRI or self-host.

---

## Low Findings

### LOW-001: `DOMPurify.sanitize()` used on fields that React already escapes

- **Severity:** Low
- **Location:** `src/components/Profile.jsx:34-37`
- **Evidence:** `name: DOMPurify.sanitize(name)` — React's JSX escaping already handles XSS for string interpolation. DOMPurify is redundant here.
- **Impact:** No security issue — this is defense-in-depth, but adds unnecessary complexity and bundle size. DOMPurify is 30KB+ and is only needed if rendering raw HTML (which Profile doesn't do).
- **Fix:** Remove DOMPurify from Profile.jsx since the values are rendered via React JSX interpolation, not `dangerouslySetInnerHTML`. Keep DOMPurify available for any future rich-text rendering needs.

### LOW-002: Password policy is minimal (8 chars, 1 uppercase, 1 number)

- **Severity:** Low
- **Location:** `supabase/functions/validate-invite/index.ts:186`, `src/components/AcceptInvite.jsx:68`
- **Evidence:** `password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)`
- **Impact:** Weak passwords are easier to brute-force. NIST SP 800-63B recommends checking against breached password lists rather than enforcing composition rules.
- **Fix:** Consider adding a minimum length of 12 characters and checking against a breached password list (e.g., HaveIBeenPwned API). This is a UX tradeoff — longer passwords with fewer composition rules are actually more secure.

### LOW-003: `ipify.org` used for IP detection on login

- **Severity:** Low
- **Location:** Login activity tracking (referenced in codebase)
- **Evidence:** External service call to `api.ipify.org` on every login/logout.
- **Impact:** Relies on a third-party service for security-critical logging. If ipify.org is down or returns a wrong IP, login activity records are inaccurate. Also sends a request to a third party with each login.
- **Fix:** Use Supabase's built-in request IP detection (available in Edge Functions via `req.headers.get('x-forwarded-for')`) or accept the ipify dependency with a fallback.

---

## Summary of Recommendations (Priority Order)

| Priority | Finding | Effort |
|----------|---------|--------|
| **Now** | Remove passwords from welcome emails (CRIT-001) | Small — edit email template |
| **Now** | Set `persistSession: false` (CRIT-002) | One line change |
| **Now** | Add security headers via `vercel.json` (HIGH-001, HIGH-003) | Create one file, delete `netlify.toml` |
| **This week** | Add rate limiting to Edge Functions (HIGH-002) | Medium |
| **This week** | Drop legacy `password` column (MED-001) | Migration |
| **Soon** | Verify Supabase JWT periodically (MED-002) | Small |
| **Backlog** | Self-host fonts / add SRI (MED-004) | Medium |
| **Backlog** | Remove DOMPurify from Profile (LOW-001) | Trivial |

---

*Report generated by security audit scan. Verify Vercel dashboard headers settings for any runtime config not visible in the repo.*
