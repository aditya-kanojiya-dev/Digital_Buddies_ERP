import { Clock, Check, X, Download } from 'lucide-react';
import { DatePicker } from '../../ui';
import { today as todayStr } from '../../../lib/format';

export default function AttendanceLeaves({
  employees,
  leaves,
  attendance,
  attendanceDocs,
  leaveEmpId, setLeaveEmpId,
  leaveStart, setLeaveStart,
  leaveEnd, setLeaveEnd,
  leaveType, setLeaveType,
  leaveReason, setLeaveReason,
  clockEmpId, setClockEmpId,
  clockInTime, setClockInTime,
  clockOutTime, setClockOutTime,
  docLabel, setDocLabel,
  uploadingDoc,
  fileInputRef,
  handleApplyLeave,
  handleUpdateLeaveStatus,
  handleClockIn,
  handleUploadAttendanceDoc,
}) {
  return (
    <div className="space-y-6 print:hidden">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Leaves', count: leaves.filter(l => l.status === 'Pending').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Approved', count: leaves.filter(l => l.status === 'Approved').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Rejected', count: leaves.filter(l => l.status === 'Rejected').length, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Today Logged', count: attendance.filter(a => a.logDate === todayStr() || a.date === todayStr()).length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border border-slate-800/40`}>
            <p className="text-3xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-sm font-bold ${s.color} mt-0.5`}>{s.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leaves Manager */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-semibold text-slate-100">Leave Requests & Approvals</h3>
          
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-800/60 rounded-xl">
                <Clock className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">No leave requests logged yet.</p>
              </div>
            ) : (
              leaves.map(l => {
                const emp = employees.find(e => e.id === l.employeeId);
                return (
                  <div key={l.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-amber-500">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-slate-200">
                        {emp ? emp.name : 'Unknown Staff'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {l.type} | {l.startDate} to {l.endDate}
                      </div>
                      <div className="text-xs text-slate-500 italic">" {l.reason} "</div>
                    </div>
                    
                    <div className="flex gap-2">
                      {l.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                            className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded transition"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateLeaveStatus(l.id, 'Rejected')}
                            className="p-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded transition"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {l.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleApplyLeave} className="border-t border-slate-900 pt-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-300">Submit Leave Application</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Employee</label>
                <select
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs"
                  required
                >
                  <option value="">-- Choose Member --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs"
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Maternity/Paternity">Maternity/Paternity</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Start Date" value={leaveStart} onChange={setLeaveStart} required />
              <DatePicker label="End Date" value={leaveEnd} onChange={setLeaveEnd} />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason Description</label>
              <input
                type="text"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-xs"
                placeholder="Reason detail..."
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-xs font-semibold text-white transition"
            >
              Submit Request
            </button>
          </form>
        </div>

        {/* Clock Register */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-semibold text-slate-100">Clock-In & Attendance Register</h3>
          
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {attendance.map(a => {
              const emp = employees.find(e => e.id === a.employeeId);
              return (
                <div key={a.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-blue-500">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-200">
                      {emp ? emp.name : 'Unknown Staff'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Date Log: {a.logDate || a.date} | Mode: {a.type || 'Office'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <div>Clock In: <span className="font-mono text-emerald-400 font-semibold">{a.clockIn}</span></div>
                    <div>Clock Out: <span className="font-mono text-slate-400">{a.clockOut || '--:--'}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleClockIn} className="border-t border-slate-900 pt-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-300 font-sans">Register Day Timestamp</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Employee</label>
                <select
                  value={clockEmpId}
                  onChange={(e) => setClockEmpId(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs"
                  required
                >
                  <option value="">-- Select --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Clock In</label>
                <input
                  type="time"
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Clock Out</label>
                <input
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-xs font-semibold text-white transition"
            >
              Log Stamp
            </button>
          </form>
        </div>
      </div>

      {/* Attendance Document Upload */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Attendance Records (Uploaded Documents)</h3>
          <span className="text-3xs text-slate-500 font-mono">{(attendanceDocs || []).length} files</span>
        </div>

        <form onSubmit={handleUploadAttendanceDoc} className="glass-card p-4 rounded-xl border border-dashed border-slate-700/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Label (e.g. June Week 3)</label>
              <input type="text" value={docLabel} onChange={e => setDocLabel(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-xs" placeholder="e.g. July Week 1, July 2026" required />
            </div>
            <div>
              <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">File</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
                className="w-full glass-input p-2 rounded-xl text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-xs file:font-semibold hover:file:bg-violet-700 file:cursor-pointer cursor-pointer"
                required />
            </div>
          </div>
          <button type="submit" disabled={uploadingDoc}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 py-2 rounded-xl text-xs font-semibold text-white transition cursor-pointer flex items-center justify-center gap-2">
            {uploadingDoc ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
            ) : 'Upload Attendance Document'}
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(attendanceDocs || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center col-span-full border border-dashed border-slate-800/60 rounded-xl">
              <Download className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No attendance documents uploaded yet.</p>
            </div>
          ) : [...(attendanceDocs || [])].reverse().map(doc => (
            <div key={doc.id} className="glass-card p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-slate-200 truncate">{doc.label}</div>
                <div className="text-3xs text-slate-400 font-mono">{doc.fileName} • {(doc.fileSize / 1024).toFixed(0)} KB</div>
                <div className="text-3xs text-slate-500">Uploaded: {doc.uploadedAt}</div>
              </div>
              <a href={doc.dataUrl} download={doc.fileName}
                className="shrink-0 p-2 bg-violet-600/15 hover:bg-violet-600/30 rounded-lg text-violet-400 transition cursor-pointer"
                title="Download">
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
