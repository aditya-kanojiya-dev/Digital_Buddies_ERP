import { memo, useState, useEffect, useRef } from 'react';
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
  Search,
  Menu,
  X,
  ChevronLeft,
  PieChart,
  Settings as SettingsIcon,
  CalendarDays,
} from 'lucide-react';
import { auth } from '../data/auth';
import { timeAgo, initials } from '../lib/format';
import { ROLES } from '../lib/constants';

const ALL_TABS = [
  { id: 'founder', label: 'Founder Center', icon: Shield, roles: [ROLES.SUPER_ADMIN], group: 'Overview' },
  { id: 'manager', label: 'Work Assignment', icon: Briefcase, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], group: 'Overview' },
  { id: 'dashboard', label: 'My Workspace', icon: CheckCircle, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.EMPLOYEE], group: 'Overview' },
  { id: 'my-calendar', label: 'My Calendar', icon: CalendarDays, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.EMPLOYEE], group: 'Overview' },
  { id: 'analytics', label: 'Analytics', icon: PieChart, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER], group: 'Overview' },

  { id: 'projects', label: 'Projects Kanban', icon: Layers, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER], group: 'Work' },
  { id: 'crm', label: 'CRM Pipeline', icon: DollarSign, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER], group: 'Work' },
  { id: 'Social Media', label: 'Social Media', icon: Calendar, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], dept: 'Social Media', group: 'Departments' },
  { id: 'Paid Ads', label: 'Paid Ads', icon: BarChart2, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], dept: 'Paid Ads', group: 'Departments' },
  { id: 'Video Editors', label: 'Video Editors', icon: Film, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], dept: 'Video Editors', group: 'Departments' },
  { id: 'Graphic Designers', label: 'Graphic Designers', icon: Image, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], dept: 'Graphic Designers', group: 'Departments' },
  { id: 'Videography/Photography', label: 'Videography', icon: Camera, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], dept: 'Videography/Photography', group: 'Departments' },
  { id: 'Developers', label: 'Developers', icon: Code, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE], dept: 'Developers', group: 'Departments' },

  { id: 'HR', label: 'HR & Operations', icon: Users, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.HR], group: 'Admin' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER], group: 'Admin' },
  { id: 'profile', label: 'My Profile', icon: User, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.EMPLOYEE], group: 'Admin' },
];

const GROUP_ORDER = ['Overview', 'Work', 'Departments', 'Admin'];

