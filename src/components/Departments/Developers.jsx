import { useState } from 'react';
import { Download, Code, Layers, FileText, Clock, Shield, Lock } from 'lucide-react';
import { useToast } from '../shared/Toast';

export default function Developers({ user, state, updateState }) {
  const toast = useToast();
  const { devProjects, employees } = state;
  const devStaff = employees.filter(e => e.department?.includes('Developers'));

  // ── Role gates ────────────────────────────────────────────────────────────
  const isManager = user.role === 'Super Admin' || user.role === 'Manager';
  // Employees can only log tasks for themselves
  const defaultDevId = isManager ? (devStaff[0]?.id || '') : (user.id);

  // Daily task sheet — employee locked to self, manager picks anyone
  const [taskDetails, setTaskDetails] = useState('');
  const [taskStatus, setTaskStatus] = useState('In Progress');
  const [selectedDevId, setSelectedDevId] = useState(defaultDevId);
  const [selectedProjectId, setSelectedProjectId] = useState(devProjects[0]?.id || '');

  // Tech spec form — manager only
  const [specClientName, setSpecClientName] = useState('');
  const [specStack, setSpecStack] = useState('React + Node + PostgreSQL');
  const [specHosting, setSpecHosting] = useState('AWS / Vercel');
  const [specRepo, setSpecRepo] = useState('');
  const [specDevUrl, setSpecDevUrl] = useState('');

  // Proposal form — manager only
  const [propClient, setPropClient] = useState('');
  const [propStack, setPropStack] = useState('Vite + React + Tailwind + Node.js');
  const [propTimeline, setPropTimeline] = useState('6 Weeks');
  const [propHours, setPropHours] = useState('');
  const [propCost, setPropCost] = useState('');

  // MOM form — manager only
  const [momAttendees, setMomAttendees] = useState('');
  const [momDecisions, setMomDecisions] = useState('');
  const [momNextSteps, setMomNextSteps] = useState('');

  // All roles — but employees are locked to their own dev ID
  const handleUpdateTaskSheet = (e) => {
    e.preventDefault();
    if (!taskDetails) return;
    const devId = isManager ? selectedDevId : user.id;
    const devName = employees.find(emp => emp.id === devId)?.name || user.name;
    const projName = devProjects.find(p => p.id === selectedProjectId)?.name;
    toast.success(`Task log saved for ${devName} on "${projName}"`);
    setTaskDetails('');
  };

  // Manager only
  const handleCreateSpec = (e) => {
    e.preventDefault();
    if (!isManager) return;
    if (!specClientName) return;
    const specText = `
========================================
NEW CLIENT TECHNICAL SPECIFICATIONS
========================================
Client Name: ${specClientName}
Tech Stack Chosen: ${specStack}
Hosting Environment: ${specHosting}
GitHub Repository: ${specRepo || 'TBD'}
Development URL: ${specDevUrl || 'TBD'}

Created on: ${new Date().toLocaleDateString()}
Assigned Architect: ${user.name}
========================================
`;
    const blob = new Blob([specText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tech_Specs_${specClientName.replace(/\s+/g, '_')}.txt`;
    a.click();
    toast.success('Technical specs created and downloaded.');
    setSpecClientName(''); setSpecRepo(''); setSpecDevUrl('');
  };

  // Manager only
  const handleCreateProposal = (e) => {
    e.preventDefault();
    if (!isManager) return;
    if (!propClient || !propCost) return;
    const proposalText = `
========================================
DEVELOPER PROJECT PROPOSAL
========================================
Proposed Client: ${propClient}
Architecture Stack: ${propStack}
Project Timeline: ${propTimeline}
Estimated Engineering Hours: ${propHours || '120'} Hours
Total Engineering Retainer: ₹${parseFloat(propCost).toLocaleString()}

Development Deliverables:
1. Complete Figma-to-code Frontend implementation.
2. API integrations and State persistence layers.
3. Hosting config, SSL, CI/CD pipeline, and developer handoffs.

Prepared by: ${user.name} — Development Department (NeoMax CMS)
========================================
`;
    const blob = new Blob([proposalText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dev_Proposal_${propClient.replace(/\s+/g, '_')}.txt`;
    a.click();
    toast.success('Project proposal drafted and downloaded.');
    setPropClient(''); setPropHours(''); setPropCost('');
  };

  // Manager only
  const handleDownloadDevMom = (e) => {
    e.preventDefault();
    if (!isManager) return;
    if (!momDecisions) return;
    const momText = `
========================================
DEVELOPMENT TEAM MEETING MINUTES (MOM)
========================================
Meeting Date: ${new Date().toLocaleDateString()}
Attendees: ${momAttendees || 'Lead Developers, Product Manager'}

Key Technical Decisions:
${momDecisions}

Next Steps & Milestones:
${momNextSteps}

Generated by: ${user.name} — Lead Devs Standup (NeoMax CMS)
========================================
`;
    const blob = new Blob([momText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dev_MOM_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    toast.success('Developer MOM compiled and downloaded.');
    setMomAttendees(''); setMomDecisions(''); setMomNextSteps('');
  };

  // All roles can move Kanban — employees can only move projects assigned to them
  const handleMoveProjectStatus = (projId, nextStatus) => {
    const proj = devProjects.find(p => p.id === projId);
    if (!isManager && proj?.devId !== user.id) {
      toast.warning('You can only move projects assigned to you.');
      return;
    }
    const updated = devProjects.map(p => p.id === projId ? { ...p, status: nextStatus } : p);
    updateState({ devProjects: updated });
  };

  const columns = ['Backlog', 'In Progress', 'Review', 'Completed'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Kanban Board */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            Ongoing Projects Kanban Board
          </h2>
          {!isManager && <span className="text-xs text-slate-500">Move only your assigned projects</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {columns.map(col => {
            const colProjects = devProjects.filter(p => p.status === col);
            return (
              <div key={col} className="bg-slate-950/45 p-4 rounded-xl border border-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="font-semibold text-sm text-slate-300">{col}</h3>
                  <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">{colProjects.length}</span>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {colProjects.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-6">Empty Column</p>
                  ) : (
                    colProjects.map(proj => {
                      const dev = employees.find(e => e.id === proj.devId);
                      const canMove = isManager || proj.devId === user.id;
                      return (
                        <div key={proj.id} className={`glass-card p-4 rounded-xl space-y-3 border-l-2 border-l-fuchsia-500 ${!canMove ? 'opacity-50' : ''}`}>
                          <div>
                            <h4 className="font-bold text-xs text-slate-200">{proj.name}</h4>
                            <p className="text-2xs text-slate-400 mt-0.5">Client: {proj.client}</p>
                            <p className="text-2xs text-slate-500 line-clamp-2 mt-1">{proj.description}</p>
                          </div>
                          <div className="flex items-center justify-between text-2xs text-slate-400 border-t border-slate-900 pt-2">
                            <span>Dev: {dev ? dev.name.split(' ')[0] : 'None'}</span>
                            <span className="text-violet-400">{proj.deadline}</span>
                          </div>
                          {canMove && (
                            <div className="flex gap-1 justify-end pt-1">
                              {col !== 'Backlog' && (
                                <button onClick={() => handleMoveProjectStatus(proj.id, columns[columns.indexOf(col) - 1])} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-2xs transition">◀</button>
                              )}
                              {col !== 'Completed' && (
                                <button onClick={() => handleMoveProjectStatus(proj.id, columns[columns.indexOf(col) + 1])} className="px-1.5 py-0.5 bg-violet-600/80 hover:bg-violet-600 text-white rounded text-2xs transition">▶</button>
                              )}
                            </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Task Sheet — all roles, employees locked to self */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 lg:col-span-1">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Code className="w-5 h-5 text-violet-400" />
            Update Daily Task on Sheet
          </h2>
          <form onSubmit={handleUpdateTaskSheet} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Developer</label>
              {isManager ? (
                <select value={selectedDevId} onChange={(e) => setSelectedDevId(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" required>
                  <option value="">-- Choose Dev --</option>
                  {devStaff.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <div className="w-full glass-input p-3 rounded-xl text-sm text-slate-300 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500" /> {user.name} (you)
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Active Project</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" required>
                <option value="">-- Choose Project --</option>
                {devProjects
                  .filter(p => isManager || p.devId === user.id)
                  .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm">
                <option value="In Progress">In Progress</option>
                <option value="Review Ready">Review Ready</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Task Progress Summary</label>
              <textarea value={taskDetails} onChange={(e) => setTaskDetails(e.target.value)} className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="e.g. Fixed customer login endpoint, integrated JWT Auth..." required />
            </div>
            <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium transition">
              Submit Daily Sheet Entry
            </button>
          </form>
        </div>

        {/* Tech Specs — manager only */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-fuchsia-400" />
            Client Technical Specifications
            {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
          </h2>
          {isManager ? (
            <form onSubmit={handleCreateSpec} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Client Name</label>
                  <input type="text" value={specClientName} onChange={(e) => setSpecClientName(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Horizon Tech" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Git Repository URL</label>
                  <input type="text" value={specRepo} onChange={(e) => setSpecRepo(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="github.com/org/repo" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tech Stack</label>
                  <input type="text" value={specStack} onChange={(e) => setSpecStack(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="React + Node + SQL" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hosting Environment</label>
                  <input type="text" value={specHosting} onChange={(e) => setSpecHosting(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="AWS, Vercel" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Development Site Link</label>
                  <input type="text" value={specDevUrl} onChange={(e) => setSpecDevUrl(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="dev.client.com" />
                </div>
              </div>
              <button type="submit" className="w-full bg-neon-gradient py-3 rounded-xl text-white font-medium shadow-md transition flex items-center justify-center gap-2">
                <Download className="w-5 h-5" /> Generate Specs File
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
              <Lock className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">Only managers can create client technical specifications.</p>
            </div>
          )}
        </div>
      </div>

      {/* Proposal + MOM — manager only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            Create Technical Project Proposals
            {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
          </h2>
          {isManager ? (
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Target Client</label>
                  <input type="text" value={propClient} onChange={(e) => setPropClient(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Horizon Tech" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Timeline Estimate</label>
                  <input type="text" value={propTimeline} onChange={(e) => setPropTimeline(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. 6 Weeks" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Architecture Details</label>
                  <input type="text" value={propStack} onChange={(e) => setPropStack(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Vite + Tailwind + React" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Cost (₹)</label>
                  <input type="number" value={propCost} onChange={(e) => setPropCost(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="400000" required />
                </div>
              </div>
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2">
                <Download className="w-5 h-5" /> Download Proposal Plan
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
              <Lock className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">Only managers can draft project proposals.</p>
            </div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-fuchsia-400" />
            Minutes of Meeting (MOM)
            {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
          </h2>
          {isManager ? (
            <form onSubmit={handleDownloadDevMom} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Meeting Attendees</label>
                <input type="text" value={momAttendees} onChange={(e) => setMomAttendees(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Amit (Lead Dev), Rohan (PM), Sneha (Dev)" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Technical Decisions Made</label>
                <textarea value={momDecisions} onChange={(e) => setMomDecisions(e.target.value)} className="w-full glass-input p-3 rounded-xl h-16 text-sm" placeholder="e.g. Switched hosting from GCP to Vercel..." required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Action Items / Milestones</label>
                <textarea value={momNextSteps} onChange={(e) => setMomNextSteps(e.target.value)} className="w-full glass-input p-3 rounded-xl h-16 text-sm" placeholder="e.g. Sneha to map API models by Friday..." required />
              </div>
              <button type="submit" className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2">
                <Download className="w-5 h-5" /> Compile & Download Dev MOM
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
              <Lock className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">Only managers can compile meeting minutes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}