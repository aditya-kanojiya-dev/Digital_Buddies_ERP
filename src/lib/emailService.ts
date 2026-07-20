/**
 * emailService.ts
 *
 * Dispatches emails by calling the Supabase Edge Function `send-welcome-email`.
 * The Resend API key never leaves the server — this file only sends a fetch()
 * to our own Edge Function endpoint.
 *
 * Security: passwords are NEVER sent via email. The invite link handles
 * password creation via the validate-invite Edge Function.
 */

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface EmailParams {
  name: string;
  email: string;
  inviteToken?: string;
}

export const emailService = {
  sendWelcomeEmail: async ({ name, email, inviteToken }: EmailParams) => {
    // Dev-only fallback: if the Supabase URL isn't configured, log to console
    // instead of failing silently. Gated on import.meta.env.DEV so a temp
    // password can never be printed in a production build, even if env vars
    // are misconfigured at deploy time.
    if (!SUPABASE_URL) {
      if (import.meta.env.DEV) {
        console.log('--- [MOCK EMAIL — SUPABASE_URL not set] ---');
        console.log(`To: ${name} <${email}>`);
        console.log('-------------------------------------------');
      } else {
        console.error('emailService: VITE_SUPABASE_URL is not set in this environment — welcome email was not sent.');
      }
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
        body: JSON.stringify({ name, email, inviteToken }),
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