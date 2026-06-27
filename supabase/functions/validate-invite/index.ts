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

  // ── Build service-role client ─────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  console.log('[validate-invite] SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('[validate-invite] SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'MISSING');

  if (!serviceRoleKey) {
    return json({ error: 'Server misconfiguration — SERVICE_ROLE_KEY secret missing.' }, 500);
  }

  // Pass service role key explicitly in both apikey header and Authorization
  // so PostgREST treats this as service_role and bypasses RLS entirely
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession:     false,
      autoRefreshToken:   false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey:        serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
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
    .maybeSingle();

  console.log('[validate-invite] invite:', JSON.stringify(invite));
  console.log('[validate-invite] invErr:', JSON.stringify(invErr));

  if (invErr) {
    return json({ error: `Database error: ${invErr.message}` }, 500);
  }

  if (!invite) {
    const { data: allInvites } = await admin
      .from('employee_invites')
      .select('id, token, accepted, created_at')
      .limit(10);
    console.log('[validate-invite] All tokens in DB:', JSON.stringify(allInvites));
    return json({ error: 'This invite link is invalid or has already been used.' }, 404);
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  const ageMs = Date.now() - new Date(invite.created_at).getTime();
  console.log(`[validate-invite] Invite age: ${Math.round(ageMs / 60000)} min`);

  if (ageMs > INVITE_EXPIRY_MS) {
    return json({ error: 'This invite link has expired (7-hour window). Ask HR to resend the invite.' }, 410);
  }

  if (invite.accepted) {
    return json({ error: 'This invite link has already been used. Please log in normally or ask HR to resend.' }, 409);
  }

  // ── Fetch employee ────────────────────────────────────────────────────────
  const { data: employee, error: empErr } = await admin
    .from('employees')
    .select('id, name, email, role, department, designation, avatar, status, password')
    .eq('id', invite.employee_id)
    .maybeSingle();

  console.log('[validate-invite] employee:', JSON.stringify(employee));
  console.log('[validate-invite] empErr:', JSON.stringify(empErr));

  if (empErr) return json({ error: `Employee lookup error: ${empErr.message}` }, 500);
  if (!employee) return json({ error: `No employee found for id "${invite.employee_id}". Contact HR.` }, 404);

  // ── VALIDATE ONLY (no password supplied) ─────────────────────────────────
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

  // ── ACTIVATE (password supplied) ─────────────────────────────────────────
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }

  // Find auth user by email
  const { data: authList, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return json({ error: `Could not list auth users: ${listErr.message}` }, 500);

  const authUser = (authList.users as any[]).find((u) => u.email === employee.email);
  console.log('[validate-invite] Auth user:', authUser?.id ?? 'NOT FOUND');

  if (!authUser) {
    return json({ error: 'No login account found for this email. Ask HR to resend the invite.' }, 404);
  }

  // Update Auth password via admin API
  const { error: pwErr } = await admin.auth.admin.updateUserById(authUser.id, { password });
  if (pwErr) return json({ error: `Could not set password: ${pwErr.message}` }, 500);

  // Mark invite accepted
  await admin
    .from('employee_invites')
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // Activate employee row
  await admin
    .from('employees')
    .update({ must_change_password: false, status: 'Active', password: null })
    .eq('id', employee.id);

  // Sign in with new password to return a real session
  const { data: signInData, error: signInErr } = await admin.auth.signInWithPassword({
    email:    employee.email,
    password,
  });

  if (signInErr) {
    console.warn('[validate-invite] Auto sign-in failed:', signInErr.message);
  }

  return json({
    activated: true,
    session:   signInData?.session ?? null,
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