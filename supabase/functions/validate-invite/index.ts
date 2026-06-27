/**
 * Supabase Edge Function: validate-invite
 *
 * Called by AcceptInvite.jsx (runs as anon — no session yet).
 * Uses the SERVICE_ROLE key server-side so RLS never blocks the lookup.
 *
 * POST /functions/v1/validate-invite
 * Body: { token: string }                        ← validate only (step 1)
 * Body: { token: string, password: string }      ← validate + activate (step 2)
 *
 * Deploy:
 *   supabase functions deploy validate-invite
 *
 * Secrets needed (one-time):
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
 *   (SUPABASE_URL is injected automatically by Supabase)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVITE_EXPIRY_MS = 7 * 60 * 60 * 1000; // 7 hours

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Build a service-role client (bypasses RLS) ────────────────────────────
  const supabaseUrl         = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey      = Deno.env.get('SERVICE_ROLE_KEY');

  if (!serviceRoleKey) {
    return json({ error: 'Server misconfiguration — service key missing' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // ── Parse body ────────────────────────────────────────────────────────────
  let token: string, password: string | undefined;
  try {
    ({ token, password } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!token) return json({ error: 'Missing token' }, 400);

  // ── Fetch invite record ───────────────────────────────────────────────────
  const { data: invite, error: invErr } = await admin
    .from('employee_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (invErr || !invite) {
    return json({ error: 'This invite link is invalid or has already been used.' }, 404);
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  const created = new Date(invite.created_at).getTime();
  if (Date.now() - created > INVITE_EXPIRY_MS) {
    return json({ error: 'This invite link has expired (7-hour window). Ask HR to resend the invite.' }, 410);
  }

  // ── Already used check ────────────────────────────────────────────────────
  if (invite.accepted) {
    return json({ error: 'This invite link has already been used. Please log in normally or ask HR to resend.' }, 409);
  }

  // ── Fetch employee ────────────────────────────────────────────────────────
  const { data: employee, error: empErr } = await admin
    .from('employees')
    .select('id, name, email, role, department, designation, avatar, status, password')
    .eq('id', invite.employee_id)
    .single();

  if (empErr || !employee) {
    return json({ error: 'Employee record not found. Please contact HR.' }, 404);
  }

  // ── VALIDATE-ONLY: return employee info so the form can be shown ──────────
  if (!password) {
    return json({
      valid: true,
      employee: {
        id:          employee.id,
        name:        employee.name,
        email:       employee.email,
        role:        employee.role,
        department:  employee.department,
        designation: employee.designation,
        avatar:      employee.avatar,
      },
      inviteId: invite.id,
    });
  }

  // ── ACTIVATE: set password + mark invite accepted ─────────────────────────
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }

  // 1. Update the Auth user's password via admin API
  // First find the auth user by email
  const { data: authList, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return json({ error: 'Could not look up auth user.' }, 500);

  const authUser = authList.users.find((u: any) => u.email === employee.email);
  if (!authUser) return json({ error: 'Auth account not found. Ask HR to resend the invite.' }, 404);

  const { error: pwErr } = await admin.auth.admin.updateUserById(authUser.id, { password });
  if (pwErr) return json({ error: `Could not set password: ${pwErr.message}` }, 500);

  // 2. Mark invite accepted
  await admin
    .from('employee_invites')
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // 3. Clear temp password + activate employee
  await admin
    .from('employees')
    .update({ must_change_password: false, status: 'Active', password: null })
    .eq('id', employee.id);

  // 4. Sign in as the employee to get a real session token
  const { data: signInData, error: signInErr } = await admin.auth.signInWithPassword({
    email:    employee.email,
    password, // the NEW password they just set
  });
  if (signInErr) return json({ error: 'Password set but auto-login failed. Please log in manually.' }, 500);

  return json({
    activated: true,
    session: signInData.session,
    employee: {
      id:                 employee.id,
      name:               employee.name,
      email:              employee.email,
      role:               employee.role        || 'Employee',
      department:         employee.department,
      designation:        employee.designation || '',
      avatar:             employee.avatar      || '',
      mustChangePassword: false,
      status:             'Active',
      loginAt:            Date.now(),
    },
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}