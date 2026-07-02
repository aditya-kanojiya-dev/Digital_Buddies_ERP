import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Login from './components/Login';
import SetupWizard from './components/SetupWizard';
import ChangePassword from './components/ChangePassword';
import Profile from './components/Profile';
import Dashboard from './components/Dashboard';
import CRM from './components/CRM';
import Projects from './components/Projects';
import FounderDashboard from './components/FounderDashboard';
import ManagerDashboard from './components/ManagerDashboard';

import PaidAds from './components/Departments/PaidAds';
import SocialMedia from './components/Departments/SocialMedia';
import Creative from './components/Departments/Creative';
import Developers from './components/Departments/Developers';
import HR from './components/Departments/HR';

import NotificationsCenter from './components/shared/NotificationsCenter';
import PersonalCalendar from './components/shared/PersonalCalendar';
import AcceptInvite from './components/AcceptInvite';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import CommandPalette from './components/CommandPalette';
import { auth, supabase } from './data/auth';
import { db } from './data/db';
import { runDeadlineEngine } from './lib/deadlineEngine';

// Key → db.js save function mapping for Supabase persistence
const DB_SAVE_MAP = {
  employees:       db.saveEmployees,
  clients:         db.saveClients,
  adStats:         db.saveAdStats,
  smmCalendar:     db.saveSmmCalendar,
  smmQuotes:       db.saveSmmQuotes,
  devProjects:     db.saveDevProjects,
  interviews:      db.saveInterviews,
  feedback:        db.saveFeedback,
  dailyOps:        db.saveDailyOps,
  attendance:      db.saveAttendance,
  leaves:          db.saveLeaves,
  advances:        db.saveAdvances,
  moms:            db.saveMoms,
  tasks:           db.saveTasks,
  taskComments:    db.saveTaskComments,
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
    devProjects: [], interviews: [], feedback: [], dailyOps: [], attendance: [],
    leaves: [], advances: [], moms: [], tasks: [], taskComments: [], timelogs: [],
    notifications: [], leads: [], proposals: [], invoices: [], projects: [],
    auditLogs: [], employeeInvites: [], loginActivity: []
  });

 // ── Fetch all data from Supabase ──────────────────────────────────────────
const fetchAllData = async () => {
  try {
    await supabase.auth.getSession();

    const results = await Promise.allSettled([
      db.getEmployees(),
      db.getClients(),
      db.getAdStats(),
      db.getSmmCalendar(),
      db.getSmmQuotes(),
      db.getDevProjects(),
      db.getInterviews(),
      db.getFeedback(),
      db.getDailyOps(),
      db.getAttendance(),
      db.getLeaves(),
      db.getAdvances(),
      db.getMoms(),
      db.getTasks(),
      db.getComments(),
      db.getTimelogs(),
      db.getNotifications(),
      db.getLeads(),
      db.getProposals(),
      db.getInvoices(),
      db.getProjects(),
      db.getAuditLogs(),
      db.getEmployeeInvites(),
      db.getLoginActivity(),
      db.getAdCampaigns()
    ]);

    // Log failed requests so you know which tables have RLS issues
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Fetch ${i} failed:`, r.reason);
      }
    });

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
      taskComments: getResult(14),
      timelogs: getResult(15),
      notifications: getResult(16),
      leads: getResult(17),
      proposals: getResult(18),
      invoices: getResult(19),
      projects: getResult(20),
      auditLogs: getResult(21),
      employeeInvites: getResult(22),
      loginActivity: getResult(23),
      adCampaigns: getResult(24)
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
  const init = async () => {
    await supabase.auth.getSession();

    await fetchAllData();
  };

  init();
}, [user]);

// ── Global Realtime subscription ───────────────────────────────────────────
useEffect(() => {
  if (!supabase || !user) return;

  const channel = supabase
    .channel('erp-global-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      db.getTasks().then(data => setState(prev => ({ ...prev, tasks: data })));
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    }, () => {
      db.getNotifications().then(data => setState(prev => ({ ...prev, notifications: data })));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'smm_calendar' }, () => {
      db.getSmmCalendar().then(data => setState(prev => ({ ...prev, smmCalendar: data })));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
      db.getProjects().then(data => setState(prev => ({ ...prev, projects: data })));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
      db.getAttendance().then(data => setState(prev => ({ ...prev, attendance: data })));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
      db.getLeaves().then(data => setState(prev => ({ ...prev, leaves: data })));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, () => {
      db.getAdvances().then(data => setState(prev => ({ ...prev, advances: data })));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns' }, () => {
      db.getAdCampaigns().then(data => setState(prev => ({ ...prev, adCampaigns: data })));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
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
  const updateState = (newSubState) => {
    // 1. Update React state immediately
    setState(prev => ({ ...prev, ...newSubState }));

    // 2. Persist each changed key to Supabase in the background
    Object.entries(newSubState).forEach(([key, val]) => {
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

    if (loggedInUser.role === 'Super Admin') setActiveTab('founder');
    else if (loggedInUser.role === 'Manager')    setActiveTab('manager');
    else if (loggedInUser.role === 'HR')         setActiveTab('HR');
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
    if (!n) return { tab: 'dashboard', focus: null };

    // Deadline engine notifications carry the originating task id
    if (n.deadlineTaskId) return { tab: 'manager', focus: { taskId: n.deadlineTaskId } };

    // Comment pings — surface in the same manager view, focused on the task
    if (n.type === 'comment') {
      const c = (state.taskComments || []).find(c => c.id === n.commentId);
      if (c?.taskId) return { tab: 'manager', focus: { taskId: c.taskId } };
    }

    // Assignment / ping / generic — manager tab is the right home
    if (n.type === 'assignment' || n.type === 'ping') {
      return { tab: 'manager', focus: null };
    }

    // Lead / proposal / invoice — anything mentioning client-facing modules
    const lower = (n.message || '').toLowerCase();
    if (lower.includes('lead') || lower.includes('proposal') || lower.includes('invoice') || lower.includes('client')) {
      return { tab: 'crm', focus: null };
    }

    return { tab: 'dashboard', focus: null };
  };

  const handleNotifNavigate = (n) => {
    const target = resolveNotifTarget(n);
    setActiveTab(target.tab);
    // `focus` is consumed by individual pages that mount a TaskDetailPanel
    // (ManagerDashboard for now). Pages can read it from a context or via a
    // module-level cache; for v1 the resolver just sets the active tab.
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
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        state={state}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      <ErrorBoundary key={activeTab}>

      {activeTab === 'founder' && user.role === 'Super Admin' && (
        <FounderDashboard state={state} />
      )}

      {activeTab === 'manager' && (user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Employee') && (
        <ManagerDashboard user={user} state={state} updateState={updateState} setActiveTab={setActiveTab} />
      )}

      {activeTab === 'my-calendar' && (
        <PersonalCalendar user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'dashboard' && (
        <Dashboard user={user} state={state} updateState={updateState} onNavigate={setActiveTab} />
      )}

      {activeTab === 'projects' && (
        <Projects state={state} updateState={updateState} />
      )}

      {activeTab === 'crm' && (user.role === 'Super Admin' || user.role === 'Manager') && (
        <CRM state={state} updateState={updateState} />
      )}

      {activeTab === 'analytics' && (user.role === 'Super Admin' || user.role === 'Manager') && (
        <Analytics state={state} />
      )}

      {activeTab === 'settings' && (user.role === 'Super Admin' || user.role === 'Manager') && (
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

      {activeTab === 'HR' && (user.role === 'Super Admin' || user.role === 'HR' || user.role === 'Manager') && (
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

      </ErrorBoundary>
    </Layout>
  );
}
