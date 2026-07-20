import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const INVITE_EXPIRY_MS = 7 * 60 * 60 * 1000;

// ── Rate limiting (in-memory, per-instance) ────────────────────────────────
// ponytail: in-memory map resets on cold start; for persistent rate limiting
// use Upstash Redis or similar. This blocks brute-force during a single
// instance's lifetime, which is sufficient for invite token validation.
const RATE_LIMIT_MAX = 10; // requests per window
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

// Periodic cleanup to prevent memory leak from abandoned entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS * 2);

Deno.serve(async (req: Request) => {
  const allowedOrigin = Deno.env.get('APP_URL');
  if (!allowedOrigin) {
    console.error('[validate-invite] APP_URL secret is not set — rejecting request');
    return json({ error: 'Server misconfiguration. Missing APP_URL.' }, 500);
  }
  const headers = corsHeaders(allowedOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error:
          'Server misconfiguration. Missing SUPABASE_URL or SERVICE_ROLE_KEY.',
      },
      500
    );
  }

  const admin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  let token: string;
  let password: string | undefined;

  try {
    ({ token, password } = await req.json());
  } catch {
    return json(
      {
        error: 'Invalid JSON body.',
      },
      400
    );
  }

  if (!token) {
    return json(
      {
        error: 'Missing invite token.',
      },
      400
    );
  }

  // =====================================================
  // Get Invite
  // =====================================================

  const {
    data: invite,
    error: inviteError,
  } = await admin
    .from('employee_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (inviteError) {
    return json(
      {
        error: inviteError.message,
      },
      500
    );
  }

  if (!invite) {
    return json(
      {
        error:
          'This invite link is invalid or has already been used.',
      },
      404
    );
  }

  const age =
    Date.now() -
    new Date(invite.created_at).getTime();

  if (age > INVITE_EXPIRY_MS) {
    return json(
      {
        error:
          'This invite link has expired. Please ask HR to resend the invitation.',
      },
      410
    );
  }

  if (invite.accepted) {
    return json(
      {
        error:
          'This invite link has already been used.',
      },
      409
    );
  }

  // =====================================================
  // Get Employee
  // =====================================================

  const {
    data: employee,
    error: employeeError,
  } = await admin
    .from('employees')
    .select('*')
    .eq('id', invite.employee_id)
    .maybeSingle();

  if (employeeError) {
    return json(
      {
        error: employeeError.message,
      },
      500
    );
  }

  if (!employee) {
    return json(
      {
        error:
          'Employee record not found.',
      },
      404
    );
  }

  // =====================================================
  // Validation Only
  // =====================================================

  if (!password) {
    return json({
      valid: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        avatar: employee.avatar,
      },
      inviteId: invite.id,
    });
  }

  // =====================================================
  // Password Validation
  // =====================================================

  // Security: require minimum 10 chars, 1 uppercase, 1 number. Checking against
  // breached password lists (HaveIBeenPwned) would be ideal but adds latency;
  // enforce length + complexity here as the baseline.
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return json(
      {
        error:
          'Password must be at least 10 characters with 1 uppercase letter and 1 number.',
      },
      400
    );
  }

  // =====================================================
  // Find Existing Auth User
  // ponytail: Supabase Admin API has no getUserByEmail — listUsers is the
  // only option. Paginate to avoid loading all users into memory at once.
  // =====================================================

  let authUser = null;
  let page = 1;
  const perPage = 100;

  while (!authUser) {
    const { data: pageData, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
    if (listError) {
      return json({ error: 'Failed to lookup authentication users.' }, 500);
    }
    authUser = pageData.users.find(
      (u) => u.email?.toLowerCase() === employee.email.toLowerCase()
    );
    if (!authUser && pageData.users.length === perPage) {
      page++;
    } else {
      break;
    }
  }

  // =====================================================
  // Create User If Needed
  // =====================================================

  if (!authUser) {
    const {
      data: created,
      error: createError,
    } = await admin.auth.admin.createUser({
      email: employee.email,
      password,
      email_confirm: true,
      user_metadata: {
        employee_id: employee.id,
        role: employee.role,
        department: employee.department,
        designation:
          employee.designation,
      },
    });

    if (createError) {
      return json(
        {
          error: createError.message,
        },
        500
      );
    }

    authUser = created.user;
  } else {
    const {
      error: updateError,
    } = await admin.auth.admin.updateUserById(
      authUser.id,
      {
        password,
        email_confirm: true,
      }
    );

    if (updateError) {
      return json(
        {
          error: updateError.message,
        },
        500
      );
    }
  }

  // =====================================================
  // Accept Invite
  // =====================================================

  const {
    error: acceptError,
  } = await admin
    .from('employee_invites')
    .update({
      accepted: true,
      accepted_at:
        new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (acceptError) {
    return json(
      {
        error:
          'Failed to mark invite as accepted.',
      },
      500
    );
  }

  // =====================================================
  // Activate Employee
  // =====================================================

  const {
    error: activateError,
  } = await admin
    .from('employees')
    .update({
      status: 'Active',
      must_change_password: false,
      password: null,
      last_login:
        new Date().toISOString(),
      // Link this employee row to the auth user that just signed in.
      // Without this the new granular RLS policies (auth_user_id = auth.uid())
      // would block every future login by this employee.
      auth_user_id: authUser.id,
    })
    .eq('id', employee.id);

  if (activateError) {
    return json(
      {
        error:
          'Failed to activate employee.',
      },
      500
    );
  }

  // =====================================================
  // Return Employee Only
  // Browser will sign in separately.
  // =====================================================

  return json({
    activated: true,
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role:
        employee.role || 'Employee',
      department:
        employee.department,
      designation:
        employee.designation || '',
      avatar:
        employee.avatar || '',
      status: 'Active',
      mustChangePassword: false,
      loginAt: Date.now(),
    },
  });
});

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const allowedOrigin = Deno.env.get('APP_URL') || '';
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        ...extraHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}