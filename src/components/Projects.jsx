import React, { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { useToast } from './shared/Toast';

export default function Projects({ state, updateState }) {
  const toast = useToast();
  const { projects, clients } = state;

  // New Project Form
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDeadline, setProjDeadline] = useState('');
  const [projMilestones, setProjMilestones] = useState('');

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projName || !projClient) return;

    const newProj = {
      id: `PROJ${Date.now()}`,
      name: projName,
      client: projClient,
      status: 'Active',
      description: projDesc,
      deadline: projDeadline || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      milestones: projMilestones || '1. Kickoff meeting\n2. Design layouts\n3. Backend API\n4. final deployment'
    };

    updateState({ projects: [...projects, newProj] });
    toast.success(`Project "${projName}" created`);
    
    // Reset
    setProjName('');
    setProjDesc('');
    setProjDeadline('');
    setProjMilestones('');
  };

  const handleUpdateProjectStatus = (projId, nextStatus) => {
    const updated = projects.map(p => p.id === projId ? { ...p, status: nextStatus } : p);
    updateState({ projects: updated });
  };

  const columns = ['Backlog', 'Active', 'Completed'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Kanban Board of Projects */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" /> Project Kanban Boards
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(col => {
            const colProjects = projects.filter(p => p.status === col || (col === 'Active' && p.status === 'In Progress'));
            return (
              <div key={col} className="bg-slate-950/45 p-4 rounded-xl border border-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">{col}</h3>
                  <span className="bg-slate-800 text-slate-300 text-3xs px-2 py-0.5 rounded-full font-mono">
                    {colProjects.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {colProjects.length === 0 ? (
                    <p className="text-3xs text-slate-600 text-center py-10">Empty Column</p>
                  ) : (
                    colProjects.map(proj => (
                      <div key={proj.id} className="glass-card p-4 rounded-xl space-y-3 border-l-2 border-l-violet-500">
                        <div>
                          <h4 className="font-bold text-xs text-slate-200">{proj.name}</h4>
                          <p className="text-3xs text-slate-400">Client: {proj.client}</p>
                          <p className="text-3xs text-slate-550 line-clamp-3 mt-1.5 leading-relaxed">{proj.description}</p>
                        </div>

                        {/* Milestones list inside Kanban */}
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                          <p className="text-3xs font-bold text-slate-500 uppercase tracking-wide mb-1">Project Milestones:</p>
                          <p className="text-3xs text-slate-400 whitespace-pre-line leading-normal">{proj.milestones}</p>
                        </div>

                        <div className="flex justify-between items-center text-3xs text-slate-500 border-t border-slate-900/60 pt-2.5">
                          <span>Due: {proj.deadline}</span>
                          <div className="flex gap-1.5">
                            {col !== 'Backlog' && (
                              <button
                                onClick={() => handleUpdateProjectStatus(proj.id, columns[columns.indexOf(col) - 1])}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-3xs transition cursor-pointer"
                              >
                                ◀
                              </button>
                            )}
                            {col !== 'Completed' && (
                              <button
                                onClick={() => handleUpdateProjectStatus(proj.id, columns[columns.indexOf(col) + 1])}
                                className="px-1.5 py-0.5 bg-violet-600 hover:bg-violet-750 text-white rounded text-3xs transition cursor-pointer font-bold"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Creator Form */}
      <div className="glass-panel p-6 rounded-2xl max-w-xl mx-auto space-y-5">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Plus className="w-5 h-5 text-violet-400" /> Create Team Project Campaign
        </h3>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project Name</label>
              <input
                type="text"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
                placeholder="Mobile Onboarding Portal"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Choose Client Roster</label>
              <select
                value={projClient}
                onChange={(e) => setProjClient(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
                required
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Deadline</label>
              <input
                type="date"
                value={projDeadline}
                onChange={(e) => setProjDeadline(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Brief Description</label>
              <input
                type="text"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
                placeholder="React dashboard with JWT token authorizations..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Milestone Targets (Line by Line)</label>
            <textarea
              value={projMilestones}
              onChange={(e) => setProjMilestones(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm h-24"
              placeholder="e.g.&#10;1. Database modeling&#10;2. UI Layout mockup&#10;3. REST API endpoints&#10;4. Production staging"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition cursor-pointer"
          >
            Deploy Project Board
          </button>
        </form>
      </div>
    </div>
  );
}
