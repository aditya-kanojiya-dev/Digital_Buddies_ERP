import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Users, CheckSquare, Briefcase, DollarSign, CornerDownLeft } from 'lucide-react';

/**
 * CommandPalette — Ctrl/Cmd+K global search across employees, tasks, clients
 * and leads. Selecting a result switches to the relevant tab.
 *
 * Props:
 *   open, onClose
 *   state: app state
 *   onNavigate: (tabId) => void
 */
const TYPE_META = {
  employee: { icon: Users, tab: 'HR', tone: 'text-sky-400' },
  task: { icon: CheckSquare, tab: 'manager', tone: 'text-violet-400' },
  client: { icon: Briefcase, tab: 'crm', tone: 'text-emerald-400' },
  lead: { icon: DollarSign, tab: 'crm', tone: 'text-amber-400' },
};

export default function CommandPalette({ open, onClose, state, onNavigate }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build a flat, searchable index from the major entities.
  const index = useMemo(() => {
    const items = [];
    (state.employees || []).forEach((e) =>
      items.push({ id: e.id, type: 'employee', title: e.name, sub: e.designation || e.department })
    );
    (state.tasks || []).forEach((t) =>
      items.push({ id: t.id, type: 'task', title: t.title, sub: `${t.status} · ${t.department || ''}` })
    );
    (state.clients || []).forEach((c) =>
      items.push({ id: c.id, type: 'client', title: c.name, sub: c.department || c.email })
    );
    (state.leads || []).forEach((l) =>
      items.push({ id: l.id, type: 'lead', title: l.name, sub: `${l.status} · ${l.source || ''}` })
    );
    return items;
  }, [state]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 8);
    return index
      .filter(
        (it) =>
          it.title?.toLowerCase().includes(q) || it.sub?.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [query, index]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  if (!open) return null;

  const select = (item) => {
    if (!item) return;
    onNavigate?.(TYPE_META[item.type]?.tab || 'dashboard');
    onClose?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') return onClose?.();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[active]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="glass-panel border border-violet-500/25 rounded-2xl w-full max-w-xl shadow-2xl animate-modal-pop overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-violet-500/10">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search employees, tasks, clients, leads…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none"
          />
          <kbd className="text-[0.6rem] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
            Esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">No matches found</p>
          ) : (
            results.map((item, i) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                    active === i ? 'bg-violet-650/60' : 'hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${meta.tone}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.title}</p>
                    <p className="text-[0.65rem] text-slate-500 truncate">{item.sub}</p>
                  </div>
                  <span className="text-[0.6rem] uppercase text-slate-600 tracking-wider">
                    {item.type}
                  </span>
                  {active === i && <CornerDownLeft className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
