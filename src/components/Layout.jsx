import React, { useState } from 'react';
import {
  Layers,
  Shield,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  Users,
  Film,
  Image,
  Camera,
  Code,
  BarChart2,
  CheckCircle,
  LogOut,
  Bell,
} from 'lucide-react';
import { auth } from '../data/auth';

export default function Layout({
  children,
  user,
  state,
  updateState,
  activeTab,
  setActiveTab,
  onLogout,
  onNotifNavigate,
}) {
  const { notifications } = state;

  const unreadNotifs = notifications.filter(
    (n) => n.userId === user.id && !n.read
  );

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      auth.logout();
      window.location.reload();
    }
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) =>
      n.userId === user.id
        ? { ...n, read: true }
        : n
    );

    updateState({
      notifications: updated,
    });
  };

  const handleMarkOneRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    updateState({ notifications: updated });
  };

  const handleNotifClick = (n) => {
    handleMarkOneRead(n.id);
    setShowNotifDropdown(false);
    onNotifNavigate?.(n);
  };

  const allTabs = [
    {
      id: 'founder',
      label: 'Founder Center',
      icon: Shield,
      roles: ['Super Admin'],
    },
    {
      id: 'manager',
      label: 'Work Assignment',
      icon: Briefcase,
      roles: ['Super Admin', 'Manager', 'Employee'],
    },
    {
      id: 'dashboard',
      label: 'My Workspace',
      icon: CheckCircle,
      roles: ['Super Admin', 'Manager', 'HR', 'Employee'],
    },
    {
      id: 'projects',
      label: 'Projects Kanban',
      icon: Layers,
      roles: ['Super Admin', 'Manager'],
    },
    {
      id: 'crm',
      label: 'CRM Pipeline',
      icon: DollarSign,
      roles: ['Super Admin', 'Manager'],
    },
    {
      id: 'Paid Ads',
      label: 'Paid Ads Dept',
      icon: BarChart2,
      roles: ['Super Admin', 'Manager', 'Employee'],
      dept: 'Paid Ads',
    },
    {
      id: 'Social Media',
      label: 'Social Media Dept',
      icon: Calendar,
      roles: ['Super Admin', 'Manager', 'Employee'],
      dept: 'Social Media',
    },
    {
      id: 'Video Editors',
      label: 'Video Editors Dept',
      icon: Film,
      roles: ['Super Admin', 'Manager', 'Employee'],
      dept: 'Video Editors',
    },
    {
      id: 'Graphic Designers',
      label: 'Graphic Designers Dept',
      icon: Image,
      roles: ['Super Admin', 'Manager', 'Employee'],
      dept: 'Graphic Designers',
    },
    {
      id: 'Videography/Photography',
      label: 'Videography Dept',
      icon: Camera,
      roles: ['Super Admin', 'Manager', 'Employee'],
      dept: 'Videography/Photography',
    },
    {
      id: 'Developers',
      label: 'Developers Dept',
      icon: Code,
      roles: ['Super Admin', 'Manager', 'Employee'],
      dept: 'Developers',
    },
    {
      id: 'HR',
      label:
        user.role === 'Manager'
          ? 'Employee Roster'
          : 'HR & Operations',
      icon: Users,
      roles: ['Super Admin', 'Manager', 'HR'],
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['Super Admin', 'Manager', 'HR', 'Employee'],
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      roles: ['Super Admin', 'Manager', 'HR', 'Employee'],
    },
  ];

  const allowedTabs = allTabs.filter((tab) => {
    // Role check first
    if (!tab.roles.includes(user.role)) {
      return false;
    }

    // Super Admin sees everything
    if (
      user.role === 'Super Admin' ||
      user.role === 'Admin'
    ) {
      return true;
    }

    // Managers see everything
    if (user.role === 'Manager') {
      return true;
    }

    // HR sees only HR + general tabs
    if (user.role === 'HR') {
      if (tab.id === 'HR') {
        return true;
      }

      return !tab.dept;
    }

    // Employees
    if (user.role === 'Employee') {
      const generalTabs = [
        'manager',
        'dashboard',
        'profile',
      ];

      if (generalTabs.includes(tab.id)) {
        return true;
      }

      return tab.dept === user.department;
    }

    return false;
  });

  return (
    <div className="min-h-screen bg-dark-gradient flex flex-col font-sans">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-violet-500/10">
        <div className="flex items-center gap-3">
          <div className="bg-neon-gradient p-2.5 rounded-xl text-white shadow-lg shadow-fuchsia-600/30">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Digital Buddies ERP
            </h1>

            <p className="text-3xs text-slate-400 uppercase tracking-widest">
              Company Operating System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() =>
                setShowNotifDropdown(
                  !showNotifDropdown
                )
              }
              className="p-2 hover:bg-slate-900/60 rounded-full text-slate-400 hover:text-slate-200 border border-slate-800/40 relative"
            >
              <Bell className="w-5 h-5" />

              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-3xs w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-3 w-80 glass-panel border border-violet-500/15 rounded-2xl p-4 shadow-xl z-50 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <h4 className="font-bold text-xs text-slate-200">
                    Workspace Pings
                  </h4>

                  <button
                    onClick={handleMarkAllRead}
                    className="text-3xs text-violet-400"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                  {unreadNotifs.length === 0 ? (
                    <p className="text-3xs text-slate-500 text-center py-6">
                      No new notifications
                    </p>
                  ) : (
                    unreadNotifs.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 bg-slate-950/45 rounded-lg border border-slate-900 flex items-start gap-2"
                      >
                        <button
                          onClick={() => handleNotifClick(n)}
                          className="flex-1 text-left hover:bg-slate-900/40 -m-1 p-1 rounded transition cursor-pointer"
                        >
                          <p className="text-3xs text-slate-300">
                            {n.message}
                          </p>
                          <span className="text-4xs text-slate-500">
                            {n.timestamp}
                          </span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkOneRead(n.id); }}
                          className="text-slate-500 hover:text-emerald-400 transition p-1 flex-shrink-0"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => { setShowNotifDropdown(false); setActiveTab('notifications'); }}
                  className="w-full text-3xs font-bold text-violet-400 hover:text-violet-300 py-1.5 border-t border-slate-900 transition cursor-pointer"
                >
                  View all notifications →
                </button>
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-3 bg-slate-900/40 px-3.5 py-1.5 rounded-xl border border-slate-800/45">
            <div className="w-8 h-8 rounded-full bg-violet-650 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>

            <div className="hidden md:block">
              <div className="text-xs font-bold text-slate-200">
                {user.name}
              </div>

              <div className="text-3xs text-slate-400">
                {user.designation}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 glass-panel border-r border-violet-500/5 p-4 flex flex-col justify-between">
          <div>
            <p className="text-3xs uppercase text-slate-500 tracking-widest pl-3 mb-2">
              Workspace Modules
            </p>

            <nav className="space-y-1">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                      activeTab === tab.id
                        ? 'bg-violet-650 text-white'
                        : 'text-slate-400 hover:bg-slate-900/35 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-slate-900 pt-4 pl-2 space-y-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-rose-400 text-3xs font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Session
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}