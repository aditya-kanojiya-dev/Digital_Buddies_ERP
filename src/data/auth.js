import { createClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

// Single shared Supabase client — used by auth.js and db.js
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Session validity: 8 hours
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

/**
 * Convert snake_case employee row from Supabase → camelCase session user.
 */
const toSessionUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role || 'Employee',
  department: row.department,
  designation: row.designation || '',
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
          logger.warn('[auth] Could not self-heal auth_user_id:', updateErr);
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
      logger.error('Failed to update employee record:', dbError);
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
        logger.error('Session parse error:', e);
      }
    }

    return { success: true };
  },

  // Session logout
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }

    sessionStorage.removeItem('neomax_session');
  },

  // Read active session — expire after 8 hours
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

        return user;
      } catch (e) {
        logger.error('Session parse error:', e);
      }
    }

    return null;
  }
};