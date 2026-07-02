import React, { useState, useMemo } from 'react';
import {
  Layers, Plus, Search, User, Filter, X, Edit3, Trash2,
  AlertCircle, CheckCircle2, Clock, Briefcase, Target
} from 'lucide-react';
import { useToast } from './shared/Toast';
import TaskCard from './shared/TaskCard';
import TaskDetailPanel from './shared/TaskDetailPanel';
import { Modal, ConfirmDialog, Button, DatePicker } from './ui';

const COLUMNS = ['Backlog', 'Active', 'Review', 'Blocked', 'Completed'];

const COLUMN_STYLES = {
  'Backlog':   { header: 'text-slate-400', border: 'border-l-slate-500' },
  'Active':    { header: 'text-blue-400',   border: 'border-l-blue-500' },
  'Review':    { header: 'text-amber-400',  border: 'border-l-amber-500' },
  'Blocked':   { header: 'text-rose-400',   border: 'border-l-rose-500' },
  'Completed': { header: 'text-emerald-400',border: 'border-l-emerald-500' },
};

export default function Projects({ state, updateState }) {
  const toast = useToast();
  const { projects, clients, employees, tasks, taskComments } = state;

  // ── Filters ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Selected project detail ─────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState(null);

  // ── Drag state ──────────────────────────────────────────────────────────
  const [dragOverCol, setDragOverCol] = useState(null);

  // ── New project form ────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projOwner, setProjOwner] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDeadline, setProjDeadline] = useState('');
  const [projBudget, setProjBudget] = useState('');
  const [projDept, setProjDept] = useState('');

  // ── Milestone form ──────────────────────────────────────────────────────
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msName, setMsName] = useState('');
  const [msAssignee, setMsAssignee] = useState('');
  const [msDue, setMsDue] = useState('');

  // ── Task detail panel ───────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState(null);

  // ════════════════════════════════════════════════════════════════════════
  //  COMPUTED
  // ════════════════════════════════════════════════════════════════════════

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q));
    }
    if (filterClient) list = list.filter(p => p.clientId === filterClient);
    if (filterOwner) list = list.filter(p => p.ownerId === filterOwner);
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    return list;
  }, [projects, search, filterClient, filterOwner, filterStatus]);

  const columns = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(c => { grouped[c] = []; });
    filteredProjects.forEach(p => {
      const col = COLUMNS.includes(p.status) ? p.status : 'Backlog';
      grouped[col].push(p);
    });
    return grouped;
  }, [filteredProjects]);

  // Milestones = tasks linked to the current project via project_id
  const projectMilestones = (projectId) =>
    (tasks || []).filter(t => t.projectId === projectId);

  const projectProgress = (projectId) => {
    const ms = projectMilestones(projectId);
    if (ms.length === 0) return 0;
    const done = ms.filter(t => t.status === 'Completed').length;
    return Math.round((done / ms.length) * 100);
  };

  const clientName = (id) => clients.find(c => c.id === id)?.name || 'Unknown';
  const empName = (id) => employees.find(e => e.id === id)?.name || 'Unassigned';

  const commentCounts = useMemo(() => {
    const counts = {};
    (taskComments || []).forEach(c => {
      counts[c.taskId] = (counts[c.taskId] || 0) + 1;
    });
    return counts;
  }, [taskComments]);

  // ════════════════════════════════════════════════════════════════════════
  //  HANDLERS
  // ════════════════════════════════════════════════════════════════════════

  const resetForm = () => {
    setProjName(''); setProjClient(''); setProjOwner(''); setProjDesc('');
    setProjDeadline(''); setProjBudget(''); setProjDept('');
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projName) return;
    const client = clients.find(c => c.id === projClient);
    const newProj = {
      id: `PROJ${Date.now()}`,
      name: projName,
      clientId: projClient || null,
      ownerId: projOwner || null,
      status: 'Backlog',
      description: projDesc || '',
      deadline: projDeadline || null,
      budget: parseFloat(projBudget) || 0,
      department: projDept || null,
    };
    updateState({ projects: [...projects, newProj] });
    toast.success(`Project "${projName}" created`);
    resetForm();
    setShowForm(false);
  };

  // Drag and drop
  const handleDragStart = (e, projId) => {
    e.dataTransfer.setData('text/plain', projId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const projId = e.dataTransfer.getData('text/plain');
    if (!projId) return;
    const proj = projects.find(p => p.id === projId);
    if (!proj || proj.status === targetStatus) return;
    const updated = projects.map(p => p.id === projId ? { ...p, status: targetStatus } : p);
    updateState({ projects: updated });
    toast.success(`Project moved to ${targetStatus}`);
  };

  // Add milestone (creates a task linked to this project)
  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!msName || !selectedProject) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newTask = {
      id: `TSK${Date.now()}`,
      title: msName,
      description: '',
      projectId: selectedProject.id,
      assignedTo: msAssignee || null,
      assignedBy: '',
      department: selectedProject.department || '',
      priority: 'Medium',
      status: 'New',
      dueDate: msDue || null,
      createdAt: now,
    };
    updateState({ tasks: [...(tasks || []), newTask] });
    toast.success(`Milestone "${msName}" added to project`);
    setMsName(''); setMsAssignee(''); setMsDue('');
    setShowMilestoneForm(false);
  };

  // Open task detail
  const handleOpenTaskDetail = (task) => {
    setSelectedTask(task);
  };

  // Delete project
  const [deleteTarget, setDeleteTarget] = useState(null);
  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    const updated = projects.filter(p => p.id !== deleteTarget.id);
    updateState({ projects: updated });
    toast.success('Project deleted');
    setDeleteTarget(null);
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Projects</h2>
            <p className="text-sm text-slate-400">{projects.length} projects · {tasks.filter(t => t.projectId).length} milestones</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card p-3 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none" placeholder="Search projects..." />
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="glass-input p-2 rounded-lg text-xs">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
          className="glass-input p-2 rounded-lg text-xs">
          <option value="">All Owners</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="glass-input p-2 rounded-lg text-xs">
          <option value="">All Status</option>
          {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Kanban Board ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {COLUMNS.map(col => {
          const colProjs = columns[col] || [];
          const style = COLUMN_STYLES[col];
          const isOver = dragOverCol === col;
          return (
            <div key={col}
              className={`glass-panel rounded-2xl flex flex-col min-h-[300px] border-l-4 ${style.border} ${isOver ? 'ring-2 ring-violet-500/50' : ''}`}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className={`p-3 border-b border-slate-800/60 flex items-center justify-between`}>
                <h3 className={`text-sm font-bold ${style.header}`}>{col}</h3>
                <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">{colProjs.length}</span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {colProjs.length === 0 ? (
                  <div className="flex items-center justify-center h-16 border border-dashed border-slate-800 rounded-lg">
                    <p className="text-3xs text-slate-600">Drop here</p>
                  </div>
                ) : (
                  colProjs.map(proj => {
                    const progress = projectProgress(proj.id);
                    const msCount = projectMilestones(proj.id).length;
                    const doneMs = projectMilestones(proj.id).filter(t => t.status === 'Completed').length;
                    const isOverdue = proj.deadline && proj.deadline < new Date().toISOString().split('T')[0] && proj.status !== 'Completed';
                    return (
                      <div key={proj.id} draggable
                        onDragStart={(e) => handleDragStart(e, proj.id)}
                        className={`glass-card p-4 rounded-xl space-y-2.5 cursor-grab active:cursor-grabbing border-l-2 ${
                          isOverdue ? 'border-l-rose-500' : 'border-l-violet-500'
                        }`}
                        onClick={() => setSelectedProject(proj)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-200">{proj.name}</h4>
                        </div>
                        {proj.clientId && (
                          <p className="text-3xs text-slate-400 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {clientName(proj.clientId)}
                          </p>
                        )}
                        {proj.ownerId && (
                          <p className="text-3xs text-violet-400 flex items-center gap-1">
                            <User className="w-3 h-3" /> {empName(proj.ownerId)}
                          </p>
                        )}
                        {proj.description && (
                          <p className="text-3xs text-slate-500 line-clamp-2">{proj.description}</p>
                        )}

                        {/* Progress bar */}
                        {msCount > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-3xs">
                              <span className="text-slate-500">Milestones: {doneMs}/{msCount}</span>
                              <span className={`font-semibold ${progress >= 100 ? 'text-emerald-400' : 'text-violet-400'}`}>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                                style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Deadline */}
                        {proj.deadline && (
                          <p className={`text-3xs flex items-center gap-1 ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3" /> {isOverdue ? 'Overdue: ' : 'Due: '}{proj.deadline}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── New Project Modal ── */}
      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm(); }}
        title="Create New Project" size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateProject} icon={Plus}>Create Project</Button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project Name *</label>
              <input type="text" value={projName} onChange={e => setProjName(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Client</label>
              <select value={projClient} onChange={e => setProjClient(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm">
                <option value="">— None —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project Owner</label>
              <select value={projOwner} onChange={e => setProjOwner(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm">
                <option value="">— Unassigned —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Department</label>
              <select value={projDept} onChange={e => setProjDept(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm">
                <option value="">— None —</option>
                {['General', 'Developers', 'Social Media', 'Paid Ads', 'Video Editors', 'Graphic Designers', 'Videography/Photography'].map(d =>
                  <option key={d} value={d}>{d}</option>
                )}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DatePicker label="Target Deadline" value={projDeadline} onChange={setProjDeadline} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Budget (₹)</label>
              <input type="number" value={projBudget} onChange={e => setProjBudget(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={projDesc} onChange={e => setProjDesc(e.target.value)}
              className="w-full glass-input p-2.5 rounded-xl text-sm h-20" />
          </div>
        </div>
      </Modal>

      {/* ── Project Detail Drawer ── */}
      {selectedProject && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setSelectedProject(null)} />
          <aside className="fixed right-0 top-0 h-full w-full max-w-md glass-panel border-l border-violet-500/15 z-50 flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 flex-shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold ${
                    selectedProject.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    selectedProject.status === 'Blocked' ? 'bg-rose-500/10 text-rose-400' :
                    selectedProject.status === 'Review' ? 'bg-amber-500/10 text-amber-400' :
                    selectedProject.status === 'Active' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>{selectedProject.status}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">{selectedProject.name}</h3>
                {selectedProject.clientId && (
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {clientName(selectedProject.clientId)}</p>
                )}
                {selectedProject.ownerId && (
                  <p className="text-xs text-violet-400 flex items-center gap-1"><User className="w-3 h-3" /> {empName(selectedProject.ownerId)}</p>
                )}
                {selectedProject.description && <p className="text-xs text-slate-400">{selectedProject.description}</p>}
                <div className="flex gap-3 text-xs text-slate-500">
                  {selectedProject.deadline && <span><Clock className="w-3 h-3 inline" /> Due: {selectedProject.deadline}</span>}
                  {selectedProject.budget > 0 && <span>Budget: ₹{selectedProject.budget.toLocaleString()}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedProject(null)}
                className="text-slate-500 hover:text-slate-200 transition p-1 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {/* Actions */}
              <div className="flex gap-2">
                {COLUMNS.map(s => {
                  if (s === selectedProject.status) return null;
                  return (
                    <button key={s} onClick={() => {
                      const updated = projects.map(p => p.id === selectedProject.id ? { ...p, status: s } : p);
                      updateState({ projects: updated });
                      setSelectedProject(prev => ({ ...prev, status: s }));
                      toast.success(`Moved to ${s}`);
                    }}
                      className={`text-3xs px-2 py-1 rounded-lg font-bold border transition ${
                        s === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
                        s === 'Blocked' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' :
                        'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}>
                      {s}
                    </button>
                  );
                })}
                <button onClick={() => { setDeleteTarget(selectedProject); }}
                  className="text-3xs px-2 py-1 rounded-lg font-bold border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition">
                  <Trash2 className="w-3 h-3 inline" />
                </button>
              </div>

              {/* Progress */}
              {(() => {
                const ms = projectMilestones(selectedProject.id);
                const done = ms.filter(t => t.status === 'Completed').length;
                const pct = ms.length > 0 ? Math.round((done / ms.length) * 100) : 0;
                return ms.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-bold text-violet-400">{done}/{ms.length} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-3xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                    <Target className="w-3 h-3" /> Milestones ({projectMilestones(selectedProject.id).length})
                  </h4>
                  <button onClick={() => setShowMilestoneForm(true)}
                    className="text-3xs text-violet-400 hover:text-violet-300 font-bold transition flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {projectMilestones(selectedProject.id).length === 0 ? (
                    <p className="text-xs text-slate-600 italic text-center py-4 border border-dashed border-slate-800 rounded-xl">
                      No milestones yet — add one to track progress.
                    </p>
                  ) : (
                    projectMilestones(selectedProject.id).map(task => {
                      const assignee = employees.find(e => e.id === task.assignedTo);
                      const cCount = commentCounts[task.id] || 0;
                      return (
                        <div key={task.id} className="scale-[0.97] origin-left">
                          <TaskCard
                            task={task}
                            assignee={assignee}
                            commentsCount={cCount}
                            currentUser={{}}
                            viewMode="employee"
                            onStatusChange={(id, status) => {
                              const updated = (tasks || []).map(t => t.id === id ? { ...t, status } : t);
                              updateState({ tasks: updated });
                            }}
                            onOpenDetail={handleOpenTaskDetail}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── Add Milestone Modal ── */}
      <Modal open={showMilestoneForm} onClose={() => { setShowMilestoneForm(false); setMsName(''); }}
        title="Add Milestone" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowMilestoneForm(false); setMsName(''); }}>Cancel</Button>
            <Button variant="primary" onClick={handleAddMilestone} icon={Plus}>Add</Button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Milestone Name *</label>
            <input type="text" value={msName} onChange={e => setMsName(e.target.value)}
              className="w-full glass-input p-2.5 rounded-xl text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assign to</label>
            <select value={msAssignee} onChange={e => setMsAssignee(e.target.value)}
              className="w-full glass-input p-2.5 rounded-xl text-sm">
              <option value="">— Unassigned —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <DatePicker label="Due Date" value={msDue} onChange={setMsDue} />
          </div>
        </div>
      </Modal>

      {/* ── Task Detail Panel ── */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          state={state}
          updateState={updateState}
          currentUser={{}}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project?"
        message={`This will permanently remove "${deleteTarget?.name}". Milestone tasks will remain but will be unlinked.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
