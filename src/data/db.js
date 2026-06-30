import { supabase } from './auth';

// ============================================================================
// Column-name conversion utilities
// ============================================================================

// camelCase → snake_case  (top-level keys only)
const camelToSnake = (key) =>
  key.replace(/([A-Z])/g, '_$1').toLowerCase();

// snake_case → camelCase  (top-level keys only)
const snakeToCamel = (key) =>
  key.replace(/(_[a-z])/g, (m) => m[1].toUpperCase());

/** Convert a JS object's top-level keys from camelCase → snake_case */
const toSnake = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
};

/** Convert a JS object's top-level keys from snake_case → camelCase */
const toCamel = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
};

// ============================================================================
// Guard — every function calls this first
// ============================================================================
const ensureSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
};

// ============================================================================
// Generic helpers
// ============================================================================

/** SELECT * from a Supabase table, returns camelCase objects */
const getTable = async (tableName) => {
  ensureSupabase();
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw error;
  return (data || []).map(toCamel);
};

/**
 * Safe bulk-sync: upsert all rows in `data`, then delete any rows in the DB
 * whose IDs are no longer present in `data`.
 *
 * WHY this replaces the old delete-all + insert:
 *   The previous pattern wiped every row first, then re-inserted. A network
 *   failure between those two steps left the table permanently empty. With
 *   upsert the existing rows are never touched until the write succeeds, so
 *   the worst case on failure is stale data — not data loss.
 *
 * EMPTY ARRAY GUARD:
 *   If `data` is empty we skip both upsert and orphan-delete. An empty array
 *   almost always means the data hasn't loaded yet, not that the user wants
 *   to wipe the table. This prevents accidental mass-deletion on a failed
 *   initial fetch.
 */
const saveTable = async (tableName, data) => {
  ensureSupabase();

  if (data.length === 0) return data;

  // 1. Upsert: insert new rows, update rows whose id already exists.
  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(data.map(toSnake), { onConflict: 'id' });
  if (upsertError) throw upsertError;

  // 2. Delete orphans: rows in the DB whose id is no longer in `data`.
  //    Uses PostgREST's `not.in.(id1,id2,...)` filter — no full-table wipe.
  const currentIds = data.map((row) => row.id);
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .not('id', 'in', `(${currentIds.join(',')})`);
  if (deleteError) throw deleteError;

  return data;
};

/** INSERT a single row, returns the inserted object in camelCase */
const addRow = async (tableName, row) => {
  ensureSupabase();
  const { data, error } = await supabase
    .from(tableName)
    .insert(toSnake(row))
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
};

/** UPDATE a single row by id, returns the updated object in camelCase */
const updateRow = async (tableName, id, fields) => {
  ensureSupabase();
  const { data, error } = await supabase
    .from(tableName)
    .update(toSnake(fields))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
};

