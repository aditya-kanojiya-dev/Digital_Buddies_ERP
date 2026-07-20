import { Plus, Edit3, Trash2 } from 'lucide-react';
import { Modal } from '../../ui';

export default function DayDetailModal({
  selectedDay, showDayModal, setShowDayModal,
  MONTH_NAMES, calMonth, calYear,
  canEdit, openAddPost, openEditPost,
  PLATFORM_COLORS, STATUS_STYLES,
  handleDeletePost, handleStatusChange, setSelectedDay,
  dayTaskFilterEmp, setDayTaskFilterEmp,
  employees, setSelectedTask,
}) {
  if (!selectedDay) return null;
  return (
    <Modal
      open={showDayModal}
      title={`${MONTH_NAMES[calMonth]} ${selectedDay.day}, ${calYear}`}
      onClose={() => setShowDayModal(false)}
      size="lg"
    >
      <div className="space-y-4">
        {canEdit && (
          <button onClick={() => { setShowDayModal(false); openAddPost(selectedDay.dateStr); }}
            className="w-full border border-dashed border-violet-500/40 rounded-xl py-2.5 text-violet-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-violet-500/5 transition">
            <Plus className="w-4 h-4" /> Add post on this day
          </button>
        )}

        {selectedDay.posts.length === 0 && selectedDay.tasks.length === 0 && (
          <p className="text-slate-500 text-center py-6">Nothing scheduled for this day.</p>
        )}

        {selectedDay.posts.map(post => {
          const c = PLATFORM_COLORS[post.platform] || PLATFORM_COLORS.Instagram;
          const isDraft = post.status === 'Draft';
          return (
            <div key={post.id} className={`glass-card rounded-xl border p-4 space-y-2 ${isDraft ? 'border-slate-700/60 opacity-70' : c.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${isDraft ? 'bg-slate-700/30 text-slate-500 italic' : `${c.bg} ${c.text}`}`}>
                    {isDraft ? 'Tentative Draft' : post.platform}
                  </span>
                  <h4 className={`font-bold text-sm ${isDraft ? 'text-slate-500' : 'text-slate-200'}`}>{post.title}</h4>
                  {isDraft && <p className="text-3xs text-slate-600 italic">Not confirmed — no tasks assigned yet</p>}
                  {post.caption && <p className="text-xs text-slate-400 italic">{post.caption}</p>}
                  <p className="text-3xs text-slate-500">@ {post.postTime} · by {post.addedBy}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => { setShowDayModal(false); openEditPost(post); }}
                      className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 hover:bg-rose-900/40 rounded-lg text-slate-400 hover:text-rose-400 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  {['Draft','Scheduled','Published','Cancelled'].map(s => (
                    <button key={s} onClick={() => { handleStatusChange(post.id, s); setSelectedDay(prev => ({ ...prev, posts: prev.posts.map(p => p.id === post.id ? {...p, status: s} : p) })); }}
                      className={`text-3xs px-2 py-0.5 rounded-full transition ${post.status === s ? STATUS_STYLES[s] : 'text-slate-500 hover:text-slate-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {!canEdit && (
                <span className={`text-3xs px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] || ''}`}>{post.status}</span>
              )}
            </div>
          );
        })}

        {selectedDay.tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter by:</span>
            <select value={dayTaskFilterEmp} onChange={e=>setDayTaskFilterEmp(e.target.value)}
              className="glass-input text-xs px-2 py-1 rounded-lg">
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
        {selectedDay.tasks.filter(t => !dayTaskFilterEmp || t.assignedTo === dayTaskFilterEmp).map(t => (
          <div key={t.id} className="glass-card rounded-xl border border-orange-500/20 p-4 cursor-pointer hover:border-orange-500/40 transition"
            onClick={() => { setSelectedTask(t); setShowDayModal(false); }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold">📌 Task</span>
              <span className="text-3xs text-slate-500">{t.department}</span>
            </div>
            <h4 className="font-bold text-sm text-slate-200">{t.title}</h4>
            {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
            <p className="text-3xs text-slate-500 mt-1">by {employees.find(e => e.id === t.assignedBy)?.name || 'Social Media'}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
