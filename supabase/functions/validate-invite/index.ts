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

  if (password.length < 8) {
    return json(
      {
        error:
          'Password must be at least 8 characters.',
      },
      400
    );
  }

  // =====================================================
  // Find Existing Auth User
  // =====================================================

  const {
    data: authUsers,
    error: listError,
  } = await admin.auth.admin.listUsers();

  if (listError) {
    return json(
      {
        error:
          'Failed to lookup authentication users.',
      },
      500
    );
  }

  let authUser = authUsers.users.find(
    (u) =>
      u.email?.toLowerCase() ===
      employee.email.toLowerCase()
  );

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