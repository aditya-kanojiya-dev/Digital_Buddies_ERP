import { Check } from 'lucide-react';
import { DatePicker, Modal } from '../../ui';

export default function PostModal({
  showPostModal, setShowPostModal,
  editingPost, setEditingPost,
  postForm, setPostForm,
  blankPost: getBlankPost,
  handleSavePost,
  PLATFORM_COLORS, employees, tasks, DEPT_LEAD_WINDOWS,
  getWorkloadInfo, formatWorkloadLabel,
  addDays,
}) {
  return (
    <Modal
      open={showPostModal}
      title={editingPost ? 'Edit Calendar Entry' : 'Add to Content Calendar'}
      onClose={() => { setShowPostModal(false); setEditingPost(null); setPostForm(getBlankPost()); }}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Post / Content Title *</label>
          <input type="text" value={postForm.title} onChange={e=>setPostForm(f=>({...f,title:e.target.value}))}
            className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Skincare Serum Reel" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Client</label>
          <input type="text" value={postForm.client_id} onChange={e=>setPostForm(f=>({...f,client_id:e.target.value}))}
            className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Luna Fashion" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <DatePicker label="Date" value={postForm.postDate} onChange={v => setPostForm(f => ({...f, postDate: v}))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Time</label>
            <input type="time" value={postForm.postTime} onChange={e=>setPostForm(f=>({...f,postTime:e.target.value}))}
              className="w-full glass-input p-3 rounded-xl text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Platform</label>
            <select value={postForm.platform} onChange={e=>setPostForm(f=>({...f,platform:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
              {Object.keys(PLATFORM_COLORS).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Status</label>
            <select value={postForm.status} onChange={e=>setPostForm(f=>({...f,status:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
              {['Draft','Scheduled','Published','Cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Creative Departments Needed</label>
          <div className="space-y-3">
            {[
              { key: 'needs_video_editing', deptName: 'Video Editors', assignKey: 'assignedVideo' },
              { key: 'needs_graphic_design', deptName: 'Graphic Designers', assignKey: 'assignedGraphic' },
              { key: 'needs_videography', deptName: 'Videography/Photography', assignKey: 'assignedPhoto' },
            ].map(({ key, deptName, assignKey }) => {
              const isChecked = postForm[key];
              const isVideography = deptName === 'Videography/Photography';
              const deptEmployees = employees.filter(e =>
                e.department?.includes(deptName) &&
                (!isVideography || !postForm[`${assignKey}SubType`] || e.subType === postForm[`${assignKey}SubType`])
              );
              const window = DEPT_LEAD_WINDOWS[deptName];
              const dueDate = postForm.postDate ? addDays(postForm.postDate, -window.lower) : '';
              return (
                <div key={key} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer min-w-0 shrink-0">
                    <input type="checkbox" checked={isChecked} onChange={e=>setPostForm(f=>({...f,[key]:e.target.checked}))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500" />
                    {deptName}
                  </label>
                  {isChecked && (
                    <>
                      {isVideography && (
                        <select value={postForm[`${assignKey}SubType`] || ''} onChange={e=>setPostForm(f=>({...f,[`${assignKey}SubType`]:e.target.value,[assignKey]:'',needsBothRoles:false,assignedPhotoCo:''}))}
                          className="glass-input p-2 rounded-lg text-xs shrink-0">
                          <option value="">All Roles</option>
                          <option value="Videographer">Videographer</option>
                          <option value="Content Creator">Content Creator</option>
                        </select>
                      )}
                      <select value={postForm[assignKey]} onChange={e=>setPostForm(f=>({...f,[assignKey]:e.target.value}))}
                        className="glass-input p-2 rounded-lg text-xs flex-1">
                        <option value="">— Auto-assign (anyone in dept) —</option>
                        {deptEmployees.map(e => {
                          const info = dueDate ? getWorkloadInfo(tasks, e.id, dueDate, deptName, 'Medium') : null;
                          const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                          return <option key={e.id} value={e.id} className={
                            info?.color === 'red' ? 'text-red-400' :
                            info?.color === 'amber' ? 'text-amber-400' : ''
                          }>{label}</option>;
                        })}
                      </select>
                      {dueDate && (
                        <span className="text-3xs text-slate-500 shrink-0">due {dueDate}</span>
                      )}
                    </>
                  )}
                  {isVideography && isChecked && postForm[`${assignKey}SubType`] && (
                    <div className="flex items-center gap-2 ml-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={postForm.needsBothRoles || false}
                          onChange={e=>setPostForm(f=>({...f,needsBothRoles:e.target.checked,assignedPhotoCo:e.target.checked?f.assignedPhotoCo:''}))}
                          className="sr-only peer" />
                        <div className="w-8 h-4 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                      <span className="text-3xs text-slate-400">Requires both roles?</span>
                    </div>
                  )}
                  {isVideography && isChecked && postForm.needsBothRoles && postForm[`${assignKey}SubType`] && (() => {
                    const oppositeRole = postForm[`${assignKey}SubType`] === 'Videographer' ? 'Content Creator' : 'Videographer';
                    const coEmployees = employees.filter(e =>
                      e.department?.includes(deptName) && e.subType === oppositeRole
                    );
                    return coEmployees.length > 0 ? (
                      <div className="flex items-center gap-2 ml-6">
                        <select value={postForm.assignedPhotoCo || ''} onChange={e=>setPostForm(f=>({...f,assignedPhotoCo:e.target.value}))}
                          className="glass-input p-2 rounded-lg text-xs flex-1">
                          <option value="">— Co-assignee ({oppositeRole}) —</option>
                          {coEmployees.map(e => {
                            const info = dueDate ? getWorkloadInfo(tasks, e.id, dueDate, deptName, 'Medium') : null;
                            const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                            return <option key={e.id} value={e.id} className={
                              info?.color === 'red' ? 'text-red-400' :
                              info?.color === 'amber' ? 'text-amber-400' : ''
                            }>{label}</option>;
                          })}
                        </select>
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Caption / Notes</label>
          <textarea value={postForm.caption} onChange={e=>setPostForm(f=>({...f,caption:e.target.value}))}
            className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Include hashtags, tags, brief..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSavePost}
            className="flex-1 bg-neon-gradient py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {editingPost ? 'Save Changes' : 'Add to Calendar'}
          </button>
          <button onClick={() => { setShowPostModal(false); setEditingPost(null); setPostForm(getBlankPost()); }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
