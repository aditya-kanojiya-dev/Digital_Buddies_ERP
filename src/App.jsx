import { Suspense, lazy, useState, useEffect, startTransition } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Login from './components/Login';
import SetupWizard from './components/SetupWizard';
import ChangePassword from './components/ChangePassword';
import Profile from './components/Profile';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import AcceptInvite from './components/AcceptInvite';

const CRM = lazy(() => import('./components/CRM'));
const FounderDashboard = lazy(() => import('./components/FounderDashboard'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));
const PaidAds = lazy(() => import('./components/Departments/PaidAds'));
const SocialMedia = lazy(() => import('./components/Departments/SocialMedia'));
const Creative = lazy(() => import('./components/Departments/Creative'));
const Developers = lazy(() => import('./components/Departments/Developers'));
const HR = lazy(() => import('./components/Departments/HR'));
const NotificationsCenter = lazy(() => import('./components/shared/NotificationsCenter'));
const PersonalCalendar = lazy(() => import('./components/shared/PersonalCalendar'));
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
import { auth, supabase } from './data/auth';
import { db } from './data/db';
import { runDeadlineEngine } from './lib/deadlineEngine';
import { ROLES } from './lib/constants';

// Key → db.js save function mapping for Supabase persistence
const DB_SAVE_MAP = {
  employees:       db.saveEmployees,
  clients:         db.saveClients,
  adStats:         db.saveAdStats,
  smmCalendar:     db.saveSmmCalendar,
  smmQuotes:       db.saveSmmQuotes,
  devProjects:     db.saveProjects,
  interviews:      db.saveInterviews,
  feedback:        db.saveFeedback,
  dailyOps:        db.saveDailyOps,
  attendanceDocs:  db.saveAttendanceDocs,
  attendance:      db.saveAttendance,
  leaves:          db.saveLeaves,
  advances:        db.saveAdvances,
  moms:            db.saveMoms,
  tasks:           db.saveTasks,
  timelogs:        db.saveTimelogs,
  notifications:   db.saveNotifications,
  leads:           db.saveLeads,
  proposals:       db.saveProposals,
  invoices:        db.saveInvoices,
  projects:        db.saveProjects,
  auditLogs:       db.saveAuditLogs,
  employeeInvites: db.saveEmployeeInvites,
  loginActivity:   db.saveLoginActivity,
  adCampaigns:     db.saveAdCampaigns,
  personalTasks:   db.savePersonalTasks,
};

export default function App() {
  const [user, setUser]                   = useState(() => auth.getCurrentUser());
  const [loading, setLoading]             = useState(true);
  const [isBootstrapped, setIsBootstrapped] = useState(true);
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [searchOpen, setSearchOpen]       = useState(false);

  // Detect ?invite=TOKEN in the URL (one-time employee onboarding link)
  const [inviteToken]                     = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || null;
  });

  const [state, setState] = useState({
    employees: [], clients: [], adStats: [], adCampaigns: [], smmCalendar: [], smmQuotes: [],
    devProjects: [], interviews: [], feedback: [], dailyOps: [], attendanceDocs: [], attendance: [],
    leaves: [], advances: [], moms: [], tasks: [], timelogs: [],
    notifications: [], leads: [], proposals: [], invoices: [], projects: [],
    auditLogs: [], employeeInvites: [], loginActivity: [], personalTasks: []
  });

 // ── Fetch all data from Supabase ──────────────────────────────────────────
