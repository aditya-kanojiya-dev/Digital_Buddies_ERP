import { Send } from 'lucide-react';

export default function ConnectLeads({
  employees,
  devProjects,
  routeClientName, setRouteClientName,
  routeProjectName, setRouteProjectName,
  routeDevId, setRouteDevId,
  handleRouteClient,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
      <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Connect Website Client to Dev</h3>
        <form onSubmit={handleRouteClient} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Company/Client Name</label>
            <input
              type="text"
              value={routeClientName}
              onChange={(e) => setRouteClientName(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              placeholder="e.g. Aura Cosmetics"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project Objective</label>
            <input
              type="text"
              value={routeProjectName}
              onChange={(e) => setRouteProjectName(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              placeholder="e.g. E-Commerce Redesign"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assign Development Lead</label>
            <select
              value={routeDevId}
              onChange={(e) => setRouteDevId(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              required
            >
              <option value="">-- Choose Dev --</option>
              {employees.filter(e => e.department?.includes('Developers')).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Route Project Lead
          </button>
        </form>
      </div>

      <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Routed Technical Clients</h3>
        
        <div className="space-y-4">
          {devProjects.map(proj => {
            const dev = employees.find(e => e.id === proj.devId);
            return (
              <div key={proj.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-violet-500">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">{proj.name}</div>
                  <div className="text-xs text-slate-400">Client: {proj.client}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-slate-900 text-slate-300 px-3 py-1 rounded-full">
                    Lead Developer: {dev ? dev.name : 'Unassigned'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