/** DELETE a single row by id */
const deleteRow = async (tableName, id) => {
  ensureSupabase();
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

// ============================================================================
// Exported db object — same function signatures as the original API
// ============================================================================
export const db = {
  // ── Employees ─────────────────────────────────────────────────────────────
  getEmployees: () => getTable('employees'),
  saveEmployees: (data) => saveTable('employees', data),
  addEmployee: (emp) => addRow('employees', emp),
  updateEmployee: (empId, fields) => updateRow('employees', empId, fields),
  deleteEmployee: async (empId) => {
    await deleteRow('employees', empId);
    return getTable('employees');
  },

  // ── Employee Invites ──────────────────────────────────────────────────────
  getEmployeeInvites: () => getTable('employee_invites'),
  saveEmployeeInvites: (data) => saveTable('employee_invites', data),
  addEmployeeInvite: (invite) => addRow('employee_invites', invite),
  updateEmployeeInvite: (inviteId, fields) =>
    updateRow('employee_invites', inviteId, fields),

  // ── Login Activity ────────────────────────────────────────────────────────
  getLoginActivity: () => getTable('login_activity'),
  saveLoginActivity: (data) => saveTable('login_activity', data),
  addLoginActivity: (log) => addRow('login_activity', log),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  getTasks: () => getTable('tasks'),
  saveTasks: (data) => saveTable('tasks', data),
  addTask: (task) => addRow('tasks', task),
  updateTask: (taskId, fields) => updateRow('tasks', taskId, fields),

  // ── Task Comments ─────────────────────────────────────────────────────────
  getComments: () => getTable('task_comments'),
  saveTaskComments: (data) => saveTable('task_comments', data), // was missing
  addComment: (comment) => addRow('task_comments', comment),

  // ── Timelogs ──────────────────────────────────────────────────────────────
  getTimelogs: () => getTable('timelogs'),
  saveTimelogs: (data) => saveTable('timelogs', data),
  addTimelog: (log) => addRow('timelogs', log),
  updateTimelog: (logId, fields) => updateRow('timelogs', logId, fields),

  // ── Attendance ────────────────────────────────────────────────────────────
  getAttendance: () => getTable('attendance'),
  saveAttendance: (data) => saveTable('attendance', data),
  addAttendance: (att) => addRow('attendance', att),
  updateAttendance: (attId, fields) => updateRow('attendance', attId, fields),

  // ── Leave Requests ────────────────────────────────────────────────────────
  getLeaves: () => getTable('leaves'),
  saveLeaves: (data) => saveTable('leaves', data),
  addLeave: (leave) => addRow('leaves', leave),
  updateLeave: (leaveId, fields) => updateRow('leaves', leaveId, fields),

  // ── Advances ──────────────────────────────────────────────────────────────
  getAdvances: () => getTable('advances'),
  saveAdvances: (data) => saveTable('advances', data),
  addAdvance: (adv) => addRow('advances', adv),
  updateAdvance: (advId, fields) => updateRow('advances', advId, fields),

  // ── Notifications & Pings ─────────────────────────────────────────────────
  getNotifications: () => getTable('notifications'),
  saveNotifications: (data) => saveTable('notifications', data),
  addNotification: (notif) => addRow('notifications', notif),

  // ── CRM: Leads ────────────────────────────────────────────────────────────
  getLeads: () => getTable('leads'),
  saveLeads: (data) => saveTable('leads', data),
  addLead: (lead) => addRow('leads', lead),
  updateLead: (leadId, fields) => updateRow('leads', leadId, fields),

  // ── Clients ───────────────────────────────────────────────────────────────
  getClients: () => getTable('clients'),
  saveClients: (data) => saveTable('clients', data),
  addClient: (client) => addRow('clients', client),

  // ── Proposals ─────────────────────────────────────────────────────────────
  getProposals: () => getTable('proposals'),
  saveProposals: (data) => saveTable('proposals', data),
  addProposal: (prop) => addRow('proposals', prop),

  // ── Invoices ──────────────────────────────────────────────────────────────
  getInvoices: () => getTable('invoices'),
  saveInvoices: (data) => saveTable('invoices', data),
  addInvoice: (inv) => addRow('invoices', inv),
  updateInvoice: (invId, fields) => updateRow('invoices', invId, fields),

  // ── Projects (shared by Projects board and Dev department) ────────────────
  getProjects: () => getTable('projects'),
  getDevProjects: () => getTable('projects'),       // alias used by App.jsx + HR.jsx
  saveProjects: (data) => saveTable('projects', data),
  saveDevProjects: (data) => saveTable('projects', data), // alias
  addProject: (proj) => addRow('projects', proj),
  updateProject: (projId, fields) => updateRow('projects', projId, fields),

  // ── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs: () => getTable('audit_logs'),
  saveAuditLogs: (data) => saveTable('audit_logs', data),
  addAuditLog: (log) => addRow('audit_logs', log),

  // ── Department: Paid Ads ──────────────────────────────────────────────────
  getAdStats: () => getTable('ad_stats'),
  saveAdStats: (data) => saveTable('ad_stats', data),       // was missing
  addAdStat: (stat) => addRow('ad_stats', stat),

  // ── Department: Social Media ──────────────────────────────────────────────
  getSmmCalendar: () => getTable('smm_calendar'),
  saveSmmCalendar: (data) => saveTable('smm_calendar', data), // was missing
  addCalendarPost: (post) => addRow('smm_calendar', post),

  getSmmQuotes: () => getTable('smm_quotes'),
  saveSmmQuotes: (data) => saveTable('smm_quotes', data),   // was missing
  addSmmQuote: (quote) => addRow('smm_quotes', quote),

  // ── Department: HR ────────────────────────────────────────────────────────
  getInterviews: () => getTable('interviews'),
  saveInterviews: (data) => saveTable('interviews', data),  // was missing
  addInterview: (int) => addRow('interviews', int),

  getFeedback: () => getTable('client_feedback'),
  saveFeedback: (data) => saveTable('client_feedback', data), // was missing
  addFeedback: (fb) => addRow('client_feedback', fb),

  getDailyOps: () => getTable('daily_ops'),
  saveDailyOps: (data) => saveTable('daily_ops', data),     // was missing (was updateDailyOps)
  updateDailyOps: (ops) => saveTable('daily_ops', ops),     // keep old name for back-compat

  getMoms: () => getTable('moms'),
  saveMoms: (data) => saveTable('moms', data),              // was missing
  addMom: (mom) => addRow('moms', mom),
};