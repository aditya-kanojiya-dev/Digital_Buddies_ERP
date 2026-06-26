import { createClient } from '@supabase/supabase-js';

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

    // Step 2: Look up employee profile from Supabase employees table
    const { data: employee, error: dbError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (dbError || !employee) {
      throw new Error(
        'Authentication succeeded but no employee profile found. ' +
        'Please run the Setup Wizard first or ask your admin to invite you.'
      );
    }

    if (employee.status === 'Suspended') throw new Error('This account has been suspended. Please contact HR.');
    if (employee.status === 'Terminated') throw new Error('Access denied. This account has been terminated.');

    // Step 3: Build session user and store in sessionStorage
    const sessionUser = toSessionUser(employee);
    sessionStorage.setItem('neomax_session', JSON.stringify(sessionUser));
    return sessionUser;
  },

  // Create Supabase Auth user (Setup Wizard + Employee Invitations)
  signUpEmployee: async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  // Change password (first-login forced reset)
  changePassword: async (employeeId, newPassword) => {
    // Step 1: Update Supabase Auth password
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;

    // Step 2: Update employees table — clear forced-reset flag, set Active
    const { error: dbError } = await supabase
      .from('employees')
      .update({ must_change_password: false, status: 'Active' })
      .eq('id', employeeId);

    if (dbError) {
      console.error('Failed to update employee record:', dbError);
    }

    // Step 3: Update active session in sessionStorage
    const session = sessionStorage.getItem('neomax_session');
    if (session) {
      try {
        const u = JSON.parse(session);
        u.mustChangePassword = false;
        u.status = 'Active';
        sessionStorage.setItem('neomax_session', JSON.stringify(u));
      } catch (e) { /* ignore */ }
    }

    return { success: true };
  },

  // Session logout
  logout: async () => {
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    sessionStorage.removeItem('neomax_session');
  },

  // Read active session — expire after 8 hours
  getCurrentUser: () => {
    const session = sessionStorage.getItem('neomax_session');
    if (session) {
      try {
        const user = JSON.parse(session);
        if (user.loginAt && Date.now() - user.loginAt > SESSION_DURATION_MS) {
          sessionStorage.removeItem('neomax_session');
          return null;
        }
        return user;
      } catch (e) {
        console.error('Session parse error:', e);
      }
    }
    return null;
  }
};
