/**
 * Supabase Edge Function: validate-invite
 *
 * POST { token }              → validate only, return employee info for the form
 * POST { token, password }    → validate + activate + return session
 *
 * Deploy:
 *   supabase functions deploy validate-invite
 *
 * Secret (one-time):
 *   supabase secrets set SERVICE_ROLE_KEY=<your service_role key>
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

  // ── Service-role client (bypasses RLS) ────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!serviceRoleKey) {
    console.error('[validate-invite] SERVICE_ROLE_KEY secret is not set');
    return json({ error: 'Server misconfiguration — service key missing. Ask the admin to set SERVICE_ROLE_KEY.' }, 500);
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

  console.log(`[validate-invite] Looking up token: ${token}`);

  // ── Fetch invite ──────────────────────────────────────────────────────────
  const { data: invite, error: invErr } = await admin
    .from('employee_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle(); // maybeSingle returns null instead of error when not found

  console.log('[validate-invite] invite row:', JSON.stringify(invite));
  console.log('[validate-invite] invite error:', JSON.stringify(invErr));

  if (invErr) {
    return json({ error: `Database error: ${invErr.message}` }, 500);
  }

  if (!invite) {
    // Token not found at all — log all tokens in table for debugging
    const { data: allInvites } = await admin
      .from('employee_invites')
      .select('id, token, accepted, created_at')
      .limit(10);
    console.log('[validate-invite] All invite tokens in DB:', JSON.stringify(allInvites));
    return json({ error: 'This invite link is invalid or has already been used.' }, 404);
  }

  // ── Expiry check (7 hours from created_at) ────────────────────────────────
  const createdMs = new Date(invite.created_at).getTime();
  const ageMs     = Date.now() - createdMs;
  console.log(`[validate-invite] Invite age: ${Math.round(ageMs / 60000)} minutes`);

  if (ageMs > INVITE_EXPIRY_MS) {
    return json({ error: 'This invite link has expired (7-hour window). Ask HR to resend the invite.' }, 410);
  }

  // ── Already used ──────────────────────────────────────────────────────────
  if (invite.accepted) {
    return json({ error: 'This invite link has already been used. Please log in normally or ask HR to resend.' }, 409);
  }

  // ── Fetch employee ────────────────────────────────────────────────────────
  const { data: employee, error: empErr } = await admin
    .from('employees')
    .select('id, name, email, role, department, designation, avatar, status, password')
    .eq('id', invite.employee_id)
    .maybeSingle();

  console.log('[validate-invite] employee row:', JSON.stringify(employee));
  console.log('[validate-invite] employee error:', JSON.stringify(empErr));

  if (empErr) {
    return json({ error: `Employee lookup error: ${empErr.message}` }, 500);
  }
  if (!employee) {
    return json({ error: `Employee record not found for id: ${invite.employee_id}. Contact HR.` }, 404);
  }

  // ── VALIDATE ONLY ─────────────────────────────────────────────────────────
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

  // ── ACTIVATE ──────────────────────────────────────────────────────────────
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }

  // Find the Supabase Auth user by email
  const { data: authList, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    return json({ error: `Could not look up auth users: ${listErr.message}` }, 500);
  }

  const authUser = (authList.users as any[]).find((u) => u.email === employee.email);
  console.log('[validate-invite] auth user found:', authUser?.id ?? 'NOT FOUND');

  if (!authUser) {
    return json({ error: 'Auth account not found. Ask HR to resend the invite so a fresh account is created.' }, 404);
  }

  // Update Auth password
  const { error: pwErr } = await admin.auth.admin.updateUserById(authUser.id, { password });
  if (pwErr) {
    return json({ error: `Could not set password: ${pwErr.message}` }, 500);
  }

  // Mark invite accepted
  await admin
    .from('employee_invites')
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // Activate employee
  await admin
    .from('employees')
    .update({ must_change_password: false, status: 'Active', password: null })
    .eq('id', employee.id);

  // Sign in with new password to get a real session
  const { data: signInData, error: signInErr } = await admin.auth.signInWithPassword({
    email:    employee.email,
    password,
  });

  if (signInErr) {
    // Non-fatal — they can log in manually
    console.warn('[validate-invite] Auto sign-in failed:', signInErr.message);
    return json({
      activated: true,
      session:   null,
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
  }

  return json({
    activated: true,
    session:   signInData.session,
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