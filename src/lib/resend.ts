/**
 * resend.ts — DEPRECATED
 *
 * The Resend client has been moved to the Supabase Edge Function
 * `supabase/functions/send-welcome-email/index.ts` so the API key
 * is never included in the browser bundle.
 *
 * This file is kept as a placeholder to avoid import errors from any
 * file that may still reference it. Remove it once you've confirmed
 * nothing else imports from here.
 *
 * The following environment variables are no longer needed in .env:
 *   VITE_RESEND_API_KEY  ← delete this line from .env
 *   VITE_EMAIL_FROM      ← delete this line from .env
 *
 * Set server-side secrets instead (one-time, never committed):
 *   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
 *   supabase secrets set EMAIL_FROM=noreply@digitalbuddies.in
 *   supabase secrets set APP_URL=https://your-app-domain.com
 */

export {};