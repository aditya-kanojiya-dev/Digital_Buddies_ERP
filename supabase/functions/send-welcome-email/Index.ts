/**
 * Supabase Edge Function: send-welcome-email
 *
 * Sends a welcome email via Resend when a new employee is invited.
 * The RESEND_API_KEY is stored as a Supabase secret — it never reaches
 * the browser.
 *
 * Deploy:
 *   supabase functions deploy send-welcome-email
 *
 * Set secrets (one-time):
 *   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
 *   supabase secrets set EMAIL_FROM=noreply@digitalbuddies.in
 *   supabase secrets set APP_URL=https://your-app-domain.com
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // ── Only allow POST ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Require a valid Authorization header (anon key or user JWT) ─────────────
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // ── Parse and validate request body ────────────────────────────────────────
  let name: string, email: string, password: string;
  try {
    ({ name, email, password } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!name || !email || !password) {
    return json({ error: 'Missing required fields: name, email, password' }, 400);
  }

  // ── Read server-side secrets ────────────────────────────────────────────────
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const EMAIL_FROM     = Deno.env.get('EMAIL_FROM') ?? 'noreply@digitalbuddies.in';
  const APP_URL        = Deno.env.get('APP_URL')    ?? 'https://your-app-domain.com';

  if (!RESEND_API_KEY) {
    console.error('[send-welcome-email] RESEND_API_KEY secret is not set');
    return json({ error: 'Email service is not configured on the server' }, 500);
  }

  // ── Send via Resend REST API ────────────────────────────────────────────────
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    EMAIL_FROM,
        to:      email,
        subject: 'Welcome to Digital Buddies – Your Account is Ready',
        html:    buildWelcomeEmail({ name, email, password, appUrl: APP_URL }),
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[send-welcome-email] Resend error:', resendData);
      throw new Error(resendData?.message ?? 'Resend API returned an error');
    }

    console.log(`[send-welcome-email] Sent to ${email} (id: ${resendData.id})`);
    return json({ success: true, id: resendData.id });

  } catch (err) {
    console.error('[send-welcome-email] Unexpected error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ── Helper: JSON response ───────────────────────────────────────────────────
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── Email template ──────────────────────────────────────────────────────────
interface WelcomeEmailProps {
  name: string;
  email: string;
  password: string;
  appUrl: string;
}

function buildWelcomeEmail({ name, email, password, appUrl }: WelcomeEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Digital Buddies</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f0b21; color: #e2e8f0; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background-color: rgba(20,16,42,0.9); border: 1px solid rgba(139,92,246,0.2); border-radius: 16px; padding: 32px; }
          .header { text-align: center; border-bottom: 1px solid rgba(139,92,246,0.1); padding-bottom: 20px; margin-bottom: 24px; }
          .header h2 { color: #c084fc; margin: 0; font-size: 20px; font-weight: 700; }
          .body { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
          .box { background-color: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.15); border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
          .box p { margin: 8px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .warning { color: #fbbf24; }
          .mono { font-family: monospace; background: #2e1065; color: #f472b6; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
          .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h2>Welcome to Digital Buddies</h2></div>
          <div class="body">
            <p>Hi ${name},</p>
            <p>Your Digital-Buddies-ERP account has been created. Log in with the credentials below.</p>
            <div class="box">
              <p><strong>Portal:</strong> <a href="${appUrl}" style="color:#c084fc">${appUrl}</a></p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary password:</strong> <span class="mono">${password}</span></p>
            </div>
            <p class="warning">⚠️ You must change this password on your first login before you can access the dashboard.</p>
            <a href="${appUrl}" class="btn" target="_blank">Access the Portal</a>
            <p>Regards,<br>Digital Buddies Team</p>
          </div>
          <div class="footer"><p>Automated system email — do not reply.</p></div>
        </div>
      </body>
    </html>
  `;
}