const fetchAllData = async () => {
  try {
    let { data: { session } } = await supabase.auth.getSession();

    // If the access token expired, try a silent refresh.
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed?.session ?? null;
    }

    // don't bail on missing session — try fetches first.
    // RLS may still allow reads with the anon key for some tables, and
    // the existing auth-failure check at the bottom handles true 401s.
    if (!session) {
      console.warn('[fetchAllData] No Supabase auth session — attempting fetches anyway.');
    }

    const results = await Promise.allSettled([
      db.getEmployees(),
      db.getClients(),
      db.getAdStats(),
      db.getSmmCalendar(),
      db.getSmmQuotes(),
      db.getProjects(),
      db.getInterviews(),
      db.getFeedback(),
      db.getDailyOps(),
      db.getAttendance(),
      db.getLeaves(),
      db.getAdvances(),
      db.getMoms(),
      db.getTasks(),
      db.getTimelogs(),
      db.getNotifications(),
      db.getLeads(),
      db.getProposals(),
      db.getInvoices(),
      db.getAuditLogs(),
      db.getEmployeeInvites(),
      db.getLoginActivity(),
      db.getAdCampaigns(),
      db.getAttendanceDocs(),
      db.getPersonalTasks()
    ]);

    // Log failed requests so you know which tables have RLS issues
    let authFailed = false;
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const msg = r.reason?.message || String(r.reason);
        console.error(`Fetch ${i} failed:`, r.reason);
        if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('Invalid API key')) {
          authFailed = true;
        }
      }
    });

    if (authFailed && results.every(r => r.status === 'rejected')) {
      console.error('[fetchAllData] All fetches failed with auth errors — session is invalid. Signing out.');
      sessionStorage.removeItem('neomax_session');
      setUser(null);
      return;
    }

    const getResult = (i) =>
      results[i].status === 'fulfilled'
        ? results[i].value
        : [];

    const newState = {
      employees: getResult(0),
      clients: getResult(1),
      adStats: getResult(2),
      smmCalendar: getResult(3),
      smmQuotes: getResult(4),
      devProjects: getResult(5),
      interviews: getResult(6),
      feedback: getResult(7),
      dailyOps: getResult(8),
      attendance: getResult(9),
      leaves: getResult(10),
      advances: getResult(11),
      moms: getResult(12),
      tasks: getResult(13),
      timelogs: getResult(14),
      notifications: getResult(15),
      leads: getResult(16),
      proposals: getResult(17),
      invoices: getResult(18),
      projects: getResult(5),
      auditLogs: getResult(19),
      employeeInvites: getResult(20),
      loginActivity: getResult(21),
      adCampaigns: getResult(22),
      attendanceDocs: getResult(23),
      personalTasks: getResult(24)
    };

    setState(newState);

    // ── Run deadline engine once after fetch — emits stable-ID notifications for
    //    tasks that are overdue / due today / due tomorrow. Idempotent — safe to
    //    run on every boot.
    try {
      const fresh = runDeadlineEngine({
        tasks: newState.tasks || [],
        notifications: newState.notifications || [],
      });
      if (fresh.length > 0) {
        const mergedNotifications = [...fresh, ...newState.notifications];
        setState(prev => ({ ...prev, notifications: mergedNotifications }));
        db.saveNotifications(mergedNotifications).catch(err =>
          console.error('[deadlineEngine] saveNotifications failed:', err)
        );
      }
    } catch (engErr) {
      console.warn('[deadlineEngine] run failed:', engErr);
    }

    // Bootstrap depends only on employees table
    setIsBootstrapped(newState.employees.length > 0);
  } catch (err) {
    console.error('Error loading data from Supabase:', err);

    // Don't lock the app on loading
    setIsBootstrapped(true);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchAllData();
}, [user]);

// ── Auth state listener: auto-logout on Supabase session expiry ────────────
// NOTE: During token refresh, Supabase fires SIGNED_OUT then SIGNED_IN in
// quick succession. We must NOT clear the app session on SIGNED_OUT alone
// because that causes a race: the session is nulled, fetchAllData runs with
// no JWT (403s), then SIGNED_IN fires and re-establishes the session.
// Instead, we only clear on explicit SIGNED_OUT with no subsequent SIGNED_IN.
useEffect(() => {
  let signOutTimer = null;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Defer — if SIGNED_IN follows within 2s, cancel the logout
        signOutTimer = setTimeout(() => {
          console.warn('[Auth] Supabase signed out (confirmed) — clearing app session.');
          sessionStorage.removeItem('neomax_session');
          setUser(null);
        }, 2000);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (signOutTimer) { clearTimeout(signOutTimer); signOutTimer = null; }
        // token refreshed → re-fetch so RLS queries succeed again
        if (event === 'TOKEN_REFRESHED') fetchAllData();
      }
    }
  );

  return () => { if (signOutTimer) clearTimeout(signOutTimer); subscription.unsubscribe(); };
}, []);

