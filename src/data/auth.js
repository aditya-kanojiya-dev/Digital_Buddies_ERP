import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

// Single shared Supabase client — used by auth.js and db.js
// Security: persistSession is false because the app manages its own session
// in sessionStorage. Supabase's internal localStorage persistence would expose
// refresh tokens to XSS — RLS is the true data-access boundary, not this client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Session validity: 8 hours
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// How often to verify the Supabase JWT is still valid (defense-in-depth).
// RLS is the true data-access boundary; this catches revoked/expired tokens.
const JWT_VERIFY_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let lastJwtVerify = 0;

/**
 * Normalize department to always be an array.
 * Handles: TEXT[] from post-migration DB, single string from old sessions.
 */
const normalizeDept = (d) => {
  if (Array.isArray(d)) return d;
  if (typeof d === 'string' && d) return [d];
  return [];
};

/**
 * Convert snake_case employee row from Supabase → camelCase session user.
 */
const toSessionUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role || 'Employee',
  department: normalizeDept(row.department),
  designation: row.designation || '',
  subType: row.sub_type || row.subType || '',
  avatar: row.avatar || '',
  mustChangePassword: row.must_change_password === true,
  status: row.status || 'Active',
  loginAt: Date.now()
});

export const auth = {
  /**
   * Login flow:
   * 1. Authenticate via Supabase Auth (secure password check)
   * 2. Query `employees` table for the employee profile
   * 3. Store session in sessionStorage
   */
  login: async (email, password) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Step 1: Authenticate with Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (authError) throw authError;

    // Step 2: Get the authenticated user's UUID (the value auth.uid() returns
    // inside RLS policies). We need this to match employees.auth_user_id.
    const { data: { user: authUser }, error: userErr } =
      await supabase.auth.getUser();

    if (userErr || !authUser) {
      throw new Error('Authenticated but could not load your user record. Try again.');
    }

    // Step 3: Look up the employee by auth_user_id. This is the join RLS uses.
    let { data: employee, error: dbError } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    // ── Self-heal: row may exist by email but auth_user_id wasn't set yet
    // (e.g. employee created before phase-1 migration ran, or via an older
    // code path). Backfill it now and retry the lookup.
    if (!employee && dbError?.code === 'PGRST116') {
      dbError = null; // maybeSingle returned no rows, not an actual error
    }

    if (!employee) {
      const { data: byEmail, error: emailErr } = await supabase
        .from('employees')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (byEmail && !byEmail.auth_user_id) {
        // Backfill auth_user_id so this employee can use granular RLS.
        const { error: updateErr } = await supabase
          .from('employees')
          .update({ auth_user_id: authUser.id })
          .eq('id', byEmail.id);

        if (!updateErr) {
          employee = { ...byEmail, auth_user_id: authUser.id };
        } else {
          console.warn('[auth] Could not self-heal auth_user_id:', updateErr);
        }
      } else if (byEmail) {
        employee = byEmail;
      } else if (emailErr) {
        dbError = emailErr;
      }
    }

    if (!employee) {
      throw new Error(
        'Authentication succeeded but no employee profile found. Please run the Setup Wizard first or ask your admin to invite you.'
      );
    }

    if (employee.status === 'Suspended') {
      throw new Error('This account has been suspended. Please contact HR.');
    }

    if (employee.status === 'Terminated') {
      throw new Error('Access denied. This account has been terminated.');
    }

    // Step 4: Build session user and store in sessionStorage
    const sessionUser = toSessionUser(employee);
    sessionStorage.setItem(
      'neomax_session',
      JSON.stringify(sessionUser)
    );

    return sessionUser;
  },

  // Change password (first-login forced reset)
  changePassword: async (employeeId, newPassword) => {
    // Step 1: Update Supabase Auth password
    const { error: authError } =
      await supabase.auth.updateUser({
        password: newPassword
      });

    if (authError) throw authError;

    // Step 2: Update employees table
    const { error: dbError } = await supabase
      .from('employees')
      .update({
        must_change_password: false,
        status: 'Active'
      })
      .eq('id', employeeId);

    if (dbError) {
      console.error(
        'Failed to update employee record:',
        dbError
      );
    }

    // Step 3: Update active session
    const session =
      sessionStorage.getItem('neomax_session');

    if (session) {
      try {
        const user = JSON.parse(session);

        user.mustChangePassword = false;
        user.status = 'Active';

        sessionStorage.setItem(
          'neomax_session',
          JSON.stringify(user)
        );
      } catch (e) {
        console.error('Session parse error:', e);
      }
    }

    return { success: true };
  },

  // Session logout
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    sessionStorage.removeItem('neomax_session');
  },

  // Read active session — expire after 8 hours
  // Note: RLS is the true data-access boundary. This session check is UX-only
  // (controls which screens render). Periodic JWT verification below ensures the
  // Supabase token hasn't been revoked server-side.
  getCurrentUser: () => {
    const session =
      sessionStorage.getItem('neomax_session');

    if (session) {
      try {
        const user = JSON.parse(session);

        if (
          user.loginAt &&
          Date.now() - user.loginAt >
            SESSION_DURATION_MS
        ) {
          sessionStorage.removeItem(
            'neomax_session'
          );
          return null;
        }

        // Normalize department for backward compat with old sessions
        user.department = normalizeDept(user.department);

        // Periodic JWT verification — ensures the Supabase token is still valid.
        // Runs at most once per JWT_VERIFY_INTERVAL_MS to avoid blocking.
        const now = Date.now();
        if (now - lastJwtVerify > JWT_VERIFY_INTERVAL_MS) {
          lastJwtVerify = now;
          supabase.auth.getUser().then(({ error }) => {
            if (error) {
              console.warn('[auth] JWT verification failed, signing out:', error.message);
              sessionStorage.removeItem('neomax_session');
            }
          }).catch(() => {}); // non-blocking, best-effort
        }

        return user;
      } catch (e) {
        console.error('Session parse error:', e);
      }
    }

    return null;
  }
};