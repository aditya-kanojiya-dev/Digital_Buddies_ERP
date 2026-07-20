export default function ClientFeedback({
  feedback,
  fbClient, setFbClient,
  fbDept, setFbDept,
  fbRating, setFbRating,
  fbComment, setFbComment,
  handleAddFeedback,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
      <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Log Clients Feedback</h3>
        <form onSubmit={handleAddFeedback} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Company/Client Name</label>
            <input
              type="text"
              value={fbClient}
              onChange={(e) => setFbClient(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              placeholder="Luna Fashion"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Department Rated</label>
              <select
                value={fbDept}
                onChange={(e) => setFbDept(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
              >
                <option value="Paid Ads">Paid Ads</option>
                <option value="Social Media">Social Media</option>
                <option value="Developers">Developers</option>
                <option value="Video Editors">Video Editors</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rating Score</label>
              <select
                value={fbRating}
                onChange={(e) => setFbRating(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
              >
                <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                <option value="4">⭐⭐⭐⭐ (4/5)</option>
                <option value="3">⭐⭐⭐ (3/5)</option>
                <option value="2">⭐⭐ (2/5)</option>
                <option value="1">⭐ (1/5)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Feedback Brief</label>
            <textarea
              value={fbComment}
              onChange={(e) => setFbComment(e.target.value)}
              className="w-full glass-input p-3 rounded-xl h-24 text-sm"
              placeholder="They loved the layout, wanted earlier postings..."
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium shadow-md transition"
          >
            Log Feedback
          </button>
        </form>
      </div>

      <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
        <h3 className="text-lg font-semibold text-slate-100 font-sans">Compiled Feedback Logs</h3>
        
        <div className="space-y-4">
          {feedback.map(fb => (
            <div key={fb.id} className="glass-card p-5 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200">{fb.clientName}</h4>
                  <p className="text-xs text-slate-400">Department: {fb.department} | {fb.date}</p>
                </div>
                <span className="text-amber-400 font-bold flex gap-0.5">
                  {'⭐'.repeat(fb.rating)}
                </span>
              </div>
              <p className="text-sm text-slate-300 italic">" {fb.comment} "</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
