import { Download, FileText, Lock } from 'lucide-react';
import { DatePicker } from '../../ui';

export default function MOMTab({
  moms, handleCreateMom,
  momClient, setMomClient,
  momDate, setMomDate,
  momAttendees, setMomAttendees,
  momPoints, setMomPoints,
  momActionItems, setMomActionItems,
  isManager,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass-panel p-6 rounded-2xl space-y-5">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-fuchsia-400" /> Minutes of Meeting
          {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3 h-3" /> Manager only</span>}
        </h2>
        {isManager ? (
          <form onSubmit={handleCreateMom} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client Name</label>
                <input type="text" value={momClient} onChange={e=>setMomClient(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Aura Cosmetics" required />
              </div>
              <div>
                <DatePicker label="Meeting Date" value={momDate} onChange={setMomDate} required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Attendees</label>
              <input type="text" value={momAttendees} onChange={e=>setMomAttendees(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Aarav (Paid Ads), Priya (Client CEO)" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Discussion Points</label>
              <textarea value={momPoints} onChange={e=>setMomPoints(e.target.value)} className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Key items discussed..." required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Action Items</label>
              <textarea value={momActionItems} onChange={e=>setMomActionItems(e.target.value)} className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="e.g. Sneha to build landing page..." />
            </div>
            <button type="submit" className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-2.5 rounded-xl text-white text-sm font-bold transition flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Compile & Download MOM
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
            <Lock className="w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-500">Only managers can compile meeting minutes.</p>
          </div>
        )}
      </div>
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-300">Recent MOMs</h3>
        {(moms||[]).length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No MOMs logged yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {[...(moms||[])].reverse().map(m => (
              <div key={m.id} className="glass-card p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-200">{m.clientName}</span>
                  <span className="text-xs text-slate-500">{m.date}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.points}</p>
                <p className="text-3xs text-slate-600 mt-1">by {m.createdBy}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