const SidebarContent = memo(function SidebarContentBase({ showLabels, activeTab, goTo, allowedTabs }) {
  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    tabs: allowedTabs.filter((t) => t.group === g),
  })).filter((g) => g.tabs.length > 0);

  return (
    <nav className="space-y-5">
      {grouped.map(({ group, tabs }) => (
        <div key={group}>
          {showLabels && (
            <p className="text-3xs uppercase text-[var(--nav-text-section)] tracking-[0.15em] px-3 mb-1.5 font-semibold">
              {group}
            </p>
          )}
          <div className="space-y-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => goTo(tab.id)}
                  title={tab.label}
                  className={`w-full flex items-center gap-3 ${
                    showLabels ? 'px-3.5' : 'px-0 justify-center'
                  } py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.98] group relative ${
                    active
                      ? 'bg-[var(--nav-brand-bg)] text-[var(--nav-text-active)] shadow-lg shadow-[var(--nav-brand-shadow)]'
                      : 'text-[var(--nav-text-inactive)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-text-active)]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[var(--nav-brand)]" />
                  )}
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {showLabels && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
});

export default function Layout({
  children,
  user,
  state,
  updateState,
  activeTab,
  setActiveTab,
  onLogout,
  onNotifNavigate,
  onOpenSearch,
}) {
  const { notifications } = state;

  const unreadNotifs = notifications.filter((n) => n.userId === user.id && !n.read);

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sb_collapsed') === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('sb_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      auth.logout();
      window.location.reload();
    }
  };

  const handleMarkAllRead = () => {
    updateState({
      notifications: notifications.map((n) =>
        n.userId === user.id ? { ...n, read: true } : n
      ),
    });
  };

  const handleMarkOneRead = (id) => {
    updateState({
      notifications: notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  };

  const handleNotifClick = (n) => {
    handleMarkOneRead(n.id);
    setShowNotifDropdown(false);
    onNotifNavigate?.(n);
  };

  const goTo = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const allowedTabs = ALL_TABS.filter((tab) => {
    if (!tab.roles.includes(user.role)) return false;
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) return true;
    if (user.role === ROLES.MANAGER) return true;
    if (user.role === ROLES.HR) return tab.id === 'HR' ? true : !tab.dept;
    if (user.role === ROLES.EMPLOYEE) {
      if (['manager', 'dashboard', 'profile', 'my-calendar'].includes(tab.id)) return true;
      return user.department?.includes(tab.dept);
    }
    return false;
  });

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    tabs: allowedTabs.filter((t) => t.group === g),
  })).filter((g) => g.tabs.length > 0);

  return (
    <div className="min-h-screen bg-dark-gradient flex flex-col font-sans">
      <header className="glass-panel sticky top-0 z-[var(--z-sticky)] px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="sm:hidden p-2.5 text-[var(--text-2)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="bg-neon-gradient p-2.5 rounded-xl text-white shadow-lg shadow-fuchsia-600/30">
            <Layers className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Digital Buddies ERP
            </h1>
            <p className="text-3xs text-[var(--text-3)] uppercase tracking-[0.2em]">
              Company Operating System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 relative">
          <button
            onClick={() => onOpenSearch?.()}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-3)] bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)] transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            <span>Search…</span>
            <kbd className="text-3xs text-[var(--text-kbd)] bg-[var(--surface-kbd)] px-1.5 py-0.5 rounded border border-[var(--border-kbd)]">
              Ctrl K
            </kbd>
          </button>
          <button
            onClick={() => onOpenSearch?.()}
            className="sm:hidden p-2.5 text-[var(--text-2)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown((s) => !s)}
              className="p-2.5 hover:bg-[var(--surface-hover)] rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] border border-[var(--border)] relative transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-3xs min-w-[1rem] h-4 px-1 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/30">
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-3 w-80 glass-panel border border-[var(--border)] rounded-2xl p-4 shadow-2xl z-[var(--z-dropdown)] space-y-3 animate-dropdown-pop">
                <div className="flex justify-between items-center border-b border-[var(--border-divider)] pb-2">
                  <h4 className="font-bold text-xs text-[var(--text-1)]">Notifications</h4>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-2xs text-[var(--accent)] hover:text-[var(--accent-strong)] transition-colors cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {unreadNotifs.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-8">
                      <Bell className="w-6 h-6 text-[var(--text-muted)] mb-2" />
                      <p className="text-[0.7rem] text-[var(--text-muted)]">You're all caught up</p>
                    </div>
                  ) : (
                    unreadNotifs.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 bg-[var(--surface-notif-item)] rounded-xl border border-[var(--border-divider)] flex items-start gap-2 hover:border-[var(--border-strong)] transition-all duration-200"
                      >
                        <button
                          onClick={() => handleNotifClick(n)}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-[0.7rem] text-[var(--text-2)] leading-snug">{n.message}</p>
                          <span className="text-3xs text-[var(--text-muted)]">
                            {timeAgo(n.timestamp)}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOneRead(n.id);
                          }}
                          className="text-[var(--text-muted)] hover:text-emerald-400 transition-colors p-1 flex-shrink-0 cursor-pointer"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowNotifDropdown(false);
                    goTo('notifications');
                  }}
                  className="w-full text-[0.7rem] font-bold text-[var(--accent)] hover:text-[var(--accent-strong)] py-1.5 border-t border-[var(--border-divider)] transition-colors cursor-pointer"
                >
                  View all notifications →
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((s) => !s)}
              className="flex items-center gap-2.5 bg-[var(--surface-hover)] pl-1.5 pr-2 sm:pr-3.5 py-1.5 rounded-xl border border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-200 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-strong)] flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials(user.name)
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[var(--text-1)] leading-tight">{user.name}</div>
                <div className="text-2xs text-[var(--text-3)]">{user.designation}</div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 glass-panel border border-[var(--border)] rounded-2xl p-2 shadow-2xl z-[var(--z-dropdown)] animate-dropdown-pop">
                <div className="px-3 py-2 border-b border-[var(--border-divider)] mb-1">
                  <p className="text-xs font-bold text-[var(--text-1)] truncate">{user.name}</p>
                  <p className="text-2xs text-[var(--text-3)] truncate">{user.email}</p>
                  <span className="inline-block mt-1.5 text-3xs font-bold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    goTo('profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" /> My Profile
                </button>
                {allowedTabs.some((t) => t.id === 'settings') && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      goTo('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4" /> Settings
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors mt-1 border-t border-[var(--border-divider)] pt-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside
          className={`hidden sm:flex flex-col justify-between glass-panel border-r border-[var(--border)] p-3 transition-all duration-300 ease-in-out ${
            collapsed ? 'w-[68px]' : 'w-60'
          }`}
        >
          <div className="overflow-y-auto overflow-x-hidden relative">
            <div className="sticky bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t from-[var(--bg-base)] to-transparent z-10" />
            <div className={`transition-all duration-200 ease-in-out ${collapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              <SidebarContent showLabels activeTab={activeTab} goTo={goTo} allowedTabs={allowedTabs} />
            </div>
            <div className={`transition-all duration-200 ease-in-out ${!collapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              <SidebarContent showLabels={false} activeTab={activeTab} goTo={goTo} allowedTabs={allowedTabs} />
            </div>
          </div>
          <button
            onClick={toggleCollapse}
            className="mt-3 flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-1)] text-2xs font-bold px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] transition-all duration-200 cursor-pointer"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && 'Collapse'}
          </button>
        </aside>

        {mobileOpen && (
          <div className="sm:hidden fixed inset-0 z-[var(--z-drawer)] flex">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative w-72 max-w-[80%] glass-panel border-r border-[var(--border)] p-4 overflow-y-auto animate-slide-in-left flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-bold text-[var(--text-1)]">Modules</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent showLabels activeTab={activeTab} goTo={goTo} allowedTabs={allowedTabs} />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 mt-5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border-t border-[var(--border-divider)] pt-4 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-5 md:p-8 overflow-y-auto w-full min-h-[calc(100dvh-64px)]">
          <div className="max-w-7xl mx-auto w-full animate-fade-in" key={activeTab}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