// ── Global Realtime subscription ───────────────────────────────────────────
useEffect(() => {
  if (!supabase || !user) return;

  const channel = supabase
    .channel('erp-global-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      db.getTasks().then(data => setState(prev => ({ ...prev, tasks: data }))).catch(err => console.warn('[realtime] Failed to fetch tasks:', err));
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    }, () => {
      db.getNotifications().then(data => setState(prev => ({ ...prev, notifications: data }))).catch(err => console.warn('[realtime] Failed to fetch notifications:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'smm_calendar' }, () => {
      db.getSmmCalendar().then(data => setState(prev => ({ ...prev, smmCalendar: data }))).catch(err => console.warn('[realtime] Failed to fetch smm_calendar:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
      db.getProjects().then(data => setState(prev => ({ ...prev, projects: data }))).catch(err => console.warn('[realtime] Failed to fetch projects:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
      db.getAttendance().then(data => setState(prev => ({ ...prev, attendance: data }))).catch(err => console.warn('[realtime] Failed to fetch attendance:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
      db.getLeaves().then(data => setState(prev => ({ ...prev, leaves: data }))).catch(err => console.warn('[realtime] Failed to fetch leaves:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, () => {
      db.getAdvances().then(data => setState(prev => ({ ...prev, advances: data }))).catch(err => console.warn('[realtime] Failed to fetch advances:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns' }, () => {
      db.getAdCampaigns().then(data => setState(prev => ({ ...prev, adCampaigns: data }))).catch(err => console.warn('[realtime] Failed to fetch ad_campaigns:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
      db.getEmployees().then(data => setState(prev => ({ ...prev, employees: data }))).catch(err => console.warn('[realtime] Failed to fetch employees:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
      db.getClients().then(data => setState(prev => ({ ...prev, clients: data }))).catch(err => console.warn('[realtime] Failed to fetch clients:', err));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'timelogs' }, () => {
      db.getTimelogs().then(data => setState(prev => ({ ...prev, timelogs: data }))).catch(err => console.warn('[realtime] Failed to fetch timelogs:', err));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);

// ── Tab-visibility refresh: re-fetch all data when user returns to tab ─────
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      startTransition(() => { fetchAllData(); });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

// ── Global Ctrl/Cmd+K to open the command palette ─────────────────────────
useEffect(() => {
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setSearchOpen((s) => !s);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);

  // ── Optimistic state update → background Supabase persist ─────────────────
  // ponytail: debounce notification saves — they re-fire on every task change
  const notifTimerRef = { current: null };
  const updateState = (newSubState, skipPersist) => {
    // 1. Update React state immediately
    setState(prev => ({ ...prev, ...newSubState }));

    // 2. Persist each changed key to Supabase in the background
    //    skipPersist: optional Set of keys to skip (e.g. 'tasks' when using targeted updateTask)
    Object.entries(newSubState).forEach(([key, val]) => {
      if (skipPersist && skipPersist.has(key)) return;
      // Debounce notifications — re-persists are frequent and redundant
      if (key === 'notifications') {
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => {
          const saveFn = DB_SAVE_MAP[key];
          if (saveFn) saveFn(val).catch(err => console.error(`[updateState] Failed to persist "${key}":`, err));
        }, 300);
        return;
      }
      const saveFn = DB_SAVE_MAP[key];
      if (saveFn) {
        saveFn(val).catch(err =>
          console.error(`[updateState] Failed to persist "${key}" to Supabase:`, err)
        );
      } else {
        console.warn(`[updateState] No save function mapped for key: "${key}"`);
      }
    });
  };

  // ── Login activity tracking ───────────────────────────────────────────────
  const getClientIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch {
      return 'unavailable';
    }
  };

  const recordLoginActivity = async (empId, type) => {
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (type === 'login') {
      const newLog = {
        id:          `LOG${Date.now()}`,
        employeeId:  empId,
        ipAddress:   await getClientIp(),
        device:      navigator.userAgent.substring(0, 60),
        loginAt:     timeStr,
        logoutAt:    null,
        createdAt:   timeStr
      };
      await db.addLoginActivity(newLog);
    } else {
      // Mark the latest open session as logged out
      const logs = await db.getLoginActivity();
      const latest = logs.find(l => l.employeeId === empId && !l.logoutAt);
      if (latest) {
        const updated = logs.map(l =>
          l.id === latest.id ? { ...l, logoutAt: timeStr } : l
        );
        await db.saveLoginActivity(updated); // ← fixed: Supabase, not localStorage
      }
    }

    const activity = await db.getLoginActivity();
    setState(prev => ({ ...prev, loginActivity: activity }));
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLoginSuccess = async (loggedInUser) => {
    setUser(loggedInUser);
    await recordLoginActivity(loggedInUser.id, 'login');

    if (loggedInUser.role === ROLES.SUPER_ADMIN) setActiveTab('founder');
    else if (loggedInUser.role === ROLES.MANAGER)    setActiveTab('manager');
    else if (loggedInUser.role === ROLES.HR)         setActiveTab('HR');
    else                                         setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    if (user) await recordLoginActivity(user.id, 'logout');
    auth.logout();
    setUser(null);
  };

  // ── Notification → app navigation resolver ─────────────────────────────────
  // Maps a notification record to a { tab, focus } pair so the Layout's bell
  // dropdown can route the user to the source when clicked.
  const resolveNotifTarget = (n) => {
    if (!n) return 'dashboard';

    if (n.deadlineTaskId) return 'manager';
    if (n.type === 'assignment' || n.type === 'ping') return 'manager';

    const lower = (n.message || '').toLowerCase();
    if (lower.includes('lead') || lower.includes('proposal') || lower.includes('invoice') || lower.includes('client')) {
      return 'crm';
    }

    return 'dashboard';
  };

  const handleNotifNavigate = (n) => {
    setActiveTab(resolveNotifTarget(n));
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center text-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wider text-slate-400">Loading Secure ERP Modules...</p>
        </div>
      </div>
    );
  }

  // ── 1. Setup Wizard (no employees in DB) ──────────────────────────────────
  if (!isBootstrapped) {
    return (
      <SetupWizard onSetupComplete={(founderUser) => {
        setUser(founderUser);
        setIsBootstrapped(true);
        recordLoginActivity(founderUser.id, 'login');
        setActiveTab('founder');
      }} />
    );
  }

  // ── 1a. One-time invite link ──────────────────────────────────────────────
  if (inviteToken) {
    return (
      <AcceptInvite
        token={inviteToken}
        onInviteAccepted={async (sessionUser) => {
          // Strip the ?invite= param from the URL so a refresh goes to normal login
          window.history.replaceState({}, '', window.location.pathname);
          setUser(sessionUser);
          await recordLoginActivity(sessionUser.id, 'login');
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // ── 2. Login ──────────────────────────────────────────────────────────────
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ── 3. Force password change on first login ───────────────────────────────
  if (user.mustChangePassword) {
    return (
      <ChangePassword user={user} onPasswordUpdated={() => {
        const updatedUser = auth.getCurrentUser();
        setUser(updatedUser);
        setActiveTab('dashboard');
      }} />
    );
  }

  // ── 4. Main app ───────────────────────────────────────────────────────────
  return (
    <Layout
      user={user}
      state={state}
      updateState={updateState}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      onNotifNavigate={handleNotifNavigate}
      onOpenSearch={() => setSearchOpen(true)}
    >
      <Suspense fallback={null}>
        <CommandPalette
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          state={state}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      </Suspense>

      <ErrorBoundary key={activeTab}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
          </div>
        }>

      {activeTab === 'founder' && user.role === ROLES.SUPER_ADMIN && (
        <FounderDashboard state={state} />
      )}

      {activeTab === 'manager' && (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.MANAGER || user.role === ROLES.EMPLOYEE) && (
        <ManagerDashboard user={user} state={state} updateState={updateState} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'my-calendar' && (
        <PersonalCalendar user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'dashboard' && (
        <Dashboard user={user} state={state} updateState={updateState} onNavigate={setActiveTab} />
      )}

      {activeTab === 'projects' && (
        <Projects user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'crm' && (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.MANAGER) && (
        <CRM state={state} updateState={updateState} />
      )}

      {activeTab === 'analytics' && (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.MANAGER) && (
        <Analytics state={state} />
      )}

      {activeTab === 'settings' && (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.MANAGER) && (
        <Settings user={user} state={state} />
      )}

      {activeTab === 'Social Media' && (
        <SocialMedia user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'Paid Ads' && (
        <PaidAds user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'Video Editors' && (
        <Creative user={user} state={state} updateState={updateState} activeDepartment="Video Editors" />
      )}

      {activeTab === 'Graphic Designers' && (
        <Creative user={user} state={state} updateState={updateState} activeDepartment="Graphic Designers" />
      )}

      {activeTab === 'Videography/Photography' && (
        <Creative user={user} state={state} updateState={updateState} activeDepartment="Videography/Photography" />
      )}

      {activeTab === 'Developers' && (
        <Developers user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'HR' && (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.HR || user.role === ROLES.MANAGER) && (
        <HR user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsCenter
          state={state}
          updateState={updateState}
          user={user}
          onNotifNavigate={handleNotifNavigate}
        />
      )}

      {activeTab === 'profile' && (
        <Profile user={user} state={state} updateState={updateState} />
      )}

      </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
