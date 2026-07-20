import { DatePicker } from '../../ui';

export default function Interviews({
  employees,
  interviews,
  candName, setCandName,
  candPos, setCandPos,
  candDate, setCandDate,
  candTime, setCandTime,
  candInterviewer, setCandInterviewer,
  candLink, setCandLink,
  handleScheduleInterview,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
      <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Schedule Interview</h3>
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Candidate Name</label>
            <input
              type="text"
              value={candName}
              onChange={(e) => setCandName(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Target Position</label>
            <input
              type="text"
              value={candPos}
              onChange={(e) => setCandPos(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              placeholder="Senior React Developer"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Interview Date</label>
              <DatePicker value={candDate} onChange={setCandDate} placeholderText="Select date" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Time</label>
              <input
                type="time"
                value={candTime}
                onChange={(e) => setCandTime(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-xs"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assigned Interviewer</label>
            <select
              value={candInterviewer}
              onChange={(e) => setCandInterviewer(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs"
            >
              <option value="">-- Select Interviewer --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Virtual Meeting Link</label>
            <input
              type="url"
              value={candLink}
              onChange={(e) => setCandLink(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-sm"
              placeholder="https://meet.google.com/abc-defg"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium shadow-md transition"
          >
            Confirm Schedule
          </button>
        </form>
      </div>

      <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Schedule Interview Roster</h3>
        
        <div className="space-y-4">
          {interviews.map(i => {
            const interviewer = employees.find(e => e.id === i.interviewerId);
            return (
              <div key={i.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-violet-500">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-100">{i.candidateName}</div>
                  <div className="text-xs text-slate-400">{i.position} | Interviewer: {interviewer ? interviewer.name : 'HR'}</div>
                  <div className="text-xs text-violet-400">{new Date(i.date).toLocaleString()}</div>
                </div>
                <div>
                  <a
                    href={i.link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs transition font-semibold"
                  >
                    Join Meet
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
