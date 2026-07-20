import { useState, useMemo } from 'react';
import { User, Mail, Calendar, Code, Save, Image, Shield, Briefcase, BarChart3, CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp, Flame, Target } from 'lucide-react';
import { useToast } from './shared/Toast';
import { Button, Card, Field, Input, Textarea } from './ui';
import { today as todayStr } from '../lib/format';

export default function Profile({ user, state, updateState }) {
  const toast = useToast();
  const employee = state.employees.find(e => e.id === user.id);

  const [name, setName] = useState(employee?.name || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [bio, setBio] = useState(employee?.bio || '');
  const [skills, setSkills] = useState(employee?.skills || '');
  const [avatar, setAvatar] = useState(employee?.avatar || '');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name) return;
    const updatedEmployees = state.employees.map(emp => {
      if (emp.id === user.id) {
        return {
          ...emp,
          // ponytail: no DOMPurify needed — values rendered via React JSX which escapes by default
          name,
          phone,
          bio,
          skills,
          avatar
        };
      }
      return emp;
    });
    updateState({ employees: updatedEmployees });
    const session = sessionStorage.getItem('neomax_session');
    if (session) {
      try {
        const s = JSON.parse(session);
        s.name = name;
        s.avatar = avatar;
        sessionStorage.setItem('neomax_session', JSON.stringify(s));
      } catch (err) { console.warn('[Profile] Failed to update session:', err); }
    }
    toast.success('Profile updated');
  };

  const stats = useMemo(() => {
    const uid = user.id;
    const today = todayStr();
    const myTasks = (state.tasks || []).filter(t => t.assignedTo === uid || t.assignedTo2 === uid);

    const total = myTasks.length;
    const completed = myTasks.filter(t => t.status === 'Completed').length;
    const inProgress = myTasks.filter(t => t.status === 'In Progress').length;
    const inReview = myTasks.filter(t => t.status === 'Review').length;
    const overdue = myTasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < today).length;
    const delayed = myTasks.filter(t => t.isDelayed).length;
    const totalDelayDays = myTasks.reduce((sum, t) => sum + (t.delayCount || 0), 0);
    const totalRevisions = myTasks.reduce((sum, t) => sum + (t.revisionCount || 0), 0);
    const avgRevisions = total > 0 ? (totalRevisions / total).toFixed(1) : '0';
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = completed > 0
      ? Math.round(((completed - myTasks.filter(t => t.status === 'Completed' && t.isDelayed).length) / completed) * 100)
      : 100;

    const byPriority = { Emergency: 0, High: 0, Medium: 0, Low: 0 };
    myTasks.forEach(t => { if (byPriority[t.priority] !== undefined) byPriority[t.priority]++; });

    const byStatus = { New: 0, 'In Progress': 0, Review: 0, Completed: 0 };
    myTasks.forEach(t => { if (byStatus[t.status] !== undefined) byStatus[t.status]++; });

    const byDept = {};
    myTasks.forEach(t => { byDept[t.department] = (byDept[t.department] || 0) + 1; });

    const recentCompleted = myTasks
      .filter(t => t.status === 'Completed')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5);

    return {
      total, completed, inProgress, inReview, overdue, delayed,
      totalDelayDays, totalRevisions, avgRevisions, completionRate, onTimeRate,
      byPriority, byStatus, byDept, recentCompleted,
    };
  }, [state.tasks, user.id]);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <div className="bg-neon-gradient p-2.5 rounded-xl text-white shadow-lg shadow-fuchsia-600/20">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-100">My Profile</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage your personal information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--accent-strong)] flex items-center justify-center text-white font-bold text-2xl overflow-hidden mb-4 border-2 border-violet-500/30">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-2">
              <Image className="w-4 h-4" /> Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="w-4 h-4" /> {user.email}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Briefcase className="w-4 h-4" /> {employee?.designation || '—'}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" /> Joined {employee?.joinDate || '—'}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Code className="w-4 h-4" /> {employee?.department || '—'}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-full">{user.role}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" htmlFor="pname" required>
                <Input id="pname" value={name} onChange={e => setName(e.target.value)} required />
              </Field>
              <Field label="Phone" htmlFor="pphone">
                <Input id="pphone" value={phone} onChange={e => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="Bio" htmlFor="pbio">
              <Textarea id="pbio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
            </Field>
            <Field label="Skills" htmlFor="pskills" hint="Comma-separated list of your skills">
              <Input id="pskills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Design, Marketing..." />
            </Field>
            <Button type="submit" icon={Save}>Save Profile</Button>
          </form>
        </Card>
      </div>

      {/* ── Analytics ── */}
      {stats.total > 0 && employee?.department?.some(d => ['Video Editors', 'Graphic Designers', 'Videography/Photography'].includes(d)) && (
        <div className="space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-fuchsia-400" />
            <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">My Work Analytics</h3>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-3xs text-slate-500 uppercase font-semibold">Total Tasks</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-100">{stats.total}</p>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-3xs text-slate-500 uppercase font-semibold">Completed</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-400">{stats.completed}</p>
              <p className="text-3xs text-slate-500 mt-0.5">{stats.completionRate}% rate</p>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-3xs text-slate-500 uppercase font-semibold">In Progress</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-blue-400">{stats.inProgress}</p>
              <p className="text-3xs text-slate-500 mt-0.5">{stats.inReview} in review</p>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-3xs text-slate-500 uppercase font-semibold">Overdue</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-rose-400">{stats.overdue}</p>
              <p className="text-3xs text-slate-500 mt-0.5">{stats.delayed} delayed</p>
            </Card>
          </div>

          {/* Performance bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Completion Rate</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
              </div>
              <div className="flex justify-between text-3xs text-slate-500">
                <span>{stats.completed} of {stats.total} tasks done</span>
                <span className="text-emerald-400 font-bold">{stats.completionRate}%</span>
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">On-Time Delivery</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${stats.onTimeRate}%` }} />
              </div>
              <div className="flex justify-between text-3xs text-slate-500">
                <span>{stats.totalDelayDays} total delay incidents</span>
                <span className="text-amber-400 font-bold">{stats.onTimeRate}%</span>
              </div>
            </Card>
          </div>

          {/* Priority + Status breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4 space-y-3">
              <span className="text-xs font-bold text-slate-200">By Priority</span>
              {[
                { label: 'Emergency', count: stats.byPriority.Emergency, color: 'bg-red-500', text: 'text-red-400' },
                { label: 'High', count: stats.byPriority.High, color: 'bg-rose-500', text: 'text-rose-400' },
                { label: 'Medium', count: stats.byPriority.Medium, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Low', count: stats.byPriority.Low, color: 'bg-slate-500', text: 'text-slate-400' },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{}} />
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.color}`} />
                  <span className="text-3xs text-slate-400 w-16">{p.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full`} style={{ width: stats.total > 0 ? `${(p.count / stats.total) * 100}%` : '0%' }} />
                  </div>
                  <span className={`text-3xs font-bold ${p.text} w-4 text-right`}>{p.count}</span>
                </div>
              ))}
            </Card>
            <Card className="p-4 space-y-3">
              <span className="text-xs font-bold text-slate-200">By Status</span>
              {[
                { label: 'New', count: stats.byStatus.New, color: 'bg-fuchsia-500', text: 'text-fuchsia-400' },
                { label: 'In Progress', count: stats.byStatus['In Progress'], color: 'bg-blue-500', text: 'text-blue-400' },
                { label: 'Review', count: stats.byStatus.Review, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Completed', count: stats.byStatus.Completed, color: 'bg-emerald-500', text: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.color}`} />
                  <span className="text-3xs text-slate-400 w-16">{s.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: stats.total > 0 ? `${(s.count / stats.total) * 100}%` : '0%' }} />
                  </div>
                  <span className={`text-3xs font-bold ${s.text} w-4 text-right`}>{s.count}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-800/50 flex items-center gap-2">
                <Zap className="w-3 h-3 text-violet-400" />
                <span className="text-3xs text-slate-500">Avg revisions: <span className="text-violet-400 font-bold">{stats.avgRevisions}</span></span>
              </div>
            </Card>
          </div>

          {/* Department breakdown + Recent completions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4 space-y-3">
              <span className="text-xs font-bold text-slate-200">By Department</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byDept)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => (
                    <span key={dept} className="inline-flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-3xs">
                      <span className="text-slate-300 font-medium">{dept}</span>
                      <span className="text-fuchsia-400 font-bold">{count}</span>
                    </span>
                  ))}
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <span className="text-xs font-bold text-slate-200">Recent Completions</span>
              {stats.recentCompleted.length === 0 ? (
                <p className="text-3xs text-slate-500 italic">No completed tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentCompleted.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="text-3xs text-slate-300 truncate flex-1">{t.title}</span>
                      <span className="text-3xs text-slate-600 flex-shrink-0">{t.department}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
