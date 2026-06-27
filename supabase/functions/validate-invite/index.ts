/**
 * Supabase Edge Function: validate-invite
 *
 * POST { token }              → validate only
 * POST { token, password }    → validate + activate + return session
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const INVITE_EXPIRY_MS = 7 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!serviceRoleKey) {
    return json(
      {
        error:
          'Server misconfiguration — SERVICE_ROLE_KEY secret missing.',
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
      global: {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    }
  );

  let token: string;
  let password: string | undefined;

  try {
    ({ token, password } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!token) {
    return json({ error: 'Missing token' }, 400);
  }

  // ======================================================
  // Get invite
  // ======================================================

  const { data: invite, error: inviteError } =
    await admin
      .from('employee_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle();

  if (inviteError) {
    return json(
      {
        error: `Database error: ${inviteError.message}`,
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

  const ageMs =
    Date.now() -
    new Date(invite.created_at).getTime();

  if (ageMs > INVITE_EXPIRY_MS) {
    return json(
      {
        error:
          'This invite link has expired (7-hour window). Ask HR to resend the invite.',
      },
      410
    );
  }

  if (invite.accepted) {
    return json(
      {
        error:
          'This invite link has already been used. Please log in normally or ask HR to resend.',
      },
      409
    );
  }

  // ======================================================
  // Get employee
  // ======================================================

  const {
    data: employee,
    error: employeeError,
  } = await admin
    .from('employees')
    .select(
      `
      id,
      name,
      email,
      role,
      department,
      designation,
      avatar,
      status,
      password
    `
    )
    .eq('id', invite.employee_id)
    .maybeSingle();

  if (employeeError) {
    return json(
      {
        error: `Employee lookup error: ${employeeError.message}`,
      },
      500
    );
  }

  if (!employee) {
    return json(
      {
        error: `No employee found for id "${invite.employee_id}". Contact HR.`,
      },
      404
    );
  }

  // ======================================================
  // Validate only
  // ======================================================

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

  // ======================================================
  // Activate employee
  // ======================================================

  if (password.length < 8) {
    return json(
      {
        error:
          'Password must be at least 8 characters.',
      },
      400
    );
  }

  const {
    data: authList,
    error: listErr,
  } = await admin.auth.admin.listUsers();

  if (listErr) {
    return json(
      {
        error: `Could not list auth users: ${listErr.message}`,
      },
      500
    );
  }

  let authUser = authList.users.find(
    (u) =>
      u.email?.toLowerCase() ===
      employee.email.toLowerCase()
  );

  // Create auth user if missing
  if (!authUser) {
    const {
      data: createdUser,
      error: createErr,
    } = await admin.auth.admin.createUser({
      email: employee.email,
      password,
      email_confirm: true,
      user_metadata: {
        employee_id: employee.id,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        designation:
          employee.designation,
      },
    });

    if (createErr) {
      return json(
        {
          error: `Could not create login account: ${createErr.message}`,
        },
        500
      );
    }

    authUser = createdUser.user;
  } else {
    const {
      error: passwordError,
    } = await admin.auth.admin.updateUserById(
      authUser.id,
      {
        password,
        email_confirm: true,
      }
    );

    if (passwordError) {
      return json(
        {
          error: `Could not set password: ${passwordError.message}`,
        },
        500
      );
    }
  }

  // ======================================================
  // Accept invite
  // ======================================================

  const { error: acceptError } =
    await admin
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
        error: `Could not update invite: ${acceptError.message}`,
      },
      500
    );
  }

  // ======================================================
  // Activate employee
  // ======================================================

  const {
    error: activateError,
  } = await admin
    .from('employees')
    .update({
      status: 'Active',
      must_change_password: false,
      password: null,
    })
    .eq('id', employee.id);

  if (activateError) {
    return json(
      {
        error: `Could not activate employee: ${activateError.message}`,
      },
      500
    );
  }

  // ======================================================
  // Sign in
  // ======================================================

  const {
    data: signInData,
    error: signInErr,
  } = await admin.auth.signInWithPassword({
    email: employee.email,
    password,
  });

  if (signInErr) {
    console.warn(
      '[validate-invite] Auto sign-in failed:',
      signInErr.message
    );
  }

  return json({
    activated: true,
    session:
      signInData?.session ?? null,
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
  status = 200
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':
          'application/json',
      },
    }
  );
}