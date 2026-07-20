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

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

// ── Rate limiting (in-memory, per-instance) ────────────────────────────────
// ponytail: in-memory map resets on cold start; for persistent rate limiting
// use Upstash Redis. This prevents email spamming during a single instance.
const RATE_LIMIT_MAX = 5; // emails per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const allowedOrigin = Deno.env.get('APP_URL');
  if (!allowedOrigin) {
    console.error('[send-welcome-email] APP_URL secret is not set — rejecting request');
    return json({ error: 'Server misconfiguration. Missing APP_URL.' }, 500);
  }
  const headers = corsHeaders(allowedOrigin);

  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
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

  // ── Rate limit ────────────────────────────────────────────────────────────
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  // ── Parse and validate request body ────────────────────────────────────────
  // Security: password is NEVER accepted or emailed — the invite link handles
  // password creation via the validate-invite Edge Function instead.
  let name: string, email: string, inviteToken: string | undefined;
  try {
    ({ name, email, inviteToken } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!name || !email) {
    return json({ error: 'Missing required fields: name, email' }, 400);
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
        html:    buildWelcomeEmail({ name, email, inviteToken, appUrl: APP_URL }),
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
function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  const allowedOrigin = Deno.env.get('APP_URL') || '';
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      ...extraHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// ── Email template ──────────────────────────────────────────────────────────
interface WelcomeEmailProps {
  name: string;
  email: string;
  inviteToken?: string;
  appUrl: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildWelcomeEmail({ name, email, inviteToken, appUrl }: WelcomeEmailProps): string {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeAppUrl = escapeHtml(appUrl);
  const inviteLink = inviteToken ? `${safeAppUrl}?invite=${escapeHtml(inviteToken)}` : safeAppUrl;
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
          .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h2>Welcome to Digital Buddies</h2></div>
          <div class="body">
            <p>Hi ${safeName},</p>
            <p>Your Digital-Buddies-ERP account has been created. Click the link below to set your password and activate your account.</p>
            <div class="box">
              <p><strong>Portal:</strong> <a href="${safeAppUrl}" style="color:#c084fc">${safeAppUrl}</a></p>
              <p><strong>Email:</strong> ${safeEmail}</p>
            </div>
            <a href="${inviteLink}" class="btn" target="_blank">Set Your Password</a>
            <p class="warning">This link expires in 7 hours and can only be used once.</p>
            <p>Regards,<br>Digital Buddies Team</p>
          </div>
          <div class="footer"><p>Automated system email — do not reply.</p></div>
        </div>
      </body>
    </html>
  `;
}