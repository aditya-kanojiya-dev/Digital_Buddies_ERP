import { Download, Share2, Lock } from 'lucide-react';

export default function QuotationsTab({
  smmQuotes, handleCreateQuote,
  quoteClient, setQuoteClient,
  quoteDetails, setQuoteDetails,
  quoteCost, setQuoteCost,
  isManager,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass-panel p-6 rounded-2xl space-y-5">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-violet-400" /> New SMM Quotation
          {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3 h-3" /> Manager only</span>}
        </h2>
        {isManager ? (
          <form onSubmit={handleCreateQuote} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Client Name</label>
              <input type="text" value={quoteClient} onChange={e=>setQuoteClient(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Luna Fashion" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Service Details</label>
              <textarea value={quoteDetails} onChange={e=>setQuoteDetails(e.target.value)} className="w-full glass-input p-3 rounded-xl h-24 text-sm" placeholder="e.g. 15 Reels, 10 Static Posts..." />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monthly Retainer (₹)</label>
              <input type="number" value={quoteCost} onChange={e=>setQuoteCost(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="80000" required />
            </div>
            <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-white text-sm font-bold transition flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Generate & Download
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
            <Lock className="w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-500">Only managers can generate client quotations.</p>
          </div>
        )}
      </div>
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-300">Recent Quotations</h3>
        {smmQuotes.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No quotations yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {[...smmQuotes].reverse().map(q => (
              <div key={q.id} className="glass-card p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-200">{q.clientName}</span>
                  <span className="text-xs font-bold text-violet-400">₹{Number(q.cost).toLocaleString()}/mo</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{q.date} · by {q.createdBy}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
