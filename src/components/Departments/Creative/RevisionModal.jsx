import { GitBranch } from 'lucide-react';

export default function RevisionModal({
  revisionTaskId, setRevisionTaskId,
  revisionNote, setRevisionNote,
  handleSubmitRevision,
}) {
  if (!revisionTaskId) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setRevisionTaskId(null)} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div className="glass-panel border border-amber-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-400" />
            Revision Note
          </h3>
          <p className="text-sm text-slate-400">Why is this task being sent back from Review?</p>
          <form onSubmit={handleSubmitRevision} className="space-y-4">
            <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm h-24" placeholder="Describe what needs to change..." required autoFocus />
            <div className="flex gap-2">
              <button type="submit" className="bg-amber-600 hover:bg-amber-700 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> Send Back (Revision)
              </button>
              <button type="button" onClick={() => { setRevisionTaskId(null); setRevisionNote(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
