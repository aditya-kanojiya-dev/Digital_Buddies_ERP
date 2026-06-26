import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
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

import { auth } from './data/auth';
import { db } from './data/db';

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
};

export default function App() {
  const [user, setUser]                   = useState(() => auth.getCurrentUser());
  const [loading, setLoading]             = useState(true);
  const [isBootstrapped, setIsBootstrapped] = useState(true);
  const [activeTab, setActiveTab]         = useState('dashboard');

  const [state, setState] = useState({
    employees: [], clients: [], adStats: [], smmCalendar: [], smmQuotes: [],
    devProjects: [], interviews: [], feedback: [], dailyOps: [], attendance: [],
    leaves: [], advances: [], moms: [], tasks: [], taskComments: [], timelogs: [],
    notifications: [], leads: [], proposals: [], invoices: [], projects: [],
    auditLogs: [], employeeInvites: [], loginActivity: []
  });

  // ── Fetch all data from Supabase ──────────────────────────────────────────
  const fetchAllData = async () => {
    try {
      const [
        employees, clients, adStats, smmCalendar, smmQuotes, devProjects,
        interviews, feedback, dailyOps, attendance, leaves, advances, moms,
        tasks, taskComments, timelogs, notifications, leads, proposals, invoices,
        projects, auditLogs, employeeInvites, loginActivity
      ] = await Promise.all([
        db.getEmployees(),
        db.getClients(),
        db.getAdStats(),
        db.getSmmCalendar(),
        db.getSmmQuotes(),
        db.getDevProjects(),      // ← fixed: was db.getProjects() (wrong)
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
        db.getLoginActivity()
      ]);

      setState({
        employees, clients, adStats, smmCalendar, smmQuotes, devProjects,
        interviews, feedback, dailyOps, attendance, leaves, advances, moms,
        tasks, taskComments, timelogs, notifications, leads, proposals, invoices,
        projects, auditLogs, employeeInvites, loginActivity
      });

      // Bootstrap check — if no employees exist, show Setup Wizard
      setIsBootstrapped(employees.length > 0);

    } catch (err) {
      console.error('Error loading data from Supabase:', err);
      // If fetch fails before login (RLS blocks anon), still show setup/login
      // Don't leave the user on a blank loading screen
      setIsBootstrapped(true); // fall through to login; wizard needs anon policy
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

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
  const recordLoginActivity = async (empId, type) => {
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (type === 'login') {
      const newLog = {
        id:          `LOG${Date.now()}`,
        employeeId:  empId,
        ipAddress:   '192.168.1.92',
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
    >
      {activeTab === 'founder' && user.role === 'Super Admin' && (
        <FounderDashboard state={state} />
      )}

      {activeTab === 'manager' && (user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Employee') && (
        <ManagerDashboard user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'dashboard' && (
        <Dashboard user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'projects' && (
        <Projects state={state} updateState={updateState} />
      )}

      {activeTab === 'crm' && (user.role === 'Super Admin' || user.role === 'Manager') && (
        <CRM state={state} updateState={updateState} />
      )}

      {activeTab === 'Paid Ads' && (
        <PaidAds user={user} state={state} updateState={updateState} />
      )}

      {activeTab === 'Social Media' && (
        <SocialMedia user={user} state={state} updateState={updateState} />
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

      {activeTab === 'profile' && (
        <Profile user={user} state={state} updateState={updateState} />
      )}
    </Layout>
  );
}
