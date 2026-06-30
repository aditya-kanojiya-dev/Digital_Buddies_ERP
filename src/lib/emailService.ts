/**
 * emailService.ts
 *
 * Dispatches emails by calling the Supabase Edge Function `send-welcome-email`.
 * The Resend API key never leaves the server — this file only sends a fetch()
 * to our own Edge Function endpoint.
 *
 * The function signature is unchanged so HR.jsx needs no edits.
 */

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface EmailParams {
  name: string;
  email: string;
  password: string;
}

export const emailService = {
  sendWelcomeEmail: async ({ name, email, password }: EmailParams) => {
    // In dev, if the Supabase URL isn't set, log to console and bail early
    if (!SUPABASE_URL) {
      console.log('--- [MOCK EMAIL — SUPABASE_URL not set] ---');
      console.log(`To: ${name} <${email}>  |  Temp password: ${password}`);
      console.log('-------------------------------------------');
      return { success: true, mocked: true };
    }

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/send-welcome-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          // The anon key identifies the request as coming from our app.
          // The actual Resend API key stays in Supabase secrets on the server.
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ name, email, password }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? 'Failed to send welcome email');
    }

    const data = await res.json();
    return { success: true, mocked: false, data };
  },
